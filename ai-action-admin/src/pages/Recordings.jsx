import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchRecordingsThunk,
  createRecordingThunk,
  updateRecordingThunk,
  deleteRecordingThunk,
  setAccessThunk,
  fetchAccessMatrixThunk
} from '../store/slices/recordingsSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const emptyForm = {
  sessionTitle: '',
  description: '',
  dayNumber: 1,
  sessionNumber: 1,
  videoUrl: ''
};

const RecordingsPage = () => {
  const dispatch = useDispatch();
  const { list, loading, accessMatrix } = useSelector((state) => state.recordings);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [accessRecording, setAccessRecording] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchRecordingsThunk({}));
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      sessionTitle: r.sessionTitle,
      description: r.description || '',
      dayNumber: r.dayNumber,
      sessionNumber: r.sessionNumber,
      videoUrl: r.videoUrl || ''
    });
    setModalOpen(true);
  };

  const openAccess = async (r) => {
    setAccessRecording(r);
    setAccessOpen(true);
    const result = await dispatch(fetchAccessMatrixThunk(r.id));
    if (fetchAccessMatrixThunk.fulfilled.match(result)) {
      const allowed = (result.payload.data.matrix || [])
        .filter((u) => u.isAllowed)
        .map((u) => u.id);
      setSelectedUsers(allowed.map(String));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updateRecordingThunk({ recordingId: editing.id, ...form })).unwrap();
        toast.success('Recording updated');
      } else {
        await dispatch(createRecordingThunk(form)).unwrap();
        toast.success('Recording created');
      }
      setModalOpen(false);
      dispatch(fetchRecordingsThunk({}));
    } catch (err) {
      toast.error(err || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete "${r.sessionTitle}"?`)) return;
    try {
      await dispatch(deleteRecordingThunk(r.id)).unwrap();
      toast.success('Deleted');
      dispatch(fetchRecordingsThunk({}));
    } catch (err) {
      toast.error(err);
    }
  };

  const toggleAccessUser = (userId) => {
    setSelectedUsers((prev) => {
      const id = String(userId);
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const saveAccess = async () => {
    setSaving(true);
    try {
      await dispatch(
        setAccessThunk({
          recordingId: accessRecording.id,
          allowedUsers: selectedUsers,
          deniedUsers: [],
          mode: 'replace'
        })
      ).unwrap();
      toast.success('Video access updated');
      setAccessOpen(false);
      dispatch(fetchRecordingsThunk({}));
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Session Recordings</h2>
          <p className="text-sm text-slate-500">
            Upload recordings & control who can watch — present does not auto-grant access
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Add Recording</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <p className="col-span-full text-center py-10 text-slate-400">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center py-10 text-slate-400">No recordings yet</p>
        )}
        {list.map((r) => (
          <Card key={r.id} className="!p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{r.sessionTitle}</p>
                <p className="text-xs text-brand-600 font-semibold mt-1">
                  Day {r.dayNumber} · Session {r.sessionNumber}
                </p>
              </div>
              <Badge variant="info">{(r.allowedUsers || []).length} allowed</Badge>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2 mb-3">{r.description || 'No description'}</p>
            <p className="text-xs text-slate-400 mb-4">
              Uploaded {r.uploadDate ? new Date(r.uploadDate).toLocaleDateString() : '—'}
              {r.videoUrl ? ' · URL' : ''}
              {r.videoFile ? ' · File' : ''}
            </p>
            <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
              <button onClick={() => openAccess(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100">
                <Shield className="w-3.5 h-3.5" /> Access
              </button>
              <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(r)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Recording' : 'Add Recording'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Session Title" required value={form.sessionTitle} onChange={(e) => setForm({ ...form, sessionTitle: e.target.value })} />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Description</label>
            <textarea className="custom-input !h-auto py-3" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Day Number" type="number" min={1} value={form.dayNumber} onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })} />
            <Input label="Session Number" type="number" min={1} value={form.sessionNumber} onChange={(e) => setForm({ ...form, sessionNumber: Number(e.target.value) })} />
          </div>
          <Input label="Video URL" required={!editing} value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://..." />
          <p className="text-xs text-slate-400">Tip: After creating, use Access to choose who can watch. Presence does not auto-grant access.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={accessOpen} onClose={() => setAccessOpen(false)} title={`Video Access — ${accessRecording?.sessionTitle || ''}`} size="lg">
        <p className="text-sm text-slate-500 mb-4">
          Only checked users can watch this recording. Absent users can be allowed; present users need explicit permission.
        </p>
        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 mb-4">
          {accessMatrix.length === 0 && <p className="text-xs text-slate-400">No users available</p>}
          {accessMatrix.map((u) => (
            <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.includes(String(u.id))}
                onChange={() => toggleAccessUser(u.id)}
                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              {u.canWatch && <Badge variant="success" className="ml-auto">Can watch</Badge>}
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setAccessOpen(false)}>Cancel</Button>
          <Button fullWidth onClick={saveAccess} disabled={saving}>{saving ? 'Saving...' : 'Save Access'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default RecordingsPage;
