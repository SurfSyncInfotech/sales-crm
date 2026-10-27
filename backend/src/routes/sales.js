const express = require('express');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireCompanyUser);

// Middleware to ensure user is salesperson or company_admin
function salespersonOrAdmin(req, res, next) {
  if (!['salesperson', 'company_admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Sales CRM only' });
  }
  next();
}

router.use(salespersonOrAdmin);

/**
 * GET /api/sales/stats
 * Personal performance counters & pipeline summaries
 */
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // Unclaimed pool leads
    const [[poolRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND (claimed_by IS NULL OR claimed_by = 0)',
      [companyId]
    );

    // My total leads (all claimed by me)
    const [[myTotalRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND claimed_by = ?',
      [companyId, userId]
    );

    // All company leads
    const [[totalCompanyRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM leads WHERE company_id = ?',
      [companyId]
    );

    // Contacted today by this rep or updated today
    const [[contactedTodayRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND (claimed_by = ? OR assigned_to = ?) AND (DATE(claimed_at) = CURDATE() OR DATE(updated_at) = CURDATE() OR status = 'contacted')",
      [companyId, userId, userId]
    );

    // My active leads
    const [[myLeadsRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND claimed_by = ? AND status NOT IN ('won', 'lost', 'not_interested')",
      [companyId, userId]
    );

    // Quotation requested / pending admin
    const [[pendingQuotesRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND claimed_by = ? AND status = 'quotation_requested'",
      [companyId, userId]
    );

    // Won
    const [[wonRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND claimed_by = ? AND status = 'won'",
      [companyId, userId]
    );

    // Lost
    const [[lostRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND claimed_by = ? AND status = 'lost'",
      [companyId, userId]
    );

    // Not Interested
    const [[notInterestedRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND claimed_by = ? AND status = 'not_interested'",
      [companyId, userId]
    );

    // Company-wide Not Interested
    const [[companyNotInterestedRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND status = 'not_interested'",
      [companyId]
    );

    // Reminders due today or pending
    const [[remindersRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM lead_reminders WHERE company_id = ? AND (salesperson_id = ? OR salesperson_id IS NULL) AND status = 'pending' AND scheduled_for <= NOW()",
      [companyId, userId]
    );

    res.json({
      available_leads: Number(poolRow.count || 0),
      pool_leads: Number(poolRow.count || 0),
      my_leads: Number(myLeadsRow.count || 0),
      my_total_leads: Number(myTotalRow.count || 0),
      all_leads: Number(totalCompanyRow.count || 0),
      total_company_leads: Number(totalCompanyRow.count || 0),
      contacted_today: Number(contactedTodayRow.count || 0),
      pending_quotes: Number(pendingQuotesRow.count || 0),
      won: Number(wonRow.count || 0),
      lost: Number(lostRow.count || 0),
      not_interested: Number(notInterestedRow.count || 0),
      company_not_interested: Number(companyNotInterestedRow.count || 0),
      due_reminders: Number(remindersRow.count || 0),
    });
  } catch (err) {
    console.error('Error fetching sales stats:', err);
    res.status(500).json({ message: 'Failed to fetch sales stats' });
  }
});

/**
 * GET /api/sales/activity
 * Real recent lead activities from DB
 */
router.get('/activity', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const [rows] = await pool.query(
      `SELECT l.id, l.name, l.phone, l.lead_company, l.status, l.claimed_by, l.updated_at, u.name AS claimed_by_name
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE l.company_id = ?
       ORDER BY l.updated_at DESC
       LIMIT 10`,
      [companyId]
    );

    const activities = rows.map((r) => {
      let title = `Lead status: ${r.status}`;
      if (r.status === 'won') title = 'Deal marked as Won';
      else if (r.status === 'lost') title = 'Deal marked as Lost';
      else if (r.status === 'quotation_requested') title = 'Quote request submitted';
      else if (r.status === 'quotation_sent') title = 'Quotation sent to client';
      else if (r.status === 'demo_requested') title = 'Demo website / details requested';
      else if (r.status === 'interested') title = 'Stage updated to Interested';
      else if (r.claimed_by) title = `Lead claimed by ${r.claimed_by_name || 'rep'}`;
      else title = 'New lead arrived in pool';

      return {
        id: r.id,
        title,
        subtitle: `${r.name || 'Inquiry'}${r.lead_company ? ' • ' + r.lead_company : ''}`,
        status: r.status,
        time: r.updated_at,
      };
    });

    res.json({ activities });
  } catch (err) {
    console.error('Activity error:', err);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

/**
 * GET /api/sales/followups
 * Real tasks/leads requiring follow-up from DB
 */
router.get('/followups', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT l.id, l.name, l.phone, l.lead_company, l.status, l.updated_at,
              r.day_number, r.scheduled_for, r.status AS reminder_status
       FROM leads l
       LEFT JOIN lead_reminders r ON r.lead_id = l.id AND r.status = 'pending'
       WHERE l.company_id = ? 
         AND (l.claimed_by = ? OR l.assigned_to = ?)
         AND l.status IN ('followup', 'interested', 'quotation_sent', 'contacted')
       ORDER BY COALESCE(r.scheduled_for, l.updated_at) DESC
       LIMIT 10`,
      [companyId, userId, userId]
    );

    res.json({ followups: rows });
  } catch (err) {
    console.error('Followups error:', err);
    res.status(500).json({ message: 'Failed to fetch followups' });
  }
});

/**
 * GET /api/sales/feedbacks
 * Fetch all stage feedbacks for leads with search & pagination
 */
router.get('/feedbacks', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const { q, stage, lead_id } = req.query;

    let whereClause = 'WHERE lf.company_id = ?';
    const params = [companyId];

    if (lead_id) {
      whereClause += ' AND lf.lead_id = ?';
      params.push(Number(lead_id));
    }

    if (stage && stage !== 'all') {
      whereClause += ' AND (lf.to_status = ? OR lf.from_status = ?)';
      params.push(stage, stage);
    }

    if (q && q.trim()) {
      whereClause += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.lead_company LIKE ? OR lf.feedback LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM lead_feedbacks lf
       JOIN leads l ON l.id = lf.lead_id
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // Fetch paginated rows
    const [rows] = await pool.query(
      `SELECT 
         lf.id,
         lf.lead_id,
         lf.company_id,
         lf.user_id,
         lf.from_status,
         lf.to_status,
         lf.feedback,
         lf.created_at,
         l.name AS lead_name,
         l.phone AS lead_phone,
         l.email AS lead_email,
         l.lead_company,
         l.status AS current_lead_status,
         u.name AS salesperson_name
       FROM lead_feedbacks lf
       JOIN leads l ON l.id = lf.lead_id
       LEFT JOIN users u ON u.id = lf.user_id
       ${whereClause}
       ORDER BY lf.created_at DESC, lf.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      feedbacks: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('Feedbacks error:', err);
    res.status(500).json({ message: 'Failed to fetch feedbacks' });
  }
});

/**
 * GET /api/sales/leads
 * Get leads with conflict / claim status
 */
router.get('/leads', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { view = 'all' } = req.query; // 'all', 'available', 'my'

    let whereClause = 'l.company_id = ?';
    const params = [companyId];

    if (view === 'my') {
      whereClause += ' AND l.claimed_by = ?';
      params.push(userId);
    } else if (view === 'available' || view === 'pool') {
      whereClause += ' AND (l.claimed_by IS NULL OR l.claimed_by = 0)';
    }

    const [rows] = await pool.query(
      `SELECT 
         l.*,
         u.name AS claimed_by_name,
         u.email AS claimed_by_email,
         (CASE 
           WHEN l.claimed_by IS NOT NULL AND l.claimed_by != 0 AND l.claimed_by != ? THEN 1 
           ELSE 0 
          END) AS is_locked_by_other,
         (SELECT COUNT(*) FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' AND wm.status = 'received') AS unread_wa_count,
         (SELECT wm.body FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' ORDER BY wm.id DESC LIMIT 1) AS latest_wa_reply,
         (SELECT wm.created_at FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' ORDER BY wm.id DESC LIMIT 1) AS latest_wa_reply_at
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE ${whereClause}
       ORDER BY l.created_at DESC LIMIT 500`,
      [userId, ...params]
    );

    res.json({ leads: rows });
  } catch (err) {
    console.error('Error fetching sales leads:', err);
    res.status(500).json({ message: 'Failed to fetch sales leads' });
  }
});

/**
 * POST /api/sales/leads
 * Sales rep directly adds a new lead
 */
router.post('/leads', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { name, phone, email, lead_company, notes, source_name = 'Direct Entry' } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and Phone are required' });
    }

    const leadCode = 'L-' + Date.now().toString().slice(-6);

    const [result] = await pool.query(
      `INSERT INTO leads (company_id, lead_code, name, phone, email, lead_company, source_name, status, notes, claimed_by, claimed_at, assigned_to, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'contacted', ?, ?, NOW(), ?, ?, NOW(), NOW())`,
      [companyId, leadCode, name, phone, email || null, lead_company || null, source_name, notes || null, userId, userId, userId]
    );

    const [[newLead]] = await pool.query(
      `SELECT l.*, u.name AS claimed_by_name FROM leads l LEFT JOIN users u ON u.id = l.claimed_by WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ lead: newLead, message: 'Lead added successfully' });
  } catch (err) {
    console.error('Error creating sales lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

/**
 * GET /api/sales/pipeline
 * Fetch all leads grouped into pipeline columns
 */
router.get('/pipeline', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // We fetch:
    // 1. All unclaimed leads (pool)
    // 2. All leads claimed by the current salesperson
    // 3. For company_admin, fetch all leads
    const [rows] = await pool.query(
      `SELECT 
         l.*,
         u.name AS claimed_by_name,
         u.email AS claimed_by_email,
         (CASE 
           WHEN l.claimed_by IS NOT NULL AND l.claimed_by != 0 AND l.claimed_by != ? THEN 1 
           ELSE 0 
          END) AS is_locked_by_other,
         (SELECT COUNT(*) FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' AND wm.status = 'received') AS unread_wa_count,
         (SELECT wm.body FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' ORDER BY wm.id DESC LIMIT 1) AS latest_wa_reply,
         (SELECT wm.created_at FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' ORDER BY wm.id DESC LIMIT 1) AS latest_wa_reply_at,
         (SELECT r.day_number FROM lead_reminders r WHERE r.lead_id = l.id AND r.status = 'pending' ORDER BY r.scheduled_for ASC LIMIT 1) AS next_reminder_day,
         (SELECT COUNT(*) FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' AND wm.status = 'received') AS unread_wa_count,
         (SELECT wm.body FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' ORDER BY wm.id DESC LIMIT 1) AS latest_wa_reply,
         (SELECT wm.created_at FROM whatsapp_messages wm WHERE wm.lead_id = l.id AND wm.direction = 'in' ORDER BY wm.id DESC LIMIT 1) AS latest_wa_reply_at
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE l.company_id = ? 
         AND (l.claimed_by IS NULL OR l.claimed_by = 0 OR l.claimed_by = ? OR ? = 'company_admin')
       ORDER BY l.updated_at DESC LIMIT 600`,
      [userId, companyId, userId, req.user.role]
    );

    const stages = {
      new_pool: [],
      contacted: [],
      demo_requested: [],
      interested: [],
      followup: [],
      quotation_requested: [],
      quotation_sent: [],
      won: [],
      lost: [],
      not_interested: [],
    };

    rows.forEach((lead) => {
      let stageKey = lead.status;
      if (!lead.claimed_by || lead.claimed_by === 0) {
        stageKey = 'new_pool';
      } else if (stageKey === 'new') {
        stageKey = 'contacted';
      }

      if (stages[stageKey]) {
        stages[stageKey].push(lead);
      } else if (stageKey === 'qualified') {
        stages.interested.push(lead);
      } else {
        stages.followup.push(lead);
      }
    });

    res.json({ pipeline: stages });
  } catch (err) {
    console.error('Error fetching sales pipeline:', err);
    res.status(500).json({ message: 'Failed to fetch pipeline' });
  }
});

/**
 * POST /api/sales/leads/:id/claim
 * Atomically claim/lock a lead for the current salesperson
 */
router.post('/leads/:id/claim', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const leadId = req.params.id;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const [rows] = await conn.query(
      `SELECT l.*, u.name AS claimed_by_name 
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE l.id = ? AND l.company_id = ? FOR UPDATE`,
      [leadId, companyId]
    );

    const lead = rows[0];
    if (!lead) {
      await conn.rollback();
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if already claimed by someone else
    if (lead.claimed_by && lead.claimed_by !== userId) {
      await conn.rollback();
      return res.status(409).json({
        message: `Already connected by ${lead.claimed_by_name || 'another salesperson'}`,
        claimed_by_name: lead.claimed_by_name,
        claimed_by: lead.claimed_by,
      });
    }

    // Lock and claim lead
    await conn.query(
      `UPDATE leads 
       SET claimed_by = ?, 
           claimed_at = COALESCE(claimed_at, NOW()), 
           assigned_to = ?,
           status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
           updated_at = NOW() 
       WHERE id = ?`,
      [userId, userId, leadId]
    );

    await conn.commit();

    // Fetch updated lead
    const [[updated]] = await pool.query(
      `SELECT l.*, u.name AS claimed_by_name 
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE l.id = ?`,
      [leadId]
    );

    res.json({
      message: 'Lead locked & claimed successfully',
      lead: updated,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Claim error:', err);
    res.status(500).json({ message: 'Failed to claim lead' });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/sales/leads/:id/status
 * Update lead status, enforce notes on quotation requests, and manage reminder triggers
 */
router.put('/leads/:id/status', async (req, res) => {
  try {
    const leadId = req.params.id;
    const userId = req.user.id;
    const companyId = req.user.company_id;
    const {
      status,
      notes,
      feedback,
      deal_value,
      quotation_services,
      quotation_scope,
      quotation_notes,
      lost_reason,
      demo_notes,
    } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Fetch lead with current claim details
    const [rows] = await pool.query(
      `SELECT l.*, u.name AS claimed_by_name 
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE l.id = ? AND l.company_id = ?`,
      [leadId, companyId]
    );

    const lead = rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // If status is identical and no extra data, ignore redundant change
    if (lead.status === status && deal_value === undefined && !notes && !quotation_services && !demo_notes) {
      return res.json({ lead, message: 'Status is already ' + status });
    }

    // Conflict check: if claimed by someone else and user is not admin
    if (lead.claimed_by && lead.claimed_by !== userId && req.user.role !== 'company_admin') {
      return res.status(409).json({
        message: `Already connected by ${lead.claimed_by_name || 'another salesperson'}`,
        claimed_by_name: lead.claimed_by_name,
      });
    }

    // If quotation_requested, validate mandatory fields
    if (status === 'quotation_requested') {
      if (!quotation_services || !quotation_notes) {
        return res.status(400).json({
          message: 'Quotation request requires services requested and notes for admin',
        });
      }
    }

    // Auto-claim if not claimed yet
    const claimAssignId = lead.claimed_by || userId;
    const finalDemoNotes = demo_notes || (status === 'demo_requested' ? feedback : null);

    await pool.query(
      `UPDATE leads 
       SET status = ?,
           claimed_by = ?,
           claimed_at = COALESCE(claimed_at, NOW()),
           assigned_to = COALESCE(assigned_to, ?),
           deal_value = CASE WHEN ? = 'won' AND ? IS NOT NULL THEN ? ELSE deal_value END,
           notes = COALESCE(?, notes),
           quotation_services = COALESCE(?, quotation_services),
           quotation_scope = COALESCE(?, quotation_scope),
           quotation_notes = COALESCE(?, quotation_notes),
           quotation_requested_at = CASE WHEN ? = 'quotation_requested' THEN NOW() ELSE quotation_requested_at END,
           demo_notes = COALESCE(?, demo_notes),
           demo_requested_at = CASE WHEN ? = 'demo_requested' THEN NOW() ELSE demo_requested_at END,
           lost_reason = CASE WHEN ? = 'lost' THEN ? ELSE lost_reason END,
           updated_at = NOW()
       WHERE id = ?`,
      [
        status,
        claimAssignId,
        claimAssignId,
        status,
        deal_value !== undefined ? deal_value : null,
        deal_value !== undefined ? deal_value : null,
        notes || null,
        quotation_services ? (typeof quotation_services === 'object' ? JSON.stringify(quotation_services) : quotation_services) : null,
        quotation_scope || null,
        quotation_notes || null,
        status,
        finalDemoNotes || null,
        status,
        status,
        lost_reason || notes || null,
        leadId,
      ]
    );

    // Record stage feedback into lead_feedbacks
    const feedbackText = (feedback || demo_notes || notes || lost_reason || quotation_notes || '').trim();
    if (feedbackText) {
      await pool.query(
        `INSERT INTO lead_feedbacks (company_id, lead_id, user_id, from_status, to_status, feedback)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [companyId, leadId, userId, lead.status || null, status, feedbackText]
      );
    }

    // If deal is closed or waiting for quotation/revision, cancel any pending reminders
    if (['won', 'lost', 'not_interested', 'quotation_requested'].includes(status)) {
      await pool.query(
        "UPDATE lead_reminders SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'",
        [leadId]
      );
    }

    // TRIGGER AUTO-REMINDERS ON "interested" or "followup" (Production Cadence: Day 2, 5, 10, 21)
    // Only schedule if this lead has never had phase_1 reminders before to avoid duplicates
    if (status === 'interested' || status === 'followup') {
      const [[existingP1]] = await pool.query(
        "SELECT COUNT(*) AS count FROM lead_reminders WHERE lead_id = ? AND phase = 'phase_1_interested'",
        [leadId]
      );

      if (Number(existingP1.count || 0) === 0) {
        const scheduleDays = [2, 5, 10, 21];
        for (const d of scheduleDays) {
          await pool.query(
            `INSERT INTO lead_reminders (company_id, lead_id, salesperson_id, phase, day_number, scheduled_for, status)
             VALUES (?, ?, ?, 'phase_1_interested', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'pending')`,
            [companyId, leadId, claimAssignId, d, d]
          );
        }
      }
    }

    // TRIGGER PHASE 2 REMINDERS ON "quotation_sent" (Production Cadence: Day 2, 5, 10, 21)
    if (status === 'quotation_sent') {
      await pool.query(
        "UPDATE leads SET quotation_sent_at = NOW() WHERE id = ?",
        [leadId]
      );

      // Phase 2 reminders on 2, 5, 10, 21 days post-quote
      const quoteFollowupDays = [2, 5, 10, 21];
      for (const d of quoteFollowupDays) {
        await pool.query(
          `INSERT INTO lead_reminders (company_id, lead_id, salesperson_id, phase, day_number, scheduled_for, status)
           VALUES (?, ?, ?, 'phase_2_post_quote', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'pending')`,
          [companyId, leadId, claimAssignId, d, d]
        );
      }
    }

    // Return updated lead
    const [[updated]] = await pool.query(
      `SELECT l.*, u.name AS claimed_by_name 
       FROM leads l
       LEFT JOIN users u ON u.id = l.claimed_by
       WHERE l.id = ?`,
      [leadId]
    );

    res.json({
      message: 'Status updated successfully',
      lead: updated,
    });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

/**
 * GET /api/sales/reminders
 * Fetch scheduled WhatsApp reminders for this salesperson
 */
router.get('/reminders', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT r.*, l.name AS lead_name, l.phone AS lead_phone, l.email AS lead_email, l.status AS lead_status, l.lead_company
       FROM lead_reminders r
       JOIN leads l ON l.id = r.lead_id
       WHERE r.company_id = ? AND (r.salesperson_id = ? OR ? = 'company_admin')
       ORDER BY r.scheduled_for ASC LIMIT 100`,
      [companyId, userId, req.user.role]
    );

    res.json({ reminders: rows });
  } catch (err) {
    console.error('Reminders fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch reminders' });
  }
});

module.exports = router;
