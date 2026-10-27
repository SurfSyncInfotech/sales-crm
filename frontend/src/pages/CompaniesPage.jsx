import { Fragment, useEffect, useMemo, useState } from 'react';
import { companiesApi, plansApi } from '../api/client';

const PAGE_SIZE = 10;

function money(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-IN');
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  industry: '',
  city: '',
  state: '',
  plan_id: '',
  billing_cycle: 'monthly',
  status: 'trial',
  admin_name: '',
  admin_email: '',
  admin_password: '',
  notes: '',
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  async function load() {
    const [c, p] = await Promise.all([companiesApi.list(), plansApi.list()]);
    setCompanies(c.companies);
    setPlans(p.plans);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.industry || '').toLowerCase().includes(q) ||
        (c.admin_email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
    );
  }, [companies, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await companiesApi.create({
        ...form,
        plan_id: form.plan_id ? Number(form.plan_id) : null,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openEditModal(company) {
    setEditingCompany(company);
    setEditForm({
      name: company.name || '',
      slug: company.slug || '',
      email: company.email || '',
      phone: company.phone || '',
      admin_name: company.admin_name || '',
      admin_email: company.admin_email || '',
      admin_password: '',
      industry: company.industry || '',
      city: company.city || '',
      state: company.state || '',
      country: company.country || 'India',
      plan_id: company.plan_id ? String(company.plan_id) : '',
      billing_cycle: company.billing_cycle || 'monthly',
      status: company.status || 'active',
      notes: company.notes || '',
    });
    setEditError('');
  }

  function closeEditModal() {
    setEditingCompany(null);
    setEditForm({});
    setEditError('');
  }

  function updateEditField(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingCompany) return;
    setEditBusy(true);
    setEditError('');
    try {
      await companiesApi.update(editingCompany.id, {
        ...editForm,
        plan_id: editForm.plan_id ? Number(editForm.plan_id) : null,
      });
      setSuccessMsg(`Company "${editForm.name}" updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      closeEditModal();
      await load();
      if (expandedId === editingCompany.id) {
        const data = await companiesApi.get(editingCompany.id);
        setDetail(data);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update company');
    } finally {
      setEditBusy(false);
    }
  }

  async function toggleActions(company) {
    if (expandedId === company.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(company.id);
    setError('');
    setBusy(true);
    try {
      const data = await companiesApi.get(company.id);
      setDetail(data);

    } catch (err) {
      setError(err.message);
      setExpandedId(null);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCompany(company) {
    const typed = window.prompt(
      `This permanently deletes "${company.name}" with all its users, leads and payments. This cannot be undone.\n\nType the company name to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== company.name) {
      setError('Company name did not match. Nothing was deleted.');
      return;
    }
    try {
      await companiesApi.remove(company.id);
      setExpandedId(null);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(companyId, status) {
    await companiesApi.setStatus(companyId, status);
    await load();
    if (expandedId === companyId) {
      const data = await companiesApi.get(companyId);
      setDetail(data);
    }
  }



  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Tenants</p>
          <h1>Companies</h1>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close form' : '+ Create company'}
        </button>
      </header>

      <div className="mobile-cta-row mobile-only">
        <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close form' : '+ Create company'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {successMsg && (
        <div className="alert" style={{ backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#BBF7D0' }}>
          {successMsg}
        </div>
      )}

      {showForm && (
        <form className="panel form-grid" onSubmit={handleCreate}>
          <h2>New company</h2>
          <label>
            Company name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>
          <label>
            Company email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </label>
          <label>
            Industry
            <input value={form.industry} onChange={(e) => updateField('industry', e.target.value)} />
          </label>
          <label>
            City
            <input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          </label>
          <label>
            State
            <input value={form.state} onChange={(e) => updateField('state', e.target.value)} />
          </label>
          <label>
            Plan
            <select
              value={form.plan_id}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({
                  ...f,
                  plan_id: val,
                  status: val === '' ? 'trial' : (f.status === 'trial' ? 'active' : f.status),
                }));
              }}
            >
              <option value="">Trial</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.price_monthly)}/mo
                </option>
              ))}
            </select>
          </label>
          <label>
            Billing cycle
            <select value={form.billing_cycle} onChange={(e) => updateField('billing_cycle', e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          {form.plan_id !== '' && (
            <label>
              Status
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          )}
          <label>
            Admin name
            <input value={form.admin_name} onChange={(e) => updateField('admin_name', e.target.value)} required />
          </label>
          <label>
            Admin email
            <input
              type="email"
              value={form.admin_email}
              onChange={(e) => updateField('admin_email', e.target.value)}
              required
            />
          </label>
          <label>
            Admin password
            <input
              type="password"
              value={form.admin_password}
              onChange={(e) => updateField('admin_password', e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label className="full">
            Notes
            <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} />
          </label>
          <div className="full form-actions">
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Creating…' : 'Create company'}
            </button>
          </div>
        </form>
      )}

      <div className="gov-table-stack">
        <div className="gov-table-toolbar">
          <div className="gov-table-title">Company Master List</div>
          <div className="gov-table-tools">
            <label>
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name / email / city / admin"
              />
            </label>
            <span>
              Total records: <strong>{filtered.length}</strong>
            </span>
          </div>
        </div>

        <div className="gov-table-wrap">
        <div className="gov-table-scroll">
          <table className="gov-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Company Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Plan</th>
                <th>Billing</th>
                <th>Status</th>
                <th>Team</th>
                <th>Ends On</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="gov-empty">
                    No company records found.
                  </td>
                </tr>
              )}

              {pageRows.map((c, index) => {
                const isOpen = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className={isOpen ? 'gov-row-open' : index % 2 === 1 ? 'gov-row-alt' : ''}>
                      <td>{pageStart + index + 1}</td>
                      <td className="gov-strong">{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone || '—'}</td>
                      <td>{c.industry || '—'}</td>
                      <td>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>{c.plan_name || 'Trial'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{c.billing_cycle || '—'}</td>
                      <td>
                        <span className={`badge badge-${c.status}`}>{c.status}</span>
                      </td>
                      <td>{c.salesperson_count}</td>
                      <td>{formatDate(c.subscription_end)}</td>
                      <td>
                        {c.admin_name || '—'}
                        {c.admin_email ? <small className="gov-sub">{c.admin_email}</small> : null}
                      </td>
                      <td>
                        <div className="gov-actions">
                          <button
                            type="button"
                            className="gov-btn"
                            onClick={() => toggleActions(c)}
                            disabled={busy && expandedId === c.id}
                          >
                            {isOpen ? 'Hide' : 'Manage'}
                          </button>
                          <button
                            type="button"
                            className="gov-btn"
                            style={{ color: '#2563EB', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', fontWeight: 700 }}
                            onClick={() => openEditModal(c)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="gov-btn gov-btn-primary"
                            disabled={!c.slug || ['suspended', 'cancelled'].includes(c.status)}
                            onClick={() => window.open(`/c/${c.slug}/login`, '_blank', 'noopener,noreferrer')}
                          >
                            Login
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="gov-detail-row">
                        <td colSpan={13}>
                          {!detail || detail.company.id !== c.id ? (
                            <p className="muted">Loading company details…</p>
                          ) : (
                            <div className="gov-detail-box">
                              <div className="gov-detail-grid">
                                <div>
                                  <span>Company</span>
                                  <strong>{detail.company.name}</strong>
                                </div>
                                <div>
                                  <span>Email</span>
                                  <strong>{detail.company.email}</strong>
                                </div>
                                <div>
                                  <span>Phone</span>
                                  <strong>{detail.company.phone || '—'}</strong>
                                </div>
                                <div>
                                  <span>Industry</span>
                                  <strong>{detail.company.industry || '—'}</strong>
                                </div>
                                <div>
                                  <span>Location</span>
                                  <strong>
                                    {[detail.company.city, detail.company.state, detail.company.country]
                                      .filter(Boolean)
                                      .join(', ') || '—'}
                                  </strong>
                                </div>
                                <div>
                                  <span>Plan</span>
                                  <strong>{detail.company.plan_name || 'Trial'}</strong>
                                </div>
                                <div>
                                  <span>Billing cycle</span>
                                  <strong>{detail.company.billing_cycle || '—'}</strong>
                                </div>
                                <div>
                                  <span>Subscription start</span>
                                  <strong>{formatDate(detail.company.subscription_start)}</strong>
                                </div>
                                <div>
                                  <span>Subscription end</span>
                                  <strong>{formatDate(detail.company.subscription_end)}</strong>
                                </div>
                                <div>
                                  <span>Status</span>
                                  <strong className={`badge badge-${detail.company.status}`}>
                                    {detail.company.status}
                                  </strong>
                                </div>
                                <div>
                                  <span>Login URL</span>
                                  <strong>
                                    <a
                                      href={`/c/${detail.company.slug}/login`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ textDecoration: 'underline' }}
                                    >
                                      /c/{detail.company.slug}/login
                                    </a>
                                  </strong>
                                </div>
                                <div>
                                  <span>Notes</span>
                                  <strong>{detail.company.notes || '—'}</strong>
                                </div>
                              </div>

                              <div className="gov-detail-section">
                                <h4>Status actions</h4>
                                <div className="gov-actions">
                                  <button
                                    type="button"
                                    className="gov-btn"
                                    style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderColor: '#2563EB', fontWeight: 700 }}
                                    onClick={() => openEditModal(detail.company)}
                                  >
                                    ✏️ Edit Company Details
                                  </button>
                                  <button
                                    type="button"
                                    className="gov-btn gov-btn-primary"
                                    disabled={
                                      !detail.company.slug ||
                                      ['suspended', 'cancelled'].includes(detail.company.status)
                                    }
                                    onClick={() =>
                                      window.open(
                                        `/c/${detail.company.slug}/login`,
                                        '_blank',
                                        'noopener,noreferrer'
                                      )
                                    }
                                  >
                                    Open company login
                                  </button>
                                  <button
                                    type="button"
                                    className="gov-btn"
                                    onClick={() => changeStatus(detail.company.id, 'active')}
                                  >
                                    Activate
                                  </button>
                                  <button
                                    type="button"
                                    className="gov-btn"
                                    onClick={() => changeStatus(detail.company.id, 'suspended')}
                                  >
                                    Suspend
                                  </button>
                                  <button
                                    type="button"
                                    className="gov-btn gov-btn-danger"
                                    onClick={() => changeStatus(detail.company.id, 'cancelled')}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="gov-btn gov-btn-danger"
                                    onClick={() => deleteCompany(detail.company)}
                                  >
                                    Delete permanently
                                  </button>
                                </div>
                              </div>



                              <div className="gov-detail-section">
                                <h4>Users</h4>
                                <table className="gov-mini-table">
                                  <thead>
                                    <tr>
                                      <th>Name</th>
                                      <th>Email</th>
                                      <th>Role</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.users.map((u) => (
                                      <tr key={u.id}>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>{u.role}</td>
                                        <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                                      </tr>
                                    ))}
                                    {detail.users.length === 0 && (
                                      <tr>
                                        <td colSpan={4}>No users yet.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="gov-pagination">
          <span>
            Showing {showingFrom} to {showingTo} of {filtered.length} entries
          </span>
          <div className="gov-page-btns">
            <button type="button" className="gov-btn" disabled={currentPage <= 1} onClick={() => setPage(1)}>
              First
            </button>
            <button
              type="button"
              className="gov-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 2)
              .reduce((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                acc.push(n);
                return acc;
              }, [])
              .map((n, idx) =>
                n === '…' ? (
                  <span key={`e-${idx}`} className="gov-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`gov-btn ${n === currentPage ? 'gov-btn-primary' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              type="button"
              className="gov-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
            <button
              type="button"
              className="gov-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Edit Company Modal */}
      {editingCompany && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !editBusy) closeEditModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Edit Company Details
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Updating company ID #{editingCompany.id}: {editingCompany.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editBusy}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {editError && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Company Name *
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => updateEditField('name', e.target.value)}
                    required
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Slug (Login Path) *
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => updateEditField('slug', e.target.value)}
                    required
                    placeholder="e.g. surfsync"
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <small style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600 }}>
                    Login URL: /c/{editForm.slug || 'slug'}/login
                  </small>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Official Email *
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => updateEditField('email', e.target.value)}
                    required
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Phone Number
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => updateEditField('phone', e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Industry
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => updateEditField('industry', e.target.value)}
                    placeholder="e.g. IT & Software Services"
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Status
                  <select
                    value={editForm.status}
                    onChange={(e) => updateEditField('status', e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  City
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => updateEditField('city', e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  State
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => updateEditField('state', e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Subscription Plan
                  <select
                    value={editForm.plan_id || ''}
                    onChange={(e) => updateEditField('plan_id', e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">No Plan / Trial</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({money(p.price_monthly)}/mo)
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Billing Cycle
                  <select
                    value={editForm.billing_cycle || 'monthly'}
                    onChange={(e) => updateEditField('billing_cycle', e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
              </div>

              {/* Administrator Account Section */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginTop: '0.25rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.75rem 0' }}>
                  Company Administrator Account
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Admin Full Name
                    <input
                      type="text"
                      value={editForm.admin_name || ''}
                      onChange={(e) => updateEditField('admin_name', e.target.value)}
                      placeholder="e.g. Kritika"
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Admin Login Email *
                    <input
                      type="email"
                      value={editForm.admin_email || ''}
                      onChange={(e) => updateEditField('admin_email', e.target.value)}
                      placeholder="e.g. info@surfsyncinfotech.in"
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Reset Admin Password (Optional)
                    <input
                      type="password"
                      value={editForm.admin_password || ''}
                      onChange={(e) => updateEditField('admin_password', e.target.value)}
                      placeholder="Leave blank to keep existing password"
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </label>
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Notes / Internal Remarks
                <textarea
                  value={editForm.notes}
                  onChange={(e) => updateEditField('notes', e.target.value)}
                  rows={2}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </label>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editBusy}
                  className="gov-btn"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBusy}
                  className="gov-btn gov-btn-primary"
                  style={{ padding: '0.55rem 1.5rem', backgroundColor: '#F68713', borderColor: '#F68713', color: '#FFFFFF', fontWeight: 700 }}
                >
                  {editBusy ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
