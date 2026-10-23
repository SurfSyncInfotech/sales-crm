const express = require('express');
const pool = require('../config/db');
const { authRequired, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireSuperadmin);

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*,
              p.name AS plan_name,
              p.price_monthly,
              p.price_yearly,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.role = 'salesperson') AS salesperson_count,
              (SELECT u.email FROM users u WHERE u.company_id = c.id AND u.role = 'company_admin' ORDER BY u.id ASC LIMIT 1) AS admin_email,
              (SELECT u.name FROM users u WHERE u.company_id = c.id AND u.role = 'company_admin' ORDER BY u.id ASC LIMIT 1) AS admin_name
       FROM companies c
       LEFT JOIN subscription_plans p ON p.id = c.plan_id
       ORDER BY c.created_at DESC`
    );
    res.json({ companies: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, p.name AS plan_name, p.price_monthly, p.price_yearly
       FROM companies c
       LEFT JOIN subscription_plans p ON p.id = c.plan_id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Company not found' });

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE company_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    const [admins] = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users WHERE company_id = ? AND role IN ('company_admin', 'salesperson')
       ORDER BY role, name`,
      [req.params.id]
    );

    res.json({ company: rows[0], payments, users: admins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
});

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      name,
      email,
      phone,
      industry,
      city,
      state,
      country = 'India',
      plan_id,
      billing_cycle = 'monthly',
      status = 'trial',
      admin_name,
      admin_email,
      admin_password,
      notes,
      subscription_months = 1,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Company name and email are required' });
    }

    if (!admin_email || !admin_password) {
      return res.status(400).json({ message: 'Company admin email and password are required' });
    }

    if (String(admin_password).length < 6) {
      return res.status(400).json({ message: 'Admin password must be at least 6 characters' });
    }

    const slugBase = slugify(name) || `company-${Date.now()}`;
    let slug = slugBase;
    let n = 1;
    while (true) {
      const [exists] = await conn.query('SELECT id FROM companies WHERE slug = ?', [slug]);
      if (!exists.length) break;
      slug = `${slugBase}-${n++}`;
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(subscription_months || 1));

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO companies
        (name, slug, email, phone, industry, city, state, country, status, plan_id, billing_cycle,
         subscription_start, subscription_end, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        email.trim().toLowerCase(),
        phone || null,
        industry || null,
        city || null,
        state || null,
        country,
        status,
        plan_id || null,
        billing_cycle,
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        notes || null,
      ]
    );

    const companyId = result.insertId;

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(admin_password, 10);
    const [adminResult] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, company_id, is_active)
       VALUES (?, ?, ?, 'company_admin', ?, 1)`,
      [admin_name || `${name} Admin`, admin_email.trim().toLowerCase(), hash, companyId]
    );
    const adminUserId = adminResult.insertId;
    await conn.query('UPDATE companies SET admin_user_id = ? WHERE id = ?', [adminUserId, companyId]);

    await conn.query(
      `INSERT INTO company_activity_logs (company_id, action, details, performed_by)
       VALUES (?, 'company_created', ?, ?)`,
      [companyId, `Company ${name} created with admin ${admin_email.trim().toLowerCase()}`, req.user.id]
    );

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [companyId]);
    res.status(201).json({ company: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or slug already exists' });
    }
    res.status(500).json({ message: 'Failed to create company' });
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      industry,
      city,
      state,
      country,
      status,
      plan_id,
      billing_cycle,
      subscription_start,
      subscription_end,
      notes,
    } = req.body;

    await pool.query(
      `UPDATE companies SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        industry = COALESCE(?, industry),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        country = COALESCE(?, country),
        status = COALESCE(?, status),
        plan_id = COALESCE(?, plan_id),
        billing_cycle = COALESCE(?, billing_cycle),
        subscription_start = COALESCE(?, subscription_start),
        subscription_end = COALESCE(?, subscription_end),
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [
        name ?? null,
        email ? email.trim().toLowerCase() : null,
        phone ?? null,
        industry ?? null,
        city ?? null,
        state ?? null,
        country ?? null,
        status ?? null,
        plan_id ?? null,
        billing_cycle ?? null,
        subscription_start ?? null,
        subscription_end ?? null,
        notes ?? null,
        req.params.id,
      ]
    );

    await pool.query(
      `INSERT INTO company_activity_logs (company_id, action, details, performed_by)
       VALUES (?, 'company_updated', 'Company details updated', ?)`,
      [req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Company not found' });
    res.json({ company: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update company' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'trial', 'suspended', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.query('UPDATE companies SET status = ? WHERE id = ?', [status, req.params.id]);
    await pool.query(
      `INSERT INTO company_activity_logs (company_id, action, details, performed_by)
       VALUES (?, 'status_changed', ?, ?)`,
      [req.params.id, `Status changed to ${status}`, req.user.id]
    );

    res.json({ message: 'Status updated', status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

router.post('/:id/extend-trial', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const [companies] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    const company = companies[0];
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const currentEnd = company.subscription_end ? new Date(company.subscription_end) : new Date();
    const base = currentEnd > new Date() ? currentEnd : new Date();
    base.setDate(base.getDate() + Number(days));
    const newEnd = base.toISOString().slice(0, 10);

    const extended = (company.trial_extended_days || 0) + Number(days);

    await pool.query(
      `UPDATE companies SET
         subscription_end = ?,
         trial_extended_days = ?,
         status = 'trial'
       WHERE id = ?`,
      [newEnd, extended, req.params.id]
    );

    await pool.query(
      `INSERT INTO company_activity_logs (company_id, action, details, performed_by)
       VALUES (?, 'trial_extended', ?, ?)`,
      [req.params.id, `Trial extended by ${days} days (total extended: ${extended} days). New end: ${newEnd}`, req.user.id]
    );

    res.json({ message: 'Trial extended', subscription_end: newEnd, trial_extended_days: extended });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to extend trial' });
  }
});

router.post('/:id/expire-trial', async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().slice(0, 10);

    await pool.query(
      `UPDATE companies SET
         subscription_end = ?
       WHERE id = ?`,
      [pastDate, req.params.id]
    );

    await pool.query(
      `INSERT INTO company_activity_logs (company_id, action, details, performed_by)
       VALUES (?, 'trial_expired_manually', ?, ?)`,
      [req.params.id, `Trial expired manually. End date set to ${pastDate}`, req.user.id]
    );

    res.json({ message: 'Trial expired', subscription_end: pastDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to expire trial' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE companies SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    res.json({ message: 'Company cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel company' });
  }
});

// Permanent delete: removes the company and everything scoped to it. Cannot be undone.
router.delete('/:id/permanent', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const [[company]] = await conn.query('SELECT id, name FROM companies WHERE id = ?', [id]);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    await conn.beginTransaction();
    for (const table of [
      'leads',
      'company_lead_integrations',
      'company_form_urls',
      'company_channel_connections',
      'facebook_connect_sessions',
      'payments',
      'company_activity_logs',
    ]) {
      await conn.query(`DELETE FROM ${table} WHERE company_id = ?`, [id]);
    }
    await conn.query('DELETE FROM users WHERE company_id = ?', [id]);
    await conn.query('DELETE FROM companies WHERE id = ?', [id]);
    await conn.commit();

    res.json({ message: `Company ${company.name} deleted` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to delete company' });
  } finally {
    conn.release();
  }
});

module.exports = router;
