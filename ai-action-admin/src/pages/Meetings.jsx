import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, CheckCircle, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchMeetingsThunk,
  createMeetingThunk,
  updateMeetingThunk,
  deleteMeetingThunk
} from '../store/slices/meetingsSlice';
import { fetchUsersThunk } from '../store/slices/usersSlice';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';

const emptyForm = {
  title: '',
  description: '',
  meetingDate: '',
  meetingTime: '',
  zoomLink: '',
  dayNumber: 1,
  sessionNumber: 1,
  organizationType: 'day-wise',
  assignedUsers: [],
  status: 'upcoming'
};

const MeetingsPage = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.meetings);
  const { list: users } = useSelector((state) => state.users);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    dispatch(fetchMeetingsThunk({}));
    dispatch(fetchUsersThunk({ status: 'active', limit: 500 }));
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.mobileNumber?.includes(q)
    );
  }, [users, userSearch]);

  const assignedSet = useMemo(
    () => new Set((form.assignedUsers || []).map(String)),
    [form.assignedUsers]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setUserSearch('');
    setModalOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setUserSearch('');
    setForm({
      title: m.title,
      description: m.description || '',
      meetingDate: m.meetingDate ? new Date(m.meetingDate).toISOString().slice(0, 10) : '',
      meetingTime: m.meetingTime || '',
      zoomLink: m.zoomLink || '',
      dayNumber: m.dayNumber || 1,
      sessionNumber: m.sessionNumber || 1,
      organizationType: m.organizationType || 'day-wise',
      assignedUsers: (m.assignedUsers || []).map((u) => (typeof u === 'object' ? u._id || u.id : u)),
      status: m.status || 'upcoming'
    });
    setModalOpen(true);
  };

  const toggleUser = (userId) => {
    setForm((prev) => {
      const set = new Set(prev.assignedUsers.map(String));
      const id = String(userId);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, assignedUsers: [...set] };
    });
  };

  const selectAllFiltered = () => {
    setForm((prev) => {
      const set = new Set(prev.assignedUsers.map(String));
      filteredUsers.forEach((u) => set.add(String(u.id)));
      return { ...prev, assignedUsers: [...set] };
    });
  };

  const clearAllFiltered = () => {
    setForm((prev) => {
      const remove = new Set(filteredUsers.map((u) => String(u.id)));
      return {
        ...prev,
        assignedUsers: prev.assignedUsers.filter((id) => !remove.has(String(id)))
      };
    });
  };

  const selectAllUsers = () => {
    setForm((prev) => ({ ...prev, assignedUsers: users.map((u) => u.id) }));
  };

  const clearAllUsers = () => {
    setForm((prev) => ({ ...prev, assignedUsers: [] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updateMeetingThunk({ meetingId: editing.id, ...form })).unwrap();
        toast.success('Meeting updated');
      } else {
        await dispatch(createMeetingThunk(form)).unwrap();
        toast.success('Meeting created');
      }
      setModalOpen(false);
      dispatch(fetchMeetingsThunk({}));
    } catch (err) {
      toast.error(err || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete meeting "${m.title}"?`)) return;
    try {
      await dispatch(deleteMeetingThunk(m.id)).unwrap();
      toast.success('Deleted');
      dispatch(fetchMeetingsThunk({}));
    } catch (err) {
      toast.error(err);
    }
  };

  const markCompleted = async (m) => {
    try {
      await postRequest('/admin/meetings/mark-completed', { meetingId: m.id });
      toast.success('Marked completed');
      dispatch(fetchMeetingsThunk({}));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Meetings</h2>
          <p className="text-sm text-slate-500">Schedule Zoom sessions day-wise / session-wise</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Create Meeting</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="text-slate-400 col-span-full text-center py-10">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="text-slate-400 col-span-full text-center py-10">No meetings yet</p>
        )}
        {list.map((m) => (
          <Card key={m.id} className="!p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{m.title}</p>
                <p className="text-xs text-brand-600 font-semibold mt-1">
                  Day {m.dayNumber} · Session {m.sessionNumber}
                </p>
              </div>
              <Badge variant={m.status === 'completed' ? 'success' : m.status === 'cancelled' ? 'danger' : 'info'}>
                {m.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2 mb-3">{m.description || 'No description'}</p>
            <div className="text-xs text-slate-600 space-y-1 mb-4">
              <p>📅 {m.meetingDate ? new Date(m.meetingDate).toLocaleDateString() : '—'} · ⏰ {m.meetingTime}</p>
              <p>👥 {(m.assignedUsers || []).length} assigned</p>
            </div>
            <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
              <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600">
                <Pencil className="w-4 h-4" />
              </button>
              {m.status !== 'completed' && (
                <button onClick={() => markCompleted(m)} className="p-2 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600" title="Mark completed">
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => handleDelete(m)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Drawer isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Meeting' : 'Create Meeting'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Description</label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" required value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} />
            <Input label="Time" type="time" required value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
          </div>
          <Input label="Zoom Link" required value={form.zoomLink} onChange={(e) => setForm({ ...form, zoomLink: e.target.value })} placeholder="https://zoom.us/j/..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Day #" type="number" min={1} value={form.dayNumber} onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })} />
            <Input label="Session #" type="number" min={1} value={form.sessionNumber} onChange={(e) => setForm({ ...form, sessionNumber: Number(e.target.value) })} />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Organize</label>
              <select className="custom-input" value={form.organizationType} onChange={(e) => setForm({ ...form, organizationType: e.target.value })}>
                <option value="day-wise">Day-wise</option>
                <option value="session-wise">Session-wise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Status</label>
              <select className="custom-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Assign Users <span className="normal-case text-brand-600">({assignedSet.size} selected)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectAllUsers} className="text-xs font-semibold text-brand-600 hover:underline">
                  Select all ({users.length})
                </button>
                <button type="button" onClick={clearAllUsers} className="text-xs font-semibold text-slate-500 hover:underline">
                  Clear all
                </button>
              </div>
            </div>

            <Input
              icon={Search}
              placeholder="Search users by name, email, mobile..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />

            {userSearch.trim() && (
              <div className="flex gap-3 mt-2 mb-1">
                <button type="button" onClick={selectAllFiltered} className="text-xs font-semibold text-brand-600 hover:underline">
                  Select filtered ({filteredUsers.length})
                </button>
                <button type="button" onClick={clearAllFiltered} className="text-xs font-semibold text-slate-500 hover:underline">
                  Clear filtered
                </button>
              </div>
            )}

            <div className="mt-3 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-1">
              {filteredUsers.length === 0 && <p className="text-xs text-slate-400">No users found</p>}
              {filteredUsers.map((u) => {
                const checked = assignedSet.has(String(u.id));
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 ${
                      checked ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(u.id)}
                      className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="font-medium truncate">{u.name}</span>
                    <span className="text-slate-400 text-xs truncate">({u.email})</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Meeting'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default MeetingsPage;
