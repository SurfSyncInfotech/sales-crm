const BASE_URL = (process.env.PINBOT_BASE_URL || 'https://partnersv1.pinbot.ai/v3').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.PINBOT_TIMEOUT_MS || 15000);

async function pinbotRequest({ apiKey, path, method = 'POST', body }) {
  if (!apiKey) {
    const err = new Error('WhatsApp API key is not configured');
    err.status = 400;
    throw err;
  }
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    const err = new Error(`Pinbot request failed: ${cause.message}`);
    err.status = 502;
    err.retryable = true;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data?.error?.message || data?.message || data?.raw || res.statusText;
    const err = new Error(`Pinbot ${res.status}: ${detail}`);
    err.status = res.status === 401 || res.status === 403 ? 400 : 502;
    err.pinbotStatus = res.status;
    err.retryable = res.status >= 500 || res.status === 429;
    err.response = data;
    throw err;
  }
  return data;
}

function messagesPath(phoneNumberId) {
  return `/${encodeURIComponent(phoneNumberId)}/messages`;
}

function baseMessage(to) {
  return { messaging_product: 'whatsapp', recipient_type: 'individual', to };
}

function buildText(to, body) {
  return { ...baseMessage(to), type: 'text', text: { body, preview_url: false } };
}

function buildMedia(to, kind, link, caption) {
  if (!['image', 'document', 'video'].includes(kind)) {
    const err = new Error(`Unsupported media type: ${kind}`);
    err.status = 400;
    throw err;
  }
  return { ...baseMessage(to), type: kind, [kind]: { link, ...(caption ? { caption } : {}) } };
}

/** Body-only text template; `params` are positional {{1}}, {{2}}... values. */
function buildTemplate(to, name, language = 'en', params = [], extraComponents = []) {
  const components = [];
  if (params.length) {
    components.push({
      type: 'body',
      parameters: params.map((text) => ({ type: 'text', text: String(text) })),
    });
  }
  return {
    ...baseMessage(to),
    type: 'template',
    template: { name, language: { code: language }, components: [...components, ...extraComponents] },
  };
}

async function sendMessage({ apiKey, phoneNumberId, payload }) {
  if (!phoneNumberId) {
    const err = new Error('WhatsApp phone_number_id is not configured');
    err.status = 400;
    throw err;
  }
  const data = await pinbotRequest({ apiKey, path: messagesPath(phoneNumberId), body: payload });
  return { waMessageId: data?.messages?.[0]?.id || null, raw: data };
}

module.exports = { pinbotRequest, buildText, buildMedia, buildTemplate, sendMessage };
