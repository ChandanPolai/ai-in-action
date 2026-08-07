import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Pencil, Trash2, KeyRound, Power } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchUsersThunk,
  createUserThunk,
  updateUserThunk,
  deleteUserThunk,
  toggleUserStatusThunk,
  resetPasswordThunk
} from '../store/slices/usersSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { imageUrl } from '../services/apiClient';

const emptyForm = {
  name: '',
  email: '',
  mobileNumber: '',
  countryCode: '+91',
  password: '',
  sendCredentials: true
};

const UsersPage = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.users);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => dispatch(fetchUsersThunk({ search, status }));

  useEffect(() => {
    load();
  }, [status]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      countryCode: user.countryCode || '+91',
      password: '',
      sendCredentials: false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await dispatch(
          updateUserThunk({
            userId: editing.id,
            name: form.name,
            email: form.email,
            mobileNumber: form.mobileNumber,
            countryCode: form.countryCode
          })
        ).unwrap();
        toast.success('User updated');
      } else {
        const result = await dispatch(createUserThunk(form)).unwrap();
        toast.success('User created' + (result.data?.temporaryPassword ? ` · Temp password: ${result.data.temporaryPassword}` : ''));
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try {
      await dispatch(deleteUserThunk(user.id)).unwrap();
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err);
    }
  };

  const handleToggle = async (user) => {
    try {
      await dispatch(toggleUserStatusThunk(user.id)).unwrap();
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err);
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password for ${user.name}?`)) return;
    try {
      const result = await dispatch(resetPasswordThunk({ userId: user.id, sendEmail: true })).unwrap();
      toast.success(
        result.data?.temporaryPassword
          ? `New password: ${result.data.temporaryPassword}`
          : 'Password reset & emailed'
      );
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">Create and manage course participants</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Add User</Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Search name, email, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <select
            className="custom-input sm:w-40"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button variant="secondary" onClick={load}>Search</Button>
        </div>

        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-center py-10 text-slate-400">No users found</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-2 font-semibold">User</th>
                  <th className="py-3 px-2 font-semibold">Mobile</th>
                  <th className="py-3 px-2 font-semibold">Status</th>
                  <th className="py-3 px-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                          {user.profilePhoto ? (
                            <img src={imageUrl(user.profilePhoto)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600 whitespace-nowrap">
                      {user.countryCode} {user.mobileNumber}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(user)} className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(user)} className="p-2 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600" title="Toggle status">
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleResetPassword(user)} className="p-2 rounded-lg hover:bg-sky-50 text-slate-500 hover:text-sky-600" title="Reset password">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Create User'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
            <div className="col-span-2">
              <Input label="Mobile" required value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
            </div>
          </div>
          {!editing && (
            <>
              <Input
                label="Password (optional)"
                type="password"
                placeholder="Auto-generated if empty"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.sendCredentials}
                  onChange={(e) => setForm({ ...form, sendCredentials: e.target.checked })}
                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                Send login credentials via email
              </label>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
