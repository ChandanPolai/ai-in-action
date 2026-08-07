import React, { useEffect, useState } from 'react';
import { ShoppingCart, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/user/courses/list');
        setCourses(res.data.courses || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBuy = () => {
    setComingSoonOpen(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Courses</h2>
        <p className="text-sm text-slate-500">Explore available courses. Purchase is Coming Soon.</p>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : courses.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No courses available yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="!p-0 overflow-hidden">
              <div className="aspect-[16/10] bg-slate-100">
                {c.image ? (
                  <img src={imageUrl(c.image)} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <BookOpen className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-lg font-bold text-slate-900">{c.title}</h3>
                <div
                  className="prose prose-sm max-w-none text-slate-600 line-clamp-4 course-details"
                  dangerouslySetInnerHTML={{ __html: c.details || '<p>No details</p>' }}
                />
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Price</span>
                    <span>₹{Number(c.price || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({c.gstPercent}%)</span>
                    <span>₹{Number(c.gstAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                    <span>Total</span>
                    <span>₹{Number(c.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setSelected(c)}
                  >
                    View Details
                  </Button>
                  <Button fullWidth icon={ShoppingCart} onClick={handleBuy}>
                    Buy
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Course'}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            {selected.image && (
              <img
                src={imageUrl(selected.image)}
                alt={selected.title}
                className="w-full max-h-56 object-cover rounded-xl"
              />
            )}
            <div
              className="prose prose-sm max-w-none text-slate-700 course-details"
              dangerouslySetInnerHTML={{ __html: selected.details || '<p>No details</p>' }}
            />
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Price</span>
                <span>₹{Number(selected.price || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({selected.gstPercent}%)</span>
                <span>₹{Number(selected.gstAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                <span>Total</span>
                <span>₹{Number(selected.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <Button fullWidth icon={ShoppingCart} onClick={handleBuy}>
              Buy
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        title="Coming Soon"
        size="sm"
      >
        <div className="space-y-4 text-center py-2">
          <p className="text-slate-600">
            Course purchase is <strong>Coming Soon</strong>. Please check back later.
          </p>
          <Button fullWidth onClick={() => setComingSoonOpen(false)}>
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CoursesPage;
