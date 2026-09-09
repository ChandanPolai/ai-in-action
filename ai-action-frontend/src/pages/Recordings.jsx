import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, ShieldAlert, Send, ArrowLeft, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import Input from '../components/ui/Input';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000';

const isEmbedUrl = (url = '') =>
  url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo');

const toEmbedSrc = (url = '') => {
  let src = url.replace('watch?v=', 'embed/');
  if (src.includes('youtu.be/')) {
    const id = src.split('youtu.be/')[1]?.split(/[?&]/)[0];
    if (id) src = `https://www.youtube.com/embed/${id}`;
  }
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}modestbranding=1&rel=0&controls=1&enablejsapi=1`;
};

const formatResume = (sec = 0) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

/**
 * Progressive stream player (same idea as admin preview).
 * Short-lived streamToken in query — browser can Range-request, so play starts fast.
 * (Full-file blob download was making large videos very slow on user app.)
 */
const ProtectedVideo = ({
  streamPath,
  streamToken,
  title,
  startAt = 0,
  onProgress,
  onComplete
}) => {
  const videoRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [src, setSrc] = useState('');
  const lastProgressRef = useRef(0);
  const completedRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const startAtRef = useRef(startAt);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C', 's', 'S'].includes(e.key)) ||
        (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key))
      ) {
        e.preventDefault();
        setBlocked(true);
        setTimeout(() => setBlocked(false), 2000);
      }
    };
    const onVis = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    completedRef.current = false;
    lastProgressRef.current = 0;
    startAtRef.current = startAt;
    setError('');
    setLoading(true);

    if (!streamPath || !streamToken) {
      setSrc('');
      setError('Video session missing. Open the video again.');
      setLoading(false);
      return undefined;
    }

    const absolute = `${API_BASE.replace(/\/api$/, '')}${streamPath}`;
    const streamUrl = `${absolute}?streamToken=${encodeURIComponent(streamToken)}`;
    setSrc(streamUrl);

    return () => {
      const el = videoRef.current;
      if (el && !completedRef.current && onProgressRef.current) {
        onProgressRef.current(el.currentTime || 0);
      }
      setSrc('');
    };
    // startAt only applied when a new stream session opens (path/token change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, streamToken]);

  const handleLoadedMetadata = () => {
    setLoading(false);
    const el = videoRef.current;
    if (!el) return;
    const resumeAt = Math.max(0, Number(startAtRef.current) || 0);
    if (resumeAt > 0 && Number.isFinite(el.duration) && resumeAt < el.duration - 2) {
      try {
        el.currentTime = resumeAt;
      } catch {
        /* ignore */
      }
    }
  };

  const handleCanPlay = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError('Unable to load video. Stream may have expired — open again.');
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || completedRef.current || !onProgressRef.current) return;
    const t = el.currentTime || 0;
    if (t - lastProgressRef.current >= 10) {
      lastProgressRef.current = t;
      onProgressRef.current(t);
    }
  };

  const handlePause = () => {
    const el = videoRef.current;
    if (!el || completedRef.current || !onProgressRef.current) return;
    onProgressRef.current(el.currentTime || 0);
  };

  const handleEnded = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onCompleteRef.current) onCompleteRef.current();
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-slate-900 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {blocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 text-white text-sm font-semibold">
          Screen capture is not allowed
        </div>
      )}
      {loading && !error && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center text-slate-300 text-sm bg-slate-900">
          Starting stream...
        </div>
      )}
      {error && (
        <div className="aspect-video flex items-center justify-center text-rose-300 text-sm px-4 text-center">
          {error}
        </div>
      )}
      {src && !error && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          controls
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          playsInline
          preload="metadata"
          className="w-full max-h-[60vh]"
          title={title}
          onContextMenu={(e) => e.preventDefault()}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onEnded={handleEnded}
        >
          Your browser does not support video playback.
        </video>
      )}
      <p className="text-[11px] text-slate-400 px-3 py-2 bg-slate-950">
        Streaming player · Starts as soon as buffer is ready · Play counts only on full finish
      </p>
    </div>
  );
};

const RecordingsPage = () => {
  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [byDay, setByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [watching, setWatching] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [requestOpen, setRequestOpen] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const completedLockRef = useRef(false);
  const lastPosRef = useRef(0);

  const loadWorkshops = useCallback(async () => {
    try {
      const res = await postRequest('/user/recordings/workshops');
      setWorkshops(res.data.workshops || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async (workshop) => {
    setLoadingVideos(true);
    try {
      const res = await postRequest('/user/recordings/list', { workshopId: workshop.id });
      setByDay(res.data.byDay || {});
      setSelectedWorkshop(res.data.workshop || workshop);
    } catch (err) {
      toast.error(err.message);
      setSelectedWorkshop(null);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  const openWorkshop = (w) => {
    setSelectedWorkshop(w);
    loadVideos(w);
  };

  const backToWorkshops = () => {
    setSelectedWorkshop(null);
    setByDay({});
    setPlayback(null);
    loadWorkshops();
  };

  const watch = async (recordingId) => {
    setWatching(recordingId);
    try {
      const res = await postRequest('/user/recordings/watch', { recordingId });
      const rec = res.data.recording;
      let playbackUrl = rec.playbackUrl || '';

      if (rec.isStream) {
        playbackUrl = '';
      } else if (playbackUrl && !playbackUrl.startsWith('http')) {
        playbackUrl = `${IMAGE_BASE}${playbackUrl}`;
      }

      completedLockRef.current = false;
      lastPosRef.current = Number(rec.lastPositionSec || 0);
      setPlayback({ ...rec, playbackUrl });
      if (selectedWorkshop) loadVideos(selectedWorkshop);
    } catch (err) {
      if (err.code === 'PLAY_LIMIT_REACHED' || err.data?.code === 'PLAY_LIMIT_REACHED') {
        toast.error(err.message);
        setRequestOpen({
          recordingId,
          hasPendingRequest: err.data?.hasPendingRequest
        });
        if (selectedWorkshop) loadVideos(selectedWorkshop);
      } else {
        toast.error(err.message);
      }
    } finally {
      setWatching(null);
    }
  };

  const saveProgress = useCallback(async (recordingId, positionSec) => {
    if (!recordingId) return;
    lastPosRef.current = positionSec;
    try {
      await postRequest('/user/recordings/progress', {
        recordingId,
        positionSec: Math.floor(positionSec || 0)
      });
    } catch {
      /* ignore progress errors */
    }
  }, []);

  const markComplete = useCallback(
    async (recordingId) => {
      if (!recordingId || completedLockRef.current) return;
      completedLockRef.current = true;
      try {
        const res = await postRequest('/user/recordings/complete', { recordingId });
        if (res.data?.counted) {
          toast.success('Video completed — play counted');
        }
        setPlayback((prev) =>
          prev
            ? {
                ...prev,
                playCount: res.data?.playCount ?? prev.playCount,
                remainingPlays: res.data?.remainingPlays ?? prev.remainingPlays,
                inProgress: false,
                lastPositionSec: 0
              }
            : prev
        );
        if (selectedWorkshop) loadVideos(selectedWorkshop);
      } catch (err) {
        completedLockRef.current = false;
        toast.error(err.message || 'Could not mark complete');
      }
    },
    [selectedWorkshop, loadVideos]
  );

  const closePlayback = useCallback(async () => {
    const id = playback?.id;
    const pos = lastPosRef.current;
    setPlayback(null);
    if (id && !completedLockRef.current && pos > 0) {
      await saveProgress(id, pos);
    }
    if (selectedWorkshop) loadVideos(selectedWorkshop);
  }, [playback?.id, saveProgress, selectedWorkshop, loadVideos]);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestOpen?.recordingId) return;
    setRequesting(true);
    try {
      await postRequest('/user/recordings/request-play', {
        recordingId: requestOpen.recordingId,
        reason: requestReason
      });
      toast.success('Request sent to admin');
      setRequestOpen(null);
      setRequestReason('');
      if (selectedWorkshop) loadVideos(selectedWorkshop);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const days = Object.keys(byDay).sort((a, b) => {
    const na = Number(a.replace(/\D/g, '')) || 0;
    const nb = Number(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Session Recordings</h2>
        <p className="text-sm text-slate-500">
          Open a workshop to watch its videos · Play counts only when you finish · Pause/close saves progress
        </p>
      </div>

      {!selectedWorkshop ? (
        loading ? (
          <p className="text-center py-12 text-slate-400">Loading...</p>
        ) : workshops.length === 0 ? (
          <Card>
            <p className="text-center py-8 text-slate-400">No workshops assigned to you yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workshops.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => openWorkshop(w)}
                className="text-left rounded-2xl border border-slate-100 bg-white overflow-hidden hover:border-brand-300 hover:shadow-md transition-all"
              >
                <div className="aspect-[16/9] bg-slate-100">
                  {w.image ? (
                    <img src={imageUrl(w.image)} alt={w.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Layers className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-800 line-clamp-2">{w.title}</p>
                    <Badge variant="info">{w.videoCount || 0} videos</Badge>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                    {w.description || 'Tap to view recordings'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={backToWorkshops}>
              Workshops
            </Button>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{selectedWorkshop.title}</p>
              <p className="text-xs text-slate-500">Workshop recordings</p>
            </div>
          </div>

          {loadingVideos ? (
            <p className="text-center py-12 text-slate-400">Loading videos...</p>
          ) : days.length === 0 ? (
            <Card>
              <p className="text-center py-8 text-slate-400">No recordings in this workshop yet</p>
            </Card>
          ) : (
            days.map((day) => (
              <Card key={day} title={day}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {byDay[day].map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-slate-800">{r.sessionTitle}</p>
                        <Badge variant="info">S{r.sessionNumber}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                        {r.description || 'Session recording'}
                      </p>
                      <p className="text-xs text-slate-500 mb-3">
                        Completed plays: {r.playCount}/{r.playCount + r.remainingPlays} · Remaining:{' '}
                        {r.remainingPlays}
                        {r.inProgress && r.lastPositionSec > 0
                          ? ` · Resume at ${formatResume(r.lastPositionSec)}`
                          : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {r.canPlay ? (
                          <Button
                            size="sm"
                            icon={Play}
                            disabled={watching === r.id}
                            onClick={() => watch(r.id)}
                          >
                            {watching === r.id
                              ? 'Loading...'
                              : r.inProgress
                                ? 'Continue'
                                : 'Watch'}
                          </Button>
                        ) : (
                          <>
                            <Badge variant="warning">Limit reached</Badge>
                            {r.hasPendingRequest ? (
                              <Badge variant="info">Request pending</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={Send}
                                onClick={() =>
                                  setRequestOpen({ recordingId: r.id, hasPendingRequest: false })
                                }
                              >
                                Request more plays
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </>
      )}

      <Drawer
        isOpen={!!playback}
        onClose={closePlayback}
        title={playback?.sessionTitle || 'Watch'}
        size="xl"
      >
        {playback && (
          <div className="space-y-3" onContextMenu={(e) => e.preventDefault()}>
            <p className="text-sm text-slate-500">{playback.description}</p>
            <p className="text-xs font-semibold text-brand-700">
              Completed {playback.playCount} of {playback.maxAllowed} · {playback.remainingPlays}{' '}
              remaining
              {playback.inProgress && playback.lastPositionSec > 0
                ? ` · Resuming ${formatResume(playback.lastPositionSec)}`
                : ''}
            </p>
            {isEmbedUrl(playback.playbackUrl) && !playback.isStream ? (
              <div className="space-y-3">
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                  <iframe
                    src={toEmbedSrc(playback.playbackUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={playback.sessionTitle}
                  />
                </div>
                <Button
                  fullWidth
                  disabled={completedLockRef.current}
                  onClick={() => markComplete(playback.id)}
                >
                  Mark as completed (counts as 1 play)
                </Button>
              </div>
            ) : playback.isStream ? (
              <ProtectedVideo
                streamPath={playback.streamPath}
                streamToken={playback.streamToken}
                title={playback.sessionTitle}
                startAt={playback.lastPositionSec || 0}
                onProgress={(t) => {
                  lastPosRef.current = t;
                  saveProgress(playback.id, t);
                }}
                onComplete={() => markComplete(playback.id)}
              />
            ) : (
              <div className="rounded-xl overflow-hidden bg-slate-900">
                <video
                  key={playback.id}
                  src={playback.playbackUrl}
                  controls
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  playsInline
                  className="w-full max-h-[60vh]"
                  onContextMenu={(e) => e.preventDefault()}
                  onLoadedMetadata={(e) => {
                    const resumeAt = Number(playback.lastPositionSec || 0);
                    if (resumeAt > 0 && resumeAt < (e.currentTarget.duration || 0) - 2) {
                      e.currentTarget.currentTime = resumeAt;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const t = e.currentTarget.currentTime || 0;
                    if (t - lastPosRef.current >= 10) {
                      lastPosRef.current = t;
                      saveProgress(playback.id, t);
                    } else {
                      lastPosRef.current = t;
                    }
                  }}
                  onPause={(e) => saveProgress(playback.id, e.currentTarget.currentTime || 0)}
                  onEnded={() => markComplete(playback.id)}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        isOpen={!!requestOpen}
        onClose={() => setRequestOpen(null)}
        title="Request more plays"
        size="md"
      >
        {requestOpen?.hasPendingRequest ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 text-amber-800">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">Your request is already pending. Admin will review it soon.</p>
          </div>
        ) : (
          <form onSubmit={submitRequest} className="space-y-4">
            <p className="text-sm text-slate-500">
              You used all allowed plays. Send a request — admin will see it and can grant extra plays.
            </p>
            <Input
              label="Reason (optional)"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="e.g. Need to revise before exam"
            />
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth type="button" onClick={() => setRequestOpen(null)}>
                Cancel
              </Button>
              <Button fullWidth type="submit" disabled={requesting}>
                {requesting ? 'Sending...' : 'Send request'}
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};

export default RecordingsPage;
