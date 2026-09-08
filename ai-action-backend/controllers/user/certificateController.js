import { Certificate } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { resolvePdfUrl } from '../../utils/certificateApi.js';

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
