import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, CheckCircle2, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import { formatDate, formatDateTime } from '../utils/formatDate';

const MeetingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [byDay, setByDay] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [reviewMeeting, setReviewMeeting] = useState(null);
  const [viewReviewMeeting, setViewReviewMeeting] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const allMeetings = useMemo(() => Object.values(byDay).flat(), [byDay]);

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const res = await postRequest('/user/meetings/list', { filter: f });
      setByDay(res.data.byDay || {});
      return res.data.byDay || {};
    } catch (err) {
      toast.error(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const reviewId = searchParams.get('reviewMeetingId');
    if (!reviewId || loading) return;

    const found = allMeetings.find((m) => String(m.id) === String(reviewId));
    if (found) {
      openReview(found);
      searchParams.delete('reviewMeetingId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, loading, allMeetings]);

  const openReview = (meeting) => {
    if (meeting.status !== 'completed') {
      toast.info('Review is available after the meeting is completed');
      return;
    }
    if (!meeting.alreadyAttended) {
      toast.info('Only attendees who were present can review');
      return;
    }
    if (meeting.hasReview) {
      setViewReviewMeeting(meeting);
      return;
    }
    setReviewMeeting(meeting);
    setRating(5);
    setComment('');
  };

  const openViewReview = (meeting) => {
    if (!meeting?.myReview) {
      toast.info('No review found for this meeting');
      return;
    }
    setViewReviewMeeting(meeting);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewMeeting) return;
    setSubmitting(true);
    try {
      await postRequest('/user/meetings/review', {
        meetingId: reviewMeeting.id,
        rating,
        comment
      });
      toast.success('Review submitted — thank you!');
      setReviewMeeting(null);
      await load(filter);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const joinMeeting = async (meeting) => {
    if (meeting.status !== 'live' && !meeting.alreadyAttended) {
      toast.info('Meeting is not live yet. Wait until admin sets it to Live.');
      return;
    }

    if (meeting.alreadyAttended) {
      toast.info('Already attended');
      if (meeting.zoomLink) {
        window.open(meeting.zoomLink, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setJoining(meeting.id);
    try {
      const res = await postRequest('/user/meetings/join', { meetingId: meeting.id });

      if (res.data?.alreadyAttended) {
        toast.info('Already attended');
      } else {
        toast.success('Attendance marked — opening Zoom...');
      }

      if (res.data?.zoomLink) {
        window.open(res.data.zoomLink, '_blank', 'noopener,noreferrer');
      }

      await load(filter);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(null);
    }
  };

  const days = Object.keys(byDay).sort((a, b) => {
    const na = Number(a.replace(/\D/g, '')) || 0;
    const nb = Number(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  const statusBadge = (status) => {
    if (status === 'live') return <Badge variant="danger">Live</Badge>;
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'cancelled') return <Badge variant="default">Cancelled</Badge>;
    return <Badge variant="info">Upcoming</Badge>;
  };

  const timeLabel = (m) => {
    const start = m.startTime || m.meetingTime || '';
    const end = m.endTime || '';
    return end ? `${start} – ${end}` : start;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">My Meetings</h2>
          <p className="text-sm text-slate-500">
            Attendance only on Live meetings · review after completed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'live', 'upcoming', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                load(f);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                filter === f ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : days.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No meetings assigned yet</p>
        </Card>
      ) : (
        days.map((day) => (
          <Card key={day} title={day} subtitle={`${byDay[day].length} session(s)`}>
            <div className="space-y-3">
              {byDay[day].map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
                    m.status === 'live' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{m.title}</p>
                      {statusBadge(m.status)}
                      <Badge>Session {m.sessionNumber}</Badge>
                      {m.alreadyAttended && <Badge variant="success">Already attended</Badge>}
                      {m.hasReview && <Badge variant="info">Reviewed</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {m.meetingDate ? formatDate(m.meetingDate) : ''} · {timeLabel(m)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {m.status === 'live' ? (
                      m.alreadyAttended ? (
                        <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => joinMeeting(m)}>
                          Already Attended
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          icon={ExternalLink}
                          disabled={joining === m.id}
                          onClick={() => joinMeeting(m)}
                        >
                          {joining === m.id ? 'Joining...' : 'Join Zoom'}
                        </Button>
                      )
                    ) : m.status === 'upcoming' ? (
                      <Badge variant="warning">Wait for Live</Badge>
                    ) : null}

                    {m.status === 'completed' && m.alreadyAttended && (
                      m.hasReview ? (
                        <Button size="sm" variant="secondary" icon={Star} onClick={() => openViewReview(m)}>
                          View Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" icon={Star} onClick={() => openReview(m)}>
                          Review
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Drawer
        isOpen={Boolean(reviewMeeting)}
        onClose={() => setReviewMeeting(null)}
        title="Meeting Review"
        size="md"
      >
        {reviewMeeting && (
          <form onSubmit={submitReview} className="space-y-4">
            <div>
              <p className="font-bold text-slate-800">{reviewMeeting.title}</p>
              <p className="text-sm text-slate-500 mt-1">
                {reviewMeeting.meetingDate ? formatDate(reviewMeeting.meetingDate) : ''} ·{' '}
                {timeLabel(reviewMeeting)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1"
                    aria-label={`${n} star`}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Your feedback
              </label>
              <textarea
                className="custom-input !h-auto py-3"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was this meeting? What went well?"
                maxLength={1000}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" fullWidth type="button" onClick={() => setReviewMeeting(null)}>
                Cancel
              </Button>
              <Button fullWidth type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        )}
      </Drawer>

      <Drawer
        isOpen={Boolean(viewReviewMeeting)}
        onClose={() => setViewReviewMeeting(null)}
        title="Your Review"
        size="md"
      >
        {viewReviewMeeting?.myReview && (
          <div className="space-y-4">
            <div>
              <p className="font-bold text-slate-800">{viewReviewMeeting.title}</p>
              <p className="text-sm text-slate-500 mt-1">
                {viewReviewMeeting.meetingDate ? formatDate(viewReviewMeeting.meetingDate) : ''} ·{' '}
                {timeLabel(viewReviewMeeting)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Your rating
              </label>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-6 h-6 ${
                        n <= viewReviewMeeting.myReview.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <Badge variant="info">{viewReviewMeeting.myReview.rating}/5</Badge>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Your feedback
              </label>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                {viewReviewMeeting.myReview.comment?.trim() || (
                  <span className="text-slate-400 italic">No comment written</span>
                )}
              </p>
            </div>

            <p className="text-xs text-slate-400">
              Submitted{' '}
              {viewReviewMeeting.myReview.createdAt
                ? formatDateTime(viewReviewMeeting.myReview.createdAt)
                : ''}
            </p>

            <Button fullWidth variant="secondary" onClick={() => setViewReviewMeeting(null)}>
              Close
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MeetingsPage;
