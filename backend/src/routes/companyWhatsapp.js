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
  const [rows] = await pool.query('SELECT id, assigned_to FROM leads WHERE id = ? AND company_id = ? LIMIT 1', [
    Number(req.params.id),
    req.user.company_id,
  ]);
  const lead = rows[0];
  if (!lead) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }
  if (req.user.role === 'salesperson' && lead.assigned_to !== req.user.id) {
    const err = new Error('You can only message leads assigned to you');
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
  const sendArgs = { companyId: req.user.company_id, leadId: lead.id, sentBy: req.user.id };

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

module.exports = router;
