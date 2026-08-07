import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Notification } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createTransporter = () => {
  const emailUser = process.env.MAILER_EMAIL || process.env.SMTP_USER;
  const emailPass = process.env.MAILER_PASSWORD || process.env.SMTP_PASS;

  if (emailUser && emailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  return {
    sendMail: async (mailOptions) => {
      console.log('====================================================');
      console.log('[EMAIL SERVICE - DEV MOCK SEND]');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Body Preview:', mailOptions.html ? mailOptions.html.substring(0, 400) : mailOptions.text);
      console.log('====================================================');
      return { messageId: 'mock-email-id-' + Date.now() };
    }
  };
};

const renderEjsTemplate = (templateName, data) => {
  const templatePath = path.join(__dirname, '../views', `${templateName}.ejs`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template ${templateName}.ejs not found`);
  }

  let content = fs.readFileSync(templatePath, 'utf-8');

  Object.keys(data).forEach((key) => {
    const value = data[key] !== undefined && data[key] !== null ? data[key] : '';
    const regex = new RegExp(`<%=\\s*${key}\\s*%>`, 'g');
    content = content.replace(regex, value);
  });

  content = content.replace(/<%[\s\S]*?%>/g, '');
  return content;
};

/**
 * Log notification for future WhatsApp / multi-channel support
 */
const logNotification = async ({ userId, channel, type, title, message, status, error = '' }) => {
  try {
    await Notification.create({
      userId: userId || null,
      channel,
      type,
      title,
      message,
      status,
      sentAt: status === 'sent' ? new Date() : null,
      error
    });
  } catch (err) {
    console.error('[NOTIFICATION LOG ERROR]:', err.message);
  }
};

export const sendEmail = async ({ to, subject, templateName, templateData, html, text, userId, type = 'general' }) => {
  try {
    const transporter = createTransporter();
    let bodyHtml = html;

    if (templateName && templateData) {
      bodyHtml = renderEjsTemplate(templateName, templateData);
    }

    const fromEmail = process.env.MAILER_EMAIL || process.env.SMTP_USER || process.env.EMAIL_FROM_ADDRESS || 'noreply@aiinaction.com';

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'AI in Action'}" <${fromEmail}>`,
      to,
      subject,
      html: bodyHtml,
      text: text || 'Please view this email in an HTML compatible mail client.'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Sent to ${to}. MessageId: ${info.messageId}`);

    await logNotification({
      userId,
      channel: 'email',
      type,
      title: subject,
      message: text || subject,
      status: 'sent'
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL SERVICE ERROR]:', error.message);
    await logNotification({
      userId,
      channel: 'email',
      type,
      title: subject,
      message: text || subject,
      status: 'failed',
      error: error.message
    });
    return { success: false, error: error.message };
  }
};

export const sendLoginCredentialsEmail = async (userEmail, name, password, userId = null) => {
  const loginUrl = process.env.USER_APP_URL || 'http://localhost:3001';

  return await sendEmail({
    to: userEmail,
    subject: 'AI in Action - Your Login Credentials',
    templateName: 'login-credentials',
    templateData: {
      name,
      email: userEmail,
      password,
      loginUrl
    },
    userId,
    type: 'login-credentials'
  });
};

/**
 * Future WhatsApp hook — logs as skipped until provider is wired
 */
export const sendWhatsAppNotification = async ({ userId, mobile, message, type = 'general' }) => {
  console.log(`[WHATSAPP STUB] To: ${mobile} | Message: ${message}`);
  await logNotification({
    userId,
    channel: 'whatsapp',
    type,
    title: 'WhatsApp Notification',
    message,
    status: 'skipped',
    error: 'WhatsApp provider not configured yet'
  });
  return { success: false, skipped: true };
};

export default {
  sendEmail,
  sendLoginCredentialsEmail,
  sendWhatsAppNotification
};
