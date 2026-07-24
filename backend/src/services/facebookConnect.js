const crypto = require('crypto');
const pool = require('../config/db');
const { createLeadFromPayload } = require('./leadIngest');

const GRAPH = 'https://graph.facebook.com/v21.0';
const SESSION_TTL_MS = 45 * 60 * 1000;

function metaConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function getRedirectUri() {
  return (
    process.env.META_REDIRECT_URI ||
    `${process.env.API_BASE || 'http://localhost:5000/api'}/public/leads/facebook/oauth/callback`
  );
}

function getPlatformWebhook() {
  const base = process.env.PUBLIC_API_BASE || 'http://localhost:5000/api/public/leads';
  return `${base.replace(/\/$/, '')}/meta/webhook`;
}

function getPlatformStatus() {
  return {
    oauth_ready: metaConfigured(),
    app_id_set: Boolean(process.env.META_APP_ID),
    redirect_uri: getRedirectUri(),
    platform_webhook: getPlatformWebhook(),
    verify_token: process.env.META_VERIFY_TOKEN || 'surfsync_verify',
    public_api_base: process.env.PUBLIC_API_BASE || 'http://localhost:5000/api/public/leads',
    note: metaConfigured()
      ? 'Companies tap Connect Facebook — Business → Pages → Ads → Forms → auto webhook.'
      : 'SurfSync admin must set META_APP_ID and META_APP_SECRET once. Companies never create a Meta App.',
  };
}

function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'surfsync')
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'surfsync')
    .update(body)
    .digest('base64url');
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function buildConnectUrl({ companyId, userId }) {
  if (!metaConfigured()) {
    const err = new Error(
      'Facebook Connect is not configured yet. SurfSync admin must set META_APP_ID and META_APP_SECRET.'
    );
    err.status = 503;
    throw err;
  }

  const state = signState({ companyId, userId, ts: Date.now() });
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: getRedirectUri(),
    state,
    scope: [
      'public_profile',
      'email',
      'pages_show_list',
      'pages_manage_metadata',
      'pages_read_engagement',
      'leads_retrieval',
      'business_management',
      'ads_read',
      'pages_manage_ads',
    ].join(','),
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

async function graphGet(path, accessToken, query = {}) {
  const params = new URLSearchParams({ ...query, access_token: accessToken });
  const res = await fetch(`${GRAPH}${path}?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || `Facebook API error on ${path}`);
    err.status = data.error?.code === 190 ? 401 : 502;
    err.fb = data.error;
    throw err;
  }
  return data;
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: getRedirectUri(),
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to exchange Facebook code');
  }
  return data;
}

async function exchangeLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    console.warn('Long-lived token exchange failed:', data.error?.message || res.status);
    return { access_token: shortLivedToken };
  }
  return data;
}

async function fetchFacebookUser(accessToken) {
  const data = await graphGet('/me', accessToken, { fields: 'id,name,email' });
  return { id: String(data.id), name: data.name || null, email: data.email || null };
}

async function fetchBusinesses(accessToken) {
  const data = await graphGet('/me/businesses', accessToken, { fields: 'id,name,verification_status' });
  return (data.data || []).map((b) => ({
    id: String(b.id),
    name: b.name || String(b.id),
    verification_status: b.verification_status || null,
  }));
}

async function fetchBusinessPages(businessId, accessToken) {
  const owned = await graphGet(`/${businessId}/owned_pages`, accessToken, {
    fields: 'id,name,access_token,tasks',
    limit: '100',
  }).catch(() => ({ data: [] }));

  const client = await graphGet(`/${businessId}/client_pages`, accessToken, {
    fields: 'id,name,access_token,tasks',
    limit: '100',
  }).catch(() => ({ data: [] }));

  const map = new Map();
  for (const p of [...(owned.data || []), ...(client.data || [])]) {
    map.set(String(p.id), {
      id: String(p.id),
      name: p.name || String(p.id),
      access_token: p.access_token || null,
      tasks: p.tasks || [],
    });
  }
  return [...map.values()];
}

async function fetchUserPages(accessToken) {
  const data = await graphGet('/me/accounts', accessToken, {
    fields: 'id,name,access_token,tasks',
    limit: '100',
  });
  return (data.data || []).map((p) => ({
    id: String(p.id),
    name: p.name || String(p.id),
    access_token: p.access_token || null,
    tasks: p.tasks || [],
  }));
}

async function fetchAdAccounts(businessId, accessToken) {
  const owned = await graphGet(`/${businessId}/owned_ad_accounts`, accessToken, {
    fields: 'id,name,account_id,currency,account_status',
    limit: '100',
  }).catch(() => ({ data: [] }));

  const client = await graphGet(`/${businessId}/client_ad_accounts`, accessToken, {
    fields: 'id,name,account_id,currency,account_status',
    limit: '100',
  }).catch(() => ({ data: [] }));

  const map = new Map();
  for (const a of [...(owned.data || []), ...(client.data || [])]) {
    map.set(String(a.id), {
      id: String(a.id),
      name: a.name || a.account_id || String(a.id),
      account_id: a.account_id || null,
      currency: a.currency || null,
      account_status: a.account_status || null,
    });
  }
  return [...map.values()];
}

async function fetchLeadFormsForPage(pageId, pageToken) {
  const data = await graphGet(`/${pageId}/leadgen_forms`, pageToken, {
    fields: 'id,name,status,leads_count,created_time',
    limit: '100',
  });
  return (data.data || []).map((f) => ({
    id: String(f.id),
    name: f.name || String(f.id),
    status: f.status || null,
    leads_count: f.leads_count || 0,
    page_id: String(pageId),
  }));
}

async function subscribePageToLeadgen(pageId, pageToken) {
  const params = new URLSearchParams({
    subscribed_fields: 'leadgen',
    access_token: pageToken,
  });
  const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
    method: 'POST',
    body: params,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to subscribe Page to leadgen');
  }
  return data;
}

function emptyWizard() {
  return {
    step: 'business',
    access_token: null,
    fb_user: null,
    businesses: [],
    selected_business_id: null,
    selected_business_name: null,
    pages: [],
    selected_page_ids: [],
    ad_accounts: [],
    selected_ad_account_ids: [],
    forms: [],
    selected_form_ids: [],
  };
}

function parseWizard(raw) {
  if (!raw) return emptyWizard();
  if (typeof raw === 'string') {
    try {
      return { ...emptyWizard(), ...JSON.parse(raw) };
    } catch {
      return emptyWizard();
    }
  }
  // Legacy: array of pages
  if (Array.isArray(raw)) {
    return {
      ...emptyWizard(),
      step: 'pages',
      pages: raw,
      selected_page_ids: raw.map((p) => String(p.id)),
    };
  }
  return { ...emptyWizard(), ...raw };
}

function publicWizardView(wizard) {
  return {
    step: wizard.step,
    fb_user: wizard.fb_user
      ? { id: wizard.fb_user.id, name: wizard.fb_user.name, email: wizard.fb_user.email }
      : null,
    businesses: wizard.businesses || [],
    selected_business_id: wizard.selected_business_id || null,
    selected_business_name: wizard.selected_business_name || null,
    pages: (wizard.pages || []).map((p) => ({
      id: String(p.id),
      name: p.name,
      tasks: p.tasks || [],
    })),
    selected_page_ids: wizard.selected_page_ids || [],
    ad_accounts: wizard.ad_accounts || [],
    selected_ad_account_ids: wizard.selected_ad_account_ids || [],
    forms: wizard.forms || [],
    selected_form_ids: wizard.selected_form_ids || [],
  };
}

async function createWizardSession({ companyId, userId, accessToken, fbUser, businesses }) {
  const sessionToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const wizard = {
    ...emptyWizard(),
    step: businesses.length ? 'business' : 'pages',
    access_token: accessToken,
    fb_user: fbUser,
    businesses,
  };

  // No business manager — fall back to personal pages immediately
  if (!businesses.length) {
    wizard.pages = await fetchUserPages(accessToken);
    wizard.step = 'pages';
    wizard.selected_business_id = null;
    wizard.selected_business_name = 'Personal Pages';
  }

  await pool.query(
    `INSERT INTO facebook_connect_sessions (session_token, company_id, user_id, pages_json, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionToken, companyId, userId || null, JSON.stringify(wizard), expiresAt]
  );

  return {
    session_token: sessionToken,
    expires_at: expiresAt,
    wizard: publicWizardView(wizard),
  };
}

async function loadSession(sessionToken, companyId) {
  const [rows] = await pool.query(
    `SELECT * FROM facebook_connect_sessions
     WHERE session_token = ? AND company_id = ? AND expires_at > NOW()
     LIMIT 1`,
    [sessionToken, companyId]
  );
  if (!rows[0]) return null;
  return { ...rows[0], wizard: parseWizard(rows[0].pages_json) };
}

async function saveWizard(sessionToken, wizard) {
  await pool.query(
    `UPDATE facebook_connect_sessions SET pages_json = ? WHERE session_token = ?`,
    [JSON.stringify(wizard), sessionToken]
  );
}

async function deleteConnectSession(sessionToken) {
  await pool.query(`DELETE FROM facebook_connect_sessions WHERE session_token = ?`, [sessionToken]);
}

async function getWizardPublic(sessionToken, companyId) {
  const session = await loadSession(sessionToken, companyId);
  if (!session) {
    const err = new Error('Facebook connect session expired. Please Connect Facebook again.');
    err.status = 410;
    throw err;
  }
  return {
    session_token: session.session_token,
    expires_at: session.expires_at,
    wizard: publicWizardView(session.wizard),
  };
}

async function selectBusiness({ companyId, sessionToken, businessId }) {
  const session = await loadSession(sessionToken, companyId);
  if (!session) {
    const err = new Error('Facebook connect session expired. Please Connect Facebook again.');
    err.status = 410;
    throw err;
  }

  const wizard = session.wizard;
  const business = (wizard.businesses || []).find((b) => String(b.id) === String(businessId));
  if (!business && businessId !== 'personal') {
    const err = new Error('Selected business was not found');
    err.status = 400;
    throw err;
  }

  if (businessId === 'personal' || !business) {
    wizard.selected_business_id = null;
    wizard.selected_business_name = 'Personal Pages';
    wizard.pages = await fetchUserPages(wizard.access_token);
    wizard.ad_accounts = [];
  } else {
    wizard.selected_business_id = String(business.id);
    wizard.selected_business_name = business.name;
    wizard.pages = await fetchBusinessPages(business.id, wizard.access_token);
    if (!wizard.pages.length) {
      // Fallback if BM pages empty
      wizard.pages = await fetchUserPages(wizard.access_token);
    }
    wizard.ad_accounts = await fetchAdAccounts(business.id, wizard.access_token);
  }

  wizard.selected_page_ids = wizard.pages.map((p) => String(p.id));
  wizard.selected_ad_account_ids = wizard.ad_accounts.map((a) => String(a.id));
  wizard.forms = [];
  wizard.selected_form_ids = [];
  wizard.step = 'pages';

  await saveWizard(sessionToken, wizard);
  return getWizardPublic(sessionToken, companyId);
}

async function selectPages({ companyId, sessionToken, pageIds }) {
  const session = await loadSession(sessionToken, companyId);
  if (!session) {
    const err = new Error('Facebook connect session expired. Please Connect Facebook again.');
    err.status = 410;
    throw err;
  }

  const wizard = session.wizard;
  const wanted = new Set((pageIds || []).map(String));
  if (!wanted.size) {
    const err = new Error('Select at least one Facebook Page');
    err.status = 400;
    throw err;
  }

  const selected = (wizard.pages || []).filter((p) => wanted.has(String(p.id)));
  if (!selected.length) {
    const err = new Error('Selected Pages were not found in this session');
    err.status = 400;
    throw err;
  }

  wizard.selected_page_ids = selected.map((p) => String(p.id));
  wizard.step = wizard.ad_accounts?.length ? 'ad_accounts' : 'forms';

  if (!wizard.ad_accounts?.length) {
    // Load forms next
    await loadFormsIntoWizard(wizard);
  }

  await saveWizard(sessionToken, wizard);
  return getWizardPublic(sessionToken, companyId);
}

async function selectAdAccounts({ companyId, sessionToken, adAccountIds }) {
  const session = await loadSession(sessionToken, companyId);
  if (!session) {
    const err = new Error('Facebook connect session expired. Please Connect Facebook again.');
    err.status = 410;
    throw err;
  }

  const wizard = session.wizard;
  const wanted = new Set((adAccountIds || []).map(String));
  wizard.selected_ad_account_ids = (wizard.ad_accounts || [])
    .filter((a) => wanted.has(String(a.id)))
    .map((a) => String(a.id));

  await loadFormsIntoWizard(wizard);
  wizard.step = 'forms';
  await saveWizard(sessionToken, wizard);
  return getWizardPublic(sessionToken, companyId);
}

async function loadFormsIntoWizard(wizard) {
  const selectedPages = (wizard.pages || []).filter((p) =>
    (wizard.selected_page_ids || []).includes(String(p.id))
  );
  const forms = [];
  for (const page of selectedPages) {
    const token = page.access_token || wizard.access_token;
    try {
      const pageForms = await fetchLeadFormsForPage(page.id, token);
      forms.push(...pageForms);
    } catch (err) {
      console.warn(`Lead forms for page ${page.id}:`, err.message);
    }
  }
  wizard.forms = forms;
  wizard.selected_form_ids = forms.map((f) => String(f.id));
}

async function ensureFacebookSourceEnabled(companyId) {
  const [sources] = await pool.query(
    `SELECT id FROM lead_sources WHERE slug = 'facebook-ads' AND is_active = 1 LIMIT 1`
  );
  if (!sources[0]) return null;
  const sourceId = sources[0].id;
  await pool.query(
    `INSERT INTO company_lead_integrations (company_id, source_id, is_enabled, webhook_key)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE is_enabled = 1`,
    [companyId, sourceId, crypto.randomBytes(16).toString('hex')]
  );
  return sourceId;
}

async function completeSetup({ companyId, userId, sessionToken, formIds }) {
  const session = await loadSession(sessionToken, companyId);
  if (!session) {
    const err = new Error('Facebook connect session expired. Please Connect Facebook again.');
    err.status = 410;
    throw err;
  }

  const wizard = session.wizard;
  const wantedForms = new Set((formIds || wizard.selected_form_ids || []).map(String));
  if (!wantedForms.size && (wizard.forms || []).length) {
    const err = new Error('Select at least one Lead Form to sync');
    err.status = 400;
    throw err;
  }

  wizard.selected_form_ids = [...wantedForms];
  const selectedPages = (wizard.pages || []).filter((p) =>
    (wizard.selected_page_ids || []).includes(String(p.id))
  );
  if (!selectedPages.length) {
    const err = new Error('No Pages selected');
    err.status = 400;
    throw err;
  }

  const sourceId = await ensureFacebookSourceEnabled(companyId);

  // Store OAuth user account once
  await pool.query(
    `INSERT INTO company_channel_connections
      (company_id, channel, external_account_id, external_account_name, access_token, meta_json, is_active, connected_by)
     VALUES (?, 'facebook_user', ?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       external_account_name = VALUES(external_account_name),
       access_token = VALUES(access_token),
       meta_json = VALUES(meta_json),
       is_active = 1,
       connected_by = VALUES(connected_by),
       updated_at = CURRENT_TIMESTAMP`,
    [
      companyId,
      wizard.fb_user?.id || 'unknown',
      wizard.fb_user?.name || 'Facebook User',
      wizard.access_token,
      JSON.stringify({
        email: wizard.fb_user?.email || null,
        business_id: wizard.selected_business_id,
        business_name: wizard.selected_business_name,
        ad_account_ids: wizard.selected_ad_account_ids || [],
      }),
      userId || session.user_id || null,
    ]
  );

  const saved = [];
  const errors = [];

  for (const page of selectedPages) {
    const pageFormIds = (wizard.forms || [])
      .filter((f) => String(f.page_id) === String(page.id) && wantedForms.has(String(f.id)))
      .map((f) => String(f.id));

    // If user selected forms on other pages only, still allow page with empty form list = all forms
    const formsForPage =
      pageFormIds.length > 0
        ? pageFormIds
        : wantedForms.size === 0
          ? []
          : (wizard.forms || [])
              .filter((f) => String(f.page_id) === String(page.id))
              .map((f) => String(f.id))
              .filter((id) => wantedForms.has(id));

    // Skip pages with no selected forms when forms exist overall
    if ((wizard.forms || []).length > 0 && formsForPage.length === 0 && wantedForms.size > 0) {
      const hasAnySelectedOnPage = (wizard.forms || []).some(
        (f) => String(f.page_id) === String(page.id) && wantedForms.has(String(f.id))
      );
      if (!hasAnySelectedOnPage) continue;
    }

    try {
      const pageToken = page.access_token || wizard.access_token;
      await subscribePageToLeadgen(page.id, pageToken);

      const selectedFormsMeta = (wizard.forms || []).filter(
        (f) => String(f.page_id) === String(page.id) && wantedForms.has(String(f.id))
      );

      await pool.query(
        `INSERT INTO company_channel_connections
          (company_id, channel, external_account_id, external_account_name, access_token, meta_json, is_active, connected_by)
         VALUES (?, 'facebook', ?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE
           external_account_name = VALUES(external_account_name),
           access_token = VALUES(access_token),
           meta_json = VALUES(meta_json),
           is_active = 1,
           connected_by = VALUES(connected_by),
           updated_at = CURRENT_TIMESTAMP`,
        [
          companyId,
          String(page.id),
          page.name || null,
          pageToken,
          JSON.stringify({
            source_id: sourceId,
            business_id: wizard.selected_business_id,
            business_name: wizard.selected_business_name,
            ad_account_ids: wizard.selected_ad_account_ids || [],
            form_ids: selectedFormsMeta.map((f) => String(f.id)),
            forms: selectedFormsMeta,
            fb_user_id: wizard.fb_user?.id || null,
            platform_webhook: getPlatformWebhook(),
          }),
          userId || session.user_id || null,
        ]
      );

      saved.push({
        page_id: String(page.id),
        page_name: page.name,
        form_ids: selectedFormsMeta.map((f) => String(f.id)),
        form_names: selectedFormsMeta.map((f) => f.name),
      });
    } catch (err) {
      errors.push({ page_id: String(page.id), page_name: page.name, error: err.message });
    }
  }

  await deleteConnectSession(sessionToken);

  return {
    saved,
    errors,
    business: {
      id: wizard.selected_business_id,
      name: wizard.selected_business_name,
    },
    webhook: getPlatformWebhook(),
  };
}

async function listFacebookConnections(companyId) {
  const [rows] = await pool.query(
    `SELECT id, external_account_id AS page_id, external_account_name AS page_name,
            is_active, connected_at, updated_at, meta_json
     FROM company_channel_connections
     WHERE company_id = ? AND channel = 'facebook'
     ORDER BY is_active DESC, connected_at DESC`,
    [companyId]
  );

  return rows.map((row) => {
    let meta = row.meta_json;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = {};
      }
    }
    return {
      id: row.id,
      page_id: row.page_id,
      page_name: row.page_name,
      is_active: row.is_active,
      connected_at: row.connected_at,
      updated_at: row.updated_at,
      business_name: meta?.business_name || null,
      form_ids: meta?.form_ids || [],
      forms: meta?.forms || [],
      ad_account_ids: meta?.ad_account_ids || [],
    };
  });
}

async function disconnectFacebookPage(companyId, pageId) {
  await pool.query(
    `UPDATE company_channel_connections
     SET is_active = 0, updated_at = CURRENT_TIMESTAMP
     WHERE company_id = ? AND channel = 'facebook' AND external_account_id = ?`,
    [companyId, pageId]
  );
}

async function findConnectionByPageId(pageId) {
  const [rows] = await pool.query(
    `SELECT * FROM company_channel_connections
     WHERE channel = 'facebook' AND external_account_id = ? AND is_active = 1
     LIMIT 1`,
    [String(pageId)]
  );
  return rows[0] || null;
}

function parseMeta(connection) {
  let meta = connection.meta_json;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  return meta || {};
}

async function fetchLeadDetails(leadgenId, pageToken) {
  try {
    return await graphGet(`/${leadgenId}`, pageToken, {
      fields:
        'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data',
    });
  } catch {
    return null;
  }
}

function externalIdForLeadgen(leadgenId) {
  return `fb_leadgen:${leadgenId}`;
}

async function findLeadByExternalId(companyId, externalId) {
  const [rows] = await pool.query(
    `SELECT * FROM leads WHERE company_id = ? AND external_id = ? LIMIT 1`,
    [companyId, externalId]
  );
  return rows[0] || null;
}

async function ingestFacebookLeadgenEvent(value = {}, options = {}) {
  const pageId = value.page_id;
  const leadgenId = value.leadgen_id;
  if (!pageId || !leadgenId) return null;

  const connection = await findConnectionByPageId(pageId);
  if (!connection) {
    const err = new Error(`No connected Facebook Page found for page_id=${pageId}`);
    err.status = 404;
    throw err;
  }

  if (options.requireCompanyId && Number(connection.company_id) !== Number(options.requireCompanyId)) {
    const err = new Error('Facebook Page does not belong to this company');
    err.status = 403;
    throw err;
  }

  const meta = parseMeta(connection);
  const allowedForms = (meta.form_ids || []).map(String);
  const incomingFormId = value.form_id ? String(value.form_id) : null;

  // Fetch details early when we need form_id for filtering
  let details = null;
  if (!options.skipGraphFetch && !value.field_data?.length) {
    details = await fetchLeadDetails(leadgenId, connection.access_token);
  }

  const formId = incomingFormId || (details?.form_id ? String(details.form_id) : null);
  if (allowedForms.length && formId && !allowedForms.includes(formId)) {
    return { skipped: true, reason: 'form_not_selected', form_id: formId };
  }

  const externalId = externalIdForLeadgen(leadgenId);
  const existing = await findLeadByExternalId(connection.company_id, externalId);
  if (existing) {
    existing.tags =
      typeof existing.tags === 'string' ? JSON.parse(existing.tags || '[]') : existing.tags || [];
    existing.duplicate = true;
    return existing;
  }

  const fieldData = details?.field_data || value.field_data || [];
  const mapped = {};
  for (const field of fieldData) {
    const key = String(field.name || '').toLowerCase();
    mapped[key] = Array.isArray(field.values) ? field.values[0] : field.value;
  }

  const formMeta = (meta.forms || []).find((f) => String(f.id) === String(formId));
  const formName = formMeta?.name || value.form_name || null;

  const [sourceRows] = await pool.query(
    `SELECT id, name FROM lead_sources WHERE slug = 'facebook-ads' AND is_active = 1 LIMIT 1`
  );
  const source = sourceRows[0];

  const campaign =
    details?.campaign_name ||
    details?.ad_name ||
    value.campaign_name ||
    value.ad_name ||
    formName ||
    'Facebook Ads';

  const notesParts = [
    `Source=Facebook`,
    `Page=${connection.external_account_name || pageId}`,
    formName ? `Form=${formName}` : formId ? `FormID=${formId}` : null,
    details?.ad_name ? `Ad=${details.ad_name}` : null,
    details?.adset_name ? `AdSet=${details.adset_name}` : null,
    details?.campaign_name ? `Campaign=${details.campaign_name}` : null,
    `leadgen_id=${leadgenId}`,
  ].filter(Boolean);

  const lead = await createLeadFromPayload({
    companyId: connection.company_id,
    sourceId: source?.id || null,
    sourceName: source?.name || 'Facebook Ads',
    externalId,
    payload: {
      ...mapped,
      name: mapped.full_name || mapped.fullname || mapped.name,
      phone: mapped.phone_number || mapped.phone || mapped.mobile_number,
      email: mapped.email,
      campaign,
      notes: notesParts.join(' | '),
      leadgen_id: leadgenId,
      page_id: pageId,
      page_name: connection.external_account_name,
      form_id: formId,
      form_name: formName,
      ad_id: details?.ad_id || value.ad_id || null,
      ad_name: details?.ad_name || value.ad_name || null,
      adset_id: details?.adset_id || null,
      adset_name: details?.adset_name || null,
      campaign_id: details?.campaign_id || null,
      campaign_name: details?.campaign_name || null,
      business_name: meta.business_name || null,
      field_data: fieldData,
    },
  });

  return lead;
}

async function createTestFacebookLead({ companyId, pageId, name, phone, email }) {
  let connection;
  if (pageId) {
    connection = await findConnectionByPageId(pageId);
    if (!connection || Number(connection.company_id) !== Number(companyId)) {
      const err = new Error('Connected Facebook Page not found for this company');
      err.status = 404;
      throw err;
    }
  } else {
    const [rows] = await pool.query(
      `SELECT * FROM company_channel_connections
       WHERE company_id = ? AND channel = 'facebook' AND is_active = 1
       ORDER BY connected_at DESC LIMIT 1`,
      [companyId]
    );
    connection = rows[0];
    if (!connection) {
      const err = new Error('Connect a Facebook Page first');
      err.status = 400;
      throw err;
    }
  }

  const meta = parseMeta(connection);
  const formId = meta.form_ids?.[0] || 'test_form';
  const leadgenId = `test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  return ingestFacebookLeadgenEvent(
    {
      page_id: connection.external_account_id,
      leadgen_id: leadgenId,
      form_id: formId,
      ad_name: 'SurfSync Test Lead',
      campaign_name: 'SurfSync Test Campaign',
      field_data: [
        { name: 'full_name', values: [name || 'Test Facebook Lead'] },
        { name: 'phone_number', values: [phone || '9999999999'] },
        { name: 'email', values: [email || 'fb.test@example.com'] },
      ],
    },
    { skipGraphFetch: true, requireCompanyId: companyId }
  );
}

// Legacy helpers kept for older routes during transition
async function createConnectSession(args) {
  return createWizardSession(args);
}

async function getConnectSession(sessionToken, companyId) {
  const session = await loadSession(sessionToken, companyId);
  if (!session) return null;
  return { ...session, pages: session.wizard.pages || [] };
}

async function confirmPagesFromSession({ companyId, userId, sessionToken, pageIds }) {
  await selectPages({ companyId, sessionToken, pageIds });
  const session = await loadSession(sessionToken, companyId);
  const formIds = session?.wizard?.selected_form_ids || [];
  return completeSetup({ companyId, userId, sessionToken, formIds });
}

module.exports = {
  metaConfigured,
  getRedirectUri,
  getPlatformWebhook,
  getPlatformStatus,
  buildConnectUrl,
  verifyState,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  fetchFacebookUser,
  fetchBusinesses,
  fetchUserPages,
  createWizardSession,
  getWizardPublic,
  selectBusiness,
  selectPages,
  selectAdAccounts,
  completeSetup,
  createConnectSession,
  getConnectSession,
  confirmPagesFromSession,
  listFacebookConnections,
  disconnectFacebookPage,
  ingestFacebookLeadgenEvent,
  createTestFacebookLead,
};
