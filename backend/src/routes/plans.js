const express = require('express');
const pool = require('../config/db');
const { authRequired, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireSuperadmin);

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM companies c WHERE c.plan_id = p.id AND c.status IN ('active','trial')) AS company_count
       FROM subscription_plans p
       ORDER BY p.price_monthly ASC`
    );
    res.json({ plans: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch plans' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price_monthly,
      price_yearly,
      max_salespersons,
      max_leads,
      whatsapp_messages,
      call_minutes,
      features = [],
      is_active = 1,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO subscription_plans
        (name, slug, description, price_monthly, price_yearly, max_salespersons, max_leads,
         whatsapp_messages, call_minutes, features, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        description || null,
        price_monthly || 0,
        price_yearly || 0,
        max_salespersons || 5,
        max_leads || 1000,
        whatsapp_messages || 1000,
        call_minutes || 500,
        JSON.stringify(features),
        is_active ? 1 : 0,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [result.insertId]);
    res.status(201).json({ plan: rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Plan slug already exists' });
    }
    res.status(500).json({ message: 'Failed to create plan' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      price_monthly,
      price_yearly,
      max_salespersons,
      max_leads,
      whatsapp_messages,
      call_minutes,
      features,
      is_active,
    } = req.body;

    await pool.query(
      `UPDATE subscription_plans SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price_monthly = COALESCE(?, price_monthly),
        price_yearly = COALESCE(?, price_yearly),
        max_salespersons = COALESCE(?, max_salespersons),
        max_leads = COALESCE(?, max_leads),
        whatsapp_messages = COALESCE(?, whatsapp_messages),
        call_minutes = COALESCE(?, call_minutes),
        features = COALESCE(?, features),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ?? null,
        description ?? null,
        price_monthly ?? null,
        price_yearly ?? null,
        max_salespersons ?? null,
        max_leads ?? null,
        whatsapp_messages ?? null,
        call_minutes ?? null,
        features ? JSON.stringify(features) : null,
        typeof is_active === 'undefined' ? null : is_active ? 1 : 0,
        req.params.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Plan not found' });
    res.json({ plan: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update plan' });
  }
});

module.exports = router;
