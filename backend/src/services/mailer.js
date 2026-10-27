const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = process.env.SMTP_SECURE === 'false' ? false : true;
    const user = process.env.SMTP_USER || 'aditi@surfsyncinfotech.in';
    const pass = process.env.SMTP_PASS || 'Aditi@surfsync2024';

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return transporter;
}

/**
 * Send quotation email with optional PDF attachment
 */
async function sendQuotationEmail({ to, subject, body, pdfUrl, pdfFilename }) {
  if (!to) {
    throw new Error('Recipient email is required');
  }
  if (!subject) {
    throw new Error('Email subject is required');
  }

  const from = process.env.SMTP_FROM || `"SurfSync Infotech Pvt. Ltd." <${process.env.SMTP_USER || 'aditi@surfsyncinfotech.in'}>`;
  const mailOptions = {
    from,
    to,
    subject,
    text: body,
    html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #2d3748; white-space: pre-wrap;">${body}</div>`,
    attachments: [],
  };

  // If a quotation PDF is attached, attach it directly from the local disk
  if (pdfUrl) {
    const relativePart = pdfUrl.replace(/^\/uploads\//, '');
    const absolutePath = path.resolve(__dirname, '../../uploads', relativePart);
    if (fs.existsSync(absolutePath)) {
      mailOptions.attachments.push({
        filename: pdfFilename || path.basename(absolutePath),
        path: absolutePath,
      });
    }
  }

  const transport = getTransporter();
  const info = await transport.sendMail(mailOptions);
  return info;
}

module.exports = {
  getTransporter,
  sendQuotationEmail,
};
