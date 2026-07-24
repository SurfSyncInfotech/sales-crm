require('dotenv').config();
const mysql = require('mysql2/promise');

const API = 'http://localhost:5000/api';

async function main() {
  // 1) Platform status
  const statusRes = await fetch(`${API}/public/leads/meta/status`);
  const status = await statusRes.json();
  console.log('meta/status', status);

  // 2) Company login
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
  if (!login.token) throw new Error('Login failed: ' + JSON.stringify(login));
  const headers = {
    Authorization: `Bearer ${login.token}`,
    'Content-Type': 'application/json',
  };
  const companyId = login.user.company_id;
  console.log('logged in company', companyId);

  // 3) Seed a fake connected Page (no real Meta needed for test-lead)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn.query(
    `INSERT INTO company_channel_connections
      (company_id, channel, external_account_id, external_account_name, access_token, meta_json, is_active)
     VALUES (?, 'facebook', '999000111', 'Acme Test Page', 'test_token', '{}', 1)
     ON DUPLICATE KEY UPDATE is_active = 1, external_account_name = VALUES(external_account_name)`,
    [companyId]
  );
  await conn.end();
  console.log('seeded facebook connection page 999000111');

  // 4) Connections status
  const connRes = await fetch(`${API}/company/leads/facebook/connections`, { headers });
  const connections = await connRes.json();
  console.log('connect_status', connections.connect_status, 'active', connections.active_count);

  // 5) Test lead
  const testRes = await fetch(`${API}/company/leads/facebook/test-lead`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_id: '999000111', name: 'Smoke FB Lead', phone: '9811111111' }),
  });
  const testLead = await testRes.json();
  if (!testRes.ok) throw new Error('test-lead failed: ' + JSON.stringify(testLead));
  console.log('test lead', testLead.lead.lead_code, 'external', testLead.lead.external_id);

  // 6) Dedupe via webhook with same leadgen_id
  const leadgenId = String(testLead.lead.external_id).replace('fb_leadgen:', '');
  const webhookRes = await fetch(`${API}/public/leads/meta/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entry: [
        {
          changes: [
            {
              field: 'leadgen',
              value: {
                page_id: '999000111',
                leadgen_id: leadgenId,
                form_id: 'test_form',
                field_data: [
                  { name: 'full_name', values: ['Smoke FB Lead Dup'] },
                  { name: 'phone_number', values: ['9811111111'] },
                ],
              },
            },
          ],
        },
      ],
    }),
  });
  const webhook = await webhookRes.json();
  console.log('webhook dedupe response', webhook);

  // 7) Inbox check
  const leadsRes = await fetch(`${API}/company/leads?source=facebook-ads&limit=5`, { headers });
  const leads = await leadsRes.json();
  const found = (leads.leads || []).find((l) => l.lead_code === testLead.lead.lead_code);
  console.log('found in inbox', Boolean(found), 'facebook leads', leads.pagination?.total);

  // 8) Pending session picker API
  const { createConnectSession } = require('../src/services/facebookConnect');
  const session = await createConnectSession({
    companyId,
    userId: login.user.id,
    pages: [
      { id: '111222333', name: 'Picker Page A', access_token: 'tok_a', tasks: [] },
      { id: '444555666', name: 'Picker Page B', access_token: 'tok_b', tasks: [] },
    ],
  });
  console.log('pending session', session.session_token, 'pages', session.pages.length);

  const pendingRes = await fetch(`${API}/company/leads/facebook/pending/${session.session_token}`, {
    headers,
  });
  const pending = await pendingRes.json();
  console.log('pending api pages', pending.pages?.map((p) => p.page_name));

  console.log('SMOKE OK');
}

main().catch((err) => {
  console.error('SMOKE FAIL', err);
  process.exit(1);
});
