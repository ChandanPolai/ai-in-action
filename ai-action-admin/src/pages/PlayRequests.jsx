import React, { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Drawer from '../components/ui/Drawer';
import { formatDateTime } from '../utils/formatDate';

const PlayRequestsPage = () => {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [extraPlays, setExtraPlays] = useState(1);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await postRequest('/admin/recordings/play-requests', { status });
      setList(res.data.requests || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (action) => {
    if (!reviewing) return;
    setSaving(true);
    try {
      await postRequest('/admin/recordings/review-play-request', {
        requestId: reviewing.id,
        action,
        extraPlays: action === 'approve' ? extraPlays : undefined,
        adminNote
      });
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      setReviewing(null);
      setAdminNote('');
      setExtraPlays(1);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s) => {
    if (s === 'approved') return <Badge variant="success">Approved</Badge>;
    if (s === 'rejected') return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Play Requests</h2>
          <p className="text-sm text-slate-500">
            Users who hit the play limit can request more — approve to grant extra plays
          </p>
        </div>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                status === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-center py-10 text-slate-400">No requests</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((r) => (
              <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-slate-800">{r.user?.name || 'User'}</p>
                    {statusBadge(r.status)}
                  </div>
                  <p className="text-xs text-slate-500">{r.user?.email} · {r.user?.mobile || ''}</p>
                  <p className="text-sm text-slate-700 mt-1">
                    Video: <span className="font-semibold">{r.recording?.sessionTitle || '—'}</span>
                    {r.recording ? ` (Day ${r.recording.dayNumber} · S${r.recording.sessionNumber})` : ''}
                  </p>
                  {r.reason && <p className="text-sm text-slate-500 mt-1">Reason: {r.reason}</p>}
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(r.createdAt)}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      icon={Check}
                      onClick={() => {
                        setReviewing(r);
                        setExtraPlays(1);
                        setAdminNote('');
                      }}
                    >
                      Review
                    </Button>
                  </div>
                )}
                {r.status === 'approved' && (
                  <p className="text-xs text-emerald-600 font-semibold">+{r.extraPlaysGranted} plays</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer isOpen={!!reviewing} onClose={() => setReviewing(null)} title="Review play request" size="md">
        {reviewing && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{reviewing.user?.name}</strong> wants more plays for{' '}
              <strong>{reviewing.recording?.sessionTitle}</strong>
            </p>
            <Input
              label="Extra plays to grant"
              type="number"
              min={1}
              value={extraPlays}
              onChange={(e) => setExtraPlays(Math.max(1, Number(e.target.value) || 1))}
            />
            <Input
              label="Admin note (optional)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                fullWidth
                icon={X}
                disabled={saving}
                onClick={() => review('reject')}
              >
                Reject
              </Button>
              <Button fullWidth icon={Check} disabled={saving} onClick={() => review('approve')}>
                {saving ? 'Saving...' : 'Approve'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PlayRequestsPage;
