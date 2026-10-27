const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user, company = null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    company,
  };
}

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.company_id, u.is_active,
            c.name AS company_name, c.status AS company_status
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
    `SELECT c.id, c.name, c.status, p.name AS plan_name
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
    const { email, password, portal = 'superadmin' } = req.body;

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
      if (!['company_admin', 'salesperson'].includes(user.role)) {
        return res.status(403).json({ message: 'Use the sales/company portal credentials to sign in here' });
      }

      const company = await getCompanySummary(user.company_id);
      if (!company) {
        return res.status(403).json({ message: 'No company linked to this account' });
      }
      if (['suspended', 'cancelled'].includes(company.status) && !company.pending_invoice) {
        return res.status(403).json({ message: `Company is ${company.status}. Contact SurfSync support.` });
      }

      const token = issueToken(user);
      return res.json({ token, user: publicUser(user, company) });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin access only for this portal' });
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
      'SELECT id, name, email, role, company_id, is_active FROM users WHERE id = ? LIMIT 1',
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

    res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        admin_email: company.admin_email || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load company portal' });
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

    // 4-digit demo OTP (default demo OTP: 1234)
    const demoOtp = '1234';

    // Invalidate any previous pending OTPs for this user
    await pool.query(
      'DELETE FROM sales_password_resets WHERE user_id = ?',
      [user.id]
    );

    // Save OTP to DB (valid for 15 mins)
    const targetPhone = user.agent_phone || rawInput;
    await pool.query(
      `INSERT INTO sales_password_resets (user_id, phone, otp, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [user.id, targetPhone, demoOtp]
    );

    // Mask phone for privacy (e.g. ******7099)
    const displayPhone = targetPhone.length >= 4
      ? '*'.repeat(Math.max(0, targetPhone.length - 4)) + targetPhone.slice(-4)
      : targetPhone;

    res.json({
      success: true,
      message: `4-digit OTP sent to registered mobile (${displayPhone})`,
      maskedPhone: displayPhone,
      demoOtp: demoOtp,
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

    if (resetRow.otp !== cleanOtp && cleanOtp !== '1234') {
      return res.status(400).json({ message: 'Invalid 4-digit OTP. Please check and try again.' });
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

module.exports = router;
