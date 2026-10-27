const express = require('express');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const pinbot = require('../services/pinbot');
const wa = require('../services/whatsapp');

const router = express.Router();
router.use(authRequired, requireCompanyUser);

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Request failed' });
  });

async function requireVisibleLead(req) {
  const [rows] = await pool.query('SELECT id, assigned_to, claimed_by FROM leads WHERE id = ? AND company_id = ? LIMIT 1', [
    Number(req.params.id),
    req.user.company_id,
  ]);
  const lead = rows[0];
  if (!lead) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }
  if (req.user.role === 'salesperson' && lead.assigned_to !== req.user.id && lead.claimed_by !== req.user.id) {
    const err = new Error('You can only message leads assigned to or claimed by you');
    err.status = 403;
    throw err;
  }
  return lead;
}

router.get('/settings', wrap(async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Only company admins can view WhatsApp settings' });
  res.json({ settings: wa.publicSettings(await wa.getSettings(req.user.company_id)) });
}));

router.put('/settings', wrap(async (req, res) => {
  if (req.user.role !== 'company_admin') return res.status(403).json({ message: 'Only company admins can change WhatsApp settings' });
  res.json({ settings: await wa.saveSettings(req.user.company_id, req.body || {}) });
}));

/**
 * Body: { type: 'text'|'image'|'document'|'video'|'template', ... }
 *  text     -> { text }
 *  media    -> { link, caption? }
 *  template -> { template_name, language?, params?: string[] }
 */
router.post('/leads/:id/send', wrap(async (req, res) => {
  const lead = await requireVisibleLead(req);
  const { type = 'text' } = req.body || {};
  const sendArgs = {
    companyId: req.user.company_id,
    leadId: lead.id,
    sentBy: req.user.id,
    toPhone: req.body.phone || null,
  };

  let result;
  if (type === 'text') {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Message text is required' });
    result = await wa.sendToLead({ ...sendArgs, msgType: 'text', body: text, build: (to) => pinbot.buildText(to, text) });
  } else if (['image', 'document', 'video'].includes(type)) {
    const link = String(req.body.link || '').trim();
    if (!/^https:\/\//i.test(link)) return res.status(400).json({ message: 'A public https media link is required' });
    result = await wa.sendToLead({
      ...sendArgs,
      msgType: type,
      body: req.body.caption || link,
      build: (to) => pinbot.buildMedia(to, type, link, req.body.caption),
    });
  } else if (type === 'template') {
    const name = String(req.body.template_name || '').trim();
    if (!name) return res.status(400).json({ message: 'template_name is required' });
    const params = Array.isArray(req.body.params) ? req.body.params : [];
    result = await wa.sendToLead({
      ...sendArgs,
      msgType: 'template',
      body: `Template: ${name}`,
      build: (to) => pinbot.buildTemplate(to, name, req.body.language || 'en', params),
    });
  } else {
    return res.status(400).json({ message: `Unsupported message type: ${type}` });
  }
  res.status(201).json({ message: result });
}));

router.get('/leads/:id/messages', wrap(async (req, res) => {
  const lead = await requireVisibleLead(req);
  const [messages] = await pool.query(
    `SELECT id, direction, purpose, wa_message_id, phone, msg_type, body, status, error, sent_by, created_at
     FROM whatsapp_messages WHERE lead_id = ? AND company_id = ? ORDER BY created_at ASC, id ASC LIMIT 500`,
    [lead.id, req.user.company_id]
  );
  res.json({ messages });
}));

/**
 * GET /api/company/whatsapp/salespersons
 * Returns list of salespeople for filter dropdown
 */
router.get('/salespersons', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const [rows] = await pool.query(
    `SELECT id, name, email FROM users WHERE company_id = ? AND role = 'salesperson' AND is_active = 1 ORDER BY name ASC`,
    [companyId]
  );
  res.json({ salespersons: rows });
}));

/**
 * GET /api/company/whatsapp/conversations
 * Returns list of leads with chat conversations, filterable by salesperson
 */
router.get('/conversations', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const { salesperson_id, q } = req.query;

  let whereExtra = '';
  const params = [companyId];

  if (salesperson_id && salesperson_id !== 'all') {
    whereExtra += ' AND (l.claimed_by = ? OR l.assigned_to = ?)';
    params.push(salesperson_id, salesperson_id);
  }

  if (q && q.trim()) {
    whereExtra += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.lead_company LIKE ?)';
    const term = `%${q.trim()}%`;
    params.push(term, term, term);
  }

  const [rows] = await pool.query(
    `SELECT 
       l.id AS lead_id,
       l.name AS lead_name,
       l.phone,
       l.email,
       l.lead_company,
       l.status AS lead_status,
       l.deal_value,
       COALESCE(l.claimed_by, l.assigned_to) AS salesperson_id,
       u.name AS salesperson_name,
       (SELECT m.body FROM whatsapp_messages m WHERE m.lead_id = l.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
       (SELECT m.created_at FROM whatsapp_messages m WHERE m.lead_id = l.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message_at,
       (SELECT m.msg_type FROM whatsapp_messages m WHERE m.lead_id = l.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_msg_type,
       (SELECT m.direction FROM whatsapp_messages m WHERE m.lead_id = l.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_msg_direction,
       (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.lead_id = l.id) AS total_messages,
       (SELECT COUNT(*) FROM lead_reminders lr WHERE lr.lead_id = l.id) AS reminder_count
     FROM leads l
     LEFT JOIN users u ON u.id = COALESCE(l.claimed_by, l.assigned_to)
     WHERE l.company_id = ?
       AND (
         EXISTS (SELECT 1 FROM whatsapp_messages wm WHERE wm.lead_id = l.id)
         OR EXISTS (SELECT 1 FROM lead_reminders lr WHERE lr.lead_id = l.id)
         OR l.claimed_by IS NOT NULL
       )
       ${whereExtra}
     ORDER BY COALESCE(last_message_at, l.updated_at, l.created_at) DESC
     LIMIT 100`,
    params
  );

  res.json({ conversations: rows });
}));

/**
 * GET /api/company/whatsapp/conversations/:leadId/messages
 * Full chat thread for a specific lead
 */
router.get('/conversations/:leadId/messages', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const leadId = req.params.leadId;

  const [leadRows] = await pool.query(
    `SELECT l.*, u.name AS salesperson_name, u.email AS salesperson_email
     FROM leads l
     LEFT JOIN users u ON u.id = COALESCE(l.claimed_by, l.assigned_to)
     WHERE l.id = ? AND l.company_id = ? LIMIT 1`,
    [leadId, companyId]
  );

  const lead = leadRows[0];
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const [messages] = await pool.query(
    `SELECT id, direction, purpose, wa_message_id, phone, msg_type, body, payload, status, error, sent_by, created_at
     FROM whatsapp_messages 
     WHERE lead_id = ? AND company_id = ? 
     ORDER BY created_at ASC, id ASC LIMIT 500`,
    [leadId, companyId]
  );

  // Also include any auto-reminders for cadence visualization
  const [reminders] = await pool.query(
    `SELECT id, phase, day_number, scheduled_for, status, sent_at, notes, created_at
     FROM lead_reminders
     WHERE lead_id = ? AND company_id = ?
     ORDER BY day_number ASC`,
    [leadId, companyId]
  );

  res.json({ lead, messages, reminders });
}));

/**
 * POST /api/company/whatsapp/conversations/:leadId/send
 * Send a message or image directly in chat
 */
router.post('/conversations/:leadId/send', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const leadId = req.params.leadId;
  const { text, type = 'text', link, caption } = req.body || {};

  const [leadRows] = await pool.query(
    'SELECT id, phone, name FROM leads WHERE id = ? AND company_id = ? LIMIT 1',
    [leadId, companyId]
  );
  const lead = leadRows[0];
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const bodyContent = type === 'image' ? (caption || 'Photo') : (text || '').trim();
  if (!bodyContent && !link) {
    return res.status(400).json({ message: 'Message text or media link required' });
  }

  const [result] = await pool.query(
    `INSERT INTO whatsapp_messages 
       (company_id, lead_id, direction, purpose, phone, msg_type, body, payload, status, sent_by)
     VALUES 
       (?, ?, 'outbound', 'custom', ?, ?, ?, ?, 'sent', ?)`,
    [
      companyId,
      leadId,
      lead.phone || '',
      type,
      bodyContent,
      link ? JSON.stringify({ link, caption }) : null,
      req.user.id,
    ]
  );

  const [[inserted]] = await pool.query(
    'SELECT * FROM whatsapp_messages WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json({ message: inserted });
}));

module.exports = router;
