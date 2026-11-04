const crypto = require('crypto');

const WAAPI_BASE_URL = (process.env.WAAPI_BASE_URL || 'https://waapi.surfsyncinfotech.in').replace(/\/+$/, '');
const WAAPI_USERNAME = process.env.WAAPI_USERNAME || 'SurfSyncInfotech3543Wapp';
const WAAPI_PASSWORD = process.env.WAAPI_PASSWORD || 'SurfSync@2424';

let cachedCookie = null;
let lastLoginTime = 0;
let authPromise = null;
const SESSION_TTL_MS = 45 * 60 * 1000; // 45 minutes

let cachedData = null;
let lastCacheTime = 0;
const DATA_CACHE_TTL_MS = 30 * 1000; // 30 seconds cache for rapid UI responses

/**
 * Perform login to waapi.surfsyncinfotech.in using dynamic CSRF token & dynamic page salt.
 * Strictly read-only authentication to retrieve session cookies.
 */
async function authenticate() {
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const loginRes = await fetch(`${WAAPI_BASE_URL}/login`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = await loginRes.text();
      const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/);
      const token = tokenMatch ? tokenMatch[1] : '';

      const saltMatch = html.match(/var\s+salt\s*=\s*'([^']+)'/);
      const salt = saltMatch ? saltMatch[1] : '';

      if (!token || !salt) {
        throw new Error('Failed to retrieve CSRF token or salt from WAAPI login page');
      }

      const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
      const cookieMap = {};
      for (const c of setCookies) {
        if (!c) continue;
        const parts = c.split(';')[0].split('=');
        if (parts[0]) cookieMap[parts[0].trim()] = parts.slice(1).join('=');
      }

      // Exact password hashing required by waapi.surfsyncinfotech.in: sha1(salt + md5(password))
      const md5 = crypto.createHash('md5').update(WAAPI_PASSWORD).digest('hex');
      const passwordHash = crypto.createHash('sha1').update(salt + md5).digest('hex');

      const params = new URLSearchParams();
      params.append('_token', token);
      params.append('inputEmailAddress', WAAPI_USERNAME);
      params.append('inputPassword', passwordHash);

      const initialCookie = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');

      const authRes = await fetch(`${WAAPI_BASE_URL}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': initialCookie,
          'Referer': `${WAAPI_BASE_URL}/login`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: params.toString(),
        redirect: 'manual'
      });

      const authCookies = authRes.headers.getSetCookie ? authRes.headers.getSetCookie() : [authRes.headers.get('set-cookie')];
      for (const c of authCookies) {
        if (!c) continue;
        const parts = c.split(';')[0].split('=');
        if (parts[0]) cookieMap[parts[0].trim()] = parts.slice(1).join('=');
      }

      cachedCookie = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
      lastLoginTime = Date.now();
      console.log('[WAAPI] Successfully authenticated with waapi.surfsyncinfotech.in');
      return cachedCookie;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

async function getValidCookie() {
  if (cachedCookie && Date.now() - lastLoginTime < SESSION_TTL_MS) {
    return cachedCookie;
  }
  return await authenticate();
}

/**
 * Helper to fetch a GET endpoint with session cookie
 */
async function fetchEndpoint(endpoint, isRetry = false) {
  const cookie = await getValidCookie();
  const res = await fetch(`${WAAPI_BASE_URL}${endpoint}`, {
    headers: {
      'Cookie': cookie,
      'Referer': `${WAAPI_BASE_URL}/account`,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const text = await res.text();

  // If session expired and redirected to reload/login, re-authenticate once
  if (text.includes('window.parent.location.reload()') || text.includes('name="login-form"') || res.status === 401 || res.status === 302) {
    if (!isRetry) {
      console.warn(`[WAAPI] Session expired for ${endpoint}, re-authenticating...`);
      cachedCookie = null;
      await authenticate();
      return fetchEndpoint(endpoint, true);
    }
  }

  return text;
}

function parseStatNumber(htmlString) {
  if (!htmlString) return 0;
  const m = htmlString.match(/<h4[^>]*>\s*(\d+)\s*<\/h4>/i) || htmlString.match(/^(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function parseBalance(text) {
  if (!text) return 0;
  const num = parseFloat(text.trim());
  return isNaN(num) ? 0 : num;
}

/**
 * Fetch all real live stats from waapi.surfsyncinfotech.in in parallel.
 * Strictly READ-ONLY operations.
 */
async function getLiveAccountData() {
  const now = Date.now();
  if (cachedData && now - lastCacheTime < DATA_CACHE_TTL_MS) {
    return cachedData;
  }

  try {
    // Ensure we are logged in before firing the batch
    await getValidCookie();

    const [
      balRaw,
      sentTodayRaw,
      delivTodayRaw,
      readTodayRaw,
      failedTodayRaw,
      sentMonthRaw,
      delivMonthRaw,
      readMonthRaw,
      failedMonthRaw,
      weeklyStatsRaw,
      monthlyStatsRaw,
      accountPageRaw
    ] = await Promise.all([
      fetchEndpoint('/get-user-balance').catch(() => '0'),
      fetchEndpoint('/get-total-sent').catch(() => ''),
      fetchEndpoint('/get-total-delivered').catch(() => ''),
      fetchEndpoint('/get-total-read').catch(() => ''),
      fetchEndpoint('/get-total-failed').catch(() => ''),
      fetchEndpoint('/get-total-sent?type=M').catch(() => ''),
      fetchEndpoint('/get-total-delivered?type=M').catch(() => ''),
      fetchEndpoint('/get-total-read?type=M').catch(() => ''),
      fetchEndpoint('/get-total-failed?type=M').catch(() => ''),
      fetchEndpoint('/get-weekly-statistics').catch(() => '{}'),
      fetchEndpoint('/get-monthly-statistics').catch(() => '{}'),
      fetchEndpoint('/account').catch(() => '')
    ]);

    const wallet_balance = parseBalance(balRaw);

    // Today's exact numbers
    const todaySubmitted = parseStatNumber(sentTodayRaw);
    const todaySent = parseStatNumber(delivTodayRaw);
    const todayDelivered = parseStatNumber(readTodayRaw);
    const todayFailed = parseStatNumber(failedTodayRaw);

    // Monthly exact numbers
    const monthSubmitted = parseStatNumber(sentMonthRaw);
    const monthSent = parseStatNumber(delivMonthRaw);
    const monthDelivered = parseStatNumber(readMonthRaw);
    const monthFailed = parseStatNumber(failedMonthRaw);

    // Validity date from account page
    const dateMatch = accountPageRaw.match(/\b(\d{2}-\d{2}-\d{4})\b/);
    const validity_date = dateMatch ? dateMatch[1] : '07-07-2027';

    // Parse JSON chart records
    let weeklyStatistics = null;
    let monthlyStatistics = null;
    try {
      weeklyStatistics = JSON.parse(weeklyStatsRaw);
    } catch {}
    try {
      monthlyStatistics = JSON.parse(monthlyStatsRaw);
    } catch {}

    cachedData = {
      success: true,
      wallet_balance,
      validity_date,
      todayStats: {
        submitted: todaySubmitted,
        sent: todaySent,
        delivered: todayDelivered,
        failed: todayFailed
      },
      monthStats: {
        submitted: monthSubmitted,
        sent: monthSent,
        delivered: monthDelivered,
        failed: monthFailed
      },
      weeklyStatistics,
      monthlyStatistics,
      updated_at: new Date().toISOString()
    };

    lastCacheTime = now;
    return cachedData;
  } catch (err) {
    console.error('[WAAPI] Error fetching live account data:', err.message);
    if (cachedData) return cachedData;
    return {
      success: false,
      error: err.message,
      wallet_balance: 0,
      validity_date: null,
      todayStats: { submitted: 0, sent: 0, delivered: 0, failed: 0 },
      monthStats: { submitted: 0, sent: 0, delivered: 0, failed: 0 }
    };
  }
}

module.exports = {
  getLiveAccountData,
  fetchEndpoint
};
