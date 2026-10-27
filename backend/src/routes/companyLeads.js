const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../config/db');
const mailer = require('../services/mailer');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const { createLeadFromPayload, parseTags } = require('../services/leadIngest');
const { setLeadStage, logActivity } = require('../services/pipeline');
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

function sanitizeExcelRow(rawRow) {
  const normalized = {};
  for (const [key, val] of Object.entries(rawRow || {})) {
    const cleanKey = String(key || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
    normalized[cleanKey] = val !== undefined && val !== null ? String(val).trim() : '';
  }

  // Strictly extract ONLY the 5 allowed fields:
  // 1. lead_id
  // 2. Name
  // 3. Phone
  // 4. Email
  // 5. company_name
  const lead_id = normalized.lead_id || normalized.id || normalized.leadid || null;
  const name = normalized.name || normalized.full_name || normalized.client_name || normalized.lead_name || '';
  const phone = normalized.phone || normalized.mobile || normalized.phone_number || normalized.contact || normalized.contact_number || '';
  const email = normalized.email || normalized.email_address || normalized.mail || '';
  const company_name = normalized.company_name || normalized.company || normalized.lead_company || normalized.business_name || '';

  return {
    lead_id,
    name,
    phone,
    email,
    company_name,
  };
}

router.get('/upload/template', (req, res) => {
  const csvContent =
    'lead_id,Name,Phone,Email,company_name\r\n' +
    'LID-101,Rahul Sharma,9876543210,rahul@example.com,Sharma Tech\r\n' +
    'LID-102,Priya Patel,9876543211,priya@example.com,Patel Enterprises\r\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads_upload_template.csv"');
  return res.send(csvContent);
});

router.post('/preview-excel', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can preview lead files' });
    }

    const { file_base64, file_name } = req.body || {};
    if (!file_base64) {
      return res.status(400).json({ message: 'No spreadsheet file provided for preview' });
    }

    const base64Data = String(file_base64).includes(',')
      ? String(file_base64).split(',').pop()
      : String(file_base64);
    const buffer = Buffer.from(base64Data, 'base64');
    const rawRows = rowsFromWorkbook(buffer);

    if (!rawRows || !rawRows.length) {
      return res.status(400).json({ message: 'No rows or readable data found in the spreadsheet' });
    }

    let validCount = 0;
    let invalidCount = 0;

    const previewRows = rawRows.map((rawRow, idx) => {
      const clean = sanitizeExcelRow(rawRow);
      const isValid = Boolean(clean.name || clean.phone);
      if (isValid) {
        validCount += 1;
      } else {
        invalidCount += 1;
      }

      return {
        rowNumber: idx + 1,
        lead_id: clean.lead_id || '',
        name: clean.name || '',
        phone: clean.phone || '',
        email: clean.email || '',
        company_name: clean.company_name || '',
        isValid,
        issue: isValid ? null : 'Missing both Name and Phone',
      };
    });

    res.json({
      file_name: file_name || 'Spreadsheet File',
      total_rows: rawRows.length,
      valid_count: validCount,
      invalid_count: invalidCount,
      rows: previewRows,
    });
  } catch (err) {
    console.error('Failed to preview excel spreadsheet:', err);
    res.status(500).json({ message: err.message || 'Failed to parse spreadsheet file' });
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
      const rawRow = rows[i] || {};
      const cleanRow = sanitizeExcelRow(rawRow);

      // Validate required fields: At least Name or Phone must be provided
      if (!cleanRow.name && !cleanRow.phone) {
        errors.push({
          row: i + 1,
          message: 'Both Name and Phone are missing in this row',
          data: cleanRow,
        });
        continue;
      }

      try {
        const lead = await createLeadFromPayload({
          companyId,
          sourceId: integration.source_id,
          sourceName: integration.source_name,
          payload: {
            external_id: cleanRow.lead_id || null,
            name: cleanRow.name,
            phone: cleanRow.phone,
            email: cleanRow.email,
            lead_company: cleanRow.company_name,
            campaign: file_name || 'Excel Upload',
          },
          createdBy: req.user.id,
          overrides: {
            external_id: cleanRow.lead_id || null,
            campaign: file_name || 'Excel Upload',
          },
          externalId: cleanRow.lead_id || null,
        });
        created.push({
          row: i + 1,
          lead_id: lead.id,
          lead_code: lead.lead_code,
          name: lead.name,
          phone: lead.phone,
          duplicate: lead.duplicate || false,
        });
      } catch (err) {
        errors.push({ row: i + 1, message: err.message || 'Failed to create lead', data: cleanRow });
      }
    }

    res.status(201).json({
      message: `Processed ${rows.length} rows (${created.length} imported, ${errors.length} errors)`,
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
      deal_value,
      quotation_pdf_url,
      demo_link,
      demo_notes,
      demo_sent_at,
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
        notes = COALESCE(?, notes),
        deal_value = COALESCE(?, deal_value),
        quotation_pdf_url = COALESCE(?, quotation_pdf_url),
        demo_link = COALESCE(?, demo_link),
        demo_notes = COALESCE(?, demo_notes),
        demo_sent_at = COALESCE(?, demo_sent_at)
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
        deal_value !== undefined && deal_value !== null && deal_value !== '' ? Number(deal_value) : null,
        quotation_pdf_url || null,
        demo_link || null,
        demo_notes || null,
        demo_sent_at ? new Date(demo_sent_at) : null,
        leadId,
        companyId,
      ]
    );

    if (demo_link) {
      await pool.query(
        `INSERT INTO lead_feedbacks (company_id, lead_id, user_id, from_status, to_status, feedback)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [companyId, leadId, req.user.id, existing.status || 'demo_requested', status || existing.status || 'demo_sent', `Admin provided demo website link: ${demo_link}`]
      );
    }

    if (status && status !== existing.status) {
      const [stageRows] = await pool.query(
        `SELECT id FROM pipeline_stages WHERE company_id = ? AND legacy_status = ? AND is_active = 1
         ORDER BY position ASC LIMIT 1`,
        [companyId, status]
      );
      if (stageRows[0]) {
        await setLeadStage({ companyId, leadId, stageId: stageRows[0].id, actorId: req.user.id });
      }

      if (status === 'quotation_sent') {
        await pool.query("UPDATE leads SET quotation_sent_at = NOW() WHERE id = ?", [leadId]);
        await pool.query("UPDATE lead_reminders SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'", [leadId]);
        const repId = existing.assigned_to || existing.claimed_by || req.user.id;
        const quoteFollowupDays = [2, 5, 10, 21];
        for (const d of quoteFollowupDays) {
          await pool.query(
            `INSERT INTO lead_reminders (company_id, lead_id, salesperson_id, phase, day_number, scheduled_for, status)
             VALUES (?, ?, ?, 'phase_2_post_quote', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'pending')`,
            [companyId, leadId, repId, d, d]
          );
        }
      } else if (status === 'quotation_requested') {
        await pool.query("UPDATE lead_reminders SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'", [leadId]);
      }
    }
    const newAssignee = typeof assigned_to === 'undefined' ? existing.assigned_to : assigned_to || null;
    if (newAssignee !== existing.assigned_to) {
      await logActivity({
        companyId,
        leadId,
        type: 'assigned',
        summary: newAssignee ? 'Lead reassigned manually' : 'Lead unassigned',
        meta: { from_user_id: existing.assigned_to, to_user_id: newAssignee },
        actorId: req.user.id,
      });
    }

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

router.post('/upload-quotation-pdf', async (req, res) => {
  try {
    const { filename, base64Data } = req.body || {};
    if (!base64Data) return res.status(400).json({ message: 'No file data provided' });
    const uploadsDir = path.resolve(__dirname, '../../uploads/quotations');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const safeName = `${Date.now()}-${(filename || 'quotation.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    const url = `/uploads/quotations/${safeName}`;
    res.json({ ok: true, url, filename: safeName });
  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ message: 'Failed to upload quotation PDF' });
  }
});

router.post('/:id/send-quotation-email', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const leadId = Number(req.params.id);
    const { to, subject, body, pdfUrl, pdfFilename, dealValue } = req.body || {};

    if (!to || !to.trim()) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Email subject is required' });
    }

    const [existingRows] = await pool.query('SELECT * FROM leads WHERE id = ? AND company_id = ? LIMIT 1', [leadId, companyId]);
    const lead = existingRows[0];
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // 1. Send via Hostinger SMTP
    await mailer.sendQuotationEmail({
      to: to.trim(),
      subject: subject.trim(),
      body: body || '',
      pdfUrl: pdfUrl || null,
      pdfFilename: pdfFilename || null,
    });

    // 2. Update lead status to quotation_sent + deal_value + email + quotation_pdf_url
    await pool.query(
      `UPDATE leads 
       SET status = 'quotation_sent', 
           email = ?, 
           deal_value = COALESCE(?, deal_value), 
           quotation_pdf_url = COALESCE(?, quotation_pdf_url)
       WHERE id = ? AND company_id = ?`,
      [to.trim(), dealValue ? Number(dealValue) : null, pdfUrl || null, leadId, companyId]
    );

    // 3. Clear old reminders and schedule Phase 2 follow-ups
    await pool.query("UPDATE lead_reminders SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'", [leadId]);
    const repId = lead.claimed_by || lead.assigned_to || req.user.id;
    const quoteFollowupDays = [2, 5, 10, 21];
    for (const d of quoteFollowupDays) {
      await pool.query(
        `INSERT INTO lead_reminders (company_id, lead_id, salesperson_id, phase, day_number, scheduled_for, status)
         VALUES (?, ?, ?, 'phase_2_post_quote', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'pending')`,
        [companyId, leadId, repId, d, d]
      );
    }

    // 4. Log activity
    await logActivity({
      companyId,
      leadId,
      type: 'email_sent',
      summary: `Quotation email sent to ${to.trim()} with subject "${subject.trim()}"`,
      meta: { subject, pdfUrl, to: to.trim() },
      actorId: req.user.id,
    });

    res.json({ ok: true, message: 'Quotation email sent successfully with attached PDF!' });
  } catch (err) {
    console.error('Send quotation email error:', err);
    res.status(500).json({ message: err.message || 'Failed to send quotation email' });
  }
});

router.post('/:id/send-demo-email', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const leadId = Number(req.params.id);
    const { to, subject, body, demoLink } = req.body || {};

    if (!to || !to.trim()) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Email subject is required' });
    }

    const [existingRows] = await pool.query('SELECT * FROM leads WHERE id = ? AND company_id = ? LIMIT 1', [leadId, companyId]);
    const lead = existingRows[0];
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Send via Hostinger SMTP
    await mailer.sendQuotationEmail({
      to: to.trim(),
      subject: subject.trim(),
      body: body || '',
    });

    // Update lead with demo_link, demo_sent_at, email, status = 'followup'
    await pool.query(
      `UPDATE leads 
       SET demo_link = COALESCE(?, demo_link),
           demo_sent_at = NOW(),
           email = ?,
           status = 'followup',
           updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [demoLink || null, to.trim(), leadId, companyId]
    );

    // Record in lead feedbacks
    await pool.query(
      `INSERT INTO lead_feedbacks (company_id, lead_id, user_id, from_status, to_status, feedback)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, leadId, req.user.id, lead.status || 'demo_requested', 'followup', `Admin delivered demo website via Email to ${to.trim()}: ${demoLink || ''}`]
    );

    // Log activity
    await logActivity({
      companyId,
      leadId,
      type: 'email_sent',
      summary: `Demo website email sent to ${to.trim()} with subject "${subject.trim()}"`,
      meta: { subject, demoLink, to: to.trim() },
      actorId: req.user.id,
    });

    res.json({ ok: true, message: 'Demo website email sent successfully!' });
  } catch (err) {
    console.error('Send demo email error:', err);
    res.status(500).json({ message: err.message || 'Failed to send demo email' });
  }
});

router.get('/urls', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const sourceId = req.query.source_id ? Number(req.query.source_id) : null;

    let query = 'SELECT * FROM company_form_urls WHERE company_id = ?';
    const params = [companyId];

    if (sourceId) {
      query += ' AND source_id = ?';
      params.push(sourceId);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ urls: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch registered URLs' });
  }
});

router.post('/urls', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can manage integrations' });
    }
    const companyId = req.user.company_id;
    const { url, source_id } = req.body;

    if (!url || !source_id) {
      return res.status(400).json({ message: 'URL and source_id are required' });
    }

    const webhookKey = crypto.randomBytes(16).toString('hex');

    await pool.query(
      `INSERT INTO company_form_urls (company_id, source_id, url, webhook_key)
       VALUES (?, ?, ?, ?)`,
      [companyId, Number(source_id), url.trim(), webhookKey]
    );

    const [rows] = await pool.query(
      'SELECT * FROM company_form_urls WHERE company_id = ? AND webhook_key = ? LIMIT 1',
      [companyId, webhookKey]
    );

    res.status(201).json({ url: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to register URL' });
  }
});

router.delete('/urls/:id', async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Only company admins can manage integrations' });
    }
    const companyId = req.user.company_id;
    const urlId = Number(req.params.id);

    const [existing] = await pool.query(
      'SELECT * FROM company_form_urls WHERE id = ? AND company_id = ? LIMIT 1',
      [urlId, companyId]
    );

    if (!existing[0]) {
      return res.status(404).json({ message: 'URL not found' });
    }

    await pool.query(
      'DELETE FROM company_form_urls WHERE id = ? AND company_id = ?',
      [urlId, companyId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete URL' });
  }
});

module.exports = router;
