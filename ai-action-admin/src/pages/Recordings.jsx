import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, Shield, Upload, BarChart3 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchRecordingsThunk,
  createRecordingThunk,
  updateRecordingThunk,
  deleteRecordingThunk,
  setAccessThunk,
  fetchAccessMatrixThunk
} from '../store/slices/recordingsSlice';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';

const emptyForm = {
  sessionTitle: '',
  description: '',
  dayNumber: 1,
  sessionNumber: 1,
  videoUrl: '',
  videoFile: null,
  maxPlayCount: 1
};

const RecordingsPage = () => {
  const dispatch = useDispatch();
  const { list, loading, accessMatrix } = useSelector((state) => state.recordings);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [accessRecording, setAccessRecording] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [defaultLimit, setDefaultLimit] = useState(1);

  useEffect(() => {
    dispatch(fetchRecordingsThunk({}));
    (async () => {
      try {
        const res = await postRequest('/admin/recordings/settings/get');
        setDefaultLimit(res.data.defaultMaxPlayCount || 1);
        setForm((f) => ({ ...f, maxPlayCount: res.data.defaultMaxPlayCount || 1 }));
      } catch {
        /* ignore */
      }
    })();
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, maxPlayCount: defaultLimit });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      sessionTitle: r.sessionTitle,
      description: r.description || '',
      dayNumber: r.dayNumber,
      sessionNumber: r.sessionNumber,
      videoUrl: r.videoUrl || '',
      videoFile: null,
      maxPlayCount: r.maxPlayCount || 1
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

  const openAnalytics = async (r) => {
    setAnalyticsOpen(true);
    setAnalytics(null);
    try {
      const res = await postRequest('/admin/recordings/analytics', { recordingId: r.id });
      setAnalytics(res.data);
    } catch (err) {
      toast.error(err.message);
      setAnalyticsOpen(false);
    }
  };

  const buildPayload = () => {
    if (form.videoFile) {
      const fd = new FormData();
      fd.append('sessionTitle', form.sessionTitle);
      fd.append('description', form.description || '');
      fd.append('dayNumber', String(form.dayNumber));
      fd.append('sessionNumber', String(form.sessionNumber));
      fd.append('maxPlayCount', String(form.maxPlayCount || 1));
      if (form.videoUrl) fd.append('videoUrl', form.videoUrl);
      fd.append('videoFile', form.videoFile);
      if (editing) fd.append('recordingId', editing.id);
      return fd;
    }

    const payload = {
      sessionTitle: form.sessionTitle,
      description: form.description,
      dayNumber: form.dayNumber,
      sessionNumber: form.sessionNumber,
      videoUrl: form.videoUrl,
      maxPlayCount: form.maxPlayCount || 1
    };
    if (editing) payload.recordingId = editing.id;
    return payload;
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!editing && !form.videoUrl && !form.videoFile) {
      toast.error('Please upload a video file or provide a video URL');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await dispatch(updateRecordingThunk(payload)).unwrap();
        toast.success('Recording updated');
      } else {
        await dispatch(createRecordingThunk(payload)).unwrap();
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
            Upload, set play limit per user, control access, and view watch analytics
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
            <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
              <span className="px-2 py-1 rounded-lg bg-slate-50">Max plays / user: {r.maxPlayCount || 1}</span>
              <span className="px-2 py-1 rounded-lg bg-slate-50">Total plays: {r.totalPlays || 0}</span>
              <span className="px-2 py-1 rounded-lg bg-slate-50">Viewers: {r.uniqueViewers || 0}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Uploaded {r.uploadDate ? new Date(r.uploadDate).toLocaleDateString() : '—'}
              {r.videoFile ? ' · Uploaded file' : ''}
              {r.videoUrl ? ' · URL' : ''}
            </p>
            <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
              <button onClick={() => openAccess(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100">
                <Shield className="w-3.5 h-3.5" /> Access
              </button>
              <button onClick={() => openAnalytics(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100">
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
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

      <Drawer isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Recording' : 'Add Recording'} size="md">
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

          <Input
            label="Max plays per user"
            type="number"
            min={1}
            required
            value={form.maxPlayCount}
            onChange={(e) => setForm({ ...form, maxPlayCount: Math.max(1, Number(e.target.value) || 1) })}
          />
          <p className="text-xs text-slate-500 -mt-2">
            Each allowed user can play this video this many times (default from Settings)
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Upload Video File
            </label>
            <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40 cursor-pointer transition-colors px-4 py-6">
              <Upload className="w-6 h-6 text-brand-500" />
              <span className="text-sm font-semibold text-slate-700 text-center">
                {form.videoFile ? form.videoFile.name : 'Click to upload MP4 / WebM / MOV'}
              </span>
              <span className="text-xs text-slate-400">Max 500MB · Users cannot download</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, videoFile: e.target.files?.[0] || null })}
              />
            </label>
            {editing?.videoFile && !form.videoFile && (
              <p className="text-xs text-slate-500 mt-2">Current file is already uploaded. Choose a new file to replace it.</p>
            )}
          </div>

          <Input
            label="Or Video URL (optional)"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://..."
          />

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Drawer>

      <Drawer isOpen={accessOpen} onClose={() => setAccessOpen(false)} title={`Video Access — ${accessRecording?.sessionTitle || ''}`} size="lg">
        <p className="text-sm text-slate-500 mb-4">
          Shows username and Present/Absent status. Absent users get video access automatically when the meeting is completed or when attendance is marked Absent.
        </p>
        <div className="max-h-[55vh] overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 mb-4">
          {accessMatrix.length === 0 && <p className="text-xs text-slate-400">No users available</p>}
          {accessMatrix.map((u) => (
            <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.includes(String(u.id))}
                onChange={() => toggleAccessUser(u.id)}
                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{u.username || u.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {u.email}
                  {u.mobileNumber ? ` · ${u.mobileNumber}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {u.isPresent && <Badge variant="success">Present</Badge>}
                {u.isAbsent && <Badge variant="warning">Absent</Badge>}
                {!u.attendanceStatus && <Badge variant="default">No attendance</Badge>}
                {u.canWatch && <Badge variant="info">Can watch</Badge>}
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setAccessOpen(false)}>Cancel</Button>
          <Button fullWidth onClick={saveAccess} disabled={saving}>{saving ? 'Saving...' : 'Save Access'}</Button>
        </div>
      </Drawer>

      <Drawer
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        title={`Analytics — ${analytics?.recording?.sessionTitle || ''}`}
        size="lg"
      >
        {!analytics ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-brand-50">
                <p className="text-xs text-brand-700 font-semibold">Total plays</p>
                <p className="text-2xl font-extrabold text-brand-800">{analytics.recording.totalPlays || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-600 font-semibold">Unique viewers</p>
                <p className="text-2xl font-extrabold text-slate-800">{analytics.recording.uniqueViewers || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-600 font-semibold">Max / user</p>
                <p className="text-2xl font-extrabold text-slate-800">{analytics.recording.maxPlayCount || 1}</p>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Plays</th>
                    <th className="px-3 py-2">Extra</th>
                    <th className="px-3 py-2">Last watched</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.viewers || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400">No watches yet</td>
                    </tr>
                  )}
                  {(analytics.viewers || []).map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{v.user?.name || '—'}</p>
                        <p className="text-xs text-slate-500">{v.user?.email}</p>
                      </td>
                      <td className="px-3 py-2">{v.playCount} / {v.maxAllowed}</td>
                      <td className="px-3 py-2">{v.extraPlaysAllowed || 0}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {v.lastWatchedAt ? new Date(v.lastWatchedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default RecordingsPage;
