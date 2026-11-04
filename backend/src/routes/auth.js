const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const pinbot = require('../services/pinbot');
const { sendQuotationEmail } = require('../services/mailer');
const { sendOtpSms } = require('../services/sms');

const router = express.Router();

function issueToken(user) {
  let permissions = [];
  if (user.permissions) {
    try {
      permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } catch (e) {
      permissions = [];
    }
  }
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      custom_role: user.custom_role || null,
      permissions: Array.isArray(permissions) ? permissions : [],
      company_id: user.company_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user, company = null) {
  let permissions = [];
  if (user.permissions) {
    try {
      permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    } catch (e) {
      permissions = [];
    }
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    custom_role: user.custom_role || null,
    permissions: Array.isArray(permissions) ? permissions : [],
    company_id: user.company_id,
    company,
  };
}

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.custom_role, u.permissions, u.company_id, u.is_active,
            c.name AS company_name, c.status AS company_status, c.slug AS company_slug
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE LOWER(u.email) = LOWER(?) LIMIT 1`,
    [email]
  );
  return rows[0];
}

async function getCompanySummary(companyId) {
  if (!companyId) return null;
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.status, p.name AS plan_name
     FROM companies c
     LEFT JOIN subscription_plans p ON p.id = c.plan_id
     WHERE c.id = ? LIMIT 1`,
    [companyId]
  );
  const company = rows[0];
  if (!company) return null;

  const [pending] = await pool.query(
    `SELECT pay.*, pl.name AS plan_name
     FROM payments pay
     LEFT JOIN subscription_plans pl ON pl.id = pay.plan_id
     WHERE pay.company_id = ? AND pay.status = 'pending'
     ORDER BY pay.due_date ASC, pay.id ASC LIMIT 1`,
    [companyId]
  );
  company.pending_invoice = pending[0] || null;
  return company;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password, portal = 'superadmin', role_tag } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (portal === 'company' || portal === 'sales') {
      if (user.role === 'superadmin' || !user.company_id) {
        return res.status(403).json({ message: 'Use the sales/company portal credentials to sign in here' });
      }

      const company = await getCompanySummary(user.company_id);
      if (!company) {
        return res.status(403).json({ message: 'No company linked to this account' });
      }
      if (['suspended', 'cancelled'].includes(company.status) && !company.pending_invoice) {
        return res.status(403).json({ message: `Company is ${company.status}. Contact SurfSync support.` });
      }

      // Strict portal-to-role restrictions
      if (portal === 'sales' && user.role !== 'salesperson') {
        return res.status(403).json({
          message: 'Admin/Manager credentials cannot access the Sales Console. Please sign in via the Company Admin Portal.',
        });
      }

      if (portal === 'company' && user.role !== 'company_admin') {
        return res.status(403).json({
          message: 'Salesperson credentials cannot access the Company Admin Portal. Please sign in via the Sales Console.',
        });
      }

      // Strict role check for Company Portal (dynamic role matching)
      if (portal === 'company' && role_tag) {
        const selectedTag = String(role_tag).trim().toLowerCase();
        const customRole = user.custom_role ? String(user.custom_role).trim() : null;
        const isPrimaryAdmin = !customRole || customRole.toLowerCase() === 'admin';

        if (isPrimaryAdmin) {
          if (selectedTag !== 'admin') {
            return res.status(403).json({
              message: `Access Denied: This account is registered as Company Admin. You cannot sign in under the '${role_tag}' tag. Please select the Admin tag.`,
            });
          }
        } else {
          // User has a specific registered role (e.g. Manager, CEO, HR)
          if (selectedTag === 'admin') {
            return res.status(403).json({
              message: `Access Denied: This account is registered as ${customRole}. You cannot sign in under the Admin tag. Please select the ${customRole} tag.`,
            });
          }
          if (selectedTag !== customRole.toLowerCase()) {
            return res.status(403).json({
              message: `Access Denied: This account is registered as ${customRole}. You cannot sign in under the '${role_tag}' tag. Please select the ${customRole} tag.`,
            });
          }
        }
      }

      const token = issueToken(user);
      return res.json({ token, user: publicUser(user, company) });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin access only for this portal. Please sign in through your designated portal.' });
    }

    const token = issueToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, name, email, role, custom_role, permissions, company_id, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.id]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found' });
    }

    const company = await getCompanySummary(user.company_id);
    res.json({ user: publicUser(user, company) });
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

router.get('/company-portal/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.slug, c.status,
              (SELECT u.email FROM users u
               WHERE u.company_id = c.id AND u.role = 'company_admin'
               ORDER BY u.id ASC LIMIT 1) AS admin_email
       FROM companies c
       WHERE c.slug = ?
       LIMIT 1`,
      [req.params.slug]
    );

    const company = rows[0];
    if (!company) {
      return res.status(404).json({ message: 'Company portal not found' });
    }

    const [pending] = await pool.query(
      `SELECT id FROM payments WHERE company_id = ? AND status = 'pending' LIMIT 1`,
      [company.id]
    );
    const hasPendingInvoice = pending.length > 0;

    if (['suspended', 'cancelled'].includes(company.status) && !hasPendingInvoice) {
      return res.status(403).json({ message: `Company is ${company.status}` });
    }

    const [roleRows] = await pool.query(
      `SELECT DISTINCT custom_role FROM users
       WHERE company_id = ? AND role = 'company_admin' AND is_active = 1 AND custom_role IS NOT NULL AND TRIM(custom_role) != ''`,
      [company.id]
    );

    const roles = [{ id: 'admin', label: 'Admin' }];
    const seen = new Set(['admin']);

    for (const row of roleRows) {
      const label = String(row.custom_role || '').trim();
      const id = label.toLowerCase();
      if (label && !seen.has(id)) {
        seen.add(id);
        roles.push({ id, label });
      }
    }

    if (!seen.has('manager')) {
      roles.push({ id: 'manager', label: 'Manager' });
    }

    res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        admin_email: company.admin_email || '',
      },
      roles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load company portal' });
  }
});

router.get('/company-roles', async (req, res) => {
  try {
    const { slug, email } = req.query || {};
    let companyId = null;

    if (slug) {
      const [c] = await pool.query('SELECT id FROM companies WHERE slug = ? LIMIT 1', [slug]);
      if (c[0]) companyId = c[0].id;
    } else if (email) {
      const [u] = await pool.query('SELECT company_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
      if (u[0]) companyId = u[0].company_id;
    }

    const roles = [{ id: 'admin', label: 'Admin' }];
    const seen = new Set(['admin']);

    if (companyId) {
      const [roleRows] = await pool.query(
        `SELECT DISTINCT custom_role FROM users
         WHERE company_id = ? AND role = 'company_admin' AND is_active = 1 AND custom_role IS NOT NULL AND TRIM(custom_role) != ''`,
        [companyId]
      );
      for (const row of roleRows) {
        const label = String(row.custom_role || '').trim();
        const id = label.toLowerCase();
        if (label && !seen.has(id)) {
          seen.add(id);
          roles.push({ id, label });
        }
      }
    }

    if (!seen.has('manager')) {
      roles.push({ id: 'manager', label: 'Manager' });
    }

    res.json({ roles });
  } catch (err) {
    console.error(err);
    res.json({ roles: [{ id: 'admin', label: 'Admin' }, { id: 'manager', label: 'Manager' }] });
  }
});

/**
 * POST /api/auth/sales/forgot-password/send-otp
 * Send 4-digit demo OTP to salesperson's registered mobile number
 */
router.post('/sales/forgot-password/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body || {};
    if (!mobile || !String(mobile).trim()) {
      return res.status(400).json({ message: 'Please enter your registered mobile number' });
    }

    const rawInput = String(mobile).trim();
    const cleanPhone = rawInput.replace(/[\s\-\+\(\)]/g, '').replace(/^91/, '');

    // Search active salesperson by phone or email
    const [rows] = await pool.query(
      `SELECT id, name, email, agent_phone, company_id
       FROM users
       WHERE role = 'salesperson' AND is_active = 1
         AND (
           agent_phone = ?
           OR REPLACE(REPLACE(REPLACE(agent_phone, ' ', ''), '-', ''), '+91', '') = ?
           OR LOWER(email) = LOWER(?)
         )
       LIMIT 1`,
      [rawInput, cleanPhone, rawInput]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({
        message: 'No active salesperson found with this mobile number. Please check or contact admin.',
      });
    }

    // Configurable DLT & Validity variables
    const validMinutes = Number(process.env.OTP_VALID_MINUTES) || 10;
    const resendSeconds = Number(process.env.OTP_RESEND_SECONDS) || 60;

    // Rate-limit check (prevent resending before OTP_RESEND_SECONDS)
    const [recentRequests] = await pool.query(
      `SELECT id, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_sec
       FROM sales_password_resets
       WHERE user_id = ? AND TIMESTAMPDIFF(SECOND, created_at, NOW()) < ?
       ORDER BY id DESC LIMIT 1`,
      [user.id, resendSeconds]
    );

    if (recentRequests.length > 0) {
      const waitTime = Math.max(1, resendSeconds - recentRequests[0].elapsed_sec);
      return res.status(429).json({
        message: `Please wait ${waitTime}s before requesting a new OTP.`,
        retryAfter: waitTime,
      });
    }

    // Generate random 4-digit OTP
    const otp = String(Math.floor(1000 + Math.random() * 9000));

    // Construct DLT-approved SMS message replacing {#var#} placeholders
    // First {#var#} = OTP, second {#var#} = validity minutes
    const rawTemplate = process.env.SMS_OTP_MESSAGE || "Your SurfSync Infotech verification code is {#var#}. This OTP is valid for {#var#} minutes. Do not share this code with anyone.";
    const smsMessage = rawTemplate.replace('{#var#}', otp).replace('{#var#}', String(validMinutes));

    console.log(`[DLT SMS OTP] Sending to ${user.agent_phone || rawInput}: "${smsMessage}"`);

    // Invalidate any previous pending OTPs for this user
    await pool.query(
      'DELETE FROM sales_password_resets WHERE user_id = ?',
      [user.id]
    );

    // Save OTP to DB (valid for OTP_VALID_MINUTES)
    const targetPhone = user.agent_phone || rawInput;
    await pool.query(
      `INSERT INTO sales_password_resets (user_id, phone, otp, expires_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())`,
      [user.id, targetPhone, otp, validMinutes]
    );

    // Live Delivery 1: Deliver directly to Mobile Carrier via SmartPing Sparc DLT SMS Gateway
    try {
      await sendOtpSms({ phone: targetPhone, otp, validMinutes });
    } catch (smsErr) {
      console.error('[OTP SmartPing SMS Error]:', smsErr.message);
    }

    // Live Delivery 2: Deliver directly to Salesperson WhatsApp via Pinbot API
    const digitsOnly = targetPhone.replace(/\D/g, '');
    const intlPhone = digitsOnly.startsWith('91') && digitsOnly.length === 12
      ? digitsOnly
      : digitsOnly.length === 10
        ? `91${digitsOnly}`
        : digitsOnly;

    if (process.env.PINBOT_API_KEY && process.env.PINBOT_PHONE_NUMBER_ID && intlPhone.length >= 10) {
      try {
        const payload = pinbot.buildText(intlPhone, smsMessage);
        const waRes = await pinbot.sendMessage({
          apiKey: process.env.PINBOT_API_KEY,
          phoneNumberId: process.env.PINBOT_PHONE_NUMBER_ID,
          payload,
        });
        console.log(`[OTP WhatsApp] Delivered to ${intlPhone} (MsgID: ${waRes?.waMessageId || 'OK'})`);
      } catch (waErr) {
        console.error('[OTP WhatsApp Delivery Error]:', waErr.message);
      }
    }

    // Live Delivery 2: Deliver to Salesperson registered Email via SMTP as secure backup
    if (user.email) {
      try {
        await sendQuotationEmail({
          to: user.email,
          subject: 'SurfSync Infotech - Verification Code',
          body: smsMessage,
        });
        console.log(`[OTP Email] Delivered to ${user.email}`);
      } catch (mailErr) {
        console.error('[OTP Email Delivery Error]:', mailErr.message);
      }
    }

    // Mask phone for privacy (e.g. ******7099)
    const displayPhone = targetPhone.length >= 4
      ? '*'.repeat(Math.max(0, targetPhone.length - 4)) + targetPhone.slice(-4)
      : targetPhone;

    res.json({
      success: true,
      message: `Verification code sent to your registered mobile and WhatsApp (${displayPhone}). Valid for ${validMinutes} minutes.`,
      maskedPhone: displayPhone,
      validMinutes,
      resendSeconds,
      userId: user.id,
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ message: err.message || 'Failed to send OTP' });
  }
});

/**
 * POST /api/auth/sales/forgot-password/verify-otp
 * Verify 4-digit OTP
 */
router.post('/sales/forgot-password/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ message: 'Mobile and 4-digit OTP are required' });
    }

    const rawInput = String(mobile).trim();
    const cleanPhone = rawInput.replace(/[\s\-\+\(\)]/g, '').replace(/^91/, '');
    const cleanOtp = String(otp).trim();

    // Find the reset record
    const [rows] = await pool.query(
      `SELECT r.*, u.id AS user_id, u.name, u.email
       FROM sales_password_resets r
       JOIN users u ON u.id = r.user_id
       WHERE (
         r.phone = ?
         OR REPLACE(REPLACE(REPLACE(r.phone, ' ', ''), '-', ''), '+91', '') = ?
         OR LOWER(u.email) = LOWER(?)
       )
       AND r.expires_at > NOW()
       ORDER BY r.id DESC
       LIMIT 1`,
      [rawInput, cleanPhone, rawInput]
    );

    const resetRow = rows[0];
    if (!resetRow) {
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new OTP.' });
    }

    // Strict security check: Must match the database OTP exactly (no backdoors)
    if (resetRow.otp !== cleanOtp) {
      return res.status(400).json({ message: 'Invalid 4-digit OTP. Please check your messages and try again.' });
    }

    // Mark verified
    await pool.query(
      'UPDATE sales_password_resets SET is_verified = 1 WHERE id = ?',
      [resetRow.id]
    );

    // Create a temporary signed verification token (valid 15m)
    const verifyToken = jwt.sign(
      {
        resetId: resetRow.id,
        userId: resetRow.user_id,
        purpose: 'sales_password_reset',
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully! Please enter your new password.',
      verifyToken,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: err.message || 'Failed to verify OTP' });
  }
});

/**
 * POST /api/auth/sales/forgot-password/reset-password
 * Set new password after verified OTP
 */
router.post('/sales/forgot-password/reset-password', async (req, res) => {
  try {
    const { verifyToken, newPassword } = req.body || {};
    if (!verifyToken || !newPassword) {
      return res.status(400).json({ message: 'Verification token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    let payload;
    try {
      payload = jwt.verify(verifyToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please request a new OTP.' });
    }

    if (payload.purpose !== 'sales_password_reset' || !payload.userId) {
      return res.status(403).json({ message: 'Invalid reset token' });
    }

    // Verify DB record
    const [resetRows] = await pool.query(
      'SELECT * FROM sales_password_resets WHERE id = ? AND is_verified = 1 LIMIT 1',
      [payload.resetId]
    );
    if (!resetRows[0]) {
      return res.status(400).json({ message: 'Reset request is no longer valid or already used' });
    }

    // Hash password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query(
      `UPDATE users 
       SET password_hash = ?, login_password = ?, updated_at = NOW() 
       WHERE id = ?`,
      [hash, newPassword, payload.userId]
    );

    // Clean up used reset record
    await pool.query('DELETE FROM sales_password_resets WHERE id = ?', [payload.resetId]);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: err.message || 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/company/forgot-password/send-otp
 * Send 4-digit OTP to company admin's registered mobile number via SmartPing SMS & WhatsApp
 */
router.post('/company/forgot-password/send-otp', async (req, res) => {
  try {
    const { mobile, slug } = req.body || {};
    if (!mobile || !String(mobile).trim()) {
      return res.status(400).json({ message: 'Please enter your registered mobile number or email' });
    }

    const rawInput = String(mobile).trim();
    const cleanPhone = rawInput.replace(/[\s\-\+\(\)]/g, '').replace(/^91/, '');

    // Search active company_admin by phone or email, optionally filtered by slug if provided
    let query = `
      SELECT u.id, u.name, u.email, u.agent_phone, u.company_id, c.phone AS company_phone, c.name AS company_name
      FROM users u
      JOIN companies c ON c.id = u.company_id
      WHERE u.role = 'company_admin' AND u.is_active = 1
        AND (
          u.agent_phone = ?
          OR REPLACE(REPLACE(REPLACE(u.agent_phone, ' ', ''), '-', ''), '+91', '') = ?
          OR c.phone = ?
          OR REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '+91', '') = ?
          OR LOWER(u.email) = LOWER(?)
        )
    `;
    const params = [rawInput, cleanPhone, rawInput, cleanPhone, rawInput];

    if (slug && String(slug).trim()) {
      query += ` AND c.slug = ?`;
      params.push(String(slug).trim().toLowerCase());
    }

    query += ` LIMIT 1`;

    const [rows] = await pool.query(query, params);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        message: 'No active company admin found with this mobile number or email. Please check and try again.',
      });
    }

    // Configurable DLT & Validity variables
    const validMinutes = Number(process.env.OTP_VALID_MINUTES) || 10;
    const resendSeconds = Number(process.env.OTP_RESEND_SECONDS) || 60;

    // Rate-limit check (prevent resending before OTP_RESEND_SECONDS)
    const [recentRequests] = await pool.query(
      `SELECT id, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_sec
       FROM company_password_resets
       WHERE user_id = ? AND TIMESTAMPDIFF(SECOND, created_at, NOW()) < ?
       ORDER BY id DESC LIMIT 1`,
      [user.id, resendSeconds]
    );

    if (recentRequests.length > 0) {
      const waitTime = Math.max(1, resendSeconds - recentRequests[0].elapsed_sec);
      return res.status(429).json({
        message: `Please wait ${waitTime}s before requesting a new OTP.`,
        retryAfter: waitTime,
      });
    }

    // Generate random 4-digit OTP
    const otp = String(Math.floor(1000 + Math.random() * 9000));

    // Construct DLT-approved SMS message replacing {#var#} placeholders
    const rawTemplate = process.env.SMS_OTP_MESSAGE ||
      "Your SurfSync Infotech verification code is {#var#}. This OTP is valid for {#var#} minutes. Do not share this code with anyone.";
    const smsMessage = rawTemplate.replace('{#var#}', otp).replace('{#var#}', String(validMinutes));

    // Invalidate previous pending OTPs
    await pool.query('DELETE FROM company_password_resets WHERE user_id = ?', [user.id]);

    const targetPhone = user.agent_phone || user.company_phone || rawInput;
    await pool.query(
      `INSERT INTO company_password_resets (user_id, phone, otp, expires_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())`,
      [user.id, targetPhone, otp, validMinutes]
    );

    // Live Delivery 1: Deliver directly to Mobile Carrier via SmartPing Sparc DLT SMS Gateway
    try {
      await sendOtpSms({ phone: targetPhone, otp, validMinutes });
    } catch (smsErr) {
      console.error('[Company OTP SmartPing SMS Error]:', smsErr.message);
    }

    // Live Delivery 2: Deliver to Company Admin WhatsApp via Pinbot API
    const digitsOnly = targetPhone.replace(/\D/g, '');
    const intlPhone = digitsOnly.startsWith('91') && digitsOnly.length === 12
      ? digitsOnly
      : digitsOnly.length === 10
        ? `91${digitsOnly}`
        : digitsOnly;

    if (process.env.PINBOT_API_KEY && process.env.PINBOT_PHONE_NUMBER_ID && intlPhone.length >= 10) {
      try {
        const payload = pinbot.buildText(intlPhone, smsMessage);
        const waRes = await pinbot.sendMessage({
          apiKey: process.env.PINBOT_API_KEY,
          phoneNumberId: process.env.PINBOT_PHONE_NUMBER_ID,
          payload,
        });
        console.log(`[Company OTP WhatsApp] Delivered to ${intlPhone} (MsgID: ${waRes?.waMessageId || 'OK'})`);
      } catch (waErr) {
        console.error('[Company OTP WhatsApp Delivery Error]:', waErr.message);
      }
    }

    // Live Delivery 3: Deliver to Company Admin registered Email via SMTP as backup
    if (user.email) {
      try {
        await sendQuotationEmail({
          to: user.email,
          subject: 'SurfSync Infotech - Company Admin Verification Code',
          body: smsMessage,
        });
        console.log(`[Company OTP Email] Delivered to ${user.email}`);
      } catch (mailErr) {
        console.error('[Company OTP Email Delivery Error]:', mailErr.message);
      }
    }

    // Mask phone for privacy (e.g. ******7099)
    const displayPhone = targetPhone.length >= 4
      ? '*'.repeat(Math.max(0, targetPhone.length - 4)) + targetPhone.slice(-4)
      : targetPhone;

    res.json({
      success: true,
      message: `Verification code sent to your registered mobile SMS and WhatsApp (${displayPhone}). Valid for ${validMinutes} minutes.`,
      maskedPhone: displayPhone,
      validMinutes,
      resendSeconds,
      userId: user.id,
    });
  } catch (err) {
    console.error('Send company OTP error:', err);
    res.status(500).json({ message: err.message || 'Failed to send OTP' });
  }
});

/**
 * POST /api/auth/company/forgot-password/verify-otp
 * Verify 4-digit OTP for company admin
 */
router.post('/company/forgot-password/verify-otp', async (req, res) => {
  try {
    const { mobile, otp, slug } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ message: 'Mobile and 4-digit OTP are required' });
    }

    const rawInput = String(mobile).trim();
    const cleanPhone = rawInput.replace(/[\s\-\+\(\)]/g, '').replace(/^91/, '');
    const cleanOtp = String(otp).trim();

    let query = `
      SELECT r.*, u.id AS user_id, u.name, u.email
      FROM company_password_resets r
      JOIN users u ON u.id = r.user_id
      JOIN companies c ON c.id = u.company_id
      WHERE (
        r.phone = ?
        OR REPLACE(REPLACE(REPLACE(r.phone, ' ', ''), '-', ''), '+91', '') = ?
        OR LOWER(u.email) = LOWER(?)
      )
      AND r.expires_at > NOW()
    `;
    const params = [rawInput, cleanPhone, rawInput];

    if (slug && String(slug).trim()) {
      query += ` AND c.slug = ?`;
      params.push(String(slug).trim().toLowerCase());
    }

    query += ` ORDER BY r.id DESC LIMIT 1`;

    const [rows] = await pool.query(query, params);
    const resetRow = rows[0];

    if (!resetRow) {
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new OTP.' });
    }

    if (resetRow.otp !== cleanOtp) {
      return res.status(400).json({ message: 'Invalid 4-digit OTP. Please check your SMS and try again.' });
    }

    // Mark verified
    await pool.query('UPDATE company_password_resets SET is_verified = 1 WHERE id = ?', [resetRow.id]);

    // Create a temporary signed verification token (valid 15m)
    const verifyToken = jwt.sign(
      {
        resetId: resetRow.id,
        userId: resetRow.user_id,
        purpose: 'company_password_reset',
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully! Please enter your new password.',
      verifyToken,
    });
  } catch (err) {
    console.error('Verify company OTP error:', err);
    res.status(500).json({ message: err.message || 'Failed to verify OTP' });
  }
});

/**
 * POST /api/auth/company/forgot-password/reset-password
 * Set new password for company admin
 */
router.post('/company/forgot-password/reset-password', async (req, res) => {
  try {
    const { verifyToken, newPassword } = req.body || {};
    if (!verifyToken || !newPassword) {
      return res.status(400).json({ message: 'Verification token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    let payload;
    try {
      payload = jwt.verify(verifyToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please request a new OTP.' });
    }

    if (payload.purpose !== 'company_password_reset' || !payload.userId) {
      return res.status(403).json({ message: 'Invalid reset token' });
    }

    // Verify DB record
    const [resetRows] = await pool.query(
      'SELECT * FROM company_password_resets WHERE id = ? AND is_verified = 1 LIMIT 1',
      [payload.resetId]
    );
    if (!resetRows[0]) {
      return res.status(400).json({ message: 'Reset request is no longer valid or already used' });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query(
      `UPDATE users 
       SET password_hash = ?, login_password = ?, updated_at = NOW() 
       WHERE id = ?`,
      [hash, newPassword, payload.userId]
    );

    // Clean up used reset record
    await pool.query('DELETE FROM company_password_resets WHERE id = ?', [payload.resetId]);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('Reset company password error:', err);
    res.status(500).json({ message: err.message || 'Failed to reset password' });
  }
});

module.exports = router;
