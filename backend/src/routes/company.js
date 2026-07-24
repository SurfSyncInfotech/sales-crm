const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireCompanyUser);

router.get('/dashboard', async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const [[company]] = await pool.query(
      `SELECT c.*, p.name AS plan_name, p.max_salespersons, p.max_leads, p.whatsapp_messages, p.call_minutes
       FROM companies c
       LEFT JOIN subscription_plans p ON p.id = c.plan_id
       WHERE c.id = ?`,
      [companyId]
    );

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const [[counts]] = await pool.query(
      `SELECT
         SUM(role = 'company_admin') AS admins,
         SUM(role = 'salesperson') AS salespersons,
         COUNT(*) AS total_users
       FROM users
       WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );

    res.json({
      company,
      counts: {
        admins: Number(counts.admins || 0),
        salespersons: Number(counts.salespersons || 0),
        total_users: Number(counts.total_users || 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load company dashboard' });
  }
});

router.get('/team', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users
       WHERE company_id = ?
       ORDER BY FIELD(role, 'company_admin', 'salesperson'), name`,
      [req.user.company_id]
    );
    res.json({ team: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load team' });
  }
});

router.post('/team', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can add salespersons' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const [[planInfo]] = await pool.query(
      `SELECT p.max_salespersons
       FROM companies c
       LEFT JOIN subscription_plans p ON p.id = c.plan_id
       WHERE c.id = ?`,
      [req.user.company_id]
    );

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE company_id = ? AND role = 'salesperson' AND is_active = 1`,
      [req.user.company_id]
    );

    const maxSeats = planInfo?.max_salespersons || 5;
    if (Number(countRow.count) >= Number(maxSeats)) {
      return res.status(400).json({ message: `Salesperson limit reached (${maxSeats}). Upgrade plan.` });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, company_id, is_active)
       VALUES (?, ?, ?, 'salesperson', ?, 1)`,
      [name.trim(), email.trim().toLowerCase(), hash, req.user.company_id]
    );

    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ member: rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create salesperson' });
  }
});

router.patch('/team/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can update team status' });
    }

    const { is_active } = req.body;
    const [rows] = await pool.query(
      `SELECT id, role FROM users WHERE id = ? AND company_id = ? LIMIT 1`,
      [req.params.id, req.user.company_id]
    );

    const member = rows[0];
    if (!member) return res.status(404).json({ message: 'Team member not found' });
    if (member.role === 'company_admin') {
      return res.status(400).json({ message: 'Cannot deactivate company admin from here' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

module.exports = router;
