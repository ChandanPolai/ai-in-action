import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../../services/apiClient';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import RichTextEditor from '../../components/ui/RichTextEditor';

const emptyForm = {
  title: '',
  description: '',
  basePrice: '',
  offerPrice: '',
  gstPercent: 18,
  sortOrder: 0,
  imageFile: null,
  isActive: true
};

const calc = (offerPrice, gstPercent) => {
  const p = Math.max(0, Number(offerPrice) || 0);
  const g = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = Math.round(((p * g) / 100) * 100) / 100;
  const total = Math.round((p + gstAmount) * 100) / 100;
  return { gstAmount, total };
};

const WebsiteWorkshopsPage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => calc(form.offerPrice, form.gstPercent), [form.offerPrice, form.gstPercent]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/website/workshops/list', {});
      setList(res.data.workshops || []);
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

  const openEdit = (w) => {
    setEditing(w);
    setForm({
      title: w.title || '',
      description: w.description || '',
      basePrice: w.basePrice ?? '',
      offerPrice: w.offerPrice ?? '',
      gstPercent: w.gstPercent ?? 18,
      sortOrder: w.sortOrder ?? 0,
      imageFile: null,
      isActive: w.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description || '');
      fd.append('basePrice', String(form.basePrice || 0));
      fd.append('offerPrice', String(form.offerPrice || 0));
      fd.append('gstPercent', String(form.gstPercent || 0));
      fd.append('sortOrder', String(form.sortOrder || 0));
      fd.append('isActive', String(form.isActive));
      if (form.imageFile) fd.append('image', form.imageFile);
      if (editing) {
        fd.append('workshopId', editing.id);
        await postRequest('/admin/website/workshops/update', fd);
        toast.success('Workshop updated');
      } else {
        await postRequest('/admin/website/workshops/create', fd);
        toast.success('Workshop created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`Delete "${w.title}"?`)) return;
    try {
      await postRequest('/admin/website/workshops/delete', { workshopId: w.id });
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
          <h2 className="text-2xl font-extrabold text-slate-900">Website Workshops</h2>
          <p className="text-sm text-slate-500">
            Base price (strike) + offer price + GST — public pricing cards
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Workshop
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="col-span-full text-center text-slate-400 py-10">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-10">No workshops yet</p>
        )}
        {list.map((w) => (
          <Card key={w.id} className="!p-5">
            {w.image && (
              <img src={imageUrl(w.image)} alt="" className="w-full h-36 object-cover rounded-xl mb-3" />
            )}
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-bold text-slate-800">{w.title}</p>
              <Badge variant={w.isActive ? 'success' : 'default'}>{w.isActive ? 'Active' : 'Off'}</Badge>
            </div>
            <p className="text-sm text-slate-500">
              <span className="line-through text-slate-400 mr-2">₹{w.basePrice}</span>
              <span className="font-bold text-brand-700">₹{w.offerPrice}</span>
              <span className="text-xs text-slate-400 ml-2">+GST → ₹{w.total}</span>
            </p>
            <div className="flex gap-1 mt-3 border-t border-slate-100 pt-3">
              <button onClick={() => openEdit(w)} className="p-2 rounded-lg hover:bg-brand-50 text-slate-500">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(w)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Workshop' : 'Add Workshop'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <RichTextEditor
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="Workshop details..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Base Price (MRP)"
              type="number"
              min={0}
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
            />
            <Input
              label="Offer Price"
              type="number"
              min={0}
              value={form.offerPrice}
              onChange={(e) => setForm({ ...form, offerPrice: e.target.value })}
            />
            <Input
              label="GST %"
              type="number"
              min={0}
              value={form.gstPercent}
              onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
            />
          </div>
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            GST: ₹{preview.gstAmount} · Total: <strong>₹{preview.total}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600 pt-6">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-600">
            <Upload className="w-4 h-4" />
            {form.imageFile ? form.imageFile.name : editing?.image ? 'Change image' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
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

export default WebsiteWorkshopsPage;
