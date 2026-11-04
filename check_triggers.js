const crypto = require('crypto');

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

async function run() {
  const token = signJwt({ id: 1, company_id: 1, role: 'superadmin', email: 'admin@surfsync.studio' }, 'surfsync_studio_super_secret_change_me');
  
  // Let's check company leads
  const res = await fetch('https://backend.patronping.com/api/company/leads?limit=5', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
}
run().catch(console.error);
