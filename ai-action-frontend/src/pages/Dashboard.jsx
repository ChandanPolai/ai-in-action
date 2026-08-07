import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Video, CalendarCheck, Clapperboard, ExternalLink, AlertCircle, Radio } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { formatDate } from '../utils/formatDate';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [meetings, setMeetings] = useState([]);
  const [liveMeetings, setLiveMeetings] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [recordingsCount, setRecordingsCount] = useState(0);
  const [joining, setJoining] = useState(null);
  const [livePopupOpen, setLivePopupOpen] = useState(false);

  const refreshMeetings = async () => {
    const [upcomingRes, liveRes] = await Promise.all([
      postRequest('/user/meetings/list', { filter: 'upcoming' }),
      postRequest('/user/meetings/list', { filter: 'live' })
    ]);
    const upcoming = upcomingRes.data.meetings || [];
    const live = liveRes.data.meetings || [];
    setMeetings(upcoming);
    setLiveMeetings(live);
    return live;
  };

  useEffect(() => {
    (async () => {
      try {
        const [live, a, r] = await Promise.all([
          refreshMeetings(),
          postRequest('/user/attendance/history'),
          postRequest('/user/recordings/list')
        ]);
        setAttendance(a.data.summary);
        setRecordingsCount((r.data.recordings || []).length);
        if ((live || []).length > 0) {
          setLivePopupOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const joinMeeting = async (meeting) => {
    if (meeting.status !== 'live' && !meeting.alreadyAttended) {
      toast.info('Meeting is not live yet. Wait until admin sets it to Live.');
      return;
    }

    if (meeting.alreadyAttended) {
      toast.info('Already attended');
      if (meeting.zoomLink) window.open(meeting.zoomLink, '_blank', 'noopener,noreferrer');
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
      await refreshMeetings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(null);
    }
  };

  const liveCount = liveMeetings.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Hi, {user?.name?.split(' ')[0] || 'there'}</h2>
        <p className="text-sm text-slate-500 mt-1">Your AI in Action learning hub</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-aesthetic p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Upcoming / Live</p>
            <p className="text-2xl font-extrabold text-slate-800">{meetings.length}</p>
          </div>
        </div>
        <div className="card-aesthetic p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Present Rate</p>
            <p className="text-2xl font-extrabold text-slate-800">{attendance?.presentRate ?? 0}%</p>
          </div>
        </div>
        <div className="card-aesthetic p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clapperboard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Videos</p>
            <p className="text-2xl font-extrabold text-slate-800">{recordingsCount}</p>
          </div>
        </div>
      </div>

      {liveCount > 0 && (
        <button
          type="button"
          onClick={() => setLivePopupOpen(true)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left hover:bg-rose-100/70 transition-colors"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-rose-800">{liveCount} Live session{liveCount > 1 ? 's' : ''} now</p>
            <p className="text-xs text-rose-600">Tap to join and mark attendance</p>
          </div>
          <Radio className="w-5 h-5 text-rose-500 shrink-0" />
        </button>
      )}

      <Card title="Upcoming Meetings" subtitle="Join Zoom only when meeting status is Live">
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No upcoming meetings assigned to you</p>
        ) : (
          <div className="space-y-3">
            {meetings.slice(0, 8).map((m) => (
              <div
                key={m.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                  m.status === 'live'
                    ? 'border-rose-200 bg-rose-50/40'
                    : 'border-slate-100 hover:border-brand-200 hover:bg-brand-50/30'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800">{m.title}</p>
                    <Badge variant="info">Day {m.dayNumber}</Badge>
                    {m.status === 'live' ? (
                      <Badge variant="danger">Live</Badge>
                    ) : (
                      <Badge variant="default">Upcoming</Badge>
                    )}
                    {m.alreadyAttended && <Badge variant="success">Already attended</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {m.meetingDate ? formatDate(m.meetingDate) : ''} · {m.meetingTime}
                  </p>
                </div>
                {m.status === 'live' ? (
                  <Button
                    size="sm"
                    icon={ExternalLink}
                    disabled={joining === m.id}
                    variant={m.alreadyAttended ? 'ghost' : 'primary'}
                    onClick={() => joinMeeting(m)}
                  >
                    {joining === m.id
                      ? 'Joining...'
                      : m.alreadyAttended
                        ? 'Already Attended'
                        : 'Join Zoom'}
                  </Button>
                ) : (
                  <Badge variant="warning">Wait for Live</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={livePopupOpen}
        onClose={() => setLivePopupOpen(false)}
        title="Live Session"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">Live meeting is running</p>
                <p>
                  Please join now to mark your attendance. If you do not attend, your attendance will remain{' '}
                  <strong className="text-rose-600">Absent</strong>.
                </p>
                <p className="text-xs text-slate-500">
                  Attendance can only be marked on Live meetings — once only.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {liveMeetings.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No live meetings right now</p>
            ) : (
              liveMeetings.map((m) => (
                <div key={m.id} className="rounded-xl border border-rose-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800">{m.title}</p>
                    <Badge variant="danger">Live</Badge>
                    <Badge variant="info">Day {m.dayNumber}</Badge>
                    <Badge>Session {m.sessionNumber}</Badge>
                    {m.alreadyAttended && <Badge variant="success">Already attended</Badge>}
                  </div>
                  {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                  <p className="text-xs text-slate-500">
                    Date: {m.meetingDate ? formatDate(m.meetingDate) : '—'} · Time:{' '}
                    {m.meetingTime}
                  </p>
                  <Button
                    size="sm"
                    icon={ExternalLink}
                    fullWidth
                    disabled={joining === m.id}
                    variant={m.alreadyAttended ? 'ghost' : 'primary'}
                    onClick={() => joinMeeting(m)}
                  >
                    {joining === m.id
                      ? 'Joining...'
                      : m.alreadyAttended
                        ? 'Already Attended'
                        : 'Join Zoom & Mark Attendance'}
                  </Button>
                </div>
              ))
            )}
          </div>

          <Button variant="outline" fullWidth onClick={() => setLivePopupOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
