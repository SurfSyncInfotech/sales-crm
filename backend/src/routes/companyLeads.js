const express = require('express');
const crypto = require('crypto');
const XLSX = require('xlsx');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const { createLeadFromPayload, parseTags } = require('../services/leadIngest');
const {
  metaConfigured,
  buildConnectUrl,
  listFacebookConnections,
  disconnectFacebookPage,
  getPlatformStatus,
  getWizardPublic,
  selectBusiness,
  selectPages,
  selectAdAccounts,
  completeSetup,
  createTestFacebookLead,
} = require('../services/facebookConnect');

const router = express.Router();

router.use(authRequired, requireCompanyUser);

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE || 'http://localhost:5000/api/public/leads';
const APP_BASE = process.env.APP_BASE || 'http://localhost:5173';
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function ensureCompanyIntegrations(companyId) {
  const [sources] = await pool.query('SELECT id FROM lead_sources WHERE is_active = 1');
  for (const source of sources) {
    await pool.query(
      `INSERT IGNORE INTO company_lead_integrations (company_id, source_id, is_enabled, webhook_key)
       VALUES (?, ?, 0, ?)`,
      [companyId, source.id, crypto.randomBytes(16).toString('hex')]
    );
  }
}

function buildCaptureInfo(source) {
  const key = source.webhook_key;
  if (!key) {
    return { webhook_key: null, capture_page: null, endpoints: {} };
  }

  const slug = source.slug;
  const base = {
    webhook_key: key,
    capture_page: null,
    endpoints: {},
  };

  switch (slug) {
    case 'facebook-ads':
      return {
        ...base,
        connect_mode: 'oauth',
        oauth_ready: metaConfigured(),
        platform_webhook: `${PUBLIC_API_BASE}/meta/webhook`,
      };

    case 'google-ads':
      return {
        ...base,
        endpoints: {
          webhook_post: `${PUBLIC_API_BASE}/google/${key}`,
        },
      };

    case 'whatsapp':
      return {
        ...base,
        endpoints: {
          verify_get: `${PUBLIC_API_BASE}/whatsapp/${key}`,
          webhook_post: `${PUBLIC_API_BASE}/whatsapp/${key}`,
        },
      };

    case 'calling':
      return {
        ...base,
        endpoints: {
          webhook_post: `${PUBLIC_API_BASE}/calling/${key}`,
        },
      };

    case 'excel-upload':
      return {
        ...base,
        endpoints: {
          upload_api: `${API_BASE}/company/leads/upload`,
        },
      };

    case 'website-form':
      return {
        ...base,
        capture_page: `${APP_BASE}/capture/${key}`,
        endpoints: {
          form_post: `${PUBLIC_API_BASE}/form/${key}`,
          config_get: `${PUBLIC_API_BASE}/form/${key}/config`,
        },
      };

    case 'landing-pages':
      return {
        ...base,
        capture_page: `${APP_BASE}/capture/${key}?campaign=Landing%20Page`,
        endpoints: {
          form_post: `${PUBLIC_API_BASE}/form/${key}?campaign=Landing%20Page`,
          config_get: `${PUBLIC_API_BASE}/form/${key}/config`,
        },
      };

    default:
      return base;
  }
}

function rowsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

router.get('/sources', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    await ensureCompanyIntegrations(companyId);

    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.slug, s.description, s.sort_order,
              COALESCE(i.is_enabled, 0) AS is_enabled,
              i.id AS integration_id,
              i.webhook_key,
              i.last_synced_at,
              (SELECT COUNT(*) FROM leads l WHERE l.company_id = ? AND l.source_id = s.id) AS lead_count
       FROM lead_sources s
       LEFT JOIN company_lead_integrations i
         ON i.source_id = s.id AND i.company_id = ?
       WHERE s.is_active = 1
       ORDER BY s.sort_order ASC, s.name ASC`,
      [companyId, companyId]
    );

    const sources = rows.map((row) => ({
      ...row,
      capture: buildCaptureInfo(row),
    }));

    res.json({ sources });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load lead sources' });
  }
});

router.patch('/sources/:sourceId', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can manage integrations' });
    }

    const companyId = req.user.company_id;
    const sourceId = Number(req.params.sourceId);
    const { is_enabled } = req.body;

    await ensureCompanyIntegrations(companyId);

    await pool.query(
      `UPDATE company_lead_integrations
       SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
       WHERE company_id = ? AND source_id = ?`,
      [is_enabled ? 1 : 0, companyId, sourceId]
    );

    res.json({ message: 'Integration updated', is_enabled: Boolean(is_enabled) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update integration' });
  }
});

router.get('/facebook/connect', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const status = getPlatformStatus();
    const url = buildConnectUrl({
      companyId: req.user.company_id,
      userId: req.user.id,
    });
    res.json({
      url,
      ...status,
      message: 'Connect Facebook to select Business, Pages, Ad Accounts, and Lead Forms',
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to start Facebook connect' });
  }
});

router.get('/facebook/connections', async (req, res) => {
  try {
    const connections = await listFacebookConnections(req.user.company_id);
    const active = connections.filter((c) => Number(c.is_active) === 1);
    const status = getPlatformStatus();
    let connect_status = 'platform_not_ready';
    if (active.length) connect_status = 'connected';
    else if (status.oauth_ready) connect_status = 'ready';
    res.json({
      ...status,
      connect_status,
      connections,
      active_count: active.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load Facebook connections' });
  }
});

router.get('/facebook/setup/:sessionToken', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const data = await getWizardPublic(req.params.sessionToken, req.user.company_id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to load Facebook setup' });
  }
});

router.post('/facebook/setup/:sessionToken/business', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const data = await selectBusiness({
      companyId: req.user.company_id,
      sessionToken: req.params.sessionToken,
      businessId: req.body?.business_id,
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to select business' });
  }
});

router.post('/facebook/setup/:sessionToken/pages', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const data = await selectPages({
      companyId: req.user.company_id,
      sessionToken: req.params.sessionToken,
      pageIds: req.body?.page_ids || [],
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to select pages' });
  }
});

router.post('/facebook/setup/:sessionToken/ad-accounts', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const data = await selectAdAccounts({
      companyId: req.user.company_id,
      sessionToken: req.params.sessionToken,
      adAccountIds: req.body?.ad_account_ids || [],
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to select ad accounts' });
  }
});

router.post('/facebook/setup/:sessionToken/complete', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const result = await completeSetup({
      companyId: req.user.company_id,
      userId: req.user.id,
      sessionToken: req.params.sessionToken,
      formIds: req.body?.form_ids || [],
    });
    res.json({
      message: result.saved.length
        ? `Connected ${result.saved.length} Page(s) — Lead Ads will sync automatically`
        : 'No Pages connected',
      ...result,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to complete Facebook setup' });
  }
});

// Legacy aliases
router.get('/facebook/pending/:sessionToken', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const data = await getWizardPublic(req.params.sessionToken, req.user.company_id);
    res.json({
      session_token: data.session_token,
      expires_at: data.expires_at,
      pages: (data.wizard.pages || []).map((p) => ({
        page_id: p.id,
        page_name: p.name,
      })),
      wizard: data.wizard,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to load Facebook Pages' });
  }
});

router.post('/facebook/pages/confirm', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can connect Facebook' });
    }
    const sessionToken = req.body?.session_token;
    await selectPages({
      companyId: req.user.company_id,
      sessionToken,
      pageIds: req.body?.page_ids || [],
    });
    const result = await completeSetup({
      companyId: req.user.company_id,
      userId: req.user.id,
      sessionToken,
      formIds: req.body?.form_ids || [],
    });
    res.json({
      message: result.saved.length
        ? `Connected ${result.saved.length} Facebook Page(s)`
        : 'No Pages connected',
      saved: result.saved,
      errors: result.errors,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to confirm Facebook Pages' });
  }
});

router.post('/facebook/test-lead', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can send a test lead' });
    }
    const lead = await createTestFacebookLead({
      companyId: req.user.company_id,
      pageId: req.body?.page_id || null,
      name: req.body?.name,
      phone: req.body?.phone,
      email: req.body?.email,
    });
    res.status(201).json({
      message: lead.duplicate ? 'Lead already existed (deduped)' : 'Test Facebook lead created',
      lead,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to create test lead' });
  }
});

router.delete('/facebook/connections/:pageId', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can disconnect Facebook' });
    }
    await disconnectFacebookPage(req.user.company_id, req.params.pageId);
    res.json({ message: 'Facebook Page disconnected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to disconnect Facebook Page' });
  }
});

router.get('/', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { source, status, q, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * pageSize;

    const where = ['l.company_id = ?'];
    const params = [companyId];

    if (req.user.role === 'salesperson') {
      where.push('l.assigned_to = ?');
      params.push(req.user.id);
    }

    if (source) {
      where.push('(s.slug = ? OR l.source_name = ?)');
      params.push(source, source);
    }

    if (status) {
      where.push('l.status = ?');
      params.push(status);
    }

    if (q) {
      where.push('(l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.lead_code LIKE ? OR l.campaign LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }

    const whereSql = where.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM leads l
       LEFT JOIN lead_sources s ON s.id = l.source_id
       WHERE ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT l.*,
              s.name AS source_label,
              s.slug AS source_slug,
              u.name AS assigned_name,
              u.email AS assigned_email
       FROM leads l
       LEFT JOIN lead_sources s ON s.id = l.source_id
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE ${whereSql}
       ORDER BY l.lead_date DESC, l.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const leads = rows.map((row) => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : row.tags || [],
    }));

    res.json({
      leads,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: Number(total),
        totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load leads' });
  }
});

router.post('/', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const {
      name,
      phone,
      email,
      lead_company,
      source_id,
      campaign,
      lead_date,
      assigned_to,
      tags,
      notes,
      status = 'new',
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Lead name is required' });
    }

    let sourceId = source_id ? Number(source_id) : null;
    let sourceName = null;

    if (sourceId) {
      const [sources] = await pool.query('SELECT id, name FROM lead_sources WHERE id = ? LIMIT 1', [sourceId]);
      if (!sources[0]) {
        return res.status(400).json({ message: 'Invalid lead source' });
      }
      sourceName = sources[0].name;
    }

    if (assigned_to) {
      const [assignees] = await pool.query(
        `SELECT id FROM users
         WHERE id = ? AND company_id = ? AND is_active = 1
           AND role IN ('salesperson', 'company_admin')
         LIMIT 1`,
        [assigned_to, companyId]
      );
      if (!assignees[0]) {
        return res.status(400).json({ message: 'Assigned salesperson not found in this company' });
      }
    }

    const lead = await createLeadFromPayload({
      companyId,
      sourceId,
      sourceName,
      payload: {
        name,
        phone,
        email,
        lead_company,
        company: lead_company,
        campaign,
        lead_date,
        tags,
        notes,
        status,
        assigned_to,
      },
      createdBy: req.user.id,
      overrides: {
        assigned_to: assigned_to || null,
        status: status || 'new',
      },
    });

    const [rows] = await pool.query(
      `SELECT l.*, s.name AS source_label, u.name AS assigned_name
       FROM leads l
       LEFT JOIN lead_sources s ON s.id = l.source_id
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE l.id = ?`,
      [lead.id]
    );

    const enriched = rows[0];
    enriched.tags = typeof enriched.tags === 'string' ? JSON.parse(enriched.tags || '[]') : enriched.tags || [];

    res.status(201).json({
      message: 'Lead created',
      lead: enriched,
      flow: ['System receives lead', 'Create Lead', 'Lead saved in unified inbox'],
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to create lead' });
  }
});

router.post('/upload', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can upload leads' });
    }

    const companyId = req.user.company_id;
    const { file_base64, file_name, rows: bodyRows } = req.body || {};

    await ensureCompanyIntegrations(companyId);

    const [integrations] = await pool.query(
      `SELECT i.*, s.name AS source_name, s.slug AS source_slug
       FROM company_lead_integrations i
       JOIN lead_sources s ON s.id = i.source_id
       WHERE i.company_id = ? AND s.slug = 'excel-upload'
       LIMIT 1`,
      [companyId]
    );

    const integration = integrations[0];
    if (!integration) {
      return res.status(400).json({ message: 'Excel upload source is not available' });
    }
    if (!integration.is_enabled) {
      return res.status(403).json({ message: 'Enable Excel Uploads before importing leads' });
    }

    let rows = Array.isArray(bodyRows) ? bodyRows : [];

    if (file_base64) {
      const base64Data = String(file_base64).includes(',')
        ? String(file_base64).split(',').pop()
        : String(file_base64);
      const buffer = Buffer.from(base64Data, 'base64');
      rows = rowsFromWorkbook(buffer);
    }

    if (!rows.length) {
      return res.status(400).json({ message: 'No rows found to import' });
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      try {
        const lead = await createLeadFromPayload({
          companyId,
          sourceId: integration.source_id,
          sourceName: integration.source_name,
          payload: {
            ...row,
            campaign: row.campaign || file_name || 'Excel Upload',
          },
          createdBy: req.user.id,
          overrides: {
            campaign: row.campaign || file_name || 'Excel Upload',
          },
        });
        created.push({ row: i + 1, lead_id: lead.id, lead_code: lead.lead_code, name: lead.name });
      } catch (err) {
        errors.push({ row: i + 1, message: err.message || 'Failed to create lead', data: row });
      }
    }

    res.status(201).json({
      message: 'Upload processed',
      created_count: created.length,
      created,
      errors,
      file_name: file_name || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload leads' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const leadId = Number(req.params.id);

    const [existingRows] = await pool.query(
      'SELECT * FROM leads WHERE id = ? AND company_id = ? LIMIT 1',
      [leadId, companyId]
    );
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ message: 'Lead not found' });

    if (req.user.role === 'salesperson' && existing.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'You can only update leads assigned to you' });
    }

    const {
      name,
      phone,
      email,
      lead_company,
      source_id,
      campaign,
      lead_date,
      assigned_to,
      tags,
      status,
      notes,
    } = req.body;

    let sourceId = typeof source_id === 'undefined' ? existing.source_id : source_id ? Number(source_id) : null;
    let sourceName = existing.source_name;

    if (typeof source_id !== 'undefined' && sourceId) {
      const [sources] = await pool.query('SELECT id, name FROM lead_sources WHERE id = ? LIMIT 1', [sourceId]);
      if (!sources[0]) return res.status(400).json({ message: 'Invalid lead source' });
      sourceName = sources[0].name;
    } else if (source_id === null || source_id === '') {
      sourceName = null;
      sourceId = null;
    }

    const tagList = typeof tags === 'undefined' ? null : parseTags(tags);

    await pool.query(
      `UPDATE leads SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        lead_company = COALESCE(?, lead_company),
        source_id = ?,
        source_name = ?,
        campaign = COALESCE(?, campaign),
        lead_date = COALESCE(?, lead_date),
        assigned_to = ?,
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
       WHERE id = ? AND company_id = ?`,
      [
        name ?? null,
        phone ?? null,
        email ? String(email).trim().toLowerCase() : null,
        lead_company ?? null,
        sourceId,
        sourceName,
        campaign ?? null,
        lead_date ? new Date(lead_date) : null,
        typeof assigned_to === 'undefined' ? existing.assigned_to : assigned_to || null,
        tagList ? JSON.stringify(tagList) : null,
        status ?? null,
        notes ?? null,
        leadId,
        companyId,
      ]
    );

    const [rows] = await pool.query(
      `SELECT l.*, s.name AS source_label, u.name AS assigned_name
       FROM leads l
       LEFT JOIN lead_sources s ON s.id = l.source_id
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE l.id = ?`,
      [leadId]
    );

    const lead = rows[0];
    lead.tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags || '[]') : lead.tags || [];
    res.json({ lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

module.exports = router;
