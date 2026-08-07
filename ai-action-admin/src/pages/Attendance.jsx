import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchAttendanceThunk, updateAttendanceThunk } from '../store/slices/attendanceSlice';
import { fetchUsersThunk } from '../store/slices/usersSlice';
import { fetchMeetingsThunk } from '../store/slices/meetingsSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const AttendancePage = () => {
  const dispatch = useDispatch();
  const { records, loading } = useSelector((state) => state.attendance);
  const { list: users } = useSelector((state) => state.users);
  const { list: meetings } = useSelector((state) => state.meetings);
  const [filters, setFilters] = useState({
    meetingId: '',
    userId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  const load = () => {
    const payload = {};
    if (filters.meetingId) payload.meetingId = filters.meetingId;
    if (filters.userId) payload.userId = filters.userId;
    if (filters.status) payload.status = filters.status;
    if (filters.dateFrom) payload.dateFrom = filters.dateFrom;
    if (filters.dateTo) payload.dateTo = filters.dateTo;
    dispatch(fetchAttendanceThunk(payload));
  };

  useEffect(() => {
    dispatch(fetchUsersThunk({}));
    dispatch(fetchMeetingsThunk({}));
    load();
  }, [dispatch]);

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
        <p className="text-sm text-slate-500">Filter by date, user, or meeting · Export-ready later</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <select
            className="custom-input"
            value={filters.meetingId}
            onChange={(e) => setFilters({ ...filters, meetingId: e.target.value })}
          >
            <option value="">All Meetings</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
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
          <select
            className="custom-input"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
        <Button variant="secondary" onClick={load}>Apply Filters</Button>
      </Card>

      <Card title="Attendance Records" subtitle={`${records.length} records`}>
        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-center py-8 text-slate-400">No attendance records</p>
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
