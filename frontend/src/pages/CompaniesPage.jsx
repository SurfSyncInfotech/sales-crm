import { Fragment, useEffect, useMemo, useState } from 'react';
import { companiesApi, plansApi, paymentsApi } from '../api/client';

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
  const [payForm, setPayForm] = useState({ amount: '', plan_id: '', billing_cycle: 'monthly', notes: '' });
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
      setPayForm({
        amount: '',
        plan_id: data.company.plan_id || '',
        billing_cycle: data.company.billing_cycle || 'monthly',
        notes: '',
      });
    } catch (err) {
      setError(err.message);
      setExpandedId(null);
    } finally {
      setBusy(false);
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

  async function recordPayment(e) {
    e.preventDefault();
    if (!detail?.company) return;
    setBusy(true);
    try {
      await paymentsApi.create({
        company_id: detail.company.id,
        plan_id: payForm.plan_id ? Number(payForm.plan_id) : detail.company.plan_id,
        amount: Number(payForm.amount),
        billing_cycle: payForm.billing_cycle,
        status: 'paid',
        notes: payForm.notes,
      });
      await load();
      const data = await companiesApi.get(detail.company.id);
      setDetail(data);
      setPayForm((f) => ({ ...f, amount: '', notes: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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
            <select value={form.plan_id} onChange={(e) => updateField('plan_id', e.target.value)}>
              <option value="">Select plan</option>
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
          <label>
            Status
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
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
                      <td>{c.plan_name || '—'}</td>
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
                                  <strong>{detail.company.plan_name || 'Unassigned'}</strong>
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
                                  <span>Slug / Portal</span>
                                  <strong>/c/{detail.company.slug}/login</strong>
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
                                </div>
                              </div>

                              <div className="gov-detail-section">
                                <h4>Record payment</h4>
                                <form className="gov-pay-form" onSubmit={recordPayment}>
                                  <label>
                                    Amount (INR)
                                    <input
                                      type="number"
                                      min="1"
                                      value={payForm.amount}
                                      onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                                      required
                                    />
                                  </label>
                                  <label>
                                    Plan
                                    <select
                                      value={payForm.plan_id}
                                      onChange={(e) => setPayForm((f) => ({ ...f, plan_id: e.target.value }))}
                                    >
                                      <option value="">Keep current</option>
                                      {plans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    Cycle
                                    <select
                                      value={payForm.billing_cycle}
                                      onChange={(e) =>
                                        setPayForm((f) => ({ ...f, billing_cycle: e.target.value }))
                                      }
                                    >
                                      <option value="monthly">Monthly</option>
                                      <option value="yearly">Yearly</option>
                                    </select>
                                  </label>
                                  <button type="submit" className="gov-btn gov-btn-primary" disabled={busy}>
                                    Mark paid
                                  </button>
                                </form>
                              </div>

                              <div className="gov-detail-split">
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

                                <div className="gov-detail-section">
                                  <h4>Payments</h4>
                                  <table className="gov-mini-table">
                                    <thead>
                                      <tr>
                                        <th>Invoice</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Paid at</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detail.payments.map((p) => (
                                        <tr key={p.id}>
                                          <td>{p.invoice_number}</td>
                                          <td>{money(p.amount)}</td>
                                          <td>{p.status}</td>
                                          <td>{formatDate(p.paid_at)}</td>
                                        </tr>
                                      ))}
                                      {detail.payments.length === 0 && (
                                        <tr>
                                          <td colSpan={4}>No payments yet.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
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
    </div>
  );
}
