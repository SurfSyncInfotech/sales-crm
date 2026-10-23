const pool = require('../config/db');
const pinbot = require('./pinbot');
const { logActivity } = require('./pipeline');

const OPT_OUT_WORDS = new Set(['stop', 'unsubscribe', 'optout', 'opt out', 'cancel']);

function normalizePhone(phone, defaultCc = '91') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `${defaultCc}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${defaultCc}${digits.slice(1)}`;
  return digits;
}

async function getSettings(companyId) {
  const [rows] = await pool.query('SELECT * FROM company_whatsapp_settings WHERE company_id = ? LIMIT 1', [companyId]);
  return rows[0] || null;
}

function publicSettings(row) {
  if (!row) return { configured: false };
  const { api_key: apiKey, ...rest } = row;
  return {
    ...rest,
    configured: Boolean(apiKey && row.phone_number_id),
    api_key_masked: apiKey ? `${'•'.repeat(8)}${String(apiKey).slice(-4)}` : null,
  };
}

async function saveSettings(companyId, input = {}) {
  const existing = await getSettings(companyId);
  const pick = (key, fallback = null) => (input[key] !== undefined ? input[key] : existing?.[key] ?? fallback);
  // An empty api_key in the form means "keep the stored one".
  const apiKey = input.api_key ? String(input.api_key).trim() : existing?.api_key || null;
  const params = input.welcome_params !== undefined ? input.welcome_params : existing?.welcome_params ?? null;

  await pool.query(
    `INSERT INTO company_whatsapp_settings
       (company_id, api_key, phone_number_id, waba_id, default_country_code, auto_welcome,
        welcome_template_name, welcome_template_lang, welcome_params, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       api_key = VALUES(api_key), phone_number_id = VALUES(phone_number_id), waba_id = VALUES(waba_id),
       default_country_code = VALUES(default_country_code), auto_welcome = VALUES(auto_welcome),
       welcome_template_name = VALUES(welcome_template_name), welcome_template_lang = VALUES(welcome_template_lang),
       welcome_params = VALUES(welcome_params), is_active = VALUES(is_active)`,
    [
      companyId,
      apiKey,
      pick('phone_number_id') ? String(pick('phone_number_id')).trim() : null,
      pick('waba_id') ? String(pick('waba_id')).trim() : null,
      String(pick('default_country_code', '91')).replace(/\D/g, '') || '91',
      pick('auto_welcome', 0) ? 1 : 0,
      pick('welcome_template_name') ? String(pick('welcome_template_name')).trim() : null,
      pick('welcome_template_lang', 'en') || 'en',
      params === null ? null : JSON.stringify(Array.isArray(params) ? params : []),
      pick('is_active', 1) ? 1 : 0,
    ]
  );
  return publicSettings(await getSettings(companyId));
}

async function loadLead(companyId, leadId) {
  const [rows] = await pool.query(
    `SELECT l.*, u.name AS assigned_name, c.name AS company_name
     FROM leads l
     LEFT JOIN users u ON u.id = l.assigned_to
     JOIN companies c ON c.id = l.company_id
     WHERE l.id = ? AND l.company_id = ? LIMIT 1`,
    [leadId, companyId]
  );
  return rows[0] || null;
}

/**
 * Send one WhatsApp message to a lead and record it. `payload` is the full Pinbot body
 * minus `to` (built by the caller via pinbot.build*), `summary` is what the timeline shows.
 */
async function sendToLead({ companyId, leadId, build, msgType, body, purpose = null, sentBy = null }) {
  const settings = await getSettings(companyId);
  if (!settings || !settings.is_active || !settings.api_key || !settings.phone_number_id) {
    const err = new Error('WhatsApp is not configured for this company');
    err.status = 400;
    throw err;
  }
  const lead = await loadLead(companyId, leadId);
  if (!lead) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }
  if (lead.opted_out) {
    const err = new Error('This lead has opted out of WhatsApp messages');
    err.status = 409;
    throw err;
  }
  const to = normalizePhone(lead.phone, settings.default_country_code);
  if (!to) {
    const err = new Error('Lead has no phone number');
    err.status = 400;
    throw err;
  }

  const payload = build(to, { lead, settings });
  const [ins] = await pool.query(
    `INSERT INTO whatsapp_messages (company_id, lead_id, direction, purpose, phone, msg_type, body, payload, status, sent_by)
     VALUES (?, ?, 'out', ?, ?, ?, ?, ?, 'queued', ?)`,
    [companyId, leadId, purpose, to, msgType, body || null, JSON.stringify(payload), sentBy]
  );
  const messageRowId = ins.insertId;

  try {
    const { waMessageId } = await pinbot.sendMessage({
      apiKey: settings.api_key,
      phoneNumberId: settings.phone_number_id,
      payload,
    });
    await pool.query("UPDATE whatsapp_messages SET status = 'sent', wa_message_id = ? WHERE id = ?", [
      waMessageId,
      messageRowId,
    ]);
    await logActivity({
      companyId,
      leadId,
      type: 'whatsapp_out',
      summary: `WhatsApp ${msgType} sent${purpose ? ` (${purpose})` : ''}`,
      meta: { message_id: messageRowId, wa_message_id: waMessageId },
      actorId: sentBy,
    });
    return { id: messageRowId, wa_message_id: waMessageId, status: 'sent' };
  } catch (err) {
    await pool.query("UPDATE whatsapp_messages SET status = 'failed', error = ? WHERE id = ?", [
      err.message.slice(0, 1000),
      messageRowId,
    ]);
    await logActivity({
      companyId,
      leadId,
      type: 'whatsapp_failed',
      summary: `WhatsApp ${msgType} failed: ${err.message}`.slice(0, 255),
      meta: { message_id: messageRowId },
      actorId: sentBy,
    });
    throw err;
  }
}

function fillParams(templateParams, lead) {
  const values = {
    name: lead.name || '',
    company: lead.company_name || '',
    salesperson: lead.assigned_name || '',
  };
  const list = typeof templateParams === 'string' ? JSON.parse(templateParams || '[]') : templateParams || [];
  return list.map((p) => String(p).replace(/\{\{\s*(name|company|salesperson)\s*\}\}/g, (_, k) => values[k]));
}

/**
 * Send the approved welcome template once per lead. Fire-and-forget safe: never throws.
 * Duplicate protection: skips when a welcome message was already queued/sent for the lead.
 */
async function sendWelcomeIfEnabled(lead) {
  try {
    const settings = await getSettings(lead.company_id);
    if (!settings?.is_active || !settings.auto_welcome || !settings.welcome_template_name || !lead.phone) return null;

    const [dupe] = await pool.query(
      `SELECT id FROM whatsapp_messages
       WHERE lead_id = ? AND purpose = 'welcome' AND status <> 'failed' LIMIT 1`,
      [lead.id]
    );
    if (dupe[0]) return null;

    return await sendToLead({
      companyId: lead.company_id,
      leadId: lead.id,
      msgType: 'template',
      purpose: 'welcome',
      body: `Template: ${settings.welcome_template_name}`,
      build: (to, { lead: full, settings: s }) =>
        pinbot.buildTemplate(to, s.welcome_template_name, s.welcome_template_lang, fillParams(s.welcome_params, full)),
    });
  } catch (err) {
    console.error(`Welcome WhatsApp failed for lead ${lead.id}:`, err.message);
    return null;
  }
}

async function findLeadByPhone(companyId, waPhone, defaultCc) {
  const digits = String(waPhone || '').replace(/\D/g, '');
  if (!digits) return null;
  const tail = digits.slice(-10);
  const [rows] = await pool.query(
    `SELECT * FROM leads WHERE company_id = ? AND phone IS NOT NULL
       AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), 10) = ?
     ORDER BY id DESC LIMIT 1`,
    [companyId, tail]
  );
  return rows[0] || null;
}

function inboundBody(message) {
  return (
    message.text?.body ||
    message.button?.text ||
    message.interactive?.button_reply?.title ||
    message.interactive?.list_reply?.title ||
    message.type ||
    ''
  );
}

/** Process a Meta-format webhook body (inbound messages + delivery statuses) for one company. */
async function handleWebhook(companyId, body) {
  const settings = await getSettings(companyId);
  const defaultCc = settings?.default_country_code || '91';
  const result = { inbound: [], statuses: 0 };

  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      for (const st of value.statuses || []) {
        const mapped = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' }[st.status];
        if (!mapped || !st.id) continue;
        const error = st.errors?.[0] ? `${st.errors[0].code || ''} ${st.errors[0].title || st.errors[0].message || ''}`.trim() : null;
        // Never move a message backwards (e.g. late "sent" after "read").
        await pool.query(
          `UPDATE whatsapp_messages SET status = ?, error = COALESCE(?, error)
           WHERE company_id = ? AND wa_message_id = ?
             AND (? = 'failed' OR FIELD(status, 'queued', 'sent', 'delivered', 'read')
                                  < FIELD(?, 'queued', 'sent', 'delivered', 'read'))`,
          [mapped, error, companyId, st.id, mapped, mapped]
        );
        result.statuses += 1;
      }

      for (const message of value.messages || []) {
        const [dupe] = await pool.query('SELECT id FROM whatsapp_messages WHERE wa_message_id = ? LIMIT 1', [message.id]);
        if (dupe[0]) continue;

        const lead = await findLeadByPhone(companyId, message.from, defaultCc);
        const text = inboundBody(message);
        await pool.query(
          `INSERT INTO whatsapp_messages
             (company_id, lead_id, direction, wa_message_id, phone, msg_type, body, payload, status)
           VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'received')`,
          [companyId, lead?.id || null, message.id, message.from, message.type || 'text', text, JSON.stringify(message)]
        );

        if (lead) {
          await logActivity({
            companyId,
            leadId: lead.id,
            type: 'whatsapp_in',
            summary: `Reply: ${text}`.slice(0, 255),
            meta: { wa_message_id: message.id },
          });
          if (OPT_OUT_WORDS.has(text.trim().toLowerCase())) {
            await pool.query('UPDATE leads SET opted_out = 1 WHERE id = ?', [lead.id]);
            await logActivity({ companyId, leadId: lead.id, type: 'opt_out', summary: 'Lead opted out of WhatsApp' });
          }
          result.inbound.push({ lead_id: lead.id, wa_message_id: message.id });
        }
      }
    }
  }
  return result;
}

module.exports = {
  normalizePhone,
  getSettings,
  publicSettings,
  saveSettings,
  sendToLead,
  sendWelcomeIfEnabled,
  findLeadByPhone,
  handleWebhook,
};
