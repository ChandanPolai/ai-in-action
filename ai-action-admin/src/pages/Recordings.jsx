import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, Upload, BarChart3, Play } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchRecordingsThunk,
  createRecordingThunk,
  updateRecordingThunk,
  deleteRecordingThunk
} from '../store/slices/recordingsSlice';
import { fetchWorkshopsThunk } from '../store/slices/workshopsSlice';
import { postRequest } from '../services/apiClient';
import { getAdminToken } from '../utils/storage';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import Modal from '../components/ui/Modal';
import { formatDate, formatDateTime } from '../utils/formatDate';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const isEmbedUrl = (url = '') =>
  /youtube\.com|youtu\.be|vimeo\.com/i.test(url);

const toEmbedSrc = (url = '') => {
  let src = url.replace('watch?v=', 'embed/');
  if (src.includes('youtu.be/')) {
    const id = src.split('youtu.be/')[1]?.split(/[?&]/)[0];
    if (id) src = `https://www.youtube.com/embed/${id}`;
  }
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}modestbranding=1&rel=0&controls=1`;
};

const isValidVideoUrl = (value) => {
  if (!value || !String(value).trim()) return true;
  try {
    const u = new URL(String(value).trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && Boolean(u.hostname);
  } catch {
    return false;
  }
};

const emptyForm = {
  workshopId: '',
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
  const { list, loading } = useSelector((state) => state.recordings);
  const { list: workshops } = useSelector((state) => state.workshops);
  const [modalOpen, setModalOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [defaultLimit, setDefaultLimit] = useState(1);

  useEffect(() => {
    dispatch(fetchRecordingsThunk({}));
    dispatch(fetchWorkshopsThunk({}));
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
    setForm({
      ...emptyForm,
      maxPlayCount: defaultLimit,
      workshopId: ''
    });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      workshopId: r.workshopId || r.workshop?.id || '',
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

  const openPreview = (r) => {
    if (!r.videoFile && !r.videoUrl) {
      toast.error('No video uploaded for this recording');
      return;
    }

    if (r.videoFile) {
      const token = getAdminToken();
      const streamUrl = `${API_BASE}/admin/recordings/stream/${r.id}?admintoken=${encodeURIComponent(token || '')}`;
      setPreview({
        title: r.sessionTitle,
        description: r.description,
        type: 'stream',
        url: streamUrl
      });
    } else if (isEmbedUrl(r.videoUrl)) {
      setPreview({
        title: r.sessionTitle,
        description: r.description,
        type: 'embed',
        url: toEmbedSrc(r.videoUrl)
      });
    } else {
      setPreview({
        title: r.sessionTitle,
        description: r.description,
        type: 'url',
        url: r.videoUrl
      });
    }
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreview(null);
  };

  const buildPayload = () => {
    if (form.videoFile) {
      const fd = new FormData();
      fd.append('workshopId', form.workshopId);
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
      workshopId: form.workshopId,
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

    if (form.videoUrl.trim() && !isValidVideoUrl(form.videoUrl)) {
      toast.error('Invalid video URL. Enter a full http:// or https:// link');
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

  const handleToggleActive = async (r, makeActive) => {
    if ((r.isActive !== false) === makeActive) return;
    try {
      await postRequest('/admin/recordings/toggle-status', {
        recordingId: r.id,
        isActive: makeActive
      });
      toast.success(
        makeActive
          ? 'Recording activated — users can see it'
          : 'Recording deactivated — hidden from users'
      );
      dispatch(fetchRecordingsThunk({}));
    } catch (err) {
      toast.error(err.message || err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Session Recordings</h2>
          <p className="text-sm text-slate-500">
            Upload videos anytime (workshop optional). Assign to a workshop later so users can watch.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Recording
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <p className="col-span-full text-center py-10 text-slate-400">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center py-10 text-slate-400">No recordings yet</p>
        )}
        {list.map((r) => (
          <Card key={r.id} className={`!p-5 ${r.isActive === false ? 'opacity-75' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{r.sessionTitle}</p>
                <p className="text-xs text-brand-600 font-semibold mt-1">
                  Day {r.dayNumber} · Session {r.sessionNumber}
                  {r.workshop?.title ? ` · ${r.workshop.title}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {r.workshop?.title ? (
                  <Badge variant="info">{r.workshop.title}</Badge>
                ) : (
                  <Badge variant="default">Unassigned</Badge>
                )}
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(r, true)}
                    className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      r.isActive !== false
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(r, false)}
                    className={`px-2.5 py-1 text-[11px] font-semibold transition-colors border-l border-slate-200 ${
                      r.isActive === false
                        ? 'bg-rose-500 text-white'
                        : 'bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2 mb-3">{r.description || 'No description'}</p>
            <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
              <span className="px-2 py-1 rounded-lg bg-slate-50">Max plays / user: {r.maxPlayCount || 1}</span>
              <span className="px-2 py-1 rounded-lg bg-slate-50">Total plays: {r.totalPlays || 0}</span>
              <span className="px-2 py-1 rounded-lg bg-slate-50">Viewers: {r.uniqueViewers || 0}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Uploaded {r.uploadDate ? formatDate(r.uploadDate) : '—'}
              {r.videoFile ? ' · Uploaded file' : ''}
              {r.videoUrl ? ' · URL' : ''}
            </p>
            <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => openPreview(r)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100"
              >
                <Play className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                type="button"
                onClick={() => openAnalytics(r)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100"
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </button>
              <button
                type="button"
                onClick={() => openEdit(r)}
                className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(r)}
                className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 ml-auto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Recording' : 'Add Recording'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Workshop (optional)
            </label>
            <select
              className="custom-input"
              value={form.workshopId}
              onChange={(e) => setForm({ ...form, workshopId: e.target.value })}
            >
              <option value="">No workshop — assign later</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Users only see videos after you assign them to a workshop and give workshop access.
            </p>
          </div>

          <Input
            label="Session Title"
            required
            value={form.sessionTitle}
            onChange={(e) => setForm({ ...form, sessionTitle: e.target.value })}
          />
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
              label="Day Number"
              type="number"
              min={1}
              value={form.dayNumber}
              onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
            />
            <Input
              label="Session Number"
              type="number"
              min={1}
              value={form.sessionNumber}
              onChange={(e) => setForm({ ...form, sessionNumber: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Max plays per user"
            type="number"
            min={1}
            required
            value={form.maxPlayCount}
            onChange={(e) =>
              setForm({ ...form, maxPlayCount: Math.max(1, Number(e.target.value) || 1) })
            }
          />
          <p className="text-xs text-slate-500 -mt-2">
            Each workshop user can play this video this many times (default from Settings)
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
              <p className="text-xs text-slate-500 mt-2">
                Current file is already uploaded. Choose a new file to replace it.
              </p>
            )}
          </div>

          <Input
            label="Or Video URL (optional)"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://..."
            error={
              form.videoUrl.trim() && !isValidVideoUrl(form.videoUrl)
                ? 'Enter a valid http:// or https:// URL'
                : ''
            }
          />
          <p className="text-xs text-slate-500 -mt-2">
            Example: https://youtube.com/... or https://example.com/video.mp4
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
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
                <p className="text-2xl font-extrabold text-brand-800">
                  {analytics.recording.totalPlays || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-600 font-semibold">Unique viewers</p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {analytics.recording.uniqueViewers || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-600 font-semibold">Max / user</p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {analytics.recording.maxPlayCount || 1}
                </p>
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
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                        No watches yet
                      </td>
                    </tr>
                  )}
                  {(analytics.viewers || []).map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{v.user?.name || '—'}</p>
                        <p className="text-xs text-slate-500">{v.user?.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        {v.playCount} / {v.maxAllowed}
                      </td>
                      <td className="px-3 py-2">{v.extraPlaysAllowed || 0}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {v.lastWatchedAt ? formatDateTime(v.lastWatchedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>

      <Modal isOpen={previewOpen} onClose={closePreview} title={preview?.title || 'Preview'} size="xl">
        {preview && (
          <div className="space-y-3">
            {preview.description ? (
              <p className="text-sm text-slate-500">{preview.description}</p>
            ) : null}
            {preview.type === 'embed' ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900">
                <iframe
                  src={preview.url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={preview.title}
                />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-slate-900">
                <video
                  key={preview.url}
                  src={preview.url}
                  controls
                  playsInline
                  className="w-full max-h-[70vh] bg-black"
                >
                  Your browser does not support video playback.
                </video>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecordingsPage;
