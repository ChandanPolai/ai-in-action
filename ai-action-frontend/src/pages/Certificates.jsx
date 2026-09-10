import React, { useEffect, useState } from 'react';
import { Award, Download, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { postRequest, postBlobRequest } from '../services/apiClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const closePreview = () => {
    setPreviewCert(null);
    setPreviewLoading(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  };

  const openPreview = async (cert) => {
    setPreviewCert(cert);
    setPreviewLoading(true);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    try {
      const blob = await postBlobRequest('/user/certificates/preview', {
        certificateId: cert.id
      });
      const pdfBlob =
        blob.type && blob.type.includes('pdf')
          ? blob
          : new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err.message || 'Failed to load preview');
      closePreview();
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadCert = (cert) => {
    if (!cert?.fullPdfUrl) return;
    const a = document.createElement('a');
    a.href = cert.fullPdfUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${cert.certId || 'certificate'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
                  <Button fullWidth icon={Eye} onClick={() => openPreview(c)}>
                    Preview
                  </Button>
                  <Button fullWidth variant="secondary" icon={Download} onClick={() => downloadCert(c)}>
                    Download
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">PDF link not available</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!previewCert}
        onClose={closePreview}
        title={previewCert?.courseTitle || 'Certificate preview'}
        size="xl"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              disabled={!previewCert?.fullPdfUrl}
              onClick={() => downloadCert(previewCert)}
            >
              Download PDF
            </Button>
          </div>
          {previewLoading ? (
            <p className="text-center py-16 text-slate-400">Loading preview...</p>
          ) : previewUrl ? (
            <iframe
              title="Certificate preview"
              src={previewUrl}
              className="w-full h-[70vh] rounded-xl border border-slate-200 bg-slate-50"
            />
          ) : (
            <p className="text-center py-16 text-slate-400">Preview unavailable</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CertificatesPage;
