import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Star, MessageSquareQuote } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const Stars = ({ value }) => (
  <div className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`w-4 h-4 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
      />
    ))}
  </div>
);

const ReviewsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetings, setMeetings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [byMeeting, setByMeeting] = useState([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    meetingId: searchParams.get('meetingId') || 'all',
    rating: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const loadMeetings = useCallback(async () => {
    try {
      const res = await postRequest('/admin/meetings/list', { status: 'all', limit: 500 });
      setMeetings(res.data.meetings || []);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  const loadReviews = useCallback(async (next = filters) => {
    setLoading(true);
    try {
      const payload = {
        meetingId: next.meetingId,
        rating: next.rating,
        search: next.search.trim(),
        limit: 500
      };
      if (next.dateFrom) payload.dateFrom = next.dateFrom;
      if (next.dateTo) payload.dateTo = next.dateTo;

      const res = await postRequest('/admin/meetings/reviews', payload);
      setReviews(res.data.reviews || []);
      setByMeeting(res.data.byMeeting || []);
      setTotal(res.data.total || 0);
      setAvgRating(res.data.avgRating || 0);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMeetings();
    loadReviews();
  }, []);

  const applyFilters = (next = filters) => {
    setFilters(next);
    if (next.meetingId && next.meetingId !== 'all') {
      setSearchParams({ meetingId: next.meetingId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    loadReviews(next);
  };

  const clearFilters = () => {
    const reset = { meetingId: 'all', rating: 'all', search: '', dateFrom: '', dateTo: '' };
    applyFilters(reset);
  };

  const selectMeetingSummary = (meetingId) => {
    applyFilters({ ...filters, meetingId: meetingId || 'all' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Meeting Reviews</h2>
        <p className="text-sm text-slate-500">
          View attendee reviews meeting-wise — filter by meeting, rating, or date
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total reviews</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{total}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-extrabold text-slate-900">{avgRating || '—'}</p>
            {avgRating > 0 && <Stars value={Math.round(avgRating)} />}
          </div>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Meetings with reviews</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{byMeeting.length}</p>
        </Card>
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
            placeholder="Search by user, email, meeting, or comment..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Meeting
              </label>
              <select
                className="custom-input"
                value={filters.meetingId}
                onChange={(e) => setFilters({ ...filters, meetingId: e.target.value })}
              >
                <option value="all">All meetings</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} (Day {m.dayNumber} · S{m.sessionNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Rating
              </label>
              <select
                className="custom-input"
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>

            <Input
              label="From date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
            <Input
              label="To date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" onClick={() => applyFilters()}>
              Apply filters
            </Button>
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={filters.meetingId !== 'all' ? 'Reviews for selected meeting' : 'All reviews'}
        subtitle={`${total} review${total === 1 ? '' : 's'}`}
      >
        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading...</p>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareQuote className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">No reviews found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.id} className="py-4 flex flex-col lg:flex-row lg:items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-slate-800">{r.user?.name || 'Unknown user'}</p>
                    <Stars value={r.rating} />
                    <Badge variant="info">{r.rating}/5</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {r.user?.email || '—'}
                    {r.user?.mobileNumber ? ` · ${r.user.mobileNumber}` : ''}
                  </p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                    {r.comment?.trim() || <span className="text-slate-400 italic">No comment</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {r.meeting && (
                      <button
                        type="button"
                        onClick={() => selectMeetingSummary(r.meeting.id)}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        {r.meeting.title}
                        {r.meeting.dayNumber != null ? ` · Day ${r.meeting.dayNumber}` : ''}
                        {r.meeting.sessionNumber != null ? ` · S${r.meeting.sessionNumber}` : ''}
                      </button>
                    )}
                    <span className="text-xs text-slate-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReviewsPage;
