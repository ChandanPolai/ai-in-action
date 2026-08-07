import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Video, CalendarCheck, Clapperboard, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isSameDay = (dateValue) => {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [meetings, setMeetings] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [recordingsCount, setRecordingsCount] = useState(0);
  const [joining, setJoining] = useState(null);
  const [todayPopupOpen, setTodayPopupOpen] = useState(false);

  const todaySessions = useMemo(
    () =>
      meetings.filter(
        (m) =>
          isSameDay(m.meetingDate) &&
          m.status !== 'cancelled' &&
          m.status !== 'completed'
      ),
    [meetings]
  );

  useEffect(() => {
    (async () => {
      try {
        const [m, a, r] = await Promise.all([
          postRequest('/user/meetings/list', { filter: 'upcoming' }),
          postRequest('/user/attendance/history'),
          postRequest('/user/recordings/list')
        ]);
        const list = m.data.meetings || [];
        setMeetings(list);
        setAttendance(a.data.summary);
        setRecordingsCount((r.data.recordings || []).length);

        const todays = list.filter(
          (item) =>
            isSameDay(item.meetingDate) &&
            item.status !== 'cancelled' &&
            item.status !== 'completed'
        );
        const storageKey = `todaySessionPopup:${todayKey()}`;
        if (todays.length > 0 && !sessionStorage.getItem(storageKey)) {
          setTodayPopupOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const closeTodayPopup = () => {
    sessionStorage.setItem(`todaySessionPopup:${todayKey()}`, '1');
    setTodayPopupOpen(false);
  };

  const joinMeeting = async (meetingId) => {
    setJoining(meetingId);
    try {
      const res = await postRequest('/user/meetings/join', { meetingId });
      toast.success('Attendance marked — opening Zoom...');
      window.open(res.data.zoomLink, '_blank', 'noopener,noreferrer');
      closeTodayPopup();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(null);
    }
  };

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
            <p className="text-xs font-semibold uppercase text-slate-500">Upcoming</p>
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

      <Card title="Upcoming Meetings" subtitle="Join with one click — attendance is recorded automatically">
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No upcoming meetings assigned to you</p>
        ) : (
          <div className="space-y-3">
            {meetings.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800">{m.title}</p>
                    <Badge variant="info">Day {m.dayNumber}</Badge>
                    {isSameDay(m.meetingDate) && <Badge variant="warning">Today</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : ''} · {m.meetingTime}
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={ExternalLink}
                  disabled={joining === m.id}
                  onClick={() => joinMeeting(m.id)}
                >
                  {joining === m.id ? 'Joining...' : 'Join Zoom'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={todayPopupOpen}
        onClose={closeTodayPopup}
        title="Today's Session"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">Please read carefully</p>
                <p>
                  Aaj aapka live session scheduled hai. Agar aap attend nahi karenge to aapki attendance{' '}
                  <strong className="text-rose-600">Absent</strong> mark hogi.
                </p>
                <p>
                  Recorded videos absentees ko bhi mil sakti hain — jab admin aapko access dega. Present hone se
                  video access automatic nahi milta.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {todaySessions.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800">{m.title}</p>
                  <Badge variant="info">Day {m.dayNumber}</Badge>
                  <Badge>Session {m.sessionNumber}</Badge>
                </div>
                {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                <p className="text-xs text-slate-500">
                  Date: {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : '—'} · Time: {m.meetingTime}
                </p>
                <Button
                  size="sm"
                  icon={ExternalLink}
                  fullWidth
                  disabled={joining === m.id}
                  onClick={() => joinMeeting(m.id)}
                >
                  {joining === m.id ? 'Joining...' : 'Join Zoom Now'}
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" fullWidth onClick={closeTodayPopup}>
            OK, Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
