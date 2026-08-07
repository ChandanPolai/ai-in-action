import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Video, CalendarClock, CheckCircle2, BarChart3 } from 'lucide-react';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="card-aesthetic p-5 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{value ?? '—'}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/admin/dashboard/stats');
        setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of your AI in Action course</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.users?.total} accent="bg-brand-50 text-brand-600" />
        <StatCard icon={UserCheck} label="Active Users" value={stats?.users?.active} accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={UserX} label="Inactive Users" value={stats?.users?.inactive} accent="bg-rose-50 text-rose-600" />
        <StatCard icon={Video} label="Total Meetings" value={stats?.meetings?.total} accent="bg-sky-50 text-sky-600" />
        <StatCard icon={CalendarClock} label="Upcoming Meetings" value={stats?.meetings?.upcoming} accent="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Completed Meetings" value={stats?.meetings?.completed} accent="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Attendance Summary" subtitle="Across all sessions">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                Present: <span className="font-bold text-emerald-600">{stats?.attendance?.present || 0}</span>
              </p>
              <p className="text-sm text-slate-600">
                Absent: <span className="font-bold text-rose-600">{stats?.attendance?.absent || 0}</span>
              </p>
              <p className="text-sm text-slate-600">
                Present Rate: <span className="font-bold text-brand-600">{stats?.attendance?.presentRate || 0}%</span>
              </p>
            </div>
          </div>
        </Card>

        <Card title="Upcoming Meetings" subtitle="Next scheduled sessions">
          <div className="space-y-3">
            {(stats?.recentMeetings || []).length === 0 && (
              <p className="text-sm text-slate-400">No meetings yet</p>
            )}
            {(stats?.recentMeetings || []).map((m) => (
              <div key={m._id || m.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : ''} · {m.meetingTime}
                  </p>
                </div>
                <Badge variant={m.status === 'completed' ? 'success' : 'info'}>{m.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
