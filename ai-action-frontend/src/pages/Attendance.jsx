import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const AttendancePage = () => {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/user/attendance/history');
        setSummary(res.data.summary);
        setRecords(res.data.records || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Attendance History</h2>
        <p className="text-sm text-slate-500">Your session attendance record</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Present', value: summary?.present, color: 'text-emerald-600' },
          { label: 'Absent', value: summary?.absent, color: 'text-rose-600' },
          { label: 'Total', value: summary?.total, color: 'text-slate-800' },
          { label: 'Rate', value: `${summary?.presentRate ?? 0}%`, color: 'text-brand-600' }
        ].map((s) => (
          <div key={s.label} className="card-aesthetic p-4 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{loading ? '—' : s.value ?? 0}</p>
          </div>
        ))}
      </div>

      <Card title="History">
        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-center py-8 text-slate-400">No attendance records yet</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{r.meeting?.title || 'Meeting'}</p>
                  <p className="text-xs text-slate-500">
                    {r.meeting?.meetingDate ? new Date(r.meeting.meetingDate).toLocaleDateString() : ''}
                    {r.meeting?.dayNumber ? ` · Day ${r.meeting.dayNumber}` : ''}
                  </p>
                </div>
                <Badge variant={r.status === 'present' ? 'success' : 'danger'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AttendancePage;
