import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const RecordingsPage = () => {
  const [byDay, setByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(null);
  const [playback, setPlayback] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/user/recordings/list');
        setByDay(res.data.byDay || {});
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const watch = async (recordingId) => {
    setWatching(recordingId);
    try {
      const res = await postRequest('/user/recordings/watch', { recordingId });
      const url = res.data.recording.playbackUrl;
      const fullUrl = url.startsWith('http') ? url : imageUrl(url);
      setPlayback({ ...res.data.recording, playbackUrl: fullUrl });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWatching(null);
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
        <p className="text-sm text-slate-500">Only videos your admin has permitted you to watch</p>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : days.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No recordings available for you yet</p>
        </Card>
      ) : (
        days.map((day) => (
          <Card key={day} title={day}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {byDay[day].map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-slate-800">{r.sessionTitle}</p>
                    <Badge variant="info">S{r.sessionNumber}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{r.description || 'Session recording'}</p>
                  <Button size="sm" icon={Play} disabled={watching === r.id} onClick={() => watch(r.id)}>
                    {watching === r.id ? 'Loading...' : 'Watch'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Modal isOpen={!!playback} onClose={() => setPlayback(null)} title={playback?.sessionTitle || 'Watch'} size="xl">
        {playback && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{playback.description}</p>
            {playback.playbackUrl.includes('youtube') || playback.playbackUrl.includes('youtu.be') || playback.playbackUrl.includes('vimeo') ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                <iframe
                  src={playback.playbackUrl.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  title={playback.sessionTitle}
                />
              </div>
            ) : (
              <video src={playback.playbackUrl} controls className="w-full rounded-xl bg-slate-900 max-h-[60vh]" />
            )}
            <a
              href={playback.playbackUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand-600 font-semibold hover:underline"
            >
              Open in new tab
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecordingsPage;
