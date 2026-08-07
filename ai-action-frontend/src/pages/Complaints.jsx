import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Upload, MessageSquareWarning } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';

const statusVariant = (status) => {
  if (status === 'resolved') return 'success';
  if (status === 'in-progress') return 'info';
  if (status === 'closed') return 'default';
  return 'warning';
};

const ComplaintsPage = () => {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'complaint',
    subject: '',
    message: '',
    imageFile: null
  });

  const load = useCallback(async (type = filter) => {
    setLoading(true);
    try {
      const res = await postRequest('/user/complaints/list', { type });
      setList(res.data.complaints || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ type: 'complaint', subject: '', message: '', imageFile: null });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('subject', form.subject.trim());
      fd.append('message', form.message.trim());
      if (form.imageFile) fd.append('image', form.imageFile);

      await postRequest('/user/complaints/create', fd);
      toast.success('Submitted successfully');
      setDrawerOpen(false);
      load(filter);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Feedback</h2>
          <p className="text-sm text-slate-500">
            Submit a complaint, suggestion, or feedback. Admin can reply and update status.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          New Submission
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'complaint', 'suggestion', 'feedback'].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              load(f);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
              filter === f ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : list.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No submissions yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <Card key={item.id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge
                      variant={
                        item.type === 'complaint' ? 'danger' : item.type === 'suggestion' ? 'info' : 'success'
                      }
                    >
                      {item.type}
                    </Badge>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="font-bold text-slate-800">{item.subject}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                </p>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.message}</p>
              {item.image && (
                <a href={imageUrl(item.image)} target="_blank" rel="noreferrer" className="inline-block mt-3">
                  <img
                    src={imageUrl(item.image)}
                    alt="Attachment"
                    className="h-28 rounded-xl object-cover border border-slate-200"
                  />
                </a>
              )}
              {item.adminReply && (
                <div className="mt-3 rounded-xl bg-brand-50 border border-brand-100 p-3">
                  <p className="text-xs font-semibold uppercase text-brand-700 mb-1">Admin reply</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.adminReply}</p>
                  {item.repliedAt && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(item.repliedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Submission" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Type
            </label>
            <select
              className="custom-input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="complaint">Complaint</option>
              <option value="suggestion">Suggestion</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          <Input
            label="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Short title"
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={5}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your complaint, suggestion, or feedback..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Image (optional)
            </label>
            <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[110px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-brand-300 cursor-pointer px-4 py-5">
              <Upload className="w-5 h-5 text-brand-500" />
              <span className="text-sm font-semibold text-slate-700 text-center">
                {form.imageFile ? form.imageFile.name : 'Upload screenshot / image'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth type="button" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth type="submit" disabled={saving} icon={MessageSquareWarning}>
              {saving ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default ComplaintsPage;
