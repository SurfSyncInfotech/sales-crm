const express = require('express');
const pool = require('../config/db');
const { authRequired, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireSuperadmin);

function invoiceNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `SS-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let sql = `
      SELECT pay.*, c.name AS company_name, p.name AS plan_name
      FROM payments pay
      JOIN companies c ON c.id = pay.company_id
      LEFT JOIN subscription_plans p ON p.id = pay.plan_id
    `;
    const params = [];
    if (company_id) {
      sql += ' WHERE pay.company_id = ?';
      params.push(company_id);
    }
    sql += ' ORDER BY pay.created_at DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json({ payments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      company_id,
      plan_id,
      amount,
      billing_cycle = 'monthly',
      status = 'paid',
      payment_method = 'manual',
      notes,
      extend_months = 1,
    } = req.body;

    if (!company_id || amount == null) {
      return res.status(400).json({ message: 'company_id and amount are required' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO payments
        (company_id, plan_id, amount, billing_cycle, status, payment_method, invoice_number, paid_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        plan_id || null,
        amount,
        billing_cycle,
        status,
        payment_method,
        invoiceNumber(),
        status === 'paid' ? new Date() : null,
        notes || null,
      ]
    );

    if (status === 'paid') {
      const [companies] = await conn.query('SELECT * FROM companies WHERE id = ?', [company_id]);
      const company = companies[0];
      if (company) {
        const base =
          company.subscription_end && new Date(company.subscription_end) > new Date()
            ? new Date(company.subscription_end)
            : new Date();
        base.setMonth(base.getMonth() + Number(extend_months || 1));
        await conn.query(
          `UPDATE companies SET
            status = 'active',
            plan_id = COALESCE(?, plan_id),
            billing_cycle = ?,
            subscription_end = ?
           WHERE id = ?`,
          [plan_id || null, billing_cycle, base.toISOString().slice(0, 10), company_id]
        );
      }
    }

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    res.status(201).json({ payment: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to record payment' });
  } finally {
    conn.release();
  }
});

module.exports = router;
