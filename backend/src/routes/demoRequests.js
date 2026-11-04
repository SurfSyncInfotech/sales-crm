const express = require('express');
const pool = require('../config/db');
const { authRequired, requireSuperadmin } = require('../middleware/auth');

const router = express.Router();

// Auto-ensure demo_requests table exists
let tableChecked = false;
async function ensureTable() {
  if (tableChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS demo_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        company_name VARCHAR(200) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        requirement TEXT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableChecked = true;
  } catch (err) {
    console.error('Failed to create demo_requests table:', err.message);
  }
}

// 1. PUBLIC: Submit a new Demo / Service Request from Landing Page
router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const { full_name, company_name, email, phone, requirement, message } = req.body || {};

    const name = String(full_name || '').trim();
    const company = String(company_name || '').trim();
    const mail = String(email || '').trim().toLowerCase();
    const tel = String(phone || '').trim();
    const reqText = String(requirement || message || '').trim();

    if (!name || !company || !mail || !tel) {
      return res.status(400).json({
        message: 'Full Name, Company Name, Work Email, and Phone Number are required.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO demo_requests (full_name, company_name, email, phone, requirement, status)
       VALUES (?, ?, ?, ?, ?, 'new')`,
      [name, company, mail, tel, reqText || null]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Thank you! Your demo request has been received. Our team will contact you shortly.'
    });
  } catch (err) {
    console.error('Error submitting demo request:', err);
    res.status(500).json({ message: 'Failed to submit demo request. Please try again.' });
  }
});

// 2. SUPERADMIN: Get all Demo Requests
router.get('/', authRequired, requireSuperadmin, async (req, res) => {
  try {
    await ensureTable();
    const { status, search } = req.query || {};

    let query = `SELECT * FROM demo_requests WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (full_name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(q, q, q, q);
    }

    query += ` ORDER BY id DESC LIMIT 200`;

    const [rows] = await pool.query(query, params);

    // Summary metrics
    const [[metrics]] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_requests,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) AS contacted,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted
      FROM demo_requests
    `);

    res.json({
      requests: rows,
      metrics: {
        total: Number(metrics?.total || 0),
        newRequests: Number(metrics?.new_requests || 0),
        contacted: Number(metrics?.contacted || 0),
        converted: Number(metrics?.converted || 0),
      }
    });
  } catch (err) {
    console.error('Error fetching demo requests:', err);
    res.status(500).json({ message: 'Failed to fetch demo requests.' });
  }
});

// 3. SUPERADMIN: Update Request Status / Notes
router.patch('/:id', authRequired, requireSuperadmin, async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const { status, notes } = req.body;

    const fields = [];
    const params = [];

    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      fields.push('notes = ?');
      params.push(notes);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    params.push(id);
    await pool.query(`UPDATE demo_requests SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Request updated successfully.' });
  } catch (err) {
    console.error('Error updating demo request:', err);
    res.status(500).json({ message: 'Failed to update request.' });
  }
});

router.patch('/:id/status', authRequired, requireSuperadmin, async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const { status, notes } = req.body;

    const fields = [];
    const params = [];

    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      fields.push('notes = ?');
      params.push(notes);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    params.push(id);
    await pool.query(`UPDATE demo_requests SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Request status updated successfully.' });
  } catch (err) {
    console.error('Error updating demo request status:', err);
    res.status(500).json({ message: 'Failed to update request status.' });
  }
});

// 4. SUPERADMIN: Delete Request
router.delete('/:id', authRequired, requireSuperadmin, async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    await pool.query(`DELETE FROM demo_requests WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Request deleted successfully.' });
  } catch (err) {
    console.error('Error deleting demo request:', err);
    res.status(500).json({ message: 'Failed to delete request.' });
  }
});

module.exports = router;
