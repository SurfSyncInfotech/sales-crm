const express = require('express');
const pool = require('../config/db');
const { authRequired, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireSuperadmin);

router.get('/overview', async (_req, res) => {
  try {
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM companies WHERE status = 'active') AS active_companies,
        (SELECT COUNT(*) FROM companies WHERE status = 'trial') AS trial_companies,
        (SELECT COUNT(*) FROM companies WHERE status = 'suspended') AS suspended_companies,
        (SELECT COUNT(*) FROM users WHERE role = 'company_admin') AS company_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'salesperson') AS salespersons
    `);

    const [[revenue]] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND MONTH(paid_at) = MONTH(CURRENT_DATE())
          AND YEAR(paid_at) = YEAR(CURRENT_DATE()) THEN amount ELSE 0 END), 0) AS mtd_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND YEAR(paid_at) = YEAR(CURRENT_DATE()) THEN amount ELSE 0 END), 0) AS ytd_revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_revenue
      FROM payments
    `);

    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month,
             COALESCE(SUM(amount), 0) AS revenue,
             COUNT(*) AS payment_count
      FROM payments
      WHERE status = 'paid' AND paid_at IS NOT NULL
        AND paid_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
      ORDER BY month ASC
    `);

    const [byPlan] = await pool.query(`
      SELECT p.name AS plan_name,
             COUNT(c.id) AS companies,
             COALESCE(SUM(CASE WHEN c.billing_cycle = 'yearly' THEN p.price_yearly ELSE p.price_monthly END), 0) AS mrr_estimate
      FROM subscription_plans p
      LEFT JOIN companies c ON c.plan_id = p.id AND c.status IN ('active', 'trial')
      GROUP BY p.id, p.name
      ORDER BY companies DESC
    `);

    const [recentCompanies] = await pool.query(`
      SELECT c.id, c.name, c.status, c.created_at, p.name AS plan_name
      FROM companies c
      LEFT JOIN subscription_plans p ON p.id = c.plan_id
      ORDER BY c.created_at DESC
      LIMIT 8
    `);

    const [recentPayments] = await pool.query(`
      SELECT pay.id, pay.amount, pay.status, pay.paid_at, pay.invoice_number, c.name AS company_name
      FROM payments pay
      JOIN companies c ON c.id = pay.company_id
      ORDER BY pay.created_at DESC
      LIMIT 8
    `);

    const [[mrr]] = await pool.query(`
      SELECT COALESCE(SUM(
        CASE
          WHEN c.billing_cycle = 'yearly' THEN p.price_yearly / 12
          ELSE p.price_monthly
        END
      ), 0) AS mrr
      FROM companies c
      JOIN subscription_plans p ON p.id = c.plan_id
      WHERE c.status = 'active'
    `);

    res.json({
      counts,
      revenue: { ...revenue, mrr: mrr.mrr },
      monthly,
      byPlan,
      recentCompanies,
      recentPayments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

module.exports = router;
