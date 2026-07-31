const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const TOKEN_KEYS = {
  superadmin: 'ss_token_superadmin',
  company: 'ss_token_company',
};

export function resolvePortal(explicit) {
  if (explicit === 'superadmin' || explicit === 'company') return explicit;
  if (typeof window === 'undefined') return 'superadmin';
  const path = window.location.pathname;
  if (path.startsWith('/admin') || path === '/login') return 'superadmin';
  if (path.startsWith('/company') || path.startsWith('/c/')) return 'company';
  return 'superadmin';
}

export function getToken(portal) {
  const key = TOKEN_KEYS[resolvePortal(portal)];
  return localStorage.getItem(key);
}

export function setToken(portal, token) {
  localStorage.setItem(TOKEN_KEYS[portal], token);
}

export function clearToken(portal) {
  localStorage.removeItem(TOKEN_KEYS[portal]);
  // legacy single-token cleanup
  localStorage.removeItem('ss_token');
}

export async function api(path, options = {}) {
  const { portal, headers: customHeaders, body, ...rest } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  const token = getToken(portal);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const authApi = {
  login: (email, password, portal = 'superadmin') =>
    api('/auth/login', { method: 'POST', body: { email, password, portal }, portal }),
  me: (portal) => api('/auth/me', { portal }),
  companyPortal: (slug) => api(`/auth/company-portal/${slug}`, { portal: 'company' }),
};

export const dashboardApi = {
  overview: () => api('/dashboard/overview', { portal: 'superadmin' }),
};

export const companiesApi = {
  list: () => api('/companies', { portal: 'superadmin' }),
  get: (id) => api(`/companies/${id}`, { portal: 'superadmin' }),
  create: (body) => api('/companies', { method: 'POST', body, portal: 'superadmin' }),
  update: (id, body) => api(`/companies/${id}`, { method: 'PUT', body, portal: 'superadmin' }),
  setStatus: (id, status) =>
    api(`/companies/${id}/status`, { method: 'PATCH', body: { status }, portal: 'superadmin' }),
  extendTrial: (id, days) =>
    api(`/companies/${id}/extend-trial`, { method: 'POST', body: { days }, portal: 'superadmin' }),
  expireTrial: (id) =>
    api(`/companies/${id}/expire-trial`, { method: 'POST', portal: 'superadmin' }),
};

export const plansApi = {
  list: () => api('/plans', { portal: 'superadmin' }),
  create: (body) => api('/plans', { method: 'POST', body, portal: 'superadmin' }),
  update: (id, body) => api(`/plans/${id}`, { method: 'PUT', body, portal: 'superadmin' }),
};

export const paymentsApi = {
  list: (companyId) =>
    api(companyId ? `/payments?company_id=${companyId}` : '/payments', { portal: 'superadmin' }),
  create: (body) => api('/payments', { method: 'POST', body, portal: 'superadmin' }),
  delete: (id) => api(`/payments/${id}`, { method: 'DELETE', portal: 'superadmin' }),
  markPaid: (id) => api(`/payments/${id}/status`, { method: 'PATCH', body: { status: 'paid' }, portal: 'superadmin' }),
};

export const companyPortalApi = {
  dashboard: () => api('/company/dashboard', { portal: 'company' }),
  team: () => api('/company/team', { portal: 'company' }),
  addMember: (body) => api('/company/team', { method: 'POST', body, portal: 'company' }),
  setMemberStatus: (id, is_active) =>
    api(`/company/team/${id}/status`, { method: 'PATCH', body: { is_active }, portal: 'company' }),
  leadSources: () => api('/company/leads/sources', { portal: 'company' }),
  toggleLeadSource: (sourceId, is_enabled) =>
    api(`/company/leads/sources/${sourceId}`, {
      method: 'PATCH',
      body: { is_enabled },
      portal: 'company',
    }),
  facebookConnectUrl: () => api('/company/leads/facebook/connect', { portal: 'company' }),
  facebookConnections: () => api('/company/leads/facebook/connections', { portal: 'company' }),
  facebookSetup: (sessionToken) =>
    api(`/company/leads/facebook/setup/${sessionToken}`, { portal: 'company' }),
  facebookSelectBusiness: (sessionToken, business_id) =>
    api(`/company/leads/facebook/setup/${sessionToken}/business`, {
      method: 'POST',
      body: { business_id },
      portal: 'company',
    }),
  facebookSelectPages: (sessionToken, page_ids) =>
    api(`/company/leads/facebook/setup/${sessionToken}/pages`, {
      method: 'POST',
      body: { page_ids },
      portal: 'company',
    }),
  facebookSelectAdAccounts: (sessionToken, ad_account_ids) =>
    api(`/company/leads/facebook/setup/${sessionToken}/ad-accounts`, {
      method: 'POST',
      body: { ad_account_ids },
      portal: 'company',
    }),
  facebookCompleteSetup: (sessionToken, form_ids) =>
    api(`/company/leads/facebook/setup/${sessionToken}/complete`, {
      method: 'POST',
      body: { form_ids },
      portal: 'company',
    }),
  facebookTestLead: (body = {}) =>
    api('/company/leads/facebook/test-lead', { method: 'POST', body, portal: 'company' }),
  disconnectFacebookPage: (pageId) =>
    api(`/company/leads/facebook/connections/${pageId}`, {
      method: 'DELETE',
      portal: 'company',
    }),
  leads: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, value);
    });
    const query = qs.toString();
    return api(`/company/leads${query ? `?${query}` : ''}`, { portal: 'company' });
  },
  createLead: (body) => api('/company/leads', { method: 'POST', body, portal: 'company' }),
  updateLead: (id, body) => api(`/company/leads/${id}`, { method: 'PATCH', body, portal: 'company' }),
  uploadLeads: (body) => api('/company/leads/upload', { method: 'POST', body, portal: 'company' }),
  getUrls: (sourceId) => api(`/company/leads/urls${sourceId ? `?source_id=${sourceId}` : ''}`, { portal: 'company' }),
  addUrl: (body) => api('/company/leads/urls', { method: 'POST', body, portal: 'company' }),
  deleteUrl: (id) => api(`/company/leads/urls/${id}`, { method: 'DELETE', portal: 'company' }),
};
