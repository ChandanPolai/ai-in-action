import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../../services/apiClient';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';

const emptyForm = {
  type: 'image',
  title: '',
  mediaUrl: '',
  file: null,
  sortOrder: 0,
  isActive: true
};

const WebsiteGalleryPage = () => {
  const [tab, setTab] = useState('image');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async (type = tab) => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/website/gallery/list', { type });
      setItems(res.data.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  const openCreate = () => {
    setForm({ ...emptyForm, type: tab });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.file && !form.mediaUrl.trim()) {
      toast.error('Upload a file or enter URL');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('title', form.title);
      fd.append('mediaUrl', form.mediaUrl);
      fd.append('sortOrder', String(form.sortOrder || 0));
      fd.append('isActive', String(form.isActive));
      if (form.file) fd.append('file', form.file);
      await postRequest('/admin/website/gallery/create', fd);
      toast.success('Added to gallery');
      setModalOpen(false);
      load(tab);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this gallery item?')) return;
    try {
      await postRequest('/admin/website/gallery/delete', { itemId: item.id });
      toast.success('Deleted');
      load(tab);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Gallery</h2>
          <p className="text-sm text-slate-500">Images and videos — tab wise for the website</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add {tab === 'image' ? 'Image' : 'Video'}
        </Button>
      </div>

      <div className="flex gap-2">
        {['image', 'video'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
              tab === t ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {t}s
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && <p className="col-span-full text-center text-slate-400 py-10">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-10">No {tab}s yet</p>
        )}
        {items.map((item) => {
          const src = item.mediaFile || item.mediaUrl;
          return (
            <Card key={item.id} className="!p-3">
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 mb-2">
                {item.type === 'image' && src ? (
                  <img src={imageUrl(src)} alt="" className="w-full h-full object-cover" />
                ) : src ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-2 text-center break-all">
                    Video: {item.title || src}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.title || 'Untitled'}</p>
                  <Badge variant={item.isActive ? 'success' : 'default'}>{item.type}</Badge>
                </div>
                <button onClick={() => handleDelete(item)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Drawer isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${tab}`} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Type</label>
            <select
              className="custom-input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <Input label="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input
            label="External URL (optional)"
            value={form.mediaUrl}
            onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
            placeholder="https://youtube.com/... or CDN link"
          />
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-600">
            <Upload className="w-4 h-4" />
            {form.file ? form.file.name : 'Upload file'}
            <input
              type="file"
              accept={form.type === 'video' ? 'video/*' : 'image/*'}
              className="hidden"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            />
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

export default WebsiteGalleryPage;
