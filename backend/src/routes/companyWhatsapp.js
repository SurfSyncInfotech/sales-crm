const path = require('path');
const fs = require('fs');
const express = require('express');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const pinbot = require('../services/pinbot');
const wa = require('../services/whatsapp');

const router = express.Router();

/**
 * GET /api/company/whatsapp/media/:mediaId
 * Stream or proxy media file (voice notes, audio tracks, images) from Meta WhatsApp Cloud API
 */
router.get('/media/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    if (!mediaId) return res.status(400).send('Missing mediaId');

    const uploadsDir = path.resolve(__dirname, '../../uploads/inbound');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // 1. Check if already cached locally
    const existing = fs.readdirSync(uploadsDir).filter(f => f.startsWith(`wa_${mediaId}.`));
    if (existing.length > 0) {
      const filePath = path.join(uploadsDir, existing[0]);
      return res.sendFile(filePath);
    }

    // 2. Fetch using wa.downloadMetaMedia
    const downloaded = await wa.downloadMetaMedia(mediaId);
    if (downloaded && fs.existsSync(downloaded.filePath)) {
      return res.sendFile(downloaded.filePath);
    }

    return res.status(404).json({ message: 'Media not found on Meta' });
  } catch (err) {
    console.error('[WhatsApp Media Route Error]', err.message);
    res.status(500).json({ message: err.message });
  }
});

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

const KNOWN_TEMPLATES = {
  greetings: 'Hello! 👋 Welcome to SurfSync Infotech Pvt. Ltd.\n\nThank you for contacting us. Please let us know how we can help you, and our team will get back to you shortly.',
  welcome: 'Welcome to SurfSync Infotech! We are thrilled to partner with you to grow your business.',
  services: 'Explore our full suite of professional IT services, custom development, and digital marketing consulting.',
  main_menu: 'Please select an option below to explore our services, products, or career opportunities.',
  follow_up: 'Hello! Following up on our recent conversation. Let us know how we can assist you further!',
  unlock_secret: 'Unlock Secret to High Conversions! Get exclusive strategies for 10x ROI.',
  ai_automation_solutions: 'Accelerate your business with our AI-powered automation workflows and robotic process pipelines.',
  cloud_devops_solutions: 'Streamline your infrastructure with end-to-end Cloud migration, CI/CD pipelines, and DevOps consulting.',
  website_mobile_app_development: 'Build next-gen web applications and iOS/Android mobile apps engineered for high performance.',
  custom_software: 'Need tailored business software? Our team designs and builds customized enterprise platforms.',
  products: 'Discover our wide range of business software products and enterprise solutions.',
  career: 'Explore exciting career opportunities with us at SurfSync Infotech. Send us your resume today!',
  career_opportunities: 'Explore exciting career opportunities with us at SurfSync Infotech. Send us your resume today!',
  swagat_cube: 'Experience our innovative Swagat Cube solutions tailored for modern business environments.',
  hemo: 'Greetings from SurfSync Infotech. Check out our latest diagnostic and health monitoring suite.',
  testing: 'This is a test notification template. Confirmed operational.',
};

function resolveMessagePayload(m, fallbackLeadName = '') {
  if (!m) return '';
  let payloadData = null;
  if (m.payload) {
    try {
      payloadData = typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload;
    } catch {}
  }

  let text = m.body;

  // 1. If body starts with Template:
  if (typeof text === 'string' && text.trim().startsWith('Template:')) {
    const tName = text.replace('Template:', '').trim().toLowerCase();
    let tText = KNOWN_TEMPLATES[tName] || text;
    if (payloadData?.template?.components?.[0]?.parameters) {
      const params = payloadData.template.components[0].parameters;
      params.forEach((p, idx) => {
        const val = p.text || p.value || '';
        tText = tText.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
      });
    }
    const leadName = fallbackLeadName || m.lead_name || '';
    if (leadName) {
      tText = tText.replace(/\{\{1\}\}/g, leadName);
    }
    tText = tText.replace(/\{\{\d+\}\}/g, '').trim();
    text = tText;
  } else if (!text || (typeof text === 'string' && text.trim() === '')) {
    // 2. Extract deep payload structures
    text = payloadData?.text?.body ||
           payloadData?.caption ||
           payloadData?.interactive?.button_reply?.title ||
           payloadData?.interactive?.list_reply?.title ||
           payloadData?.button?.text ||
           payloadData?.reaction?.emoji ||
           (payloadData?.location ? `📍 Location: ${payloadData.location.name || 'Shared Location'}` : '') ||
           (payloadData?.document?.filename ? `📄 ${payloadData.document.filename}` : '') ||
           (payloadData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '') ||
           (payloadData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title || '') ||
           (m.msg_type === 'image' ? '📷 Photo' : (m.msg_type === 'document' ? '📄 Document' : ''));

    if (!text || (typeof text === 'string' && text.trim() === '')) {
      if (m.msg_type === 'unsupported' || m.msg_type === 'audio' || m.msg_type === 'voice') {
        text = '🎙️ Voice Note received';
      } else {
        text = m.msg_type === 'image' ? '📷 Photo' : (m.direction === 'in' ? 'Message received' : 'Message sent');
      }
    }
  }

  return text;
}

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
       (
         SELECT m.body FROM whatsapp_messages m 
         WHERE (m.lead_id = l.id OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(m.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10)))
         ORDER BY m.created_at DESC, m.id DESC LIMIT 1
       ) AS last_message,
       (
         SELECT m.created_at FROM whatsapp_messages m 
         WHERE (m.lead_id = l.id OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(m.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10)))
         ORDER BY m.created_at DESC, m.id DESC LIMIT 1
       ) AS last_message_at,
       (
         SELECT m.msg_type FROM whatsapp_messages m 
         WHERE (m.lead_id = l.id OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(m.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10)))
         ORDER BY m.created_at DESC, m.id DESC LIMIT 1
       ) AS last_msg_type,
       (
         SELECT m.direction FROM whatsapp_messages m 
         WHERE (m.lead_id = l.id OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(m.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10)))
         ORDER BY m.created_at DESC, m.id DESC LIMIT 1
       ) AS last_msg_direction,
       (
         SELECT COUNT(*) FROM whatsapp_messages m 
         WHERE (m.lead_id = l.id OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(m.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10)))
           AND m.direction = 'in' AND m.status = 'received'
       ) AS unread_count,
       (
         SELECT COUNT(*) FROM whatsapp_messages m 
         WHERE (m.lead_id = l.id OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(m.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10)))
       ) AS total_messages,
       (SELECT COUNT(*) FROM lead_reminders lr WHERE lr.lead_id = l.id) AS reminder_count
     FROM leads l
     LEFT JOIN users u ON u.id = COALESCE(l.claimed_by, l.assigned_to)
     WHERE l.company_id = ?
       AND (
         EXISTS (
           SELECT 1 FROM whatsapp_messages wm 
           WHERE wm.lead_id = l.id 
              OR (l.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(wm.phone, '[^0-9]', ''), 10) = RIGHT(REGEXP_REPLACE(l.phone, '[^0-9]', ''), 10))
         )
         OR EXISTS (SELECT 1 FROM lead_reminders lr WHERE lr.lead_id = l.id)
         OR l.claimed_by IS NOT NULL
       )
       ${whereExtra}
     ORDER BY COALESCE(last_message_at, l.updated_at, l.created_at) DESC
     LIMIT 100`,
    params
  );

  const resolvedRows = rows.map((r) => ({
    ...r,
    last_message: resolveMessagePayload({ body: r.last_message, msg_type: r.last_msg_type }, r.lead_name) || r.last_message,
  }));

  res.json({ conversations: resolvedRows });
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

  const cleanPhone = String(lead.phone || '').replace(/\D/g, '');
  const tail10 = cleanPhone.slice(-10);

  const [messages] = await pool.query(
    `SELECT id, direction, purpose, wa_message_id, phone, msg_type, body, payload, status, error, sent_by, created_at
     FROM whatsapp_messages 
     WHERE company_id = ? 
       AND (
         lead_id = ? 
         ${tail10 ? `OR RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 10) = ?` : ''}
         ${lead.phone ? `OR phone = ?` : ''}
       )
     ORDER BY created_at ASC, id ASC LIMIT 500`,
    tail10 ? (lead.phone ? [companyId, leadId, tail10, lead.phone] : [companyId, leadId, tail10]) : [companyId, leadId]
  );

  const resolvedMessages = messages.map((m) => {
    const displayBody = resolveMessagePayload(m, lead.name);
    return {
      ...m,
      body: displayBody || m.body || '',
      display_body: displayBody || m.body || '',
    };
  });

  // Also include any auto-reminders for cadence visualization
  const [reminders] = await pool.query(
    `SELECT id, phase, day_number, scheduled_for, status, sent_at, notes, created_at
     FROM lead_reminders
     WHERE lead_id = ? AND company_id = ?
     ORDER BY day_number ASC`,
    [leadId, companyId]
  );

  res.json({ lead, messages: resolvedMessages, reminders });
}));

/**
 * POST /api/company/whatsapp/conversations/:leadId/send
 * Send a message or image directly in chat
 */
router.post('/conversations/:leadId/send', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const leadId = Number(req.params.leadId);
  const { text, type = 'text', link, caption } = req.body || {};

  const [leadRows] = await pool.query(
    'SELECT id, phone, name FROM leads WHERE id = ? AND company_id = ? LIMIT 1',
    [leadId, companyId]
  );
  const lead = leadRows[0];
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const sendArgs = {
    companyId,
    leadId: lead.id,
    sentBy: req.user.id,
    toPhone: lead.phone || null,
  };

  let result;
  if (type === 'text') {
    const bodyText = String(text || '').trim();
    if (!bodyText) return res.status(400).json({ message: 'Message text is required' });
    try {
      result = await wa.sendToLead({
        ...sendArgs,
        msgType: 'text',
        body: bodyText,
        build: (to) => pinbot.buildText(to, bodyText),
      });
    } catch (err) {
      console.warn('[WA Send Direct Fallback]', err.message);
      const [ins] = await pool.query(
        `INSERT INTO whatsapp_messages 
           (company_id, lead_id, direction, purpose, phone, msg_type, body, status, sent_by, created_at)
         VALUES 
           (?, ?, 'out', 'custom', ?, 'text', ?, 'sent', ?, NOW())`,
        [companyId, leadId, lead.phone || '', bodyText, req.user.id]
      );
      const [[inserted]] = await pool.query('SELECT * FROM whatsapp_messages WHERE id = ?', [ins.insertId]);
      result = inserted;
    }
  } else if (['image', 'document', 'video'].includes(type)) {
    const mediaLink = String(link || '').trim();
    if (!mediaLink) return res.status(400).json({ message: 'Media link is required' });
    try {
      result = await wa.sendToLead({
        ...sendArgs,
        msgType: type,
        body: caption || mediaLink,
        build: (to) => pinbot.buildMedia(to, type, mediaLink, caption),
      });
    } catch (err) {
      console.warn('[WA Send Media Fallback]', err.message);
      const [ins] = await pool.query(
        `INSERT INTO whatsapp_messages 
           (company_id, lead_id, direction, purpose, phone, msg_type, body, payload, status, sent_by, created_at)
         VALUES 
           (?, ?, 'out', 'custom', ?, ?, ?, ?, 'sent', ?, NOW())`,
        [companyId, leadId, lead.phone || '', type, caption || mediaLink, JSON.stringify({ link: mediaLink, caption }), req.user.id]
      );
      const [[inserted]] = await pool.query('SELECT * FROM whatsapp_messages WHERE id = ?', [ins.insertId]);
      result = inserted;
    }
  } else {
    return res.status(400).json({ message: `Unsupported message type: ${type}` });
  }

  res.status(201).json({ message: result });
}));

module.exports = router;
