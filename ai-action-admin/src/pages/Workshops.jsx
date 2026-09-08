import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, Shield, Upload, Layers, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchWorkshopsThunk,
  createWorkshopThunk,
  updateWorkshopThunk,
  deleteWorkshopThunk,
  setWorkshopAccessThunk,
  fetchWorkshopAccessMatrixThunk
} from '../store/slices/workshopsSlice';
import { imageUrl, postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';

const emptyForm = {
  title: '',
  description: '',
  imageFile: null,
  isActive: true
};

const WorkshopsPage = () => {
  const dispatch = useDispatch();
  const { list, loading, accessMatrix } = useSelector((state) => state.workshops);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [accessWorkshop, setAccessWorkshop] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredAccessUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return accessMatrix;
    return accessMatrix.filter(
      (u) =>
        (u.username || u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        String(u.mobileNumber || '').includes(q)
    );
  }, [accessMatrix, userSearch]);

  useEffect(() => {
    dispatch(fetchWorkshopsThunk({}));
  }, [dispatch]);

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
      imageFile: null,
      isActive: w.isActive !== false
    });
    setModalOpen(true);
  };

  const openAccess = async (w) => {
    setAccessWorkshop(w);
    setUserSearch('');
    setAccessOpen(true);
    const result = await dispatch(fetchWorkshopAccessMatrixThunk(w.id));
    if (fetchWorkshopAccessMatrixThunk.fulfilled.match(result)) {
      const allowed = (result.payload.data.matrix || [])
        .filter((u) => u.isAllowed)
        .map((u) => String(u.id));
      setSelectedUsers(allowed);
    }
  };

  const buildPayload = () => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description || '');
    fd.append('isActive', String(form.isActive));
    if (form.imageFile) fd.append('image', form.imageFile);
    if (editing) fd.append('workshopId', editing.id);
    return fd;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Workshop title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await dispatch(updateWorkshopThunk(payload)).unwrap();
        toast.success('Workshop updated');
      } else {
        await dispatch(createWorkshopThunk(payload)).unwrap();
        toast.success('Workshop created');
      }
      setModalOpen(false);
      dispatch(fetchWorkshopsThunk({}));
    } catch (err) {
      toast.error(err || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (w) => {
    if (
      !window.confirm(
        `Delete workshop "${w.title}"?\n\nVideos will NOT be deleted — they will only be unassigned from this workshop.`
      )
    ) {
      return;
    }
    try {
      await dispatch(deleteWorkshopThunk(w.id)).unwrap();
      toast.success('Workshop deleted — recordings kept');
      dispatch(fetchWorkshopsThunk({}));
    } catch (err) {
      toast.error(err);
    }
  };

  const handleToggleActive = async (w, makeActive) => {
    if ((w.isActive !== false) === makeActive) return;
    try {
      await postRequest('/admin/workshops/toggle-status', {
        workshopId: w.id,
        isActive: makeActive
      });
      toast.success(makeActive ? 'Workshop activated' : 'Workshop deactivated');
      dispatch(fetchWorkshopsThunk({}));
    } catch (err) {
      toast.error(err.message || err);
    }
  };

  const toggleAccessUser = (userId) => {
    setSelectedUsers((prev) => {
      const id = String(userId);
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const selectAll = () => {
    if (userSearch.trim()) {
      setSelectedUsers((prev) => {
        const set = new Set(prev.map(String));
        filteredAccessUsers.forEach((u) => set.add(String(u.id)));
        return [...set];
      });
      return;
    }
    setSelectedUsers(accessMatrix.map((u) => String(u.id)));
  };

  const deselectAll = () => {
    if (userSearch.trim()) {
      const remove = new Set(filteredAccessUsers.map((u) => String(u.id)));
      setSelectedUsers((prev) => prev.filter((id) => !remove.has(String(id))));
      return;
    }
    setSelectedUsers([]);
  };

  const saveAccess = async () => {
    setSaving(true);
    try {
      await dispatch(
        setWorkshopAccessThunk({
          workshopId: accessWorkshop.id,
          assignedUsers: selectedUsers,
          mode: 'replace'
        })
      ).unwrap();
      toast.success('Workshop access updated — users can watch all videos in this workshop');
      setAccessOpen(false);
      dispatch(fetchWorkshopsThunk({}));
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
          <h2 className="text-2xl font-extrabold text-slate-900">Workshops</h2>
          <p className="text-sm text-slate-500">
            Create a workshop, assign users once, then add multiple recordings under it.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Workshop
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <p className="col-span-full text-center py-10 text-slate-400">Loading...</p>}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center py-10 text-slate-400">No workshops yet</p>
        )}
        {list.map((w) => (
          <Card key={w.id} className={`!p-0 overflow-hidden ${w.isActive === false ? 'opacity-75' : ''}`}>
            <div className="aspect-[16/10] bg-slate-100">
              {w.image ? (
                <img src={imageUrl(w.image)} alt={w.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Layers className="w-10 h-10" />
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-800 line-clamp-2">{w.title}</p>
                <Badge variant={w.isActive !== false ? 'success' : 'default'}>
                  {w.isActive !== false ? 'Active' : 'Hidden'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{w.description || 'No description'}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="px-2 py-1 rounded-lg bg-slate-50">{w.videoCount || 0} videos</span>
                <span className="px-2 py-1 rounded-lg bg-slate-50">{w.assignedCount || 0} users</span>
              </div>
              <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => openAccess(w)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100"
                >
                  <Shield className="w-3.5 h-3.5" /> Access
                </button>
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden ml-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(w, true)}
                    className={`px-2 py-1 text-[11px] font-semibold ${
                      w.isActive !== false ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'
                    }`}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(w, false)}
                    className={`px-2 py-1 text-[11px] font-semibold border-l border-slate-200 ${
                      w.isActive === false ? 'bg-rose-500 text-white' : 'bg-white text-slate-500'
                    }`}
                  >
                    Off
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(w)}
                  className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(w)}
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
        title={editing ? 'Edit Workshop' : 'Add Workshop'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Image (optional)
            </label>
            <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[100px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-brand-300 cursor-pointer px-4 py-5">
              <Upload className="w-5 h-5 text-brand-500" />
              <span className="text-sm font-semibold text-slate-700">
                {form.imageFile ? form.imageFile.name : 'Click to upload image'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
              />
            </label>
            {editing?.image && !form.imageFile && (
              <p className="text-xs text-slate-500 mt-2">Current image kept unless you upload a new one.</p>
            )}
          </div>
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
        isOpen={accessOpen}
        onClose={() => setAccessOpen(false)}
        title={`Access — ${accessWorkshop?.title || ''}`}
        size="lg"
      >
        <p className="text-sm text-slate-500 mb-3">
          Selected users can watch all videos inside this workshop. Multi-select or deselect anytime.
        </p>
        <div className="mb-3">
          <Input
            icon={Search}
            placeholder="Search users by name, email, mobile..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mb-3">
          <Button variant="ghost" type="button" onClick={selectAll}>
            {userSearch.trim() ? `Select filtered (${filteredAccessUsers.length})` : 'Select all'}
          </Button>
          <Button variant="ghost" type="button" onClick={deselectAll}>
            {userSearch.trim() ? 'Clear filtered' : 'Deselect all'}
          </Button>
          <span className="ml-auto text-xs text-slate-500 self-center">
            {selectedUsers.length} selected
          </span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 mb-4">
          {accessMatrix.length === 0 && <p className="text-xs text-slate-400">No users available</p>}
          {accessMatrix.length > 0 && filteredAccessUsers.length === 0 && (
            <p className="text-xs text-slate-400">No users found</p>
          )}
          {filteredAccessUsers.map((u) => (
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
              {u.canWatch && <Badge variant="info">Can watch</Badge>}
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setAccessOpen(false)}>
            Cancel
          </Button>
          <Button fullWidth onClick={saveAccess} disabled={saving}>
            {saving ? 'Saving...' : 'Save Access'}
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default WorkshopsPage;
