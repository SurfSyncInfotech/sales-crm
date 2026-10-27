import { useEffect, useMemo, useState, useRef } from 'react';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Loader2,
  Check,
} from 'lucide-react';
import WhatsAppChatModal from '../components/WhatsAppChatModal';

function downloadSampleExcelTemplate() {
  const csvContent =
    'lead_id,Name,Phone,Email,company_name\r\n' +
    'LID-101,Rahul Sharma,9876543210,rahul@example.com,Sharma Tech\r\n' +
    'LID-102,Priya Patel,9876543211,priya@example.com,Patel Enterprises\r\n' +
    'LID-103,Amit Verma,9876543212,amit@example.com,Verma & Sons\r\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'leads_sample_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const PAGE_SIZE = 10;

const emptyLead = {
  name: '',
  phone: '',
  email: '',
  lead_company: '',
  source_id: '',
  campaign: '',
  lead_date: new Date().toISOString().slice(0, 16),
  assigned_to: '',
  tags: '',
  notes: '',
  status: 'new',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatColumnTitle(key) {
  if (key === 'lead_company') return 'Company';
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLeadCellValue(lead, key) {
  if (key === 'company' && lead.lead_company) return lead.lead_company;
  if (key === 'lead_company' && lead.company) return lead.company;
  if (lead[key] !== undefined && lead[key] !== null && lead[key] !== '') {
    return String(lead[key]);
  }

  let payload = lead.raw_payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      payload = null;
    }
  }
  if (payload && typeof payload === 'object') {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      return String(payload[key]);
    }
  }

  return '—';
}

export default function CompanyLeadsPage() {
  const { user } = useAuth('company');
  const isAdmin = user?.role === 'company_admin';
  const PUBLIC_API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '') + '/public/leads';

  const [sources, setSources] = useState([]);
  const [team, setTeam] = useState([]);
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyLead);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [uploadMsg, setUploadMsg] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [fbConnections, setFbConnections] = useState([]);
  const [fbReady, setFbReady] = useState(false);
  const [fbStatus, setFbStatus] = useState('platform_not_ready');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSession, setFbSession] = useState('');
  const [fbWizard, setFbWizard] = useState(null);
  const [fbSelectedBusiness, setFbSelectedBusiness] = useState('');
  const [fbSelectedPages, setFbSelectedPages] = useState([]);
  const [fbSelectedAds, setFbSelectedAds] = useState([]);
  const [fbSelectedForms, setFbSelectedForms] = useState([]);

  const [excelPreview, setExcelPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const fileInputRef = useRef(null);

  const previewFilteredRows = useMemo(() => {
    if (!excelPreview || !Array.isArray(excelPreview.rows)) return [];
    let list = excelPreview.rows;
    if (previewFilter === 'valid') {
      list = list.filter((r) => r.isValid);
    } else if (previewFilter === 'invalid') {
      list = list.filter((r) => !r.isValid);
    }
    if (previewSearch.trim()) {
      const q = previewSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.name || '').toLowerCase().includes(q) ||
          String(r.phone || '').toLowerCase().includes(q) ||
          String(r.email || '').toLowerCase().includes(q) ||
          String(r.company_name || '').toLowerCase().includes(q) ||
          String(r.lead_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [excelPreview, previewFilter, previewSearch]);

  const [registeredUrls, setRegisteredUrls] = useState([]);
  const [newUrls, setNewUrlInput] = useState({});

  async function loadRegisteredUrls() {
    try {
      const data = await companyPortalApi.getUrls();
      setRegisteredUrls(data.urls || []);
    } catch (err) {
      console.error('Failed to load registered URLs:', err.message);
    }
  }

  async function handleAddUrl(sourceId) {
    const urlText = (newUrls[sourceId] || '').trim();
    if (!urlText) return;

    setBusy(true);
    setError('');
    try {
      await companyPortalApi.addUrl({ url: urlText, source_id: sourceId });
      setNewUrlInput((prev) => ({ ...prev, [sourceId]: '' }));
      await loadRegisteredUrls();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUrl(urlId) {
    if (!window.confirm('Are you sure you want to delete this registered URL? Forms on this URL will no longer be captured.')) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await companyPortalApi.deleteUrl(urlId);
      await loadRegisteredUrls();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadSources() {
    const data = await companyPortalApi.leadSources();
    setSources(data.sources);
  }

  async function loadFacebookConnections() {
    if (!isAdmin) return;
    try {
      const data = await companyPortalApi.facebookConnections();
      setFbConnections(data.connections || []);
      setFbReady(Boolean(data.oauth_ready));
      setFbStatus(data.connect_status || (data.oauth_ready ? 'ready' : 'platform_not_ready'));
    } catch {
      setFbConnections([]);
      setFbReady(false);
      setFbStatus('platform_not_ready');
    }
  }

  function applyWizardPayload(data) {
    const wizard = data.wizard || {};
    setFbSession(data.session_token);
    setFbWizard(wizard);
    setFbSelectedBusiness(wizard.selected_business_id || (wizard.businesses?.length ? '' : 'personal'));
    setFbSelectedPages(wizard.selected_page_ids || []);
    setFbSelectedAds(wizard.selected_ad_account_ids || []);
    setFbSelectedForms(wizard.selected_form_ids || []);
    setActiveTab('sources');
  }

  async function loadFacebookSetup(sessionToken) {
    const data = await companyPortalApi.facebookSetup(sessionToken);
    applyWizardPayload(data);
  }

  async function loadTeam() {
    const data = await companyPortalApi.team();
    setTeam(data.team.filter((m) => m.is_active));
  }

  async function loadLeads(nextPage = page) {
    const data = await companyPortalApi.leads({
      page: nextPage,
      limit: PAGE_SIZE,
      q: search || undefined,
      source: sourceFilter || undefined,
      status: statusFilter || undefined,
    });
    setLeads(data.leads);
    setPagination(data.pagination);
    setPage(data.pagination.page);
  }

  useEffect(() => {
    Promise.all([loadSources(), loadTeam(), loadLeads(1), loadFacebookConnections(), loadRegisteredUrls()]).catch((err) =>
      setError(err.message)
    );

    const params = new URLSearchParams(window.location.search);
    const fb = params.get('fb');
    if (fb === 'setup' || fb === 'pick') {
      const session = params.get('session');
      setActiveTab('sources');
      if (session) {
        loadFacebookSetup(session).catch((err) => setError(err.message));
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else if (fb === 'connected') {
      const pages = params.get('pages') || 'your Pages';
      setFbMessage(`Facebook connected: ${pages}. New Lead Ads will appear in this inbox.`);
      setActiveTab('sources');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (fb === 'error') {
      setError(params.get('message') || 'Facebook connect failed');
      setActiveTab('sources');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadLeads(1).catch((err) => setError(err.message));
  }, [sourceFilter, statusFilter]);

  const enabledCount = useMemo(() => sources.filter((s) => Number(s.is_enabled) === 1).length, [sources]);
  const salespeople = useMemo(
    () => team.filter((m) => m.role === 'salesperson' || m.role === 'company_admin'),
    [team]
  );

  const dynamicColumns = useMemo(() => {
    if (!sourceFilter) {
      return [
        { key: 'lead_code', label: 'Lead ID', isLeadCode: true },
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'lead_company', label: 'Company' },
        { key: 'source_label', label: 'Source' },
        { key: 'campaign', label: 'Campaign' },
        { key: 'lead_date', label: 'Date', isDate: true },
        { key: 'assigned_to', label: 'Assigned Salesperson', isSalesperson: true },
        { key: 'tags', label: 'Tags', isTags: true },
        { key: 'status', label: 'Status', isStatus: true },
      ];
    }

    const cols = [{ key: 'lead_code', label: 'Lead ID', isLeadCode: true }];

    const excludedKeys = new Set([
      'id', 'company_id', 'lead_code', 'created_at', 'updated_at', 'source_id',
      'source_name', 'source_label', 'source_slug', 'claimed_by', 'claimed_at',
      'assigned_to', 'assigned_name', 'assigned_email', 'status', 'tags',
      'deal_value', 'lost_reason', 'quotation_notes', 'quotation_scope',
      'quotation_services', 'quotation_sent_at', 'quotation_requested_at',
      'domain_id', 'duplicate', 'raw_payload', 'external_id', 'lead_date'
    ]);

    const priorityOrder = ['name', 'phone', 'email', 'company', 'lead_company', 'title', 'campaign', 'url', 'website', 'notes'];

    const discoveredKeys = new Set();
    leads.forEach((lead) => {
      Object.keys(lead).forEach((k) => {
        if (!excludedKeys.has(k) && lead[k] !== null && lead[k] !== undefined && lead[k] !== '' && lead[k] !== '—') {
          discoveredKeys.add(k);
        }
      });

      let payload = lead.raw_payload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          payload = null;
        }
      }
      if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach((k) => {
          const val = payload[k];
          if (!excludedKeys.has(k) && val !== null && val !== undefined && val !== '' && typeof val !== 'object') {
            discoveredKeys.add(k);
          }
        });
      }
    });

    const sortedKeys = Array.from(discoveredKeys).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a.toLowerCase());
      const idxB = priorityOrder.indexOf(b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const addedKeys = new Set();
    sortedKeys.forEach((key) => {
      if (key === 'company' && addedKeys.has('lead_company')) return;
      if (key === 'lead_company' && addedKeys.has('company')) return;
      addedKeys.add(key);

      cols.push({
        key,
        label: formatColumnTitle(key),
        isDynamic: true,
      });
    });

    cols.push(
      { key: 'lead_date', label: 'Date', isDate: true },
      { key: 'assigned_to', label: 'Assigned Salesperson', isSalesperson: true },
      { key: 'status', label: 'Status', isStatus: true }
    );

    return cols;
  }, [leads, sourceFilter]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function toggleSource(source) {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    try {
      await companyPortalApi.toggleLeadSource(source.id, !Number(source.is_enabled));
      await loadSources();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await companyPortalApi.createLead({
        ...form,
        source_id: form.source_id ? Number(form.source_id) : null,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      });
      setForm(emptyLead);
      setShowForm(false);
      setActiveTab('inbox');
      await Promise.all([loadLeads(1), loadSources()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await loadLeads(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function assignLead(leadId, assignedTo) {
    setBusy(true);
    try {
      await companyPortalApi.updateLead(leadId, {
        assigned_to: assignedTo ? Number(assignedTo) : null,
      });
      await loadLeads(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(leadId, status) {
    setBusy(true);
    try {
      await companyPortalApi.updateLead(leadId, { status });
      await loadLeads(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const [copiedKey, setCopiedKey] = useState(null);

  async function copyText(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      if (key) {
        setCopiedKey(key);
        setTimeout(() => {
          setCopiedKey(null);
        }, 1500);
      }
    } catch {
      // ignore
    }
  }

  async function connectFacebook() {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    setFbMessage('');
    try {
      const data = await companyPortalApi.facebookConnectUrl();
      if (!data.url) throw new Error(data.message || 'Facebook Connect not available');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function toggleId(list, setList, id) {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function wizardSelectBusiness() {
    if (!fbSession || !fbSelectedBusiness) return;
    setBusy(true);
    setError('');
    try {
      const data = await companyPortalApi.facebookSelectBusiness(fbSession, fbSelectedBusiness);
      applyWizardPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function wizardSelectPages() {
    if (!fbSession || !fbSelectedPages.length) return;
    setBusy(true);
    setError('');
    try {
      const data = await companyPortalApi.facebookSelectPages(fbSession, fbSelectedPages);
      applyWizardPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function wizardSelectAds() {
    if (!fbSession) return;
    setBusy(true);
    setError('');
    try {
      const data = await companyPortalApi.facebookSelectAdAccounts(fbSession, fbSelectedAds);
      applyWizardPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function wizardComplete() {
    if (!fbSession) return;
    setBusy(true);
    setError('');
    try {
      const result = await companyPortalApi.facebookCompleteSetup(fbSession, fbSelectedForms);
      setFbSession('');
      setFbWizard(null);
      await Promise.all([loadFacebookConnections(), loadSources(), loadLeads(1)]);
      const names = (result.saved || []).map((p) => p.page_name).join(', ') || 'selected Pages';
      setFbMessage(`Facebook connected: ${names}. New leads sync automatically.`);
      if (result.errors?.length) {
        setError(result.errors.map((e) => `${e.page_name || e.page_id}: ${e.error}`).join('; '));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnectFacebook(pageId) {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    try {
      await companyPortalApi.disconnectFacebookPage(pageId);
      await loadFacebookConnections();
      setFbMessage('Facebook Page disconnected');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendFacebookTestLead(pageId) {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    setFbMessage('');
    try {
      const result = await companyPortalApi.facebookTestLead({ page_id: pageId });
      setFbMessage(
        result.message + (result.lead?.lead_code ? ` (${result.lead.lead_code})` : '')
      );
      setActiveTab('inbox');
      await Promise.all([loadLeads(1), loadSources()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleExcelFileSelect(file) {
    if (!file) return;
    setPreviewLoading(true);
    setError('');
    setUploadMsg('');
    setPreviewSearch('');
    setPreviewFilter('all');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read spreadsheet file'));
        reader.readAsDataURL(file);
      });
      const preview = await companyPortalApi.previewExcel({
        file_base64: base64,
        file_name: file.name,
      });
      setExcelPreview({
        file,
        fileBase64: base64,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        totalRows: preview.total_rows || 0,
        validCount: preview.valid_count || 0,
        invalidCount: preview.invalid_count || 0,
        rows: preview.rows || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to read spreadsheet file');
      setExcelPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmExcelImport() {
    if (!excelPreview || !excelPreview.fileBase64) return;
    setImportingExcel(true);
    setError('');
    setUploadMsg('');
    try {
      const result = await companyPortalApi.uploadLeads({
        file_base64: excelPreview.fileBase64,
        file_name: excelPreview.fileName,
      });
      setUploadMsg(`${result.message}${result.errors?.length ? ` (${result.errors.length} row errors)` : ''}`);
      setExcelPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('inbox');
      await Promise.all([loadLeads(1), loadSources()]);
    } catch (err) {
      setError(err.message || 'Failed to import leads from spreadsheet');
    } finally {
      setImportingExcel(false);
    }
  }

  function handleCancelExcelPreview() {
    setExcelPreview(null);
    setPreviewSearch('');
    setPreviewFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Unified inbox</p>
          <h1>Leads</h1>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close form' : '+ Create lead'}
        </button>
      </header>

      <div className="mobile-cta-row mobile-only">
        <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close form' : '+ Create lead'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="lead-tabs">
        <button
          type="button"
          className={activeTab === 'inbox' ? 'active' : ''}
          onClick={() => setActiveTab('inbox')}
        >
          All leads ({pagination.total})
        </button>
        <button
          type="button"
          className={activeTab === 'sources' ? 'active' : ''}
          onClick={() => setActiveTab('sources')}
        >
          Integrations ({enabledCount}/{sources.length})
        </button>
      </div>

      {showForm && (
        <form className="panel form-grid" onSubmit={handleCreate}>
          <h2>Create lead</h2>
          <label>
            Name *
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>
          <label>
            Company
            <input value={form.lead_company} onChange={(e) => updateField('lead_company', e.target.value)} />
          </label>
          <label>
            Source
            <select value={form.source_id} onChange={(e) => updateField('source_id', e.target.value)}>
              <option value="">Select source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Campaign
            <input value={form.campaign} onChange={(e) => updateField('campaign', e.target.value)} />
          </label>
          <label>
            Date
            <input
              type="datetime-local"
              value={form.lead_date}
              onChange={(e) => updateField('lead_date', e.target.value)}
            />
          </label>
          <label>
            Assigned salesperson
            <select value={form.assigned_to} onChange={(e) => updateField('assigned_to', e.target.value)}>
              <option value="">Unassigned</option>
              {salespeople.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === 'company_admin' ? 'Admin' : 'Sales'})
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Tags (comma separated)
            <input
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="hot, demo, delhi"
            />
          </label>
          <label className="full">
            Notes
            <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} />
          </label>
          <div className="full form-actions">
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Saving…' : 'Create lead'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'sources' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Integrations</h2>
            <span className="muted">{enabledCount} channels enabled</span>
          </div>
          <p className="muted lead-sources-intro">
            One-tap connect. Enable a channel, then connect — leads land in one inbox.
          </p>

          {uploadMsg && <div className="capture-success">{uploadMsg}</div>}
          {fbMessage && <div className="capture-success">{fbMessage}</div>}

          <div className="lead-source-grid lead-source-grid-wide">
            {sources.map((source) => {
              const enabled = Number(source.is_enabled) === 1;
              const capture = source.capture || {};
              const isFacebook = source.slug === 'facebook-ads';
              const isExcel = source.slug === 'excel-upload';
              const isForm =
                source.slug === 'website-form' || source.slug === 'landing-pages';
              const activeFbPages = fbConnections.filter((c) => Number(c.is_active) === 1);

              return (
                <article
                  key={source.id}
                  className={`lead-source-card ${enabled ? 'enabled' : 'disabled'}`}
                >
                  <div className="lead-source-top">
                    <div>
                      <h3>{source.name}</h3>
                      <p>{source.description}</p>
                      <small>{source.lead_count} leads</small>
                      {isFacebook && activeFbPages.length > 0 && (
                        <small className="lead-connected-badge">
                          {' '}
                          · {activeFbPages.length} Page(s) connected
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      className={enabled ? 'primary-btn' : 'secondary-btn'}
                      disabled={!isAdmin || busy}
                      onClick={() => toggleSource(source)}
                    >
                      {enabled ? 'Enabled' : 'Enable'}
                    </button>
                  </div>

                  {isAdmin && (
                    <div className={`lead-one-tap ${enabled ? '' : 'is-disabled'}`}>
                      {isFacebook && (
                        <>
                          <div className={`fb-status-pill fb-status-${fbStatus}`}>
                            {fbStatus === 'connected' && 'Connected'}
                            {fbStatus === 'ready' && 'Ready to connect'}
                            {fbStatus === 'platform_not_ready' && 'Platform setup needed'}
                          </div>

                          {fbSession && fbWizard && (
                            <div className="fb-page-picker fb-wizard">
                              <div className="fb-wizard-steps">
                                <span className={fbWizard.step === 'business' ? 'active' : ''}>1. Business</span>
                                <span className={fbWizard.step === 'pages' ? 'active' : ''}>2. Pages</span>
                                <span className={fbWizard.step === 'ad_accounts' ? 'active' : ''}>3. Ads</span>
                                <span className={fbWizard.step === 'forms' ? 'active' : ''}>4. Forms</span>
                              </div>

                              {fbWizard.fb_user?.name && (
                                <p className="muted">Signed in as {fbWizard.fb_user.name}</p>
                              )}

                              {fbWizard.step === 'business' && (
                                <>
                                  <h4>Select Business</h4>
                                  {(fbWizard.businesses || []).map((b) => (
                                    <label key={b.id} className="fb-page-option">
                                      <input
                                        type="radio"
                                        name="fb-business"
                                        checked={fbSelectedBusiness === b.id}
                                        onChange={() => setFbSelectedBusiness(b.id)}
                                        disabled={busy || !enabled}
                                      />
                                      <span>{b.name}</span>
                                    </label>
                                  ))}
                                  <label className="fb-page-option">
                                    <input
                                      type="radio"
                                      name="fb-business"
                                      checked={fbSelectedBusiness === 'personal'}
                                      onChange={() => setFbSelectedBusiness('personal')}
                                      disabled={busy || !enabled}
                                    />
                                    <span>Personal Pages (no Business Manager)</span>
                                  </label>
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    disabled={busy || !enabled || !fbSelectedBusiness}
                                    onClick={wizardSelectBusiness}
                                  >
                                    {busy ? 'Loading…' : 'Continue'}
                                  </button>
                                </>
                              )}

                              {fbWizard.step === 'pages' && (
                                <>
                                  <h4>Select Pages</h4>
                                  <p className="muted">{fbWizard.selected_business_name || 'Pages'}</p>
                                  {(fbWizard.pages || []).length === 0 && (
                                    <p className="muted">No Pages found for this business.</p>
                                  )}
                                  {(fbWizard.pages || []).map((page) => (
                                    <label key={page.id} className="fb-page-option">
                                      <input
                                        type="checkbox"
                                        checked={fbSelectedPages.includes(page.id)}
                                        onChange={() => toggleId(fbSelectedPages, setFbSelectedPages, page.id)}
                                        disabled={busy || !enabled}
                                      />
                                      <span>{page.name}</span>
                                    </label>
                                  ))}
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    disabled={busy || !enabled || fbSelectedPages.length === 0}
                                    onClick={wizardSelectPages}
                                  >
                                    {busy ? 'Loading…' : `Continue with ${fbSelectedPages.length} Page(s)`}
                                  </button>
                                </>
                              )}

                              {fbWizard.step === 'ad_accounts' && (
                                <>
                                  <h4>Select Ad Accounts</h4>
                                  {(fbWizard.ad_accounts || []).length === 0 && (
                                    <p className="muted">No ad accounts found. You can continue.</p>
                                  )}
                                  {(fbWizard.ad_accounts || []).map((ad) => (
                                    <label key={ad.id} className="fb-page-option">
                                      <input
                                        type="checkbox"
                                        checked={fbSelectedAds.includes(ad.id)}
                                        onChange={() => toggleId(fbSelectedAds, setFbSelectedAds, ad.id)}
                                        disabled={busy || !enabled}
                                      />
                                      <span>
                                        {ad.name}
                                        {ad.account_id ? ` (${ad.account_id})` : ''}
                                      </span>
                                    </label>
                                  ))}
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    disabled={busy || !enabled}
                                    onClick={wizardSelectAds}
                                  >
                                    {busy ? 'Loading forms…' : 'Continue to Lead Forms'}
                                  </button>
                                </>
                              )}

                              {fbWizard.step === 'forms' && (
                                <>
                                  <h4>Select Lead Forms to sync</h4>
                                  {(fbWizard.forms || []).length === 0 && (
                                    <p className="muted">
                                      No lead forms found yet. Connecting Pages will still receive new Lead Ads.
                                    </p>
                                  )}
                                  {(fbWizard.forms || []).map((formItem) => (
                                    <label key={formItem.id} className="fb-page-option">
                                      <input
                                        type="checkbox"
                                        checked={fbSelectedForms.includes(formItem.id)}
                                        onChange={() =>
                                          toggleId(fbSelectedForms, setFbSelectedForms, formItem.id)
                                        }
                                        disabled={busy || !enabled}
                                      />
                                      <span>
                                        {formItem.name}
                                        <small className="fb-form-meta"> · page {formItem.page_id}</small>
                                      </span>
                                    </label>
                                  ))}
                                  <button
                                    type="button"
                                    className="primary-btn"
                                    disabled={
                                      busy ||
                                      !enabled ||
                                      ((fbWizard.forms || []).length > 0 && fbSelectedForms.length === 0)
                                    }
                                    onClick={wizardComplete}
                                  >
                                    {busy ? 'Subscribing…' : 'Finish & sync leads'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {!fbSession && (
                            <button
                              type="button"
                              className="primary-btn"
                              disabled={busy || !fbReady || !enabled}
                              onClick={connectFacebook}
                            >
                              {busy
                                ? 'Opening Facebook…'
                                : activeFbPages.length
                                  ? 'Reconnect Facebook'
                                  : 'Connect Facebook'}
                            </button>
                          )}

                          {!fbReady && (
                            <p className="muted lead-one-tap-note">
                              SurfSync platform Meta App credentials are not set yet. Companies never create a Meta
                              App — they only tap Connect once the platform is configured.
                            </p>
                          )}

                          {activeFbPages.map((conn) => (
                            <div key={conn.page_id} className="lead-endpoint-row">
                              <div>
                                <span>Connected Page</span>
                                <code>
                                  {conn.page_name || conn.page_id}
                                  {conn.business_name ? ` · ${conn.business_name}` : ''}
                                  {conn.forms?.length
                                    ? ` · ${conn.forms.length} form(s)`
                                    : conn.form_ids?.length
                                      ? ` · ${conn.form_ids.length} form(s)`
                                      : ''}
                                </code>
                              </div>
                              <div className="fb-page-actions">
                                <button
                                  type="button"
                                  className="gov-btn gov-btn-primary"
                                  disabled={busy || !enabled}
                                  onClick={() => sendFacebookTestLead(conn.page_id)}
                                >
                                  Test lead
                                </button>
                                <button
                                  type="button"
                                  className="gov-btn"
                                  disabled={busy || !enabled}
                                  onClick={() => disconnectFacebook(conn.page_id)}
                                >
                                  Disconnect
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {isExcel && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {/* Format Specification Banner */}
                          <div
                            style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '0.9rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={16} color="#0d9488" />
                                <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                                  Fixed Excel / CSV Format Specification
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={downloadSampleExcelTemplate}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  backgroundColor: '#072423',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                                title="Download pre-formatted sample template with exact headers"
                              >
                                <Download size={13} />
                                <span>Download Sample Template</span>
                              </button>
                            </div>

                            <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                              Our system accepts <strong>only the 5 columns listed below</strong>. Any other columns present in your file are safely ignored during import:
                            </p>

                            {/* Accepted Columns Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: '8px',
                              }}
                            >
                              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: '800', color: '#0f172a' }}>lead_id</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Optional • External ID</div>
                              </div>

                              <div style={{ backgroundColor: '#f0fdf4', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86efac' }}>
                                <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: '800', color: '#166534' }}>Name *</div>
                                <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: '700' }}>Required • Full Name</div>
                              </div>

                              <div style={{ backgroundColor: '#f0fdf4', padding: '6px 8px', borderRadius: '6px', border: '1px solid #86efac' }}>
                                <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: '800', color: '#166534' }}>Phone *</div>
                                <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: '700' }}>Required • WhatsApp/No</div>
                              </div>

                              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: '800', color: '#0f172a' }}>Email</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Optional • Email ID</div>
                              </div>

                              <div style={{ backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: '800', color: '#0f172a' }}>company_name</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Optional • Business Name</div>
                              </div>
                            </div>
                          </div>

                          {/* Upload Box & Instant Tabular Preview */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Upload size={14} color="#0d9488" />
                              <span>Select File to Preview & Import (.xlsx, .xls, .csv):</span>
                            </label>
                            
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              disabled={busy || !enabled || previewLoading || importingExcel}
                              onChange={(e) => handleExcelFileSelect(e.target.files?.[0])}
                              style={{
                                padding: '8px 12px',
                                border: '1.5px dashed #cbd5e1',
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                fontSize: '0.82rem',
                                cursor: busy || !enabled || previewLoading || importingExcel ? 'not-allowed' : 'pointer',
                              }}
                            />

                            {/* Loading state while parsing */}
                            {previewLoading && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '12px 16px',
                                  backgroundColor: '#f0fdfa',
                                  border: '1.5px solid #99f6e4',
                                  borderRadius: '8px',
                                  color: '#0f766e',
                                  fontSize: '0.84rem',
                                  fontWeight: '600',
                                }}
                              >
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Reading spreadsheet file and generating tabular preview...</span>
                              </div>
                            )}

                            {/* Tabular Preview Container */}
                            {excelPreview && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  backgroundColor: '#ffffff',
                                  border: '1.5px solid #0d9488',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.08)',
                                }}
                              >
                                {/* Header Bar */}
                                <div
                                  style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#f0fdfa',
                                    borderBottom: '1px solid #ccfbf1',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        backgroundColor: '#0d9488',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <FileSpreadsheet size={20} />
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                                          {excelPreview.fileName}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                          {excelPreview.fileSize}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f766e' }}>
                                          {excelPreview.totalRows} Total Rows
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>•</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a' }}>
                                          {excelPreview.validCount} Valid & Ready
                                        </span>
                                        {excelPreview.invalidCount > 0 && (
                                          <>
                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>•</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#d97706' }}>
                                              {excelPreview.invalidCount} Missing Name/Phone
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={handleCancelExcelPreview}
                                      disabled={importingExcel}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '7px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        backgroundColor: '#ffffff',
                                        color: '#475569',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        cursor: importingExcel ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      <X size={14} />
                                      <span>Cancel / Change</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleConfirmExcelImport}
                                      disabled={importingExcel || excelPreview.validCount === 0}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        backgroundColor: excelPreview.validCount === 0 ? '#94a3b8' : '#0d9488',
                                        color: '#ffffff',
                                        fontSize: '0.82rem',
                                        fontWeight: '800',
                                        cursor: importingExcel || excelPreview.validCount === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                                      }}
                                    >
                                      {importingExcel ? (
                                        <>
                                          <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                          <span>Importing Leads...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={15} />
                                          <span>Import {excelPreview.validCount} Leads</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Filter Toolbar */}
                                <div
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFilter('all')}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.74rem',
                                        fontWeight: '700',
                                        borderRadius: '4px',
                                        border: 'none',
                                        backgroundColor: previewFilter === 'all' ? '#0f172a' : '#e2e8f0',
                                        color: previewFilter === 'all' ? '#ffffff' : '#475569',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      All ({excelPreview.totalRows})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFilter('valid')}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.74rem',
                                        fontWeight: '700',
                                        borderRadius: '4px',
                                        border: 'none',
                                        backgroundColor: previewFilter === 'valid' ? '#16a34a' : '#dcfce7',
                                        color: previewFilter === 'valid' ? '#ffffff' : '#15803d',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Valid ({excelPreview.validCount})
                                    </button>
                                    {excelPreview.invalidCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewFilter('invalid')}
                                        style={{
                                          padding: '4px 10px',
                                          fontSize: '0.74rem',
                                          fontWeight: '700',
                                          borderRadius: '4px',
                                          border: 'none',
                                          backgroundColor: previewFilter === 'invalid' ? '#d97706' : '#fef3c7',
                                          color: previewFilter === 'invalid' ? '#ffffff' : '#b45309',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Issues ({excelPreview.invalidCount})
                                      </button>
                                    )}
                                  </div>

                                  {/* Search */}
                                  <div style={{ position: 'relative', width: '220px' }}>
                                    <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                      type="text"
                                      value={previewSearch}
                                      onChange={(e) => setPreviewSearch(e.target.value)}
                                      placeholder="Search inside file..."
                                      style={{
                                        width: '100%',
                                        padding: '4px 8px 4px 26px',
                                        fontSize: '0.76rem',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        backgroundColor: '#ffffff',
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Table Grid */}
                                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 1, borderBottom: '1px solid #cbd5e1' }}>
                                      <tr>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', width: '40px' }}>#</th>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', width: '90px' }}>lead_id</th>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800' }}>Name</th>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800' }}>Phone</th>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800' }}>Email</th>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800' }}>company_name</th>
                                        <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', width: '90px', textAlign: 'center' }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {previewFilteredRows.length === 0 ? (
                                        <tr>
                                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                                            No rows match the current search or filter.
                                          </td>
                                        </tr>
                                      ) : (
                                        previewFilteredRows.map((row) => (
                                          <tr
                                            key={row.rowNumber}
                                            style={{
                                              borderBottom: '1px solid #f1f5f9',
                                              backgroundColor: row.isValid ? '#ffffff' : '#fffbeb',
                                            }}
                                          >
                                            <td style={{ padding: '7px 10px', color: '#64748b', fontWeight: '600' }}>
                                              {row.rowNumber}
                                            </td>
                                            <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>
                                              {row.lead_id || <span style={{ color: '#cbd5e1' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '7px 10px', fontWeight: '700', color: row.name ? '#0f172a' : '#ef4444' }}>
                                              {row.name || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>}
                                            </td>
                                            <td style={{ padding: '7px 10px', color: row.phone ? '#0d9488' : '#ef4444', fontWeight: row.phone ? '600' : 'normal' }}>
                                              {row.phone || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>}
                                            </td>
                                            <td style={{ padding: '7px 10px', color: '#475569' }}>
                                              {row.email || <span style={{ color: '#cbd5e1' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '7px 10px', color: '#475569' }}>
                                              {row.company_name || <span style={{ color: '#cbd5e1' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                              {row.isValid ? (
                                                <span
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    padding: '2px 8px',
                                                    borderRadius: '999px',
                                                    backgroundColor: '#dcfce7',
                                                    color: '#15803d',
                                                    fontSize: '0.68rem',
                                                    fontWeight: '800',
                                                  }}
                                                >
                                                  <Check size={11} /> Ready
                                                </span>
                                              ) : (
                                                <span
                                                  title={row.issue || 'Missing Name and Phone'}
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    padding: '2px 8px',
                                                    borderRadius: '999px',
                                                    backgroundColor: '#fef3c7',
                                                    color: '#b45309',
                                                    fontSize: '0.68rem',
                                                    fontWeight: '800',
                                                    cursor: 'help',
                                                  }}
                                                >
                                                  <AlertCircle size={11} /> Skip
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Footer info */}
                                <div
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#f8fafc',
                                    borderTop: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.72rem',
                                    color: '#64748b',
                                  }}
                                >
                                  <span>
                                    Showing <strong>{previewFilteredRows.length}</strong> of <strong>{excelPreview.totalRows}</strong> rows
                                  </span>
                                  <span>
                                    * Only rows with valid Name or Phone will be imported
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {isForm && (
                        <div style={{ marginTop: '12px' }}>
                          {/* 1. Register a new URL Form */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                              type="url"
                              value={newUrls[source.id] || ''}
                              onChange={(e) =>
                                setNewUrlInput((prev) => ({ ...prev, [source.id]: e.target.value }))
                              }
                              placeholder={
                                source.slug === 'landing-pages'
                                  ? 'Enter Landing Page URL (e.g. https://my-landing-page.com)'
                                  : 'Enter Website Form URL (e.g. https://mysite.com/contact)'
                              }
                              disabled={!enabled || busy}
                              className="gov-input"
                              style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gray-300)', borderRadius: '6px' }}
                            />
                            <button
                              type="button"
                              className="gov-btn gov-btn-primary"
                              disabled={!enabled || busy || !(newUrls[source.id] || '').trim()}
                              onClick={() => handleAddUrl(source.id)}
                            >
                              Add URL
                            </button>
                          </div>

                          {/* 2. List of registered URLs */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {registeredUrls
                              .filter((u) => Number(u.source_id) === Number(source.id))
                              .map((u) => {
                                const webhookUrl = `${PUBLIC_API_BASE}/form/${u.webhook_key}`;
                                return (
                                  <div
                                    key={u.id}
                                    style={{
                                      padding: '12px',
                                      backgroundColor: 'var(--gray-50)',
                                      border: '1px solid var(--gray-200)',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px',
                                      }}
                                    >
                                      <strong style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                                        {u.url}
                                      </strong>
                                      <button
                                        type="button"
                                        style={{
                                          color: 'var(--red-600)',
                                          border: 'none',
                                          background: 'none',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                        }}
                                        disabled={busy}
                                        onClick={() => handleDeleteUrl(u.id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                    <div className="lead-endpoint-row" style={{ margin: 0 }}>
                                      <div>
                                        <span>form_post</span>
                                        <code>{webhookUrl}</code>
                                      </div>
                                      <button
                                        type="button"
                                        className="gov-btn"
                                        onClick={() => copyText(webhookUrl, `webhook-${u.id}`)}
                                      >
                                        {copiedKey === `webhook-${u.id}` ? '✓ Copied!' : 'Copy Webhook'}
                                      </button>
                                    </div>
                                    <div className="lead-endpoint-row" style={{ marginTop: '8px', marginBottom: 0 }}>
                                      <div>
                                        <span>HTML form action</span>
                                        <code>{`<form method="POST" action="${webhookUrl}">...</form>`}</code>
                                      </div>
                                      <button
                                        type="button"
                                        className="gov-btn"
                                        onClick={() =>
                                          copyText(`<form method="POST" action="${webhookUrl}">...</form>`, `code-${u.id}`)
                                        }
                                      >
                                        {copiedKey === `code-${u.id}` ? '✓ Copied!' : 'Copy Code'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                            {registeredUrls.filter((u) => Number(u.source_id) === Number(source.id))
                              .length === 0 && (
                              <p className="muted" style={{ fontSize: '13px', textAlign: 'center', margin: '8px 0' }}>
                                No URLs registered yet. Add your landing page or form URL above to start.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {!isFacebook && !isExcel && !isForm && (
                        <>
                          <p className="muted lead-one-tap-note">
                            {enabled ? 'Connected — receiving leads when enabled.' : 'Enable to start receiving leads.'}
                          </p>

                          {source.slug === 'whatsapp' && (
                            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setShowWhatsAppModal(true)}
                                style={{
                                  width: '100%',
                                  backgroundColor: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '10px 16px',
                                  borderRadius: '8px',
                                  fontSize: '0.86rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                                  transition: 'background-color 0.15s',
                                }}
                              >
                                <MessageSquare size={17} />
                                <span>View WhatsApp Chats with Salespersons</span>
                              </button>
                            </div>
                          )}
                          {enabled && capture.endpoints?.webhook_post && (
                            <div style={{ marginTop: '12px' }}>
                              <div className="lead-endpoint-row">
                                <div>
                                  <span>Webhook URL</span>
                                  <code>{capture.endpoints.webhook_post}</code>
                                </div>
                                <button
                                  type="button"
                                  className="gov-btn"
                                  onClick={() => copyText(capture.endpoints.webhook_post, `webhook-post-${source.id}`)}
                                >
                                  {copiedKey === `webhook-post-${source.id}` ? '✓ Copied!' : 'Copy'}
                                </button>
                              </div>

                              {source.slug === 'google-ads' && (
                                <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                                  Paste this Webhook URL into your Google Ads Lead Form webhook settings.
                                </p>
                              )}

                              {source.slug === 'whatsapp' && (
                                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                  <div className="lead-endpoint-row" style={{ marginTop: '4px' }}>
                                    <div>
                                      <span>Verify Token</span>
                                      <code>surfsync_verify</code>
                                    </div>
                                    <button
                                      type="button"
                                      className="gov-btn"
                                      onClick={() => copyText('surfsync_verify', `wa-verify-${source.id}`)}
                                    >
                                      {copiedKey === `wa-verify-${source.id}` ? '✓ Copied!' : 'Copy'}
                                    </button>
                                  </div>
                                  <p className="muted" style={{ marginTop: '6px' }}>
                                    Paste this URL and Verify Token in your Meta Developer App Webhooks setup.
                                  </p>
                                </div>
                              )}

                              {source.slug === 'calling' && (
                                <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                                  Set this Webhook URL in your telephony system callback settings.
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {!isAdmin && <p className="muted">Only company admins can connect channels.</p>}
        </section>
      )}
      {activeTab === 'inbox' && (
        <div className="gov-table-stack">
          <div className="gov-table-toolbar">
            <div className="gov-table-title">Lead Master List</div>
            <form className="gov-table-tools" onSubmit={handleSearch}>
              <label>
                Search
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name / phone / email / lead ID"
                />
              </label>
              <label>
                Source
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="">All</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <button type="submit" className="gov-btn gov-btn-primary">
                Apply
              </button>
            </form>
          </div>

          <section className="gov-table-wrap">
          <div className="gov-table-scroll">
            <table className="gov-table">
              <thead>
                <tr>
                  {dynamicColumns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={dynamicColumns.length} className="gov-empty">
                      No leads yet. Enable a source or create a lead manually.
                    </td>
                  </tr>
                )}
                {leads.map((lead, index) => (
                  <tr key={lead.id} className={index % 2 === 1 ? 'gov-row-alt' : ''}>
                    {dynamicColumns.map((col) => {
                      if (col.isLeadCode) {
                        return (
                          <td key={col.key} className="gov-strong">
                            {lead.lead_code}
                          </td>
                        );
                      }
                      if (col.isDate) {
                        return (
                          <td key={col.key}>
                            {formatDate(lead.lead_date)}
                          </td>
                        );
                      }
                      if (col.isSalesperson) {
                        return (
                          <td key={col.key}>
                            {isAdmin ? (
                              <select
                                className="lead-inline-select"
                                value={lead.assigned_to || ''}
                                onChange={(e) => assignLead(lead.id, e.target.value)}
                                disabled={busy}
                              >
                                <option value="">Unassigned</option>
                                {salespeople.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              lead.assigned_name || '—'
                            )}
                          </td>
                        );
                      }
                      if (col.isTags) {
                        return (
                          <td key={col.key}>
                            <div className="lead-tags">
                              {(lead.tags || []).length === 0 && '—'}
                              {(lead.tags || []).map((tag) => (
                                <span key={tag} className="lead-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                        );
                      }
                      if (col.isStatus) {
                        return (
                          <td key={col.key}>
                            <select
                              className="lead-inline-select"
                              value={lead.status}
                              onChange={(e) => updateStatus(lead.id, e.target.value)}
                              disabled={busy}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="qualified">Qualified</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                            </select>
                          </td>
                        );
                      }
                      return (
                        <td key={col.key}>
                          {getLeadCellValue(lead, col.key)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="gov-pagination">
            <span>
              Showing {leads.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} entries
            </span>
            <div className="gov-page-btns">
              <button
                type="button"
                className="gov-btn"
                disabled={page <= 1}
                onClick={() => loadLeads(page - 1)}
              >
                Prev
              </button>
              <span className="gov-ellipsis">
                Page {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="gov-btn"
                disabled={page >= pagination.totalPages}
                onClick={() => loadLeads(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
          </section>
        </div>
      )}

      {/* WhatsApp Live Chat & Salesperson Conversations Modal */}
      <WhatsAppChatModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
      />
    </div>
  );
}
