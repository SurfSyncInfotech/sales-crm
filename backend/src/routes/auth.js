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
      name: user.name,
      company_id: user.company_id || null,
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
    company_id: user.company_id || null,
    company: company
      ? {
          id: company.id,
          name: company.name,
          status: company.status,
          plan_name: company.plan_name || null,
        }
      : null,
  };
}

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, role, company_id, is_active
     FROM users WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  return rows[0] || null;
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
  return rows[0] || null;
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

    if (portal === 'company') {
      if (!['company_admin', 'salesperson'].includes(user.role)) {
        return res.status(403).json({ message: 'Use the company portal credentials to sign in here' });
      }

      const company = await getCompanySummary(user.company_id);
      if (!company) {
        return res.status(403).json({ message: 'No company linked to this account' });
      }
      if (['suspended', 'cancelled'].includes(company.status)) {
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

    if (['suspended', 'cancelled'].includes(company.status)) {
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

module.exports = router;
