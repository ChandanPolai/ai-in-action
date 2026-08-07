import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { RotateCcw } from 'lucide-react';
import { fetchAttendanceThunk, updateAttendanceThunk } from '../store/slices/attendanceSlice';
import { fetchUsersThunk } from '../store/slices/usersSlice';
import { fetchMeetingsThunk } from '../store/slices/meetingsSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const emptyFilters = {
  meetingId: '',
  userId: '',
  status: '',
  dateFrom: '',
  dateTo: ''
};

const AttendancePage = () => {
  const dispatch = useDispatch();
  const { records, loading } = useSelector((state) => state.attendance);
  const { list: users } = useSelector((state) => state.users);
  const { list: meetings } = useSelector((state) => state.meetings);
  const [filters, setFilters] = useState(emptyFilters);
  const [summary, setSummary] = useState(null);

  const load = async (nextFilters = filters) => {
    if (nextFilters.dateFrom && nextFilters.dateTo && nextFilters.dateFrom > nextFilters.dateTo) {
      toast.error('From Date cannot be after To Date');
      return;
    }

    const payload = {};
    if (nextFilters.meetingId) payload.meetingId = nextFilters.meetingId;
    if (nextFilters.userId) payload.userId = nextFilters.userId;
    if (nextFilters.status) payload.status = nextFilters.status;
    if (nextFilters.dateFrom) payload.dateFrom = nextFilters.dateFrom;
    if (nextFilters.dateTo) payload.dateTo = nextFilters.dateTo;

    const result = await dispatch(fetchAttendanceThunk(payload));
    if (fetchAttendanceThunk.fulfilled.match(result)) {
      setSummary(result.payload.data.summary || null);
    }
  };

  useEffect(() => {
    dispatch(fetchUsersThunk({ status: 'all', limit: 500 }));
    dispatch(fetchMeetingsThunk({}));
    load();
  }, [dispatch]);

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

  const toggleStatus = async (record) => {
    const next = record.status === 'present' ? 'absent' : 'present';
    try {
      await dispatch(updateAttendanceThunk({ attendanceId: record.id, status: next })).unwrap();
      toast.success(`Marked ${next}`);
      load();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Attendance</h2>
        <p className="text-sm text-slate-500">Filter by From Date, To Date, user, meeting and status</p>
      </div>

      <Card title="Filters">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">User</label>
            <select
              className="custom-input"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Meeting</label>
            <select
              className="custom-input"
              value={filters.meetingId}
              onChange={(e) => setFilters({ ...filters, meetingId: e.target.value })}
            >
              <option value="">All Meetings</option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.meetingDate ? ` · ${new Date(m.meetingDate).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => load()}>Apply Filters</Button>
          <Button variant="secondary" onClick={setToday}>Today</Button>
          <Button variant="ghost" icon={RotateCcw} onClick={clearFilters}>Clear</Button>
        </div>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-aesthetic p-4 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">Present</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.present}</p>
          </div>
          <div className="card-aesthetic p-4 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">Absent</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{summary.absent}</p>
          </div>
          <div className="card-aesthetic p-4 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{summary.total}</p>
          </div>
          <div className="card-aesthetic p-4 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">Rate</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1">{summary.presentRate}%</p>
          </div>
        </div>
      )}

      <Card title="Attendance Records" subtitle={`${records.length} records`}>
        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-center py-8 text-slate-400">No attendance records for selected filters</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-2">User</th>
                  <th className="py-3 px-2">Meeting</th>
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-800 text-sm">{r.userId?.name || '—'}</p>
                      <p className="text-xs text-slate-500">{r.userId?.email}</p>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-700">{r.meetingId?.title || '—'}</td>
                    <td className="py-3 px-2 text-sm text-slate-600 whitespace-nowrap">
                      {r.meetingId?.meetingDate ? new Date(r.meetingId.meetingDate).toLocaleDateString() : '—'}
                      {r.meetingId?.meetingTime ? ` · ${r.meetingId.meetingTime}` : ''}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={r.status === 'present' ? 'success' : 'danger'}>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(r)}>
                        Mark {r.status === 'present' ? 'Absent' : 'Present'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AttendancePage;
