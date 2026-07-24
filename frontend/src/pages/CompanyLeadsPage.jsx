import { useEffect, useMemo, useState } from 'react';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

export default function CompanyLeadsPage() {
  const { user } = useAuth('company');
  const isAdmin = user?.role === 'company_admin';

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
    Promise.all([loadSources(), loadTeam(), loadLeads(1), loadFacebookConnections()]).catch((err) =>
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

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
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

  async function handleExcelUpload(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    setUploadMsg('');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const result = await companyPortalApi.uploadLeads({
        file_base64: base64,
        file_name: file.name,
      });
      setUploadMsg(`${result.message}${result.errors?.length ? ` (${result.errors.length} row errors)` : ''}`);
      setActiveTab('inbox');
      await Promise.all([loadLeads(1), loadSources()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
                        <label className="lead-upload-box">
                          Upload Excel / CSV
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            disabled={busy || !enabled}
                            onChange={(e) => handleExcelUpload(e.target.files?.[0])}
                          />
                        </label>
                      )}

                      {isForm && (
                        <>
                          {capture.capture_page && (
                            <a
                              className={`primary-btn ${enabled ? '' : 'is-disabled-link'}`}
                              href={enabled ? capture.capture_page : undefined}
                              target="_blank"
                              rel="noreferrer"
                              aria-disabled={!enabled}
                              onClick={(e) => {
                                if (!enabled) e.preventDefault();
                              }}
                            >
                              Open capture page
                            </a>
                          )}

                          {capture.endpoints?.form_post && (
                            <>
                              <div className="lead-endpoint-row">
                                <div>
                                  <span>form_post</span>
                                  <code>{capture.endpoints.form_post}</code>
                                </div>
                                <button
                                  type="button"
                                  className="gov-btn"
                                  disabled={!enabled}
                                  onClick={() => copyText(capture.endpoints.form_post)}
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="lead-endpoint-row">
                                <div>
                                  <span>HTML form action</span>
                                  <code>{`<form method="POST" action="${capture.endpoints.form_post}">...</form>`}</code>
                                </div>
                                <button
                                  type="button"
                                  className="gov-btn"
                                  disabled={!enabled}
                                  onClick={() =>
                                    copyText(
                                      `<form method="POST" action="${capture.endpoints.form_post}">...</form>`
                                    )
                                  }
                                >
                                  Copy
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {!isFacebook && !isExcel && !isForm && (
                        <p className="muted lead-one-tap-note">
                          {enabled ? 'Connected — receiving leads when enabled.' : 'Enable to start receiving leads.'}
                        </p>
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
                  <th>Lead ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Campaign</th>
                  <th>Date</th>
                  <th>Assigned Salesperson</th>
                  <th>Tags</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={11} className="gov-empty">
                      No leads yet. Enable a source or create a lead manually.
                    </td>
                  </tr>
                )}
                {leads.map((lead, index) => (
                  <tr key={lead.id} className={index % 2 === 1 ? 'gov-row-alt' : ''}>
                    <td className="gov-strong">{lead.lead_code}</td>
                    <td>{lead.name}</td>
                    <td>{lead.phone || '—'}</td>
                    <td>{lead.email || '—'}</td>
                    <td>{lead.lead_company || '—'}</td>
                    <td>{lead.source_label || lead.source_name || '—'}</td>
                    <td>{lead.campaign || '—'}</td>
                    <td>{formatDate(lead.lead_date)}</td>
                    <td>
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
                    <td>
                      <div className="lead-tags">
                        {(lead.tags || []).length === 0 && '—'}
                        {(lead.tags || []).map((tag) => (
                          <span key={tag} className="lead-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
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
      )}    </div>
  );
}
