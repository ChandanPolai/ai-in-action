import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Pencil, Trash2, Power, FileSpreadsheet } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchUsersThunk,
  createUserThunk,
  updateUserThunk,
  deleteUserThunk,
  toggleUserStatusThunk
} from '../store/slices/usersSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import { imageUrl, postRequest } from '../services/apiClient';

const emptyForm = {
  name: '',
  email: '',
  mobileNumber: '',
  secondaryMobileNumber: '',
  countryCode: '+91',
  password: '',
  sendCredentials: true
};

const FIELD_OPTIONS = [
  { key: 'name', label: 'Name *', required: true },
  { key: 'email', label: 'Email *', required: true },
  { key: 'mobileNumber', label: 'Mobile *', required: true },
  { key: 'secondaryMobileNumber', label: 'Secondary Mobile', required: false },
  { key: 'countryCode', label: 'Country Code', required: false },
  { key: 'password', label: 'Password', required: false }
];

const UsersPage = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.users);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [importStep, setImportStep] = useState(1);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    secondaryMobileNumber: '',
    countryCode: '',
    password: ''
  });
  const [sendCredentials, setSendCredentials] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = () => dispatch(fetchUsersThunk({ search, status, limit: 500 }));

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
      secondaryMobileNumber: user.secondaryMobileNumber || '',
      countryCode: user.countryCode || '+91',
      password: '',
      sendCredentials: false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.password && form.password.trim().length > 0 && form.password.trim().length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const payload = {
          userId: editing.id,
          name: form.name,
          email: form.email,
          mobileNumber: form.mobileNumber,
          secondaryMobileNumber: form.secondaryMobileNumber,
          countryCode: form.countryCode
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        await dispatch(updateUserThunk(payload)).unwrap();
        toast.success('User updated');
      } else {
        await dispatch(createUserThunk(form)).unwrap();
        toast.success('User created');
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

  const openImport = () => {
    setImportStep(1);
    setPreview(null);
    setImportResult(null);
    setMapping({
      name: '',
      email: '',
      mobileNumber: '',
      secondaryMobileNumber: '',
      countryCode: '',
      password: ''
    });
    setSendCredentials(false);
    setImportOpen(true);
  };

  const autoMapHeaders = (headers = []) => {
    const next = {
      name: '',
      email: '',
      mobileNumber: '',
      secondaryMobileNumber: '',
      countryCode: '',
      password: ''
    };

    headers.forEach((header) => {
      const h = String(header).toLowerCase().trim();
      if (!next.name && (h.includes('name') || h.includes('full'))) next.name = header;
      else if (!next.email && h.includes('email')) next.email = header;
      else if (!next.secondaryMobileNumber && (h.includes('secondary') || h.includes('alt') || h.includes('whatsapp'))) {
        next.secondaryMobileNumber = header;
      } else if (!next.mobileNumber && (h.includes('mobile') || h.includes('phone') || h === 'number')) {
        next.mobileNumber = header;
      } else if (!next.countryCode && (h.includes('country') || h.includes('code'))) {
        next.countryCode = header;
      } else if (!next.password && h.includes('password')) {
        next.password = header;
      }
    });

    return next;
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await postRequest('/admin/users/import-preview', fd);
      setPreview(res.data);
      setMapping(autoMapHeaders(res.data.headers || []));
      setImportStep(2);
      toast.success('Excel loaded. Map columns and import.');
    } catch (err) {
      toast.error(err.message || 'Failed to read Excel');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const runImport = async () => {
    if (!mapping.name || !mapping.email || !mapping.mobileNumber) {
      toast.error('Please map Name, Email and Mobile columns');
      return;
    }

    setImporting(true);
    try {
      const res = await postRequest('/admin/users/import', {
        storedFile: preview.storedFile,
        mapping,
        sendCredentials
      });
      setImportResult(res.data);
      setImportStep(3);
      toast.success(`Imported ${res.data.createdCount} users`);
      load();
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const mappedPreview = useMemo(() => {
    if (!preview?.sampleRows?.length) return [];
    return preview.sampleRows.map((row) => ({
      name: row[mapping.name] || '',
      email: row[mapping.email] || '',
      mobileNumber: row[mapping.mobileNumber] || '',
      secondaryMobileNumber: mapping.secondaryMobileNumber ? row[mapping.secondaryMobileNumber] || '' : ''
    }));
  }, [preview, mapping]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">Create, import and manage course participants</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FileSpreadsheet} onClick={openImport}>
            Import Excel
          </Button>
          <Button icon={Plus} onClick={openCreate}>Add User</Button>
        </div>
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
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-2 font-semibold">User</th>
                  <th className="py-3 px-2 font-semibold">Mobile</th>
                  <th className="py-3 px-2 font-semibold">Secondary</th>
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
                    <td className="py-3 px-2 text-sm text-slate-600 whitespace-nowrap">
                      {user.secondaryMobileNumber || '—'}
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

      <Drawer isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Create User'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
            <div className="col-span-2">
              <Input label="Mobile" required value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
            </div>
          </div>
          <Input
            label="Secondary Mobile"
            placeholder="Optional"
            value={form.secondaryMobileNumber}
            onChange={(e) => setForm({ ...form, secondaryMobileNumber: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            placeholder={editing ? 'Leave blank to keep current password' : 'Optional'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {!editing && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.sendCredentials}
                onChange={(e) => setForm({ ...form, sendCredentials: e.target.checked })}
                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              Send login credentials via email
            </label>
          )}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
            <Button variant="ghost" fullWidth type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Drawer>

      <Drawer isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Users from Excel" size="lg">
        {importStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload `.xlsx` / `.xls` / `.csv` file. Next you will map columns and create users.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 min-h-[160px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40 cursor-pointer px-4 py-6">
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              <span className="text-sm font-semibold text-slate-700">
                {importing ? 'Reading Excel...' : 'Click to upload Excel file'}
              </span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={importing} />
            </label>
          </div>
        )}

        {importStep === 2 && preview && (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-slate-700">
              File: <strong>{preview.fileName}</strong> · Total rows: <strong>{preview.totalRows}</strong>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Column Mapping</p>
              {FIELD_OPTIONS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{field.label}</label>
                  <select
                    className="custom-input"
                    value={mapping[field.key]}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value="">— Select Excel column —</option>
                    {(preview.headers || []).map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Preview (first rows)</p>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Mobile</th>
                      <th className="px-3 py-2">Secondary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedPreview.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-3 py-2">{row.name || '—'}</td>
                        <td className="px-3 py-2">{row.email || '—'}</td>
                        <td className="px-3 py-2">{row.mobileNumber || '—'}</td>
                        <td className="px-3 py-2">{row.secondaryMobileNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={sendCredentials}
                onChange={(e) => setSendCredentials(e.target.checked)}
                className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              Send login credentials email to imported users
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" fullWidth type="button" onClick={() => setImportStep(1)}>Back</Button>
              <Button fullWidth onClick={runImport} disabled={importing}>
                {importing ? 'Importing...' : 'Import Users'}
              </Button>
            </div>
          </div>
        )}

        {importStep === 3 && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card-aesthetic p-4 text-center">
                <p className="text-xs uppercase text-slate-500 font-semibold">Created</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{importResult.createdCount}</p>
              </div>
              <div className="card-aesthetic p-4 text-center">
                <p className="text-xs uppercase text-slate-500 font-semibold">Skipped</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{importResult.skippedCount}</p>
              </div>
            </div>

            {importResult.skipped?.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2">
                {importResult.skipped.map((item, idx) => (
                  <p key={idx} className="text-xs text-slate-600">
                    Row {item.row}: {item.reason} ({item.email})
                  </p>
                ))}
              </div>
            )}

            <Button fullWidth onClick={() => setImportOpen(false)}>Done</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default UsersPage;
