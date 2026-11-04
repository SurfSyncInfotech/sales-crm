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
  const token = signJwt({ id: 1, company_id: 1, role: 'company_admin', email: 'aditi@surfsyncinfotech.in' }, 'surfsync_studio_super_secret_change_me');
  
  const res = await fetch('https://backend.patronping.com/api/company/whatsapp/conversations/210/messages', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const lastMsg = data.messages?.[data.messages.length - 1];
  console.log('Last message:', lastMsg);
}
run().catch(console.error);
