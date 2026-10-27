const CONSOLE_BASE_URL = (process.env.PINBOT_CONSOLE_URL || 'https://consolev1.pinbot.ai/api').replace(/\/+$/, '');
const RESELLER_API_KEY = process.env.PINBOT_RESELLER_API_KEY || '';

async function consoleRequest({ endpoint, method = 'POST', headers = {}, body = null }) {
  const apiKey = headers.apikey || RESELLER_API_KEY;
  const url = `${CONSOLE_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (apiKey) {
    reqHeaders['apikey'] = apiKey;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`Pinbot Console API [${endpoint}] error:`, err.message);
    return { ok: false, status: 500, error: err.message };
  }
}

/**
 * 1. Create User Account (CDC Panel)
 */
async function createUserAccount(payload, resellerKey = null) {
  return consoleRequest({
    endpoint: '/create-user-account',
    method: 'POST',
    headers: resellerKey ? { apikey: resellerKey } : {},
    body: payload,
  });
}

/**
 * 2. Check User Balance
 */
async function getUserBalance(wabaNumber, resellerKey = null) {
  return consoleRequest({
    endpoint: '/get-user-balance',
    method: 'POST',
    headers: {
      ...(resellerKey ? { apikey: resellerKey } : {}),
      wabanumber: String(wabaNumber).startsWith('+') ? wabaNumber : `+${wabaNumber}`,
    },
  });
}

/**
 * 3. Create User Recharge
 */
async function rechargeUser(wabaNumber, rechargeAmount, resellerKey = null) {
  return consoleRequest({
    endpoint: '/user-recharge',
    method: 'POST',
    headers: {
      ...(resellerKey ? { apikey: resellerKey } : {}),
      wabanumber: String(wabaNumber).startsWith('+') ? wabaNumber : `+${wabaNumber}`,
    },
    body: { rechargeamt: Number(rechargeAmount) },
  });
}

/**
 * 4. Get User API Key
 */
async function getUserApiKey(wabaNumber, resellerKey = null) {
  return consoleRequest({
    endpoint: '/get-user-apikey',
    method: 'GET',
    headers: resellerKey ? { apikey: resellerKey } : {},
    body: { wabanumber: String(wabaNumber).startsWith('+') ? wabaNumber : `+${wabaNumber}` },
  });
}

/**
 * 5. Get User Expiry Details
 */
async function getUserExpiringDetail(wabaNumber, resellerKey = null) {
  return consoleRequest({
    endpoint: '/user-expiring-detail',
    method: 'POST',
    headers: resellerKey ? { apikey: resellerKey } : {},
    body: { wabanumber: String(wabaNumber).replace(/\D/g, '') },
  });
}

/**
 * 6. Recharge Transaction Report
 */
async function getRechargeTransactionReport(wabaNumber, resellerKey = null) {
  return consoleRequest({
    endpoint: '/recharge-transaction-report',
    method: 'POST',
    headers: resellerKey ? { apikey: resellerKey } : {},
    body: { wabanumber: Number(String(wabaNumber).replace(/\D/g, '')) },
  });
}

/**
 * 7. Change User Status (Active / Inactive)
 */
async function changeUserStatus(wabaNumber, status = 1, resellerKey = null) {
  return consoleRequest({
    endpoint: '/change-user-status',
    method: 'POST',
    headers: resellerKey ? { apikey: resellerKey } : {},
    body: { wabanumber: String(wabaNumber).replace(/\D/g, ''), status: Number(status) },
  });
}

/**
 * 8. Update User Expiry Date
 * Endpoint: POST /api/expired-user
 * Payload: { wabanumber: "91...", expirydate: "dd-mm-yyyy" }
 */
async function updateUserExpiry(wabaNumber, expiryDate, resellerKey = null) {
  return consoleRequest({
    endpoint: '/expired-user',
    method: 'POST',
    headers: resellerKey ? { apikey: resellerKey } : {},
    body: {
      wabanumber: String(wabaNumber).replace(/\D/g, ''),
      expirydate: expiryDate,
    },
  });
}

/**
 * 9. Fetch Access Token
 * Endpoint: GET /api/get-access-token
 */
async function getAccessToken(wabaId, resellerKey = null) {
  return consoleRequest({
    endpoint: `/get-access-token?waba_id=${encodeURIComponent(wabaId)}`,
    method: 'GET',
    headers: resellerKey ? { apikey: resellerKey } : {},
  });
}

/**
 * 10. WhatsApp Template Migration (CDC Panel)
 * Endpoint: POST /whatsapp-template-migration
 * Headers: apikey, Token (Reseller system access token from Meta)
 * Payload: { waba_id, waba_number }
 */
async function migrateTemplate({ waba_id, waba_number }, resellerKey = null, metaToken = null) {
  const apiKey = resellerKey || process.env.PINBOT_RESELLER_API_KEY;
  const token = metaToken || process.env.META_SYSTEM_ACCESS_TOKEN;

  return consoleRequest({
    endpoint: '/whatsapp-template-migration',
    method: 'POST',
    headers: {
      ...(apiKey ? { apikey: apiKey } : {}),
      ...(token ? { Token: token } : {}),
    },
    body: {
      waba_id: Number(String(waba_id).replace(/\D/g, '')),
      waba_number: String(waba_number).replace(/\D/g, ''),
    },
  });
}

module.exports = {
  consoleRequest,
  createUserAccount,
  getUserBalance,
  rechargeUser,
  getUserApiKey,
  getUserExpiringDetail,
  getRechargeTransactionReport,
  changeUserStatus,
  updateUserExpiry,
  getAccessToken,
  migrateTemplate,
};
