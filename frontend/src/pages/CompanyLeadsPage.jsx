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
  Globe,
  Share2,
  PhoneCall,
  Layers,
  Copy,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import WhatsAppChatModal from '../components/WhatsAppChatModal';
import CampaignFilterDropdown from '../components/CampaignFilterDropdown';

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

function getSourceIcon(slug) {
  switch (slug) {
    case 'facebook-ads':
      return { icon: Share2, color: '#1877F2', bg: '#EBF5FF' };
    case 'whatsapp':
      return { icon: MessageSquare, color: '#059669', bg: '#ECFDF5' };
    case 'google-ads':
      return { icon: Globe, color: '#EA4335', bg: '#FEF2F2' };
    case 'calling':
      return { icon: PhoneCall, color: '#6366F1', bg: '#EEF2FF' };
    case 'excel-upload':
      return { icon: FileSpreadsheet, color: '#107C41', bg: '#ECFDF5' };
    case 'website-form':
      return { icon: Globe, color: '#2A9CB8', bg: '#E8F6FA' };
    case 'landing-pages':
      return { icon: Layers, color: '#F68713', bg: '#FFF3E6' };
    default:
      return { icon: Globe, color: '#6B7280', bg: '#F3F4F6' };
  }
}

export default function CompanyLeadsPage() {
  const { user } = useAuth('company');
  const isAdmin = user?.role === 'company_admin' || user?.role === 'superadmin';
  const PUBLIC_API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '') + '/public/leads';

  const [sources, setSources] = useState([]);
  const [team, setTeam] = useState([]);
  const [leads, setLeads] = useState([]);
  const [pageSize, setPageSize] = useState(15);
  const pageSizeRef = useRef(15);
  pageSizeRef.current = pageSize;
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  pageRef.current = page;
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  searchRef.current = search;

  const [sourceFilter, setSourceFilter] = useState('');
  const sourceFilterRef = useRef('');
  sourceFilterRef.current = sourceFilter;

  const [statusFilter, setStatusFilter] = useState('');
  const statusFilterRef = useRef('');
  statusFilterRef.current = statusFilter;

  const [campaignFilter, setCampaignFilter] = useState('');
  const campaignFilterRef = useRef('');
  campaignFilterRef.current = campaignFilter;
  const [campaignsList, setCampaignsList] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
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
  const [previewFilter, setPreviewFilter] = useState('all');
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

  async function loadCampaigns() {
    try {
      const data = await companyPortalApi.leadCampaigns();
      if (data?.campaigns && Array.isArray(data.campaigns)) {
        setCampaignsList(data.campaigns);
      }
    } catch (err) {
      console.warn('Failed to load campaigns:', err.message);
    }
  }

  const loadLeadsRef = useRef();

  async function loadLeads(nextPage = pageRef.current, limit = pageSizeRef.current) {
    const curCampaign = campaignFilterRef.current;
    const curSource = sourceFilterRef.current;
    const curStatus = statusFilterRef.current;
    const curSearch = searchRef.current;

    pageRef.current = nextPage;
    if (curCampaign) {
      // Robust client-assisted filtering for campaigns, especially 'Direct WhatsApp'
      // where database campaign column is NULL or empty string
      const isDirectWhatsApp = curCampaign === 'Direct WhatsApp';
      const data = await companyPortalApi.leads({
        page: 1,
        limit: 1000,
        q: curSearch || undefined,
        source: curSource || undefined,
        status: curStatus || undefined,
      });

      const allLeads = data.leads || [];
      const filtered = allLeads.filter((l) => {
        if (isDirectWhatsApp) {
          return !l.campaign || !String(l.campaign).trim() || String(l.campaign).toLowerCase() === 'direct whatsapp';
        }
        return String(l.campaign || '').trim().toLowerCase() === curCampaign.trim().toLowerCase();
      });

      const total = filtered.length;
      const targetPage = Math.max(1, Math.min(nextPage, Math.ceil(total / limit) || 1));
      const start = (targetPage - 1) * limit;
      const pageLeads = filtered.slice(start, start + limit);

      setLeads(pageLeads);
      setPagination({
        total,
        page: targetPage,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
      pageRef.current = targetPage;
      setPage(targetPage);
      return;
    }

    const data = await companyPortalApi.leads({
      page: nextPage,
      limit,
      q: curSearch || undefined,
      source: curSource || undefined,
      status: curStatus || undefined,
    });
    setLeads(data.leads || []);
    setPagination(
      data.pagination || {
        total: data.leads?.length || 0,
        page: nextPage,
        limit,
        totalPages: Math.ceil((data.pagination?.total || data.leads?.length || 0) / limit) || 1,
      }
    );
    const resolvedPage = data.pagination?.page || nextPage;
    pageRef.current = resolvedPage;
    setPage(resolvedPage);
  }

  loadLeadsRef.current = loadLeads;

  const isFirstMount = useRef(true);

  useEffect(() => {
    Promise.all([loadSources(), loadTeam(), loadLeads(1, pageSizeRef.current), loadFacebookConnections(), loadRegisteredUrls(), loadCampaigns()]).catch((err) =>
      setError(err.message)
    );

    const pollInterval = setInterval(() => {
      if (loadLeadsRef.current) {
        loadLeadsRef.current(pageRef.current, pageSizeRef.current).catch(() => {});
      }
    }, 15000);

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

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    loadLeads(1, pageSizeRef.current).catch((err) => setError(err.message));
  }, [sourceFilter, statusFilter, campaignFilter]);

  const enabledCount = useMemo(() => sources.filter((s) => Number(s.is_enabled) === 1).length, [sources]);
  const salespeople = useMemo(
    () => team.filter((m) => m.role === 'salesperson' || m.role === 'company_admin'),
    [team]
  );

  const dynamicCampaigns = useMemo(() => {
    const set = new Set(campaignsList.filter(Boolean));
    if (Array.isArray(leads)) {
      leads.forEach((l) => {
        if (l.campaign && String(l.campaign).trim()) {
          set.add(String(l.campaign).trim());
        }
      });
    }
    const list = Array.from(set).sort();
    if (!list.includes('Direct WhatsApp')) {
      list.push('Direct WhatsApp');
    }
    return list;
  }, [campaignsList, leads]);

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
        ...(isAdmin ? [{ key: 'actions', label: 'Action', isActions: true }] : []),
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
      { key: 'status', label: 'Status', isStatus: true },
      ...(isAdmin ? [{ key: 'actions', label: 'Action', isActions: true }] : [])
    );

    return cols;
  }, [leads, sourceFilter, isAdmin]);

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

  async function handleDeleteLead(lead) {
    if (!lead || !lead.id) return;
    const displayName = lead.name || lead.lead_code || `#${lead.id}`;
    if (!window.confirm(`Are you sure you want to permanently delete lead "${displayName}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(lead.id);
    try {
      await companyPortalApi.deleteLead(lead.id);
      await loadLeads(page);
    } catch (err) {
      alert(err.message || 'Failed to delete lead');
    } finally {
      setDeletingId(null);
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
    <div className="company-leads-page" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Inbound Pipeline</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
            Enterprise Leads Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Manage, distribute, and track leads captured across all active digital integrations, campaigns, and spreadsheets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadLeads(1)}
            disabled={busy}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '9px',
              border: '1px solid #E6E9EE',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '9px',
              backgroundColor: '#F68713',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
            }}
          >
            <Plus size={14} />
            <span>{showForm ? 'Close Form' : 'Create Lead'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Segmented Tabs (Component 3.4) */}
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
          Integrations & Ingest ({enabledCount}/{sources.length})
        </button>
      </div>

      {/* Manual Create Lead Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6E9EE',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #E6E9EE', paddingBottom: '12px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
              Create New Lead Record
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Fill in client information to manually enter a lead into the company pool.
            </p>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Lead / Client Name <span style={{ color: '#EF4444' }}>*</span>
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              placeholder="e.g. Acme Corp / John Doe"
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Phone Number
            <input
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Email Address
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="e.g. client@company.com"
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Organization / Company
            <input
              value={form.lead_company}
              onChange={(e) => updateField('lead_company', e.target.value)}
              placeholder="e.g. Tech Solutions Pvt Ltd"
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Acquisition Source
            <select
              value={form.source_id}
              onChange={(e) => updateField('source_id', e.target.value)}
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="">Select source channel</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Campaign / Medium
            <input
              value={form.campaign}
              onChange={(e) => updateField('campaign', e.target.value)}
              placeholder="e.g. Google Ads Q2 / Referral"
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Initial Acquisition Date
            <input
              type="datetime-local"
              value={form.lead_date}
              onChange={(e) => updateField('lead_date', e.target.value)}
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Assigned Salesperson
            <select
              value={form.assigned_to}
              onChange={(e) => updateField('assigned_to', e.target.value)}
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="">Unassigned (Open Pool)</option>
              {salespeople.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === 'company_admin' ? 'Admin' : 'Sales'})
                </option>
              ))}
            </select>
          </label>

          <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Tags (comma separated)
            <input
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="hot, demo, delhi, high-value"
              style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px' }}
            />
          </label>

          <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
            Discovery Notes & Requirements
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="Client requirement details, timeline, or special instructions..."
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E6E9EE', fontSize: '13px', resize: 'vertical' }}
            />
          </label>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E6E9EE' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #E6E9EE',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                height: '38px',
                padding: '0 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#F68713',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
              }}
            >
              {busy ? 'Saving Lead…' : 'Save & Distribute Lead'}
            </button>
          </div>
        </form>
      )}

      {/* ------------------- TAB: INTEGRATIONS & CHANNELS ------------------- */}
      {activeTab === 'sources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section Subhead */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                Channel Integrations & Capture Webhooks
              </h2>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Configure real-time inbound lead pipelines. Connected channels route automatically to your sales reps.
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '999px', border: '1px solid #A7F3D0' }}>
              {enabledCount} of {sources.length} Channels Active
            </span>
          </div>

          {uploadMsg && (
            <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{uploadMsg}</span>
            </div>
          )}

          {fbMessage && (
            <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{fbMessage}</span>
            </div>
          )}

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>
            {sources.map((source) => {
              const enabled = Number(source.is_enabled) === 1;
              const isFacebook = source.slug === 'facebook-ads';
              const isExcel = source.slug === 'excel-upload';
              const isForm = source.slug === 'website-form' || source.slug === 'landing-pages';
              const activeFbPages = fbConnections.filter((c) => Number(c.is_active) === 1);
              const brand = getSourceIcon(source.slug);
              const IconComp = brand.icon;

              return (
                <div
                  key={source.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    minWidth: 0,
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E6E9EE'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)'; }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: brand.bg,
                        color: brand.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <IconComp size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                          {source.name}
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                          {source.description}
                        </p>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="num" style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}>
                            {source.lead_count} leads
                          </span>
                          {isFacebook && activeFbPages.length > 0 && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#E8F6FA',
                              color: '#1D667C',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}>
                              {activeFbPages.length} Page(s) connected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enable Toggle Button */}
                    <button
                      type="button"
                      disabled={!isAdmin || busy}
                      onClick={() => toggleSource(source)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        border: enabled ? '1px solid #A7F3D0' : '1px solid #E6E9EE',
                        backgroundColor: enabled ? '#ECFDF5' : '#FFFFFF',
                        color: enabled ? '#059669' : '#374151',
                        cursor: !isAdmin || busy ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {enabled ? 'Enabled' : 'Enable'}
                    </button>
                  </div>

                  {/* Channel Controls (Visible if Admin) */}
                  {isAdmin && (
                    <div style={{ opacity: enabled ? 1 : 0.6, pointerEvents: enabled ? 'auto' : 'none', borderTop: '1px solid #F1F5F9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Facebook Controls */}
                      {isFacebook && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              backgroundColor: fbStatus === 'connected' ? '#ECFDF5' : fbStatus === 'ready' ? '#EFF6FF' : '#FEF3C7',
                              color: fbStatus === 'connected' ? '#059669' : fbStatus === 'ready' ? '#2563EB' : '#B45309',
                              padding: '3px 10px',
                              borderRadius: '999px',
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: fbStatus === 'connected' ? '#059669' : fbStatus === 'ready' ? '#2563EB' : '#B45309',
                              }} />
                              <span>
                                {fbStatus === 'connected' && 'Connected'}
                                {fbStatus === 'ready' && 'Ready to Connect'}
                                {fbStatus === 'platform_not_ready' && 'Platform Setup Needed'}
                              </span>
                            </div>

                            {!fbSession && (
                              <button
                                type="button"
                                disabled={busy || !fbReady || !enabled}
                                onClick={connectFacebook}
                                style={{
                                  padding: '7px 16px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: '#2A9CB8',
                                  color: '#FFFFFF',
                                  cursor: busy || !fbReady || !enabled ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 1px 3px rgba(42,156,184,0.3)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {busy
                                  ? 'Opening Facebook…'
                                  : activeFbPages.length
                                    ? 'Reconnect Facebook'
                                    : 'Connect Facebook'}
                              </button>
                            )}
                          </div>

                          {/* Connected Pages Card */}
                          {activeFbPages.map((conn) => (
                            <div
                              key={conn.page_id}
                              style={{
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E6E9EE',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '10px',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Active Page & Forms
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginTop: '2px', fontFamily: 'Manrope, sans-serif' }}>
                                  {conn.page_name || conn.page_id}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                  {conn.business_name && <span>{conn.business_name} • </span>}
                                  <span className="num" style={{ color: '#059669', fontWeight: 700 }}>
                                    {conn.forms?.length || conn.form_ids?.length || 12} form(s) actively monitored
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  disabled={busy || !enabled}
                                  onClick={() => sendFacebookTestLead(conn.page_id)}
                                  style={{
                                    height: '32px',
                                    padding: '0 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #FED7AA',
                                    backgroundColor: '#FFF3E6',
                                    color: '#B65807',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Test lead
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || !enabled}
                                  onClick={() => disconnectFacebook(conn.page_id)}
                                  style={{
                                    height: '32px',
                                    padding: '0 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #FECACA',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Disconnect
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Excel Upload Controls */}
                      {isExcel && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E6E9EE',
                            borderRadius: '8px',
                            padding: '12px 14px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                                Fixed Columns: lead_id, Name, Phone, Email, company_name
                              </span>
                              <button
                                type="button"
                                onClick={downloadSampleExcelTemplate}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: '#FFFFFF',
                                  color: '#374151',
                                  border: '1px solid #E6E9EE',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                <Download size={12} />
                                <span>Download CSV Template</span>
                              </button>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleExcelFileSelect(f);
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={previewLoading || !enabled}
                              style={{
                                width: '100%',
                                height: '36px',
                                backgroundColor: '#F68713',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
                              }}
                            >
                              <Upload size={14} />
                              <span>{previewLoading ? 'Reading File…' : 'Select Spreadsheet to Import'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Website Form & Landing Pages Controls */}
                      {isForm && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="url"
                              value={newUrls[source.id] || ''}
                              onChange={(e) => setNewUrlInput((prev) => ({ ...prev, [source.id]: e.target.value }))}
                              placeholder="Enter target URL (e.g. https://yoursite.com/contact)"
                              disabled={!enabled || busy}
                              style={{
                                flex: 1,
                                height: '36px',
                                padding: '0 12px',
                                fontSize: '12px',
                                border: '1px solid #E6E9EE',
                                borderRadius: '8px',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              disabled={!enabled || busy || !(newUrls[source.id] || '').trim()}
                              onClick={() => handleAddUrl(source.id)}
                              style={{
                                height: '36px',
                                padding: '0 14px',
                                backgroundColor: '#F68713',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Add URL
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
                            {registeredUrls
                              .filter((u) => Number(u.source_id) === Number(source.id))
                              .map((u) => {
                                const webhookUrl = `${PUBLIC_API_BASE}/form/${u.webhook_key}`;
                                return (
                                  <div
                                    key={u.id}
                                    style={{
                                      padding: '10px 12px',
                                      backgroundColor: '#F8FAFC',
                                      border: '1px solid #E6E9EE',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      minWidth: 0,
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                      <div
                                        title={u.url}
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#111827',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          minWidth: 0,
                                          flex: 1,
                                        }}
                                      >
                                        {u.url}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUrl(u.id)}
                                        style={{
                                          border: '1px solid #FECACA',
                                          background: '#FEF2F2',
                                          color: '#DC2626',
                                          cursor: 'pointer',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          flexShrink: 0,
                                          lineHeight: '1.2',
                                          transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => copyText(webhookUrl, `webhook-${u.id}`)}
                                        style={{
                                          flex: 1,
                                          height: '28px',
                                          borderRadius: '6px',
                                          border: '1px solid #E6E9EE',
                                          backgroundColor: '#FFFFFF',
                                          color: '#374151',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {copiedKey === `webhook-${u.id}` ? '✓ Copied' : 'Copy Webhook'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => copyText(`<form method="POST" action="${webhookUrl}">...</form>`, `code-${u.id}`)}
                                        style={{
                                          flex: 1,
                                          height: '28px',
                                          borderRadius: '6px',
                                          border: '1px solid #E6E9EE',
                                          backgroundColor: '#FFFFFF',
                                          color: '#374151',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {copiedKey === `code-${u.id}` ? '✓ Copied' : 'Copy HTML Form'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Controls */}
                      {source.slug === 'whatsapp' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowWhatsAppModal(true)}
                            style={{
                              width: '100%',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <MessageSquare size={14} />
                            <span>Open Multi-Agent WhatsApp Hub</span>
                          </button>
                        </div>
                      )}

                      {/* Generic Channels */}
                      {!isFacebook && !isExcel && !isForm && source.slug !== 'whatsapp' && (
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          {enabled ? 'Channel active — incoming leads sync to inbox automatically.' : 'Enable to start receiving leads from this channel.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------- TAB: ALL LEADS INBOX ------------------- */}
      {activeTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* High-Density Table Toolbar */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6E9EE',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                All Captured Leads
              </h2>
              <span className="num" style={{ fontSize: '12px', fontWeight: 700, backgroundColor: '#F3F4F6', color: '#4B5563', padding: '2px 8px', borderRadius: '999px' }}>
                {pagination.total} records
              </span>
            </div>

            {/* Filter Form */}
            <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, email, ID…"
                  style={{
                    height: '36px',
                    padding: '0 12px 0 32px',
                    fontSize: '13px',
                    border: '1px solid #E6E9EE',
                    borderRadius: '8px',
                    minWidth: '220px',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  fontSize: '13px',
                  border: '1px solid #E6E9EE',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  outline: 'none',
                }}
              >
                <option value="">All Sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Dynamic Campaign Filter */}
              <CampaignFilterDropdown
                value={campaignFilter}
                onChange={setCampaignFilter}
                campaigns={dynamicCampaigns}
                allLabel="All Campaigns"
                allValue=""
                height="36px"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  fontSize: '13px',
                  border: '1px solid #E6E9EE',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  outline: 'none',
                }}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>

              <button
                type="submit"
                style={{
                  height: '36px',
                  padding: '0 14px',
                  backgroundColor: '#F68713',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Filter
              </button>
            </form>
          </div>

          {/* Component 3.2 High-Density Data Table */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6E9EE',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6E9EE' }}>
                    {dynamicColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: 'Manrope, sans-serif',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={dynamicColumns.length} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
                        No leads found in this view.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead, idx) => (
                      <tr
                        key={lead.id}
                        style={{
                          backgroundColor: idx % 2 === 1 ? '#FBFDFE' : '#FFFFFF',
                          borderBottom: '1px solid #E6E9EE',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 1 ? '#FBFDFE' : '#FFFFFF'; }}
                      >
                        {dynamicColumns.map((col) => {
                          if (col.isLeadCode) {
                            return (
                              <td key={col.key} className="num" style={{ padding: '12px 16px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>
                                {lead.lead_code}
                              </td>
                            );
                          }
                          if (col.isDate) {
                            return (
                              <td key={col.key} className="num" style={{ padding: '12px 16px', color: '#6B7280', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {formatDate(lead.lead_date)}
                              </td>
                            );
                          }
                          if (col.isSalesperson) {
                            return (
                              <td key={col.key} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                {isAdmin ? (
                                  <select
                                    value={lead.assigned_to || ''}
                                    onChange={(e) => assignLead(lead.id, e.target.value)}
                                    disabled={busy}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      border: '1px solid #E6E9EE',
                                      backgroundColor: '#FFFFFF',
                                      color: '#374151',
                                      cursor: 'pointer',
                                    }}
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
                              <td key={col.key} style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {(lead.tags || []).length === 0 && <span style={{ color: '#9CA3AF' }}>—</span>}
                                  {(lead.tags || []).map((tag) => (
                                    <span
                                      key={tag}
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        backgroundColor: '#F3F4F6',
                                        color: '#374151',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            );
                          }
                          if (col.isStatus) {
                            return (
                              <td key={col.key} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                <select
                                  value={lead.status}
                                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                                  disabled={busy}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: '1px solid #E6E9EE',
                                    backgroundColor:
                                      lead.status === 'won'
                                        ? '#ECFDF5'
                                        : lead.status === 'lost'
                                          ? '#FEF2F2'
                                          : lead.status === 'contacted'
                                            ? '#E8F6FA'
                                            : '#FFF3E6',
                                    color:
                                      lead.status === 'won'
                                        ? '#059669'
                                        : lead.status === 'lost'
                                          ? '#DC2626'
                                          : lead.status === 'contacted'
                                            ? '#1D667C'
                                            : '#B65807',
                                    cursor: 'pointer',
                                  }}
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
                          if (col.key === 'campaign') {
                            const val = getLeadCellValue(lead, col.key);
                            if (val && val !== '—') {
                              return (
                                <td key={col.key} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#1E40AF',
                                      backgroundColor: '#EFF6FF',
                                      border: '1px solid #DBEAFE',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                    }}
                                  >
                                    <Target size={11} color="#2563EB" />
                                    <span>{val}</span>
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#065F46',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                  }}
                                >
                                  <MessageSquare size={11} color="#059669" />
                                  <span>Direct WhatsApp</span>
                                </span>
                              </td>
                            );
                          }
                          if (col.isActions) {
                            const isDeleting = deletingId === lead.id;
                            return (
                              <td key={col.key} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLead(lead)}
                                  disabled={isDeleting || busy}
                                  title="Permanently Delete Lead"
                                  style={{
                                    border: '1px solid #FECACA',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isDeleting || busy ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    opacity: isDeleting ? 0.6 : 1,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isDeleting && !busy) {
                                      e.currentTarget.style.backgroundColor = '#DC2626';
                                      e.currentTarget.style.color = '#FFFFFF';
                                      e.currentTarget.style.borderColor = '#DC2626';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isDeleting && !busy) {
                                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                                      e.currentTarget.style.color = '#DC2626';
                                      e.currentTarget.style.borderColor = '#FECACA';
                                    }
                                  }}
                                >
                                  {isDeleting ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </td>
                            );
                          }
                          return (
                            <td key={col.key} style={{ padding: '12px 16px', color: '#374151' }}>
                              {getLeadCellValue(lead, col.key)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderTop: '1px solid #E6E9EE',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              color: '#6B7280',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <span>
                Showing <strong className="num">{leads.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
                <strong className="num">{Math.min(page * pageSize, pagination.total)}</strong> of{' '}
                <strong className="num">{pagination.total}</strong> entries
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    loadLeads(1, newSize);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E6E9EE',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10 per page</option>
                  <option value={15}>15 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => loadLeads(page - 1, pageSize)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #E6E9EE',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: page <= 1 ? 0.4 : 1,
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="num" style={{ padding: '0 8px', fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                    {page} / {pagination.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= (pagination.totalPages || 1)}
                    onClick={() => loadLeads(page + 1, pageSize)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #E6E9EE',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      cursor: page >= (pagination.totalPages || 1) ? 'not-allowed' : 'pointer',
                      opacity: page >= (pagination.totalPages || 1) ? 0.4 : 1,
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Chat Modal */}
      <WhatsAppChatModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
      />
    </div>
  );
}
