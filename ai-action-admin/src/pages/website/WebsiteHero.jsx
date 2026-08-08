import React, { useEffect, useState } from 'react';
import { Upload, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../../services/apiClient';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const WebsiteHeroPage = () => {
  const [hero, setHero] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', imageFile: null, isActive: true });
  const [mediaType, setMediaType] = useState('image');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/website/hero/get', {});
      const h = res.data.hero;
      setHero(h);
      setForm({
        title: h?.title || '',
        description: h?.description || '',
        imageFile: null,
        isActive: h?.isActive !== false
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('isActive', String(form.isActive));
      if (form.imageFile) fd.append('image', form.imageFile);
      const res = await postRequest('/admin/website/hero/update', fd);
      setHero(res.data.hero);
      toast.success('Hero section saved');
      setForm((f) => ({ ...f, imageFile: null }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addMedia = async () => {
    if (!mediaFile && !mediaUrl.trim()) {
      toast.error('Upload a file or enter a URL');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('mediaType', mediaType);
      fd.append('title', mediaTitle);
      fd.append('url', mediaUrl);
      if (mediaFile) fd.append('file', mediaFile);
      const res = await postRequest('/admin/website/hero/media/add', fd);
      setHero(res.data.hero);
      setMediaFile(null);
      setMediaUrl('');
      setMediaTitle('');
      toast.success('Media added');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeMedia = async (mediaTypeKey, mediaId) => {
    try {
      const res = await postRequest('/admin/website/hero/media/remove', {
        mediaType: mediaTypeKey,
        mediaId
      });
      setHero(res.data.hero);
      toast.success('Removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <p className="text-center py-12 text-slate-400">Loading...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Hero Section</h2>
        <p className="text-sm text-slate-500">Title, description, main image — optional videos &amp; images</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="AI In Action"
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short hero description"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Main Image
            </label>
            {(hero?.image || form.imageFile) && (
              <img
                src={form.imageFile ? URL.createObjectURL(form.imageFile) : imageUrl(hero.image)}
                alt=""
                className="w-full max-w-md h-40 object-cover rounded-xl mb-3 border border-slate-100"
              />
            )}
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
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-slate-300 text-brand-500"
            />
            Active on website
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Hero'}
          </Button>
        </form>
      </Card>

      <Card title="Optional hero media" subtitle="Extra images & videos for the hero strip">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Type</label>
            <select className="custom-input" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <Input label="Title (optional)" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} />
          <Input
            label="External URL (optional)"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://..."
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Or upload file
            </label>
            <input
              type="file"
              accept={mediaType === 'video' ? 'video/*' : 'image/*'}
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>
        </div>
        <Button size="sm" icon={Plus} onClick={addMedia}>
          Add Media
        </Button>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800 mb-2">Images ({hero?.images?.length || 0})</p>
            <div className="space-y-2">
              {(hero?.images || []).map((m) => (
                <div key={m._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-600 truncate flex-1">{m.title || m.file || m.url}</span>
                  <button type="button" onClick={() => removeMedia('image', m._id)} className="text-rose-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!hero?.images?.length && <p className="text-xs text-slate-400">No images</p>}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 mb-2">Videos ({hero?.videos?.length || 0})</p>
            <div className="space-y-2">
              {(hero?.videos || []).map((m) => (
                <div key={m._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-600 truncate flex-1">{m.title || m.file || m.url}</span>
                  <button type="button" onClick={() => removeMedia('video', m._id)} className="text-rose-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!hero?.videos?.length && <p className="text-xs text-slate-400">No videos</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WebsiteHeroPage;
