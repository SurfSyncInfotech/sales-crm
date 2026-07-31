const crypto = require('crypto');
const pool = require('../config/db');

function makeLeadCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LD-${stamp}-${rand}`;
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function pick(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return null;
}

function normalizeLeadInput(payload = {}) {
  const fieldData = Array.isArray(payload.field_data)
    ? Object.fromEntries(
        payload.field_data.map((f) => [
          String(f.name || f.key || '').toLowerCase(),
          Array.isArray(f.values) ? f.values[0] : f.value,
        ])
      )
    : {};

  const data = { ...fieldData, ...payload };

  const name =
    pick(data, ['name', 'full_name', 'fullname', 'customer_name', 'lead_name', 'contact_name']) ||
    [pick(data, ['first_name', 'firstname']), pick(data, ['last_name', 'lastname'])]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    null;

  const phone = pick(data, [
    'phone',
    'phone_number',
    'mobile',
    'mobile_number',
    'contact_number',
    'caller_id',
    'from',
    'CallFrom',
    'wa_id',
  ]);

  const email = pick(data, ['email', 'email_address', 'mail']);
  const leadCompany = pick(data, ['company', 'lead_company', 'company_name', 'business_name', 'organisation']);
  const campaign = pick(data, ['campaign', 'campaign_name', 'utm_campaign', 'ad_name', 'form_name', 'page_name']);
  const notes = pick(data, ['notes', 'message', 'enquiry', 'comment', 'body', 'CallStatus', 'text']);

  return {
    name: name || (phone ? `Lead ${phone}` : email ? `Lead ${email}` : null),
    phone,
    email: email ? email.toLowerCase() : null,
    lead_company: leadCompany,
    campaign,
    notes,
    tags: parseTags(data.tags),
    lead_date: data.lead_date || data.created_time || data.Date || new Date(),
    status: data.status || 'new',
    assigned_to: data.assigned_to || null,
  };
}

async function resolveIntegrationByWebhookKey(webhookKey, expectedSlugs = null) {
  // First check if the webhookKey is registered in company_form_urls
  const [urlRows] = await pool.query(
    `SELECT u.company_id, u.source_id, u.url, s.slug AS source_slug, s.name AS source_name, s.is_active AS source_active,
            c.name AS company_name, c.slug AS company_slug, c.status AS company_status,
            COALESCE(i.is_enabled, 0) AS is_enabled
     FROM company_form_urls u
     JOIN lead_sources s ON s.id = u.source_id
     JOIN companies c ON c.id = u.company_id
     LEFT JOIN company_lead_integrations i ON i.company_id = u.company_id AND i.source_id = u.source_id
     WHERE u.webhook_key = ?
     LIMIT 1`,
    [webhookKey]
  );

  let integration = null;
  if (urlRows[0]) {
    const row = urlRows[0];
    integration = {
      ...row,
      webhook_key: webhookKey,
      custom_url: row.url,
    };
  } else {
    // Fallback: Check company_lead_integrations
    const [rows] = await pool.query(
      `SELECT i.*, s.slug AS source_slug, s.name AS source_name, s.is_active AS source_active,
              c.id AS company_id, c.name AS company_name, c.slug AS company_slug, c.status AS company_status
       FROM company_lead_integrations i
       JOIN lead_sources s ON s.id = i.source_id
       JOIN companies c ON c.id = i.company_id
       WHERE i.webhook_key = ?
       LIMIT 1`,
      [webhookKey]
    );
    integration = rows[0];
  }

  if (!integration) {
    const err = new Error('Invalid webhook key');
    err.status = 404;
    throw err;
  }
  if (!integration.source_active) {
    const err = new Error('Lead source is not available');
    err.status = 400;
    throw err;
  }
  if (['suspended', 'cancelled'].includes(integration.company_status)) {
    const err = new Error('Company is not active');
    err.status = 403;
    throw err;
  }
  if (!integration.is_enabled) {
    const err = new Error('This channel is not enabled for the company');
    err.status = 403;
    throw err;
  }
  if (expectedSlugs && !expectedSlugs.includes(integration.source_slug)) {
    const err = new Error(`Webhook key is not for ${expectedSlugs.join('/')}`);
    err.status = 400;
    throw err;
  }
  return integration;
}

async function createLeadFromPayload({
  companyId,
  sourceId,
  sourceName,
  payload,
  createdBy = null,
  overrides = {},
  externalId = null,
}) {
  const normalized = { ...normalizeLeadInput(payload), ...overrides };

  if (!normalized.name) {
    const err = new Error('Lead name or phone/email is required');
    err.status = 400;
    throw err;
  }

  const resolvedExternalId =
    externalId ||
    payload?.external_id ||
    (payload?.leadgen_id ? `fb_leadgen:${payload.leadgen_id}` : null);

  if (resolvedExternalId) {
    const [existing] = await pool.query(
      `SELECT * FROM leads WHERE company_id = ? AND external_id = ? LIMIT 1`,
      [companyId, resolvedExternalId]
    );
    if (existing[0]) {
      const lead = existing[0];
      lead.tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags || '[]') : lead.tags || [];
      lead.duplicate = true;
      return lead;
    }
  }

  const leadCode = makeLeadCode();
  const [result] = await pool.query(
    `INSERT INTO leads
      (company_id, lead_code, external_id, name, phone, email, lead_company, source_id, source_name,
       campaign, lead_date, assigned_to, tags, status, notes, raw_payload, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      leadCode,
      resolvedExternalId,
      normalized.name,
      normalized.phone,
      normalized.email,
      normalized.lead_company,
      sourceId,
      sourceName,
      normalized.campaign,
      new Date(normalized.lead_date),
      normalized.assigned_to || null,
      JSON.stringify(normalized.tags || []),
      normalized.status || 'new',
      normalized.notes,
      JSON.stringify(payload || {}),
      createdBy,
    ]
  );

  await pool.query(
    `UPDATE company_lead_integrations
     SET last_synced_at = CURRENT_TIMESTAMP
     WHERE company_id = ? AND source_id = ?`,
    [companyId, sourceId]
  );

  const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
  const lead = rows[0];
  lead.tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags || '[]') : lead.tags || [];
  return lead;
}

async function ingestByWebhookKey(webhookKey, payload, options = {}) {
  const integration = await resolveIntegrationByWebhookKey(webhookKey, options.expectedSlugs || null);
  const lead = await createLeadFromPayload({
    companyId: integration.company_id,
    sourceId: integration.source_id,
    sourceName: integration.source_name,
    payload,
    createdBy: options.createdBy || null,
    overrides: options.overrides || {},
  });
  return { lead, integration };
}

module.exports = {
  makeLeadCode,
  parseTags,
  normalizeLeadInput,
  resolveIntegrationByWebhookKey,
  createLeadFromPayload,
  ingestByWebhookKey,
};
