import React, { useEffect, useState } from 'react';
import { Award, Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await postRequest('/user/certificates/list');
        setCertificates(res.data.certificates || []);
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
        <h2 className="text-2xl font-extrabold text-slate-900">Certificates</h2>
        <p className="text-sm text-slate-500">Your certificates issued by AI in Action.</p>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-400">Loading...</p>
      ) : certificates.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-slate-400">No certificates yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900">{c.courseTitle || 'Certificate'}</h3>
                  <p className="text-sm text-slate-500">{c.recipientName}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-1 rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="flex justify-between gap-2">
                  <span>Certificate ID</span>
                  <span className="font-mono text-slate-700">{c.certId || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Issue date</span>
                  <span className="text-slate-700">{c.issueDate || '—'}</span>
                </div>
              </div>
              {c.fullPdfUrl ? (
                <div className="flex gap-2">
                  <Button
                    fullWidth
                    icon={Download}
                    onClick={() => window.open(c.fullPdfUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Download PDF
                  </Button>
                  <Button
                    variant="secondary"
                    icon={ExternalLink}
                    onClick={() => window.open(c.fullPdfUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">PDF link not available</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CertificatesPage;
