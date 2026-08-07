import React, { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import { formatDateTime } from '../utils/formatDate';

const statusVariant = (status) => {
  if (status === 'resolved') return 'success';
  if (status === 'in-progress') return 'info';
  if (status === 'closed') return 'default';
  return 'warning';
};

const ComplaintsPage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: 'all', status: 'all', search: '' });
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (next = filters) => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/complaints/list', {
        type: next.type,
        status: next.status,
        search: next.search.trim()
      });
      setList(res.data.complaints || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, []);

  const openReview = (item) => {
    setSelected(item);
    setReply(item.adminReply || '');
    setStatus(item.status || 'pending');
  };

  const saveReview = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await postRequest('/admin/complaints/update', {
        complaintId: selected.id,
        status,
        adminReply: reply
      });
      toast.success('Updated successfully');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this submission?')) return;
    try {
      await postRequest('/admin/complaints/delete', { complaintId: item.id });
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const clearFilters = () => {
    const reset = { type: 'all', status: 'all', search: '' };
    setFilters(reset);
    load(reset);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Feedback</h2>
        <p className="text-sm text-slate-500">
          Review user complaints, suggestions, and feedback — reply and update status
        </p>
      </div>

      <Card className="!p-4 sm:!p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-brand-600" />
          <p className="text-sm font-bold text-slate-800">Filters</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Search"
            icon={Search}
            placeholder="Search by subject, message, or user..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load();
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Type
              </label>
              <select
                className="custom-input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">All types</option>
                <option value="complaint">Complaint</option>
                <option value="suggestion">Suggestion</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Status
              </label>
              <select
                className="custom-input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" onClick={() => load()}>
              Apply filters
            </Button>
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-center py-10 text-slate-400">No submissions found</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((item) => (
              <div key={item.id} className="py-4 flex flex-col lg:flex-row lg:items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge
                      variant={
                        item.type === 'complaint' ? 'danger' : item.type === 'suggestion' ? 'info' : 'success'
                      }
                    >
                      {item.type}
                    </Badge>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    <span className="text-xs text-slate-400">
                      {item.createdAt ? formatDateTime(item.createdAt) : ''}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{item.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.user?.name || 'User'} · {item.user?.email || ''}
                    {item.user?.mobileNumber ? ` · ${item.user.mobileNumber}` : ''}
                  </p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">{item.message}</p>
                  {item.adminReply && (
                    <p className="text-xs text-brand-700 mt-2 font-medium">Reply sent</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => openReview(item)}>
                    Review
                  </Button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Review submission"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  selected.type === 'complaint' ? 'danger' : selected.type === 'suggestion' ? 'info' : 'success'
                }
              >
                {selected.type}
              </Badge>
              <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">{selected.subject}</p>
              <p className="text-xs text-slate-500 mt-1">
                {selected.user?.name} · {selected.user?.email}
              </p>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.message}</p>
            {selected.image && (
              <a href={imageUrl(selected.image)} target="_blank" rel="noreferrer">
                <img
                  src={imageUrl(selected.image)}
                  alt="Attachment"
                  className="max-h-48 rounded-xl object-cover border border-slate-200"
                />
              </a>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Status
              </label>
              <select className="custom-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin reply
              </label>
              <textarea
                className="custom-input !h-auto py-3"
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply for the user..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" fullWidth onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button fullWidth disabled={saving} onClick={saveReview}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ComplaintsPage;
