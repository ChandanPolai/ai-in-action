import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../../services/apiClient';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';

const emptyForm = {
  name: '',
  description: '',
  position: '',
  sortOrder: 0,
  imageFile: null,
  isActive: true
};

const WebsiteTestimonialsPage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/website/testimonials/list', {});
      setList(res.data.testimonials || []);
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

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      description: t.description || '',
      position: t.position || '',
      sortOrder: t.sortOrder || 0,
      imageFile: null,
      isActive: t.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('position', form.position);
      fd.append('sortOrder', String(form.sortOrder || 0));
      fd.append('isActive', String(form.isActive));
      if (form.imageFile) fd.append('image', form.imageFile);
      if (editing) {
        fd.append('testimonialId', editing.id);
        await postRequest('/admin/website/testimonials/update', fd);
        toast.success('Updated');
      } else {
        await postRequest('/admin/website/testimonials/create', fd);
        toast.success('Created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await postRequest('/admin/website/testimonials/delete', { testimonialId: t.id });
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
          <h2 className="text-2xl font-extrabold text-slate-900">Testimonials</h2>
          <p className="text-sm text-slate-500">Name, feedback, image, position (optional)</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Testimonial
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="col-span-full text-center text-slate-400 py-10">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-10">No testimonials yet</p>
        )}
        {list.map((t) => (
          <Card key={t.id} className="!p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-100 shrink-0">
                {t.image ? (
                  <img src={imageUrl(t.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-brand-700">
                    {t.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{t.name}</p>
                {t.position && <p className="text-xs text-slate-500">{t.position}</p>}
              </div>
              <Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Active' : 'Off'}</Badge>
            </div>
            <p className="text-sm text-slate-600 line-clamp-3">{t.description}</p>
            <div className="flex gap-1 mt-3 border-t border-slate-100 pt-3">
              <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-brand-50 text-slate-500">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(t)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Testimonial' : 'Add Testimonial'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Position (optional)"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            placeholder="CEO, Founder..."
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description / Quote
            </label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-600">
            <Upload className="w-4 h-4" />
            {form.imageFile ? form.imageFile.name : 'Upload photo'}
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

export default WebsiteTestimonialsPage;
