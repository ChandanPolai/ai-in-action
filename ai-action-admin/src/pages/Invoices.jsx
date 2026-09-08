import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileText, Printer, Search, Trash2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsersThunk } from '../store/slices/usersSlice';
import { fetchWorkshopsThunk } from '../store/slices/workshopsSlice';
import { postRequest } from '../services/apiClient';
import { openInvoicePrint } from '../utils/openInvoicePrint';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  userId: '',
  workshopId: '',
  courseId: '',
  buyerName: '',
  buyerEmail: '',
  buyerMobile: '',
  buyerAddress: '',
  buyerGstin: '',
  buyerState: '',
  description: 'Training / Workshop Fee',
  taxableAmount: '',
  gstPercent: '18',
  amountPaid: '',
  paymentMode: 'UPI',
  paymentStatus: 'paid',
  notes: '',
  invoiceDate: todayISO()
};

const emptyCompany = {
  companyName: 'AI in Action',
  companyAddress: '',
  companyGstin: '',
  companyState: '',
  companyEmail: '',
  companyPhone: '',
  companyPan: '',
  invoicePrefix: 'INV'
};

const InvoicesPage = () => {
  const dispatch = useDispatch();
  const { list: users } = useSelector((state) => state.users);
  const { list: workshops } = useSelector((state) => state.workshops);

  const [company, setCompany] = useState(emptyCompany);
  const [form, setForm] = useState(emptyForm);
  const [userSearch, setUserSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [creating, setCreating] = useState(false);

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const taxable = Number(form.taxableAmount) || 0;
  const gstPercent = Number(form.gstPercent) || 0;
  const gstAmount = round2((taxable * gstPercent) / 100);
  const totalAmount = round2(taxable + gstAmount);

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

  const loadInvoices = async (search = listSearch) => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/invoices/list', { search: search.trim(), limit: 200 });
      setInvoices(res.data.invoices || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async () => {
    try {
      const res = await postRequest('/admin/invoices/company/get');
      setCompany({ ...emptyCompany, ...(res.data.company || {}) });
    } catch (err) {
      toast.error(err.message || 'Failed to load company settings');
    }
  };

  const loadCourses = async () => {
    try {
      const res = await postRequest('/admin/courses/list', { limit: 200 });
      setCourses(res.data.courses || []);
    } catch {
      /* optional */
    }
  };

  useEffect(() => {
    dispatch(fetchUsersThunk({ status: 'active', limit: 500 }));
    dispatch(fetchWorkshopsThunk({}));
    loadCompany();
    loadCourses();
    loadInvoices('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const selectUser = (userId) => {
    const u = users.find((x) => String(x.id) === String(userId));
    setForm((prev) => ({
      ...prev,
      userId: String(userId),
      buyerName: u?.name || prev.buyerName,
      buyerEmail: u?.email || prev.buyerEmail,
      buyerMobile: u?.mobileNumber || prev.buyerMobile
    }));
  };

  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      const res = await postRequest('/admin/invoices/company/update', company);
      setCompany({ ...emptyCompany, ...(res.data.company || {}) });
      toast.success('Company details saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId) {
      toast.error('Select a user');
      return;
    }
    if (!form.buyerName.trim()) {
      toast.error('Buyer name is required');
      return;
    }
    if (form.taxableAmount === '' || Number.isNaN(Number(form.taxableAmount))) {
      toast.error('Enter taxable amount');
      return;
    }

    setCreating(true);
    try {
      const res = await postRequest('/admin/invoices/create', {
        userId: form.userId,
        workshopId: form.workshopId || null,
        courseId: form.courseId || null,
        buyerName: form.buyerName.trim(),
        buyerEmail: form.buyerEmail.trim(),
        buyerMobile: form.buyerMobile.trim(),
        buyerAddress: form.buyerAddress.trim(),
        buyerGstin: form.buyerGstin.trim(),
        buyerState: form.buyerState.trim(),
        description: form.description.trim(),
        taxableAmount: Number(form.taxableAmount),
        gstPercent: Number(form.gstPercent) || 0,
        amountPaid: form.amountPaid === '' ? totalAmount : Number(form.amountPaid),
        paymentMode: form.paymentMode,
        paymentStatus: form.paymentStatus,
        notes: form.notes.trim(),
        invoiceDate: form.invoiceDate
      });
      toast.success(`Invoice ${res.data.invoice.invoiceNumber} created`);
      const result = openInvoicePrint(res.data.invoice);
      if (result === 'failed') toast.error('Could not open invoice print view');
      setForm(emptyForm);
      await loadInvoices();
    } catch (err) {
      toast.error(err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    try {
      await postRequest('/admin/invoices/delete', { invoiceId: inv.id });
      toast.success('Invoice deleted');
      await loadInvoices();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const statusBadge = (s) => {
    if (s === 'paid') return <Badge variant="success">Paid</Badge>;
    if (s === 'partial') return <Badge variant="info">Partial</Badge>;
    return <Badge variant="default">Unpaid</Badge>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Invoices</h2>
        <p className="text-sm text-slate-500">
          Set company details, generate GST invoices for users, and print / save as PDF.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Company details</h3>
          <Button icon={Save} onClick={saveCompany} disabled={savingCompany}>
            {savingCompany ? 'Saving...' : 'Save Company'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company name"
            value={company.companyName}
            onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
          />
          <Input
            label="Invoice prefix"
            value={company.invoicePrefix}
            onChange={(e) => setCompany({ ...company, invoicePrefix: e.target.value })}
          />
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Company address
            </label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={2}
              value={company.companyAddress}
              onChange={(e) => setCompany({ ...company, companyAddress: e.target.value })}
            />
          </div>
          <Input
            label="GSTIN"
            value={company.companyGstin}
            onChange={(e) => setCompany({ ...company, companyGstin: e.target.value })}
          />
          <Input
            label="State"
            value={company.companyState}
            onChange={(e) => setCompany({ ...company, companyState: e.target.value })}
          />
          <Input
            label="Email"
            value={company.companyEmail}
            onChange={(e) => setCompany({ ...company, companyEmail: e.target.value })}
          />
          <Input
            label="Phone"
            value={company.companyPhone}
            onChange={(e) => setCompany({ ...company, companyPhone: e.target.value })}
          />
          <Input
            label="PAN"
            value={company.companyPan}
            onChange={(e) => setCompany({ ...company, companyPan: e.target.value })}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Generate invoice</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select user
            </label>
            <Input
              icon={Search}
              placeholder="Search user..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="custom-input mt-2"
              value={form.userId}
              onChange={(e) => selectUser(e.target.value)}
              required
            >
              <option value="">Choose user</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Buyer name"
              required
              value={form.buyerName}
              onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
            />
            <Input
              label="Buyer email"
              value={form.buyerEmail}
              onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
            />
            <Input
              label="Buyer mobile"
              value={form.buyerMobile}
              onChange={(e) => setForm({ ...form, buyerMobile: e.target.value })}
            />
            <Input
              label="Buyer state"
              value={form.buyerState}
              onChange={(e) => setForm({ ...form, buyerState: e.target.value })}
              placeholder="Same as company → CGST+SGST"
            />
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Buyer address
              </label>
              <textarea
                className="custom-input !h-auto py-3"
                rows={2}
                value={form.buyerAddress}
                onChange={(e) => setForm({ ...form, buyerAddress: e.target.value })}
              />
            </div>
            <Input
              label="Buyer GSTIN (optional)"
              value={form.buyerGstin}
              onChange={(e) => setForm({ ...form, buyerGstin: e.target.value })}
            />
            <Input
              label="Invoice date"
              type="date"
              value={form.invoiceDate}
              onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Workshop (optional)
              </label>
              <select
                className="custom-input"
                value={form.workshopId}
                onChange={(e) => setForm({ ...form, workshopId: e.target.value })}
              >
                <option value="">None</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Course (optional)
              </label>
              <select
                className="custom-input"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                <option value="">None</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Input
              label="Taxable amount (₹)"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.taxableAmount}
              onChange={(e) => setForm({ ...form, taxableAmount: e.target.value })}
            />
            <Input
              label="GST %"
              type="number"
              min="0"
              step="0.01"
              value={form.gstPercent}
              onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
            />
            <Input
              label="Amount paid (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
              placeholder={`Default ${totalAmount.toFixed(2)}`}
            />
            <Input
              label="Payment mode"
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Payment status
              </label>
              <select
                className="custom-input"
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>GST amount</span>
                <span>₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              className="custom-input !h-auto py-3"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" icon={FileText} disabled={creating}>
              {creating ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">All invoices</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <Input
                icon={Search}
                placeholder="Search invoices..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadInvoices(listSearch);
                }}
              />
            </div>
            <Button variant="ghost" icon={RefreshCw} type="button" onClick={() => loadInvoices(listSearch)}>
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-center py-8 text-slate-400">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Invoice</th>
                  <th className="py-2 pr-3 font-semibold">Buyer</th>
                  <th className="py-2 pr-3 font-semibold">Amount</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-800">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">
                        {inv.invoiceDate
                          ? new Date(inv.invoiceDate).toLocaleDateString('en-IN')
                          : '—'}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-800">{inv.buyerName}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[220px]">{inv.buyerEmail}</p>
                    </td>
                    <td className="py-3 pr-3 font-semibold text-slate-800">
                      ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 pr-3">{statusBadge(inv.paymentStatus)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const result = openInvoicePrint(inv);
                            if (result === 'failed') toast.error('Could not open invoice. Allow popups and try again.');
                          }}
                          className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600"
                          title="Print / PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(inv)}
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

export default InvoicesPage;
