import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, Upload, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchCoursesThunk,
  createCourseThunk,
  updateCourseThunk,
  deleteCourseThunk
} from '../store/slices/coursesSlice';
import { imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import RichTextEditor from '../components/ui/RichTextEditor';

const emptyForm = {
  title: '',
  details: '',
  price: '',
  gstPercent: 18,
  imageFile: null,
  isActive: true
};

const calcTotals = (price, gstPercent) => {
  const p = Math.max(0, Number(price) || 0);
  const g = Math.max(0, Number(gstPercent) || 0);
  const gstAmount = Math.round(((p * g) / 100) * 100) / 100;
  const total = Math.round((p + gstAmount) * 100) / 100;
  return { price: p, gstAmount, total };
};

const CoursesPage = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.courses);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => calcTotals(form.price, form.gstPercent),
    [form.price, form.gstPercent]
  );

  useEffect(() => {
    dispatch(fetchCoursesThunk({}));
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      title: c.title || '',
      details: c.details || '',
      price: c.price ?? '',
      gstPercent: c.gstPercent ?? 18,
      imageFile: null,
      isActive: c.isActive !== false
    });
    setModalOpen(true);
  };

  const buildPayload = () => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('details', form.details || '');
    fd.append('price', String(form.price || 0));
    fd.append('gstPercent', String(form.gstPercent || 0));
    fd.append('isActive', String(form.isActive));
    if (form.imageFile) fd.append('image', form.imageFile);
    if (editing) fd.append('courseId', editing.id);
    return fd;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Course title is required');
      return;
    }
    if (!editing && !form.imageFile) {
      toast.error('Please upload a course image');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await dispatch(updateCourseThunk(payload)).unwrap();
        toast.success('Course updated');
      } else {
        await dispatch(createCourseThunk(payload)).unwrap();
        toast.success('Course created');
      }
      setModalOpen(false);
      dispatch(fetchCoursesThunk({}));
    } catch (err) {
      toast.error(err || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete course "${c.title}"?`)) return;
    try {
      await dispatch(deleteCourseThunk(c.id)).unwrap();
      toast.success('Deleted');
      dispatch(fetchCoursesThunk({}));
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Courses</h2>
          <p className="text-sm text-slate-500">
            Add course details, price, GST and image. Buy payment is Coming Soon for users.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="col-span-full text-center py-10 text-slate-400">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center py-10 text-slate-400">No courses yet</p>
        )}
        {list.map((c) => (
          <Card key={c.id} className="!p-0 overflow-hidden">
            <div className="aspect-[16/10] bg-slate-100">
              {c.image ? (
                <img src={imageUrl(c.image)} alt={c.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <BookOpen className="w-10 h-10" />
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-800 line-clamp-2">{c.title}</p>
                <Badge variant={c.isActive ? 'success' : 'default'}>
                  {c.isActive ? 'Active' : 'Hidden'}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                <p>Price: ₹{Number(c.price || 0).toLocaleString('en-IN')}</p>
                <p>
                  GST ({c.gstPercent}%): ₹{Number(c.gstAmount || 0).toLocaleString('en-IN')}
                </p>
                <p className="font-semibold text-slate-800">
                  Total: ₹{Number(c.total || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Course' : 'Add Course'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Course Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. AI in Action Masterclass"
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Course Details
            </label>
            <RichTextEditor
              value={form.details}
              onChange={(html) => setForm({ ...form, details: html })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Price (₹)"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0"
            />
            <Input
              label="GST %"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.gstPercent}
              onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
            <p className="text-slate-600">
              GST Amount: <strong>₹{preview.gstAmount.toLocaleString('en-IN')}</strong>
            </p>
            <p className="text-slate-800 font-bold">
              Total (Price + GST): ₹{preview.total.toLocaleString('en-IN')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Course Image {editing ? '(optional replace)' : '*'}
            </label>
            <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40 cursor-pointer transition-colors px-4 py-6">
              <Upload className="w-6 h-6 text-brand-500" />
              <span className="text-sm font-semibold text-slate-700 text-center">
                {form.imageFile ? form.imageFile.name : 'Click to upload image'}
              </span>
              <span className="text-xs text-slate-400">JPG / PNG / WEBP · Max 5MB</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
              />
            </label>
            {editing?.image && !form.imageFile && (
              <img
                src={imageUrl(editing.image)}
                alt=""
                className="mt-3 h-28 rounded-xl object-cover border border-slate-200"
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
            />
            Show this course to users (Active)
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Course'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default CoursesPage;
