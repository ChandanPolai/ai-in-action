import { Certificate } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { resolvePdfUrl, fetchCertificateFile } from '../../utils/certificateApi.js';

// @desc    List certificates for logged-in user
// @route   POST /api/user/certificates/list
export const listMyCertificates = async (req, res) => {
  try {
    const userId = req.user._id;

    const certificates = await Certificate.find({
      userId,
      isDeleted: false
    })
      .select(
        'recipientName courseTitle issueDate certId verifyHash pdfUrl svgUrl fullPdfUrl sendStatus sentAt createdAt'
      )
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Certificates fetched successfully', {
      certificates: certificates.map((c) => ({
        id: c._id,
        recipientName: c.recipientName,
        courseTitle: c.courseTitle,
        issueDate: c.issueDate,
        certId: c.certId,
        verifyHash: c.verifyHash,
        pdfUrl: c.pdfUrl,
        svgUrl: c.svgUrl,
        fullPdfUrl: c.fullPdfUrl || resolvePdfUrl(c.pdfUrl),
        sendStatus: c.sendStatus,
        sentAt: c.sentAt,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Stream certificate PDF inline for in-app preview (no forced download)
// @route   POST /api/user/certificates/preview
export const previewMyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.body;
    if (!certificateId) return sendError(res, 'certificateId is required', null, 400);

    const cert = await Certificate.findOne({
      _id: certificateId,
      userId: req.user._id,
      isDeleted: false
    });
    if (!cert) return sendError(res, 'Certificate not found', null, 404);

    const pdfUrl = cert.fullPdfUrl || resolvePdfUrl(cert.pdfUrl);
    if (!pdfUrl) return sendError(res, 'PDF not available for this certificate', null, 404);

    const { buffer, contentType } = await fetchCertificateFile(pdfUrl);
    const type = contentType.includes('pdf') ? 'application/pdf' : contentType;

    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', 'inline; filename="certificate.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(buffer);
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
