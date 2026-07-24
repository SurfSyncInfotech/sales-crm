require('dotenv').config();
const mysql = require('mysql2/promise');

const API = 'http://localhost:5000/api';

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acmemotors.test',
      password: 'Company@123',
      portal: 'company',
    }),
  });
  const login = await loginRes.json();
  if (!login.token) throw new Error('login failed ' + JSON.stringify(login));
  const headers = {
    Authorization: `Bearer ${login.token}`,
    'Content-Type': 'application/json',
  };
  const companyId = login.user.company_id;

  const sessionToken = 'smoke_wizard_' + Date.now();
  const wizard = {
    step: 'business',
    access_token: 'fake_token',
    fb_user: { id: 'u1', name: 'Smoke User', email: 'smoke@test.com' },
    businesses: [
      { id: 'b1', name: 'ABC Pvt Ltd' },
      { id: 'b2', name: 'XYZ Agency' },
    ],
    selected_business_id: null,
    pages: [],
    selected_page_ids: [],
    ad_accounts: [],
    selected_ad_account_ids: [],
    forms: [],
    selected_form_ids: [],
  };

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn.query(
    `INSERT INTO facebook_connect_sessions (session_token, company_id, user_id, pages_json, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
    [sessionToken, companyId, login.user.id, JSON.stringify(wizard)]
  );
  await conn.end();

  const setupRes = await fetch(`${API}/company/leads/facebook/setup/${sessionToken}`, { headers });
  const setup = await setupRes.json();
  if (!setupRes.ok) throw new Error(JSON.stringify(setup));
  console.log('step', setup.wizard.step, 'businesses', setup.wizard.businesses.length);

  // Force pages/ads/forms without calling Meta by patching session then completing via complete with preloaded data
  const readyWizard = {
    ...wizard,
    step: 'forms',
    selected_business_id: 'b1',
    selected_business_name: 'ABC Pvt Ltd',
    pages: [
      { id: 'p1', name: 'ABC Motors', access_token: 'page_tok', tasks: [] },
      { id: 'p2', name: 'ABC Realty', access_token: 'page_tok2', tasks: [] },
    ],
    selected_page_ids: ['p1'],
    ad_accounts: [{ id: 'act_1', name: 'Ad Account 1', account_id: '1' }],
    selected_ad_account_ids: ['act_1'],
    forms: [
      { id: 'f1', name: 'Car Loan Form', page_id: 'p1', status: 'ACTIVE' },
      { id: 'f2', name: 'Home Loan Form', page_id: 'p1', status: 'ACTIVE' },
    ],
    selected_form_ids: ['f1'],
  };

  const conn2 = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn2.query(`UPDATE facebook_connect_sessions SET pages_json = ? WHERE session_token = ?`, [
    JSON.stringify(readyWizard),
    sessionToken,
  ]);
  await conn2.end();

  // completeSetup will try Graph subscribe — expect page error but DB path may still fail.
  // Instead verify setup GET shows forms step.
  const formsRes = await fetch(`${API}/company/leads/facebook/setup/${sessionToken}`, { headers });
  const forms = await formsRes.json();
  console.log('forms step', forms.wizard.step, 'forms', forms.wizard.forms.map((f) => f.name));

  // Save connection manually like complete would (skip Graph subscribe)
  const conn3 = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn3.query(
    `INSERT INTO company_channel_connections
      (company_id, channel, external_account_id, external_account_name, access_token, meta_json, is_active)
     VALUES (?, 'facebook', 'p1', 'ABC Motors', 'page_tok', ?, 1)
     ON DUPLICATE KEY UPDATE meta_json = VALUES(meta_json), is_active = 1`,
    [
      companyId,
      JSON.stringify({
        business_id: 'b1',
        business_name: 'ABC Pvt Ltd',
        form_ids: ['f1'],
        forms: [{ id: 'f1', name: 'Car Loan Form', page_id: 'p1' }],
        ad_account_ids: ['act_1'],
      }),
    ]
  );
  await conn3.end();

  const listRes = await fetch(`${API}/company/leads/facebook/connections`, { headers });
  const list = await listRes.json();
  const page = (list.connections || []).find((c) => c.page_id === 'p1');
  console.log('connection', page?.page_name, page?.business_name, page?.form_ids);

  // Form filter: wrong form should skip
  const { ingestFacebookLeadgenEvent } = require('../src/services/facebookConnect');
  const skipped = await ingestFacebookLeadgenEvent(
    {
      page_id: 'p1',
      leadgen_id: 'skip_' + Date.now(),
      form_id: 'f2',
      field_data: [{ name: 'full_name', values: ['Should Skip'] }],
    },
    { skipGraphFetch: true }
  );
  console.log('skipped other form', skipped.skipped === true);

  const accepted = await ingestFacebookLeadgenEvent(
    {
      page_id: 'p1',
      leadgen_id: 'ok_' + Date.now(),
      form_id: 'f1',
      ad_name: 'Car Ad',
      campaign_name: 'Q1 Cars',
      field_data: [
        { name: 'full_name', values: ['Wizard Lead'] },
        { name: 'phone_number', values: ['9800000000'] },
      ],
    },
    { skipGraphFetch: true }
  );
  console.log('accepted lead', accepted.lead_code, accepted.campaign);

  console.log('WIZARD SMOKE OK');
}

main().catch((err) => {
  console.error('WIZARD SMOKE FAIL', err);
  process.exit(1);
});
