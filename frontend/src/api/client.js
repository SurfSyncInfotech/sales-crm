const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5010/api').trim();
export const API_BASE = rawApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? rawApiUrl.replace(/\/+$/, '')
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

export const TOKEN_KEYS = {
  superadmin: 'ss_token_superadmin',
  company: 'ss_token_company',
  sales: 'ss_token_sales',
};

export function resolvePortal(explicit) {
  if (explicit === 'superadmin' || explicit === 'company' || explicit === 'sales') return explicit;
  if (typeof window === 'undefined') return 'superadmin';
  const path = window.location.pathname;
  if (path.startsWith('/admin') || path === '/login') return 'superadmin';
  if (path.startsWith('/sales')) return 'sales';
  if (path.startsWith('/company') || path.startsWith('/c/')) return 'company';
  return 'superadmin';
}

export function getToken(portal) {
  const target = portal ? (TOKEN_KEYS[portal] ? portal : resolvePortal(portal)) : resolvePortal();
  const key = TOKEN_KEYS[target];
  let token = key ? localStorage.getItem(key) : null;
  if (!token) {
    // Seamless fallback for company admins accessing sales endpoints or vice-versa
    token = localStorage.getItem(TOKEN_KEYS.company) || localStorage.getItem(TOKEN_KEYS.sales) || localStorage.getItem(TOKEN_KEYS.superadmin);
  }
  return token;
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

export async function downloadFile(path, defaultFilename, options = {}) {
  const { portal, ...rest } = options;
  const token = getToken(portal);
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...rest,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let msg = 'Failed to download file';
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.message || msg;
    } catch {}
    throw new Error(msg);
  }

  let filename = defaultFilename;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const authApi = {
  login: (email, password, portal = 'superadmin', role_tag = null) =>
    api('/auth/login', { method: 'POST', body: { email, password, portal, role_tag }, portal }),
  me: (portal) => api('/auth/me', { portal }),
  companyPortal: (slug) => api(`/auth/company-portal/${slug}`, { portal: 'company' }),
  companyRoles: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/auth/company-roles${qs}`, { portal: 'company' });
  },
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
  remove: (id) => api(`/companies/${id}/permanent`, { method: 'DELETE', portal: 'superadmin' }),
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

export const adminWabaApi = {
  overview: () => api('/admin/waba/overview', { portal: 'superadmin' }),
  requests: () => api('/admin/waba/requests', { portal: 'superadmin' }),
  accounts: () => api('/admin/waba/accounts', { portal: 'superadmin' }),
  createAccount: (body) => api('/admin/waba/create-account', { method: 'POST', body, portal: 'superadmin' }),
  recharge: (body) => api('/admin/waba/recharge', { method: 'POST', body, portal: 'superadmin' }),
  changeStatus: (body) => api('/admin/waba/change-status', { method: 'POST', body, portal: 'superadmin' }),
  updateExpiry: (body) => api('/admin/waba/update-expiry', { method: 'POST', body, portal: 'superadmin' }),
  checkLive: (wabanumber) => api(`/admin/waba/check-live?wabanumber=${encodeURIComponent(wabanumber)}`, { portal: 'superadmin' }),
  recharges: () => api('/admin/waba/recharges', { portal: 'superadmin' }),
  migrateTemplate: (body) => api('/admin/waba/template-migration', { method: 'POST', body, portal: 'superadmin' }),
};

export const companyPortalApi = {
  dashboard: () => api('/company/dashboard', { portal: 'company' }),
  getProfile: () => api('/company/profile', { portal: 'company' }),
  updateProfile: (body) => api('/company/profile', { method: 'PUT', body, portal: 'company' }),
  team: () => api('/company/team', { portal: 'company' }),
  domains: () => api('/company/domains', { portal: 'company' }),
  addMember: (body) => api('/company/team', { method: 'POST', body, portal: 'company' }),
  setMemberStatus: (id, is_active) =>
    api(`/company/team/${id}/status`, { method: 'PATCH', body: { is_active }, portal: 'company' }),
  updateMember: (id, body) =>
    api(`/company/team/${id}`, { method: 'PATCH', body, portal: 'company' }),
  updateMemberDomain: (id, domain) =>
    api(`/company/team/${id}/domain`, { method: 'PATCH', body: { domain }, portal: 'company' }),
  impersonateSales: (memberId) =>
    api(`/company/team/${memberId}/impersonate`, { method: 'POST', portal: 'company' }),
  memberLeadsSummary: (id) =>
    api(`/company/team/${id}/leads-summary`, { portal: 'company' }),
  transferLeads: (body) =>
    api('/company/team/transfer-leads', { method: 'POST', body, portal: 'company' }),
  deleteMember: (id) =>
    api(`/company/team/${id}`, { method: 'DELETE', portal: 'company' }),
  leadSources: () => api('/company/leads/sources', { portal: 'company' }),
  leadCampaigns: () => api('/company/leads/campaigns', { portal: 'company' }),
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
  exportLeads: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, value);
    });
    const query = qs.toString();
    return downloadFile(`/company/leads/export${query ? `?${query}` : ''}`, `Leads_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, { portal: 'company' });
  },
  exportPipeline: (campaign) =>
    downloadFile(`/sales/pipeline/export${campaign && campaign !== 'all' ? `?campaign=${encodeURIComponent(campaign)}` : ''}`, `Pipeline_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, { portal: 'company' }),
  createLead: (body) => api('/company/leads', { method: 'POST', body, portal: 'company' }),
  updateLead: (id, body) => api(`/company/leads/${id}`, { method: 'PATCH', body, portal: 'company' }),
  deleteLead: (id) => api(`/company/leads/${id}`, { method: 'DELETE', portal: 'company' }),
  previewExcel: (body) => api('/company/leads/preview-excel', { method: 'POST', body, portal: 'company' }),
  uploadLeads: (body) => api('/company/leads/upload', { method: 'POST', body, portal: 'company' }),
  getUrls: (sourceId) => api(`/company/leads/urls${sourceId ? `?source_id=${sourceId}` : ''}`, { portal: 'company' }),
  addUrl: (body) => api('/company/leads/urls', { method: 'POST', body, portal: 'company' }),
  deleteUrl: (id) => api(`/company/leads/urls/${id}`, { method: 'DELETE', portal: 'company' }),
  whatsappSalespersons: () => api('/company/whatsapp/salespersons', { portal: 'company' }),
  whatsappConversations: (salespersonId = '', q = '') => {
    const qs = new URLSearchParams();
    if (salespersonId && salespersonId !== 'all') qs.set('salesperson_id', salespersonId);
    if (q) qs.set('q', q);
    const query = qs.toString();
    return api(`/company/whatsapp/conversations${query ? `?${query}` : ''}`, { portal: 'company' });
  },
  whatsappMessages: (leadId) => api(`/company/whatsapp/conversations/${leadId}/messages`, { portal: 'company' }),
  whatsappSendMessage: (leadId, body) =>
    api(`/company/whatsapp/conversations/${leadId}/send`, { method: 'POST', body, portal: 'company' }),
  whatsappSendToLead: (leadId, body) =>
    api(`/company/whatsapp/leads/${leadId}/send`, { method: 'POST', body, portal: 'company' }),
  uploadQuotationPdf: (body) =>
    api('/company/leads/upload-quotation-pdf', { method: 'POST', body, portal: 'company' }),
  sendQuotationEmail: (leadId, body) =>
    api(`/company/leads/${leadId}/send-quotation-email`, { method: 'POST', body, portal: 'company' }),
  sendDemoEmail: (leadId, body) =>
    api(`/company/leads/${leadId}/send-demo-email`, { method: 'POST', body, portal: 'company' }),
  tasks: () => api('/company/leads/tasks', { portal: 'company' }),
  completeTask: (id, body) => api(`/company/leads/tasks/${id}/complete`, { method: 'PATCH', body, portal: 'company' }),
  // WABA / WhatsApp Business API Suite
  wabaStatus: () => api('/company/waba/status', { portal: 'company' }),
  wabaRazorpayConfig: () => api('/company/waba/razorpay-config', { portal: 'company' }),
  wabaCreateOrder: (body) => api('/company/waba/create-order', { method: 'POST', body, portal: 'company' }),
  wabaVerifyPayment: (body) => api('/company/waba/verify-payment', { method: 'POST', body, portal: 'company' }),
  wabaConnectExisting: (body) => api('/company/waba/connect-existing', { method: 'POST', body, portal: 'company' }),
  wabaDisconnect: () => api('/company/waba/disconnect', { method: 'POST', portal: 'company' }),
  wabaRequestActivation: (body) => api('/company/waba/request-activation', { method: 'POST', body, portal: 'company' }),
  wabaRecharge: (body) => api('/company/waba/recharge', { method: 'POST', body, portal: 'company' }),
  wabaRecharges: () => api('/company/waba/recharges', { portal: 'company' }),
  wabaQualityReport: () => api('/company/waba/quality-report', { portal: 'company' }),
  wabaTemplates: () => api('/company/waba/templates', { portal: 'company' }),
  wabaCampaigns: () => api('/company/waba/campaigns', { portal: 'company' }),
  wabaCreateCampaign: (body) => api('/company/waba/campaigns', { method: 'POST', body, portal: 'company' }),
  wabaMedia: () => api('/company/waba/media', { portal: 'company' }),
  wabaUploadMedia: (body) => api('/company/waba/media', { method: 'POST', body, portal: 'company' }),
  wabaDailyReport: () => api('/company/waba/daily-report', { portal: 'company' }),
  wabaChatLogs: () => api('/company/waba/chat-logs', { portal: 'company' }),
  wabaConversations: () => api('/company/waba/conversations', { portal: 'company' }),
  wabaConversationMessages: (phone) => api(`/company/waba/conversations/${encodeURIComponent(phone)}/messages`, { portal: 'company' }),
  wabaSendMessage: (phone, body) => api(`/company/waba/conversations/${encodeURIComponent(phone)}/send`, { method: 'POST', body, portal: 'company' }),
  wabaUnsubscribes: () => api('/company/waba/unsubscribes', { portal: 'company' }),
  wabaAddUnsubscribe: (body) => api('/company/waba/unsubscribes', { method: 'POST', body, portal: 'company' }),
  feedbacks: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') qs.set(key, val);
    });
    const query = qs.toString();
    return api(`/company/feedbacks${query ? `?${query}` : ''}`, { portal: 'company' });
  },
};

export const salesApi = {
  stats: () => api('/sales/stats', { portal: 'sales' }),
  leads: (view) => api(`/sales/leads${view ? `?view=${view}` : ''}`, { portal: 'sales' }),
  createLead: (body) => api('/sales/leads', { method: 'POST', body, portal: 'sales' }),
  pipeline: (campaign) =>
    api(`/sales/pipeline${campaign && campaign !== 'all' ? `?campaign=${encodeURIComponent(campaign)}` : ''}`, { portal: 'sales' }),
  exportPipeline: (campaign) =>
    downloadFile(`/sales/pipeline/export${campaign && campaign !== 'all' ? `?campaign=${encodeURIComponent(campaign)}` : ''}`, `Pipeline_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, { portal: 'sales' }),
  claimLead: (id) => api(`/sales/leads/${id}/claim`, { method: 'POST', portal: 'sales' }),
  updateStatus: (id, body) => api(`/sales/leads/${id}/status`, { method: 'PUT', body, portal: 'sales' }),
  reminders: () => api('/sales/reminders', { portal: 'sales' }),
  activity: () => api('/sales/activity', { portal: 'sales' }),
  followups: () => api('/sales/followups', { portal: 'sales' }),
  feedbacks: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') qs.set(key, val);
    });
    const query = qs.toString();
    return api(`/sales/feedbacks${query ? `?${query}` : ''}`, { portal: 'sales' });
  },
  wonLeads: () => api('/sales/won-leads', { portal: 'sales' }),
  invoices: () => api('/sales/invoices', { portal: 'sales' }),
  createInvoice: (body) => api('/sales/invoices', { method: 'POST', body, portal: 'sales' }),
  invoiceDetails: (id) => api(`/sales/invoices/${id}`, { portal: 'sales' }),
  deleteInvoice: (id) => api(`/sales/invoices/${id}`, { method: 'DELETE', portal: 'sales' }),
};

export const salesAuthApi = {
  sendForgotOtp: (mobile) =>
    api('/auth/sales/forgot-password/send-otp', { method: 'POST', body: { mobile } }),
  verifyForgotOtp: (mobile, otp) =>
    api('/auth/sales/forgot-password/verify-otp', { method: 'POST', body: { mobile, otp } }),
  resetPassword: (verifyToken, newPassword) =>
    api('/auth/sales/forgot-password/reset-password', { method: 'POST', body: { verifyToken, newPassword } }),
};

export const companyAuthApi = {
  sendForgotOtp: (mobile, slug) =>
    api('/auth/company/forgot-password/send-otp', { method: 'POST', body: { mobile, slug } }),
  verifyForgotOtp: (mobile, otp, slug) =>
    api('/auth/company/forgot-password/verify-otp', { method: 'POST', body: { mobile, otp, slug } }),
  resetPassword: (verifyToken, newPassword) =>
    api('/auth/company/forgot-password/reset-password', { method: 'POST', body: { verifyToken, newPassword } }),
};

export const notificationsApi = {
  list: (portal) => api('/notifications', { portal }),
  markAsRead: (id, portal) => api(`/notifications/${id}/read`, { method: 'PATCH', portal }),
  markAllAsRead: (portal) => api('/notifications/read-all', { method: 'POST', portal }),
};

export const demoRequestsApi = {
  submit: (body) => api('/demo-requests', { method: 'POST', body }),
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'all') q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return api(`/demo-requests${qs}`, { portal: 'superadmin' });
  },
  updateStatus: (id, status, notes) =>
    api(`/demo-requests/${id}/status`, { method: 'PATCH', body: { status, notes }, portal: 'superadmin' }),
  delete: (id) =>
    api(`/demo-requests/${id}`, { method: 'DELETE', portal: 'superadmin' }),
};

export const companyApi = companyPortalApi;
