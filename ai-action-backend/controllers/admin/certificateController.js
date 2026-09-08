import { Certificate, User } from '../../models/index.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import {
  generateCertificate,
  batchGenerateCertificates,
  resolvePdfUrl
} from '../../utils/certificateApi.js';
import { sendEmail } from '../../utils/emailService.js';

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatCertificate = (c) => ({
  id: c._id,
  userId: c.userId?._id || c.userId,
  userName: c.userId?.name || c.recipientName,
  userEmail: c.userId?.email || c.recipientEmail,
  recipientName: c.recipientName,
  recipientEmail: c.recipientEmail,
  courseTitle: c.courseTitle,
  issueDate: c.issueDate,
  templateId: c.templateId,
  signatory1Name: c.signatory1Name,
  signatory2Name: c.signatory2Name,
  certId: c.certId,
  verifyHash: c.verifyHash,
  pdfUrl: c.pdfUrl,
  svgUrl: c.svgUrl,
  fullPdfUrl: c.fullPdfUrl || resolvePdfUrl(c.pdfUrl),
  sendStatus: c.sendStatus,
  sentAt: c.sentAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt
});

// @desc    List saved certificates
// @route   POST /api/admin/certificates/list
export const listCertificates = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 100 } = req.body;
    const query = { isDeleted: false };

    if (search && String(search).trim()) {
      const q = String(search).trim();
      query.$or = [
        { recipientName: new RegExp(q, 'i') },
        { recipientEmail: new RegExp(q, 'i') },
        { certId: new RegExp(q, 'i') },
        { courseTitle: new RegExp(q, 'i') }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('userId', 'name email mobileNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Certificate.countDocuments(query)
    ]);

    return sendSuccess(res, 'Certificates fetched successfully', {
      certificates: certificates.map(formatCertificate),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Generate certificates for selected users and save
// @route   POST /api/admin/certificates/generate
export const generateAndSaveCertificates = async (req, res) => {
  try {
    const {
      userIds = [],
      courseTitle = 'AI IN ACTION',
      issueDate = todayISO(),
      templateId = 'ai_in_action',
      signatory1Name = 'Gouri Shankar',
      signatory2Name = 'Arpit Shah',
      sendEmailAfter = false
    } = req.body;

    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return sendError(res, 'Select at least one user', null, 400);
    }

    const users = await User.find({
      _id: { $in: ids },
      isDeleted: false,
      isActive: true
    }).select('name email');

    if (users.length === 0) {
      return sendError(res, 'No valid users found', null, 404);
    }

    const course = String(courseTitle || 'AI IN ACTION').trim();
    const date = String(issueDate || todayISO()).trim();
    const template = String(templateId || 'ai_in_action').trim();
    const sig1 = String(signatory1Name || 'Gouri Shankar').trim();
    const sig2 = String(signatory2Name || 'Arpit Shah').trim();

    const created = [];
    const errors = [];

    // Prefer batch when multiple users
    if (users.length > 1) {
      try {
        const batch = await batchGenerateCertificates({
          template_id: template,
          issue_date: date,
          signatory1_name: sig1,
          signatory2_name: sig2,
          course_title: course,
          items: users.map((u) => ({
            recipient_name: u.name,
            recipient_email: u.email || '',
            course_title: course
          }))
        });

        const byEmail = new Map();
        const byName = new Map();
        (batch.certificates || []).forEach((c) => {
          if (c.recipient_email) byEmail.set(String(c.recipient_email).toLowerCase(), c);
          if (c.recipient_name) byName.set(String(c.recipient_name).toLowerCase(), c);
        });

        for (const user of users) {
          const match =
            byEmail.get(String(user.email || '').toLowerCase()) ||
            byName.get(String(user.name || '').toLowerCase());

          if (!match?.cert_id) {
            // Fallback: generate one-by-one for this user
            try {
              const single = await generateCertificate({
                recipient_name: user.name,
                recipient_email: user.email || '',
                course_title: course,
                issue_date: date,
                template_id: template,
                signatory1_name: sig1,
                signatory2_name: sig2
              });
              const doc = await Certificate.create({
                userId: user._id,
                recipientName: user.name,
                recipientEmail: user.email || '',
                courseTitle: course,
                issueDate: date,
                templateId: template,
                signatory1Name: sig1,
                signatory2Name: sig2,
                certId: single.cert_id || '',
                verifyHash: single.verify_hash || '',
                pdfUrl: single.pdf_url || '',
                svgUrl: single.svg_url || '',
                fullPdfUrl: single.full_pdf_url || '',
                createdBy: req.admin._id
              });
              created.push(doc);
            } catch (err) {
              errors.push({ userId: user._id, name: user.name, error: err.message });
            }
            continue;
          }

          const doc = await Certificate.create({
            userId: user._id,
            recipientName: user.name,
            recipientEmail: user.email || '',
            courseTitle: course,
            issueDate: date,
            templateId: template,
            signatory1Name: sig1,
            signatory2Name: sig2,
            certId: match.cert_id || '',
            verifyHash: match.verify_hash || '',
            pdfUrl: match.pdf_url || '',
            svgUrl: match.svg_url || '',
            fullPdfUrl: match.full_pdf_url || '',
            createdBy: req.admin._id
          });
          created.push(doc);
        }
      } catch (batchErr) {
        // Full fallback: generate one-by-one
        for (const user of users) {
          try {
            const single = await generateCertificate({
              recipient_name: user.name,
              recipient_email: user.email || '',
              course_title: course,
              issue_date: date,
              template_id: template,
              signatory1_name: sig1,
              signatory2_name: sig2
            });
            const doc = await Certificate.create({
              userId: user._id,
              recipientName: user.name,
              recipientEmail: user.email || '',
              courseTitle: course,
              issueDate: date,
              templateId: template,
              signatory1Name: sig1,
              signatory2Name: sig2,
              certId: single.cert_id || '',
              verifyHash: single.verify_hash || '',
              pdfUrl: single.pdf_url || '',
              svgUrl: single.svg_url || '',
              fullPdfUrl: single.full_pdf_url || '',
              createdBy: req.admin._id
            });
            created.push(doc);
          } catch (err) {
            errors.push({ userId: user._id, name: user.name, error: err.message });
          }
        }
      }
    } else {
      const user = users[0];
      try {
        const single = await generateCertificate({
          recipient_name: user.name,
          recipient_email: user.email || '',
          course_title: course,
          issue_date: date,
          template_id: template,
          signatory1_name: sig1,
          signatory2_name: sig2
        });
        const doc = await Certificate.create({
          userId: user._id,
          recipientName: user.name,
          recipientEmail: user.email || '',
          courseTitle: course,
          issueDate: date,
          templateId: template,
          signatory1Name: sig1,
          signatory2Name: sig2,
          certId: single.cert_id || '',
          verifyHash: single.verify_hash || '',
          pdfUrl: single.pdf_url || '',
          svgUrl: single.svg_url || '',
          fullPdfUrl: single.full_pdf_url || '',
          createdBy: req.admin._id
        });
        created.push(doc);
      } catch (err) {
        return sendError(res, err.message || 'Failed to generate certificate', null, 502);
      }
    }

    let emailed = 0;
    if (sendEmailAfter && created.length > 0) {
      for (const doc of created) {
        const result = await sendCertificateEmail(doc);
        if (result.ok) emailed += 1;
      }
    }

    return sendSuccess(
      res,
      `Generated ${created.length} certificate(s)${errors.length ? `, ${errors.length} failed` : ''}`,
      {
        certificates: created.map(formatCertificate),
        created: created.length,
        failed: errors.length,
        errors,
        emailed
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

const sendCertificateEmail = async (doc) => {
  const email = doc.recipientEmail;
  if (!email) {
    doc.sendStatus = 'skipped';
    await doc.save();
    return { ok: false, reason: 'No email' };
  }

  const pdfLink = doc.fullPdfUrl || resolvePdfUrl(doc.pdfUrl);
  try {
    await sendEmail({
      to: email,
      subject: `Your Certificate — ${doc.courseTitle || 'AI IN ACTION'}`,
      templateName: 'certificate-issued',
      templateData: {
        name: doc.recipientName || 'Learner',
        courseTitle: doc.courseTitle || 'AI IN ACTION',
        certId: doc.certId || '',
        issueDate: doc.issueDate || '',
        pdfUrl: pdfLink
      },
      userId: doc.userId,
      type: 'general'
    });
    doc.sendStatus = 'sent';
    doc.sentAt = new Date();
    await doc.save();
    return { ok: true };
  } catch (err) {
    doc.sendStatus = 'failed';
    await doc.save();
    return { ok: false, reason: err.message };
  }
};

// @desc    Send certificate email(s)
// @route   POST /api/admin/certificates/send
export const sendCertificates = async (req, res) => {
  try {
    const { certificateIds = [] } = req.body;
    const ids = Array.isArray(certificateIds) ? certificateIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return sendError(res, 'certificateIds is required', null, 400);
    }

    const certificates = await Certificate.find({ _id: { $in: ids }, isDeleted: false });
    if (certificates.length === 0) {
      return sendError(res, 'No certificates found', null, 404);
    }

    let sent = 0;
    const results = [];

    for (const doc of certificates) {
      const result = await sendCertificateEmail(doc);
      if (result.ok) sent += 1;
      results.push({
        id: doc._id,
        certId: doc.certId,
        ok: result.ok,
        reason: result.reason || null,
        sendStatus: doc.sendStatus
      });
    }

    return sendSuccess(res, `Sent ${sent} of ${certificates.length} certificate email(s)`, {
      sent,
      total: certificates.length,
      results
    });
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};

// @desc    Soft delete certificate
// @route   POST /api/admin/certificates/delete
export const deleteCertificate = async (req, res) => {
  try {
    const { certificateId } = req.body;
    if (!certificateId) return sendError(res, 'certificateId is required', null, 400);

    const cert = await Certificate.findOne({ _id: certificateId, isDeleted: false });
    if (!cert) return sendError(res, 'Certificate not found', null, 404);

    cert.isDeleted = true;
    await cert.save();

    return sendSuccess(res, 'Certificate deleted successfully');
  } catch (error) {
    return sendError(res, error.message, null, 500);
  }
};
