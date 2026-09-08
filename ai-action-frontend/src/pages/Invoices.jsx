import React, { useEffect, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import { openInvoicePrint } from '../utils/openInvoicePrint';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/user/invoices/list');
        setInvoices(res.data.invoices || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusBadge = (s) => {
    if (s === 'paid') return <Badge variant="success">Paid</Badge>;
    if (s === 'partial') return <Badge variant="info">Partial</Badge>;
    return <Badge variant="default">Unpaid</Badge>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Invoices</h2>
        <p className="text-sm text-slate-500">Your GST invoices / bills.</p>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : invoices.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No invoices yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoices.map((inv) => (
            <Card key={inv.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{inv.invoiceNumber}</h3>
                    {statusBadge(inv.paymentStatus)}
                  </div>
                  <p className="text-sm text-slate-500">{inv.description}</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="flex justify-between gap-2">
                  <span>Date</span>
                  <span className="text-slate-700">
                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Taxable</span>
                  <span className="text-slate-700">
                    ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>GST ({inv.gstPercent}%)</span>
                  <span className="text-slate-700">
                    ₹{Number(inv.gstAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between gap-2 font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                  <span>Total</span>
                  <span>₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <Button
                fullWidth
                icon={Printer}
                onClick={() => {
                  const result = openInvoicePrint(inv);
                  if (result === 'failed') toast.error('Could not open invoice. Allow popups and try again.');
                }}
              >
                View / Print PDF
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
