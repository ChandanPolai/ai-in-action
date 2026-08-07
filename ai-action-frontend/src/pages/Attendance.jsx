import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RotateCcw } from 'lucide-react';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const emptyFilters = {
  dateFrom: '',
  dateTo: '',
  status: ''
};

const AttendancePage = () => {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);

  const load = async (nextFilters = filters) => {
    if (nextFilters.dateFrom && nextFilters.dateTo && nextFilters.dateFrom > nextFilters.dateTo) {
      toast.error('From Date cannot be after To Date');
      return;
    }

    setLoading(true);
    try {
      const payload = {};
      if (nextFilters.dateFrom) payload.dateFrom = nextFilters.dateFrom;
      if (nextFilters.dateTo) payload.dateTo = nextFilters.dateTo;
      if (nextFilters.status) payload.status = nextFilters.status;

      const res = await postRequest('/user/attendance/history', payload);
      setSummary(res.data.summary);
      setRecords(res.data.records || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    const next = { ...filters, dateFrom: today, dateTo: today };
    setFilters(next);
    load(next);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    load(emptyFilters);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Attendance History</h2>
        <p className="text-sm text-slate-500">Filter your sessions by date range and status</p>
      </div>

      <Card title="Filters">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Input
            label="From Date"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <Input
            label="To Date"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Status</label>
            <select
              className="custom-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => load()}>Apply Filters</Button>
          <Button variant="secondary" onClick={setToday}>Today</Button>
          <Button variant="ghost" icon={RotateCcw} onClick={clearFilters}>Clear</Button>
        </div>
      </Card>

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

      <Card title="History" subtitle={`${records.length} records`}>
        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-center py-8 text-slate-400">No attendance records for selected filters</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{r.meeting?.title || 'Meeting'}</p>
                  <p className="text-xs text-slate-500">
                    {r.meeting?.meetingDate ? new Date(r.meeting.meetingDate).toLocaleDateString() : ''}
                    {r.meeting?.meetingTime ? ` · ${r.meeting.meetingTime}` : ''}
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
