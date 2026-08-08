import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../../services/apiClient';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import { formatDate } from '../../utils/formatDate';

const emptyForm = {
  title: '',
  description: '',
  dayNumber: 1,
  sessionNumber: 1,
  sessionDate: '',
  startTime: '',
  endTime: '',
  sortOrder: 0,
  imageFile: null,
  isActive: true
};

const WebsiteSessionsPage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/website/sessions/list', {});
      setList(res.data.sessions || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      title: s.title || '',
      description: s.description || '',
      dayNumber: s.dayNumber || 1,
      sessionNumber: s.sessionNumber || 1,
      sessionDate: s.sessionDate ? new Date(s.sessionDate).toISOString().slice(0, 10) : '',
      startTime: s.startTime || '',
      endTime: s.endTime || '',
      sortOrder: s.sortOrder || 0,
      imageFile: null,
      isActive: s.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.sessionDate || !form.startTime || !form.endTime) {
      toast.error('Title, date, start & end time required');
      return;
    }
    if (form.endTime <= form.startTime) {
      toast.error('End time must be after start time');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries({
        title: form.title,
        description: form.description,
        dayNumber: form.dayNumber,
        sessionNumber: form.sessionNumber,
        sessionDate: form.sessionDate,
        startTime: form.startTime,
        endTime: form.endTime,
        sortOrder: form.sortOrder,
        isActive: form.isActive
      }).forEach(([k, v]) => fd.append(k, String(v)));
      if (form.imageFile) fd.append('image', form.imageFile);
      if (editing) {
        fd.append('sessionId', editing.id);
        await postRequest('/admin/website/sessions/update', fd);
        toast.success('Session updated');
      } else {
        await postRequest('/admin/website/sessions/create', fd);
        toast.success('Session created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.title}"?`)) return;
    try {
      await postRequest('/admin/website/sessions/delete', { sessionId: s.id });
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Website Sessions</h2>
          <p className="text-sm text-slate-500">Upcoming sessions — day, date, start &amp; end time</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Session
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="col-span-full text-center text-slate-400 py-10">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-10">No sessions yet</p>
        )}
        {list.map((s) => (
          <Card key={s.id} className="!p-5">
            {s.image && (
              <img src={imageUrl(s.image)} alt="" className="w-full h-32 object-cover rounded-xl mb-3" />
            )}
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-bold text-slate-800">{s.title}</p>
              <Badge variant={s.isActive ? 'success' : 'default'}>{s.isActive ? 'Active' : 'Off'}</Badge>
            </div>
            <p className="text-xs text-brand-600 font-semibold">
              Day {s.dayNumber} · Session {s.sessionNumber}
            </p>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.description}</p>
            <p className="text-xs text-slate-400 mt-2">
              {formatDate(s.sessionDate)} · {s.startTime} – {s.endTime}
            </p>
            <div className="flex gap-1 mt-3 border-t border-slate-100 pt-3">
              <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-brand-50 text-slate-500">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(s)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Session' : 'Add Session'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Session Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Day #"
              type="number"
              min={1}
              value={form.dayNumber}
              onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
            />
            <Input
              label="Session #"
              type="number"
              min={1}
              value={form.sessionNumber}
              onChange={(e) => setForm({ ...form, sessionNumber: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Date"
              type="date"
              required
              value={form.sessionDate}
              onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
            />
            <Input
              label="Start Time"
              type="time"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-600">
            <Upload className="w-4 h-4" />
            {form.imageFile ? form.imageFile.name : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default WebsiteSessionsPage;
