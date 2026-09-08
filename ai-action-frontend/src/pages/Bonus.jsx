import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, imageUrl } from '../services/apiClient';
import Card from '../components/ui/Card';

const BonusPage = () => {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/user/bonuses/list');
        setBonuses(res.data.bonuses || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Bonus</h2>
        <p className="text-sm text-slate-500">Bonuses assigned to you by admin.</p>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : bonuses.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No bonuses assigned to you yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bonuses.map((b) => (
            <Card key={b.id} className="!p-0 overflow-hidden">
              <div className="aspect-[16/10] bg-slate-100">
                {b.image ? (
                  <img src={imageUrl(b.image)} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Gift className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-lg font-bold text-slate-900">{b.title}</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {b.description || 'No description'}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold">
                    ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BonusPage;
