import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Award, Download, Mail, Search, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsersThunk } from '../store/slices/usersSlice';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const todayISO = () => new Date().toISOString().slice(0, 10);

const CertificatesPage = () => {
  const dispatch = useDispatch();
  const { list: users } = useSelector((state) => state.users);

  const [form, setForm] = useState({
    courseTitle: 'AI IN ACTION',
    issueDate: todayISO(),
    templateId: 'ai_in_action',
    signatory1Name: 'Gouri Shankar',
    signatory2Name: 'Arpit Shah',
    sendEmailAfter: false
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const loadCertificates = async (search = listSearch) => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/certificates/list', {
        search: search.trim(),
        limit: 200
      });
      setCertificates(res.data.certificates || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(fetchUsersThunk({ status: 'active', limit: 500 }));
    loadCertificates('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        String(u.mobileNumber || '').includes(q)
    );
  }, [users, userSearch]);

  const toggleUser = (userId) => {
    const id = String(userId);
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectFiltered = () => {
    setSelectedUsers((prev) => {
      const set = new Set(prev.map(String));
      filteredUsers.forEach((u) => set.add(String(u.id)));
      return [...set];
    });
  };

  const clearFiltered = () => {
    const remove = new Set(filteredUsers.map((u) => String(u.id)));
    setSelectedUsers((prev) => prev.filter((id) => !remove.has(String(id))));
  };

  const handleGenerate = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Select at least one user');
      return;
    }
    if (!form.courseTitle.trim()) {
      toast.error('Course title is required');
      return;
    }

    setGenerating(true);
    try {
      const res = await postRequest('/admin/certificates/generate', {
        userIds: selectedUsers,
        courseTitle: form.courseTitle.trim(),
        issueDate: form.issueDate,
        templateId: form.templateId.trim() || 'ai_in_action',
        signatory1Name: form.signatory1Name.trim(),
        signatory2Name: form.signatory2Name.trim(),
        sendEmailAfter: !!form.sendEmailAfter
      });
      const created = res.data?.created || 0;
      const failed = res.data?.failed || 0;
      toast.success(
        `Generated ${created} certificate(s)${failed ? `, ${failed} failed` : ''}${
          form.sendEmailAfter ? ` · emailed ${res.data?.emailed || 0}` : ''
        }`
      );
      if (failed && res.data?.errors?.length) {
        console.warn('Certificate errors:', res.data.errors);
      }
      setSelectedUsers([]);
      await loadCertificates();
    } catch (err) {
      toast.error(err.message || 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (cert) => {
    setSendingId(cert.id);
    try {
      await postRequest('/admin/certificates/send', { certificateIds: [cert.id] });
      toast.success(`Email sent to ${cert.recipientEmail || cert.userEmail}`);
      await loadCertificates();
    } catch (err) {
      toast.error(err.message || 'Send failed');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Delete certificate for ${cert.recipientName}?`)) return;
    try {
      await postRequest('/admin/certificates/delete', { certificateId: cert.id });
      toast.success('Certificate deleted');
      await loadCertificates();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const sendStatusBadge = (status) => {
    if (status === 'sent') return <Badge variant="success">Sent</Badge>;
    if (status === 'failed') return <Badge variant="danger">Failed</Badge>;
    if (status === 'skipped') return <Badge variant="default">No email</Badge>;
    return <Badge variant="default">Pending</Badge>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Certificates</h2>
        <p className="text-sm text-slate-500">
          Generate certificates for users, save them, then email the PDF link.
        </p>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Generate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Course title"
            value={form.courseTitle}
            onChange={(e) => setForm({ ...form, courseTitle: e.target.value })}
          />
          <Input
            label="Issue date"
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
          />
          <Input
            label="Template ID"
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Signatory 1"
              value={form.signatory1Name}
              onChange={(e) => setForm({ ...form, signatory1Name: e.target.value })}
            />
            <Input
              label="Signatory 2"
              value={form.signatory2Name}
              onChange={(e) => setForm({ ...form, signatory2Name: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Select users
          </label>
          <Input
            icon={Search}
            placeholder="Search users by name, email, mobile..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <div className="flex gap-2 mt-2 mb-2">
            <Button variant="ghost" type="button" onClick={selectFiltered}>
              {userSearch.trim() ? `Select filtered (${filteredUsers.length})` : 'Select all'}
            </Button>
            <Button variant="ghost" type="button" onClick={clearFiltered}>
              {userSearch.trim() ? 'Clear filtered' : 'Deselect all'}
            </Button>
            <span className="ml-auto text-xs text-slate-500 self-center">
              {selectedUsers.length} selected
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-1">
            {filteredUsers.length === 0 && (
              <p className="text-xs text-slate-400">No users found</p>
            )}
            {filteredUsers.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(String(u.id))}
                  onChange={() => toggleUser(u.id)}
                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {u.email}
                    {u.mobileNumber ? ` · ${u.mobileNumber}` : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.sendEmailAfter}
            onChange={(e) => setForm({ ...form, sendEmailAfter: e.target.checked })}
            className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
          />
          Also send email after generate
        </label>

        <div className="flex justify-end">
          <Button icon={Award} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate & Save'}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Saved certificates</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <Input
                icon={Search}
                placeholder="Search saved..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadCertificates(listSearch);
                }}
              />
            </div>
            <Button
              variant="ghost"
              icon={RefreshCw}
              type="button"
              onClick={() => loadCertificates(listSearch)}
            >
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : certificates.length === 0 ? (
          <p className="text-center py-8 text-slate-400">No certificates yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3 font-semibold">User</th>
                  <th className="py-2 pr-3 font-semibold">Course</th>
                  <th className="py-2 pr-3 font-semibold">Cert ID</th>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-800">{c.recipientName}</p>
                      <p className="text-xs text-slate-500">{c.recipientEmail}</p>
                    </td>
                    <td className="py-3 pr-3 text-slate-700">{c.courseTitle}</td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-600">{c.certId || '—'}</td>
                    <td className="py-3 pr-3 text-slate-600">{c.issueDate || '—'}</td>
                    <td className="py-3 pr-3">{sendStatusBadge(c.sendStatus)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.fullPdfUrl && (
                          <a
                            href={c.fullPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSend(c)}
                          disabled={sendingId === c.id || !c.recipientEmail}
                          className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600 disabled:opacity-40"
                          title="Send email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                          title="Delete"
                        >
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
    </div>
  );
};

export default CertificatesPage;
