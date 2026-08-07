import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const MeetingsPage = () => {
  const [byDay, setByDay] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const res = await postRequest('/user/meetings/list', { filter: f });
      setByDay(res.data.byDay || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const joinMeeting = async (meetingId) => {
    setJoining(meetingId);
    try {
      const res = await postRequest('/user/meetings/join', { meetingId });
      toast.success('Attendance marked — opening Zoom...');
      window.open(res.data.zoomLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(null);
    }
  };

  const days = Object.keys(byDay).sort((a, b) => {
    const na = Number(a.replace(/\D/g, '')) || 0;
    const nb = Number(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">My Meetings</h2>
          <p className="text-sm text-slate-500">Sessions assigned to you, organized day-wise</p>
        </div>
        <div className="flex gap-2">
          {['all', 'upcoming', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                load(f);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                filter === f ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : days.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No meetings assigned yet</p>
        </Card>
      ) : (
        days.map((day) => (
          <Card key={day} title={day} subtitle={`${byDay[day].length} session(s)`}>
            <div className="space-y-3">
              {byDay[day].map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{m.title}</p>
                      <Badge variant={m.status === 'completed' ? 'success' : 'info'}>{m.status}</Badge>
                      <Badge>Session {m.sessionNumber}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : ''} · {m.meetingTime}
                    </p>
                  </div>
                  {m.status !== 'cancelled' && m.status !== 'completed' && (
                    <Button
                      size="sm"
                      icon={ExternalLink}
                      disabled={joining === m.id}
                      onClick={() => joinMeeting(m.id)}
                    >
                      Join Zoom
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default MeetingsPage;
