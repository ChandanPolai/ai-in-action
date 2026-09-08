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
  return `${src}${sep}modestbranding=1&rel=0&controls=1`;
};

/**
 * Secure player: fetch with stream token, then revoke blob URL ASAP after the element loads it.
 * HTML me blob: string dikh sakti hai, lekin revoke ke baad new tab me paste = fail.
 * (Browser Blob/srcObject bhi quietly blob: banata hai — isliye revoke zaroori hai.)
 */
const ProtectedVideo = ({ streamPath, streamToken, title }) => {
  const videoRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

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
    let cancelled = false;
    let objectUrl = '';
    let revokeTimer = 0;

    const revokeNow = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = '';
      }
      if (revokeTimer) {
        window.clearTimeout(revokeTimer);
        revokeTimer = 0;
      }
    };

    const clearVideo = (el) => {
      if (!el) return;
      try {
        el.pause();
      } catch {
        /* ignore */
      }
      el.removeAttribute('src');
      el.src = '';
      try {
        el.srcObject = null;
      } catch {
        /* ignore */
      }
      try {
        el.load();
      } catch {
        /* ignore */
      }
    };

    const load = async () => {
      setLoading(true);
      setError('');
      setReady(false);
      revokeNow();
      clearVideo(videoRef.current);

      if (!streamPath || !streamToken) {
        setError('Video session missing. Open the video again.');
        setLoading(false);
        return;
      }

      const absolute = `${API_BASE.replace(/\/api$/, '')}${streamPath}`;

      try {
        const res = await fetch(absolute, {
          method: 'GET',
          headers: {
            'x-stream-token': streamToken,
            Accept: 'video/*,*/*'
          }
        });
        if (!res.ok) {
          const msg =
            res.status === 401 || res.status === 403
              ? 'Stream expired. Close and open the video again.'
              : 'Unable to load video';
          throw new Error(msg);
        }

        const blob = await res.blob();
        if (cancelled) return;

        const el = videoRef.current;
        if (!el) return;

        // Blob registry me URL register → element load kare → turant revoke.
        // Is page ka player chalega; dusri tab me wahi URL dead ho jayegi.
        objectUrl = URL.createObjectURL(blob);
        el.removeAttribute('src');
        try {
          el.srcObject = null;
        } catch {
          /* ignore */
        }
        el.src = objectUrl;

        const onLoaded = () => {
          revokeNow();
        };
        el.addEventListener('loadeddata', onLoaded, { once: true });
        // Safety: agar event miss ho jaye
        revokeTimer = window.setTimeout(revokeNow, 1500);

        setReady(true);
      } catch (err) {
        revokeNow();
        if (!cancelled) setError(err.message || 'Unable to load video');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      revokeNow();
      clearVideo(videoRef.current);
    };
  }, [streamPath, streamToken]);

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
      {loading && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center text-slate-300 text-sm bg-slate-900">
          Securely loading video...
        </div>
      )}
      {error && !loading && (
        <div className="aspect-video flex items-center justify-center text-rose-300 text-sm px-4 text-center">
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        controls
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        playsInline
        className={`w-full max-h-[60vh] ${ready && !error ? '' : 'hidden'}`}
        title={title}
        onContextMenu={(e) => e.preventDefault()}
      >
        Your browser does not support video playback.
      </video>
      <p className="text-[11px] text-slate-400 px-3 py-2 bg-slate-950">
        Protected player · No shareable link in page · Open only from this app
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
        // Stream uses short-lived token + blob player — do not attach login token to URL
        playbackUrl = '';
      } else if (playbackUrl && !playbackUrl.startsWith('http')) {
        playbackUrl = `${IMAGE_BASE}${playbackUrl}`;
      }

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
          Open a workshop to watch its videos · Download not allowed · Ask admin for more plays if needed
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
                        Plays used: {r.playCount}/{r.playCount + r.remainingPlays} · Remaining:{' '}
                        {r.remainingPlays}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {r.canPlay ? (
                          <Button
                            size="sm"
                            icon={Play}
                            disabled={watching === r.id}
                            onClick={() => watch(r.id)}
                          >
                            {watching === r.id ? 'Loading...' : 'Watch'}
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
        onClose={() => setPlayback(null)}
        title={playback?.sessionTitle || 'Watch'}
        size="xl"
      >
        {playback && (
          <div className="space-y-3" onContextMenu={(e) => e.preventDefault()}>
            <p className="text-sm text-slate-500">{playback.description}</p>
            <p className="text-xs font-semibold text-brand-700">
              Play {playback.playCount} of {playback.maxAllowed} · {playback.remainingPlays} remaining
            </p>
            {isEmbedUrl(playback.playbackUrl) && !playback.isStream ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                <iframe
                  src={toEmbedSrc(playback.playbackUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={playback.sessionTitle}
                />
              </div>
            ) : playback.isStream ? (
              <ProtectedVideo
                streamPath={playback.streamPath}
                streamToken={playback.streamToken}
                title={playback.sessionTitle}
              />
            ) : (
              <div className="rounded-xl overflow-hidden bg-slate-900">
                <video
                  src={playback.playbackUrl}
                  controls
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  playsInline
                  className="w-full max-h-[60vh]"
                  onContextMenu={(e) => e.preventDefault()}
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
