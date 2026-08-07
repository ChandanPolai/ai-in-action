import React, { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
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

  const joinMeeting = async (meeting) => {
    if (meeting.status !== 'live' && !meeting.alreadyAttended) {
      toast.info('Meeting is not live yet. Wait until admin sets it to Live.');
      return;
    }

    if (meeting.alreadyAttended) {
      toast.info('Already attended');
      if (meeting.zoomLink) {
        window.open(meeting.zoomLink, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setJoining(meeting.id);
    try {
      const res = await postRequest('/user/meetings/join', { meetingId: meeting.id });

      if (res.data?.alreadyAttended) {
        toast.info('Already attended');
      } else {
        toast.success('Attendance marked — opening Zoom...');
      }

      if (res.data?.zoomLink) {
        window.open(res.data.zoomLink, '_blank', 'noopener,noreferrer');
      }

      await load(filter);
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

  const statusBadge = (status) => {
    if (status === 'live') return <Badge variant="danger">Live</Badge>;
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'cancelled') return <Badge variant="default">Cancelled</Badge>;
    return <Badge variant="info">Upcoming</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">My Meetings</h2>
          <p className="text-sm text-slate-500">
            Attendance only on Live meetings · one time only
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'live', 'upcoming', 'completed'].map((f) => (
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
                    m.status === 'live' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{m.title}</p>
                      {statusBadge(m.status)}
                      <Badge>Session {m.sessionNumber}</Badge>
                      {m.alreadyAttended && <Badge variant="success">Already attended</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : ''} · {m.meetingTime}
                    </p>
                  </div>
                  {m.status === 'live' ? (
                    m.alreadyAttended ? (
                      <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => joinMeeting(m)}>
                        Already Attended
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        icon={ExternalLink}
                        disabled={joining === m.id}
                        onClick={() => joinMeeting(m)}
                      >
                        {joining === m.id ? 'Joining...' : 'Join Zoom'}
                      </Button>
                    )
                  ) : m.status === 'upcoming' ? (
                    <Badge variant="warning">Wait for Live</Badge>
                  ) : null}
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
