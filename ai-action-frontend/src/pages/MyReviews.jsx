import React, { useEffect, useState } from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatDate, formatDateTime } from '../utils/formatDate';

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

const MyReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await postRequest('/user/meetings/my-reviews', {});
        setReviews(res.data.reviews || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">My Reviews</h2>
        <p className="text-sm text-slate-500">
          Meeting-wise reviews you have submitted
        </p>
      </div>

      <Card subtitle={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`}>
        {loading ? (
          <p className="text-center py-10 text-slate-400">Loading...</p>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareQuote className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">You have not submitted any reviews yet</p>
            <p className="text-xs text-slate-400 mt-1">
              After a completed meeting you attended, you can leave a review from My Meetings
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-bold text-slate-800">
                    {r.meeting?.title || 'Meeting'}
                  </p>
                  {r.meeting?.dayNumber != null && (
                    <Badge>Day {r.meeting.dayNumber}</Badge>
                  )}
                  {r.meeting?.sessionNumber != null && (
                    <Badge>Session {r.meeting.sessionNumber}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  {r.meeting?.meetingDate ? formatDate(r.meeting.meetingDate) : ''}
                  {r.meeting?.startTime
                    ? ` · ${r.meeting.startTime}${r.meeting.endTime ? ` – ${r.meeting.endTime}` : ''}`
                    : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Stars value={r.rating} />
                  <Badge variant="info">{r.rating}/5</Badge>
                  <span className="text-xs text-slate-400">
                    Submitted {r.createdAt ? formatDateTime(r.createdAt) : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {r.comment?.trim() || (
                    <span className="text-slate-400 italic">No comment written</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MyReviewsPage;
