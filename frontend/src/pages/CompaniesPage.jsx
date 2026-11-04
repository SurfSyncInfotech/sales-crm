import { Fragment, useEffect, useMemo, useState } from 'react';
import { companiesApi, plansApi } from '../api/client';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  Calendar,
  Lock,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
      setSuccessMsg('Company created successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
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
      setSuccessMsg(`Company "${company.name}" deleted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
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
    <div className="sa-companies-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .sa-companies-page,
        .sa-companies-page * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .sa-field-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 6px;
        }
        .sa-form-input {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #D0D5DD;
          background-color: #FFFFFF;
          font-size: 13.5px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .sa-form-input:focus {
          border-color: #0B6BE6;
          box-shadow: 0 0 0 4px rgba(11, 107, 230, 0.15);
        }
      `}</style>

      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#07A96A',
              marginBottom: '4px',
            }}
          >
            <span>Tenant Management</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Enterprise Fleet</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Companies & Tenants
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13.5px' }}>
            Manage client tenant organizations, assign subscription plans, and manage administrator access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            background: showForm ? '#FFFFFF' : 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
            border: showForm ? '1px solid #D0D5DD' : 'none',
            color: showForm ? '#374151' : '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: showForm ? 'none' : '0 1px 2px rgba(3, 111, 69, 0.35)',
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          <span>{showForm ? 'Close form' : '+ Create Company'}</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#FEECEC', color: '#DC2626', border: '1px solid #FECACA', fontSize: '13.5px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#E8F7EE', color: '#16A34A', border: '1px solid #BBF7D0', fontSize: '13.5px', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {/* 2. Create Company Panel (when opened) */}
      {showForm && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '24px', boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #F3F4F6', paddingBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#E8F8F0', color: '#07A96A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>Create New Company Tenant</h3>
              <p style={{ fontSize: '12.5px', color: '#6B7280', margin: '2px 0 0 0' }}>Provision workspace, seed credentials, and configure quotas.</p>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="sa-field-label">Company Name *</label>
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="Acme Infotech Pvt Ltd" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Company Email *</label>
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required placeholder="contact@acme.com" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Phone</label>
                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+91 9876543210" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Industry</label>
                <input value={form.industry} onChange={(e) => updateField('industry', e.target.value)} placeholder="Real Estate, SaaS, Manufacturing" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">City</label>
                <input value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Mumbai, Bengaluru, Noida" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">State</label>
                <input value={form.state} onChange={(e) => updateField('state', e.target.value)} placeholder="Maharashtra, Karnataka, UP" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Subscription Plan</label>
                <select
                  value={form.plan_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({
                      ...f,
                      plan_id: val,
                      status: val === '' ? 'trial' : f.status === 'trial' ? 'active' : f.status,
                    }));
                  }}
                  className="sa-form-input"
                >
                  <option value="">Trial Plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {money(p.price_monthly)}/mo
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sa-field-label">Billing Cycle</label>
                <select value={form.billing_cycle} onChange={(e) => updateField('billing_cycle', e.target.value)} className="sa-form-input">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              {form.plan_id !== '' && (
                <div>
                  <label className="sa-field-label">Initial Status</label>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="sa-form-input">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              )}
              <div>
                <label className="sa-field-label">Primary Admin Name *</label>
                <input value={form.admin_name} onChange={(e) => updateField('admin_name', e.target.value)} required placeholder="Rohan Sharma" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Admin Email *</label>
                <input type="email" value={form.admin_email} onChange={(e) => updateField('admin_email', e.target.value)} required placeholder="admin@acme.com" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Admin Password *</label>
                <input type="password" value={form.admin_password} onChange={(e) => updateField('admin_password', e.target.value)} required minLength={6} placeholder="Min 6 characters" className="sa-form-input" />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="sa-field-label">Internal Operational Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
                placeholder="Client requirements, payment terms, or sales rep notes..."
                className="sa-form-input"
                style={{ height: 'auto', padding: '10px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
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
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(3, 111, 69, 0.35)',
                }}
              >
                {busy ? 'Creating Tenant…' : 'Create Company'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Toolbar & Search */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '14px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(16,24,40,0.02)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company name, email, city, admin..."
            style={{
              width: '100%',
              height: '36px',
              padding: '0 12px 0 34px',
              borderRadius: '8px',
              border: '1px solid #D0D5DD',
              fontSize: '13px',
              color: '#111827',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ fontSize: '13px', color: '#6B7280' }}>
          Total records: <strong style={{ color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{filtered.length}</strong>
        </div>
      </div>

      {/* 4. High-Density Enterprise Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(16,24,40,0.02)',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E6E9EE',
                  color: '#6B7280',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ padding: '12px 16px', width: '60px' }}>#</th>
                <th style={{ padding: '12px 16px', minWidth: '190px' }}>COMPANY</th>
                <th style={{ padding: '12px 16px', minWidth: '170px' }}>CONTACT</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>LOCATION</th>
                <th style={{ padding: '12px 16px', minWidth: '120px' }}>PLAN</th>
                <th style={{ padding: '12px 16px', minWidth: '90px' }}>CYCLE</th>
                <th style={{ padding: '12px 16px', minWidth: '100px' }}>STATUS</th>
                <th style={{ padding: '12px 16px', minWidth: '70px', textAlign: 'center' }}>SEATS</th>
                <th style={{ padding: '12px 16px', minWidth: '110px' }}>EXPIRY</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '220px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                    No company tenant records match your criteria.
                  </td>
                </tr>
              ) : (
                pageRows.map((c, index) => {
                  const isOpen = expandedId === c.id;
                  const initial = (c.name?.charAt(0) || 'C').toUpperCase();

                  return (
                    <Fragment key={c.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          backgroundColor: isOpen ? '#F9FAFB' : index % 2 === 1 ? '#FAFBFC' : '#FFFFFF',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>
                          {pageStart + index + 1}
                        </td>

                        {/* Company Name with Avatar */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                backgroundColor: '#E8F8F0',
                                color: '#07A96A',
                                fontWeight: 800,
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initial}
                            </span>
                            <div>
                              <div style={{ fontWeight: 800, color: '#111827' }}>{c.name}</div>
                              {c.industry && <div style={{ fontSize: '11px', color: '#6B7280' }}>{c.industry}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Contact info */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: '#111827' }}>{c.email}</div>
                          {c.phone && <div style={{ fontSize: '11px', color: '#6B7280' }}>{c.phone}</div>}
                        </td>

                        {/* Location */}
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                          {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>
                          {c.plan_name || 'Trial'}
                        </td>

                        {/* Billing Cycle */}
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#4B5563' }}>
                          {c.billing_cycle || '—'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor:
                                c.status === 'active'
                                  ? '#E8F7EE'
                                  : c.status === 'trial'
                                  ? '#FEF7E1'
                                  : c.status === 'suspended'
                                  ? '#FEECEC'
                                  : '#F1F3F6',
                              color:
                                c.status === 'active'
                                  ? '#16A34A'
                                  : c.status === 'trial'
                                  ? '#A16207'
                                  : c.status === 'suspended'
                                  ? '#DC2626'
                                  : '#4B5563',
                              textTransform: 'capitalize',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor:
                                  c.status === 'active'
                                    ? '#16A34A'
                                    : c.status === 'trial'
                                    ? '#A16207'
                                    : c.status === 'suspended'
                                    ? '#DC2626'
                                    : '#4B5563',
                              }}
                            />
                            {c.status}
                          </span>
                        </td>

                        {/* Team Count */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {c.salesperson_count}
                        </td>

                        {/* Subscription End */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: '#4B5563' }}>
                          {formatDate(c.subscription_end)}
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => toggleActions(c)}
                              disabled={busy && expandedId === c.id}
                              style={{
                                height: '30px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: '1px solid #D0D5DD',
                                backgroundColor: '#FFFFFF',
                                color: '#374151',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {isOpen ? 'Close' : 'Manage'}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              style={{
                                height: '30px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: '1px solid #BFDBFE',
                                backgroundColor: '#EFF6FF',
                                color: '#0B6BE6',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={!c.slug || ['suspended', 'cancelled'].includes(c.status)}
                              onClick={() => window.open(`/c/${c.slug}/login`, '_blank', 'noopener,noreferrer')}
                              style={{
                                height: '30px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: !c.slug || ['suspended', 'cancelled'].includes(c.status) ? 'not-allowed' : 'pointer',
                                opacity: !c.slug || ['suspended', 'cancelled'].includes(c.status) ? 0.4 : 1,
                              }}
                            >
                              Login
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Manage Accordion */}
                      {isOpen && (
                        <tr>
                          <td colSpan={10} style={{ padding: '16px 20px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E6E9EE' }}>
                            {!detail || detail.company.id !== c.id ? (
                              <div style={{ padding: '16px', color: '#6B7280', fontSize: '13px' }}>Loading company telemetry…</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Key Details Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E6E9EE' }}>
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Company</span>
                                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>{detail.company.name}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Email</span>
                                    <div style={{ fontSize: '13px', color: '#374151' }}>{detail.company.email}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Plan</span>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#07A96A' }}>{detail.company.plan_name || 'Trial'}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Subscription Start</span>
                                    <div style={{ fontSize: '13px', color: '#374151' }}>{formatDate(detail.company.subscription_start)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Subscription End</span>
                                    <div style={{ fontSize: '13px', color: '#374151' }}>{formatDate(detail.company.subscription_end)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Dedicated Login URL</span>
                                    <div>
                                      <a
                                        href={`/c/${detail.company.slug}/login`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#0B6BE6', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}
                                      >
                                        /c/{detail.company.slug}/login ↗
                                      </a>
                                    </div>
                                  </div>
                                </div>

                                {/* Status & Management Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(detail.company)}
                                    style={{
                                      height: '32px',
                                      padding: '0 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #BFDBFE',
                                      backgroundColor: '#EFF6FF',
                                      color: '#0B6BE6',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Edit Details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => changeStatus(detail.company.id, 'active')}
                                    style={{
                                      height: '32px',
                                      padding: '0 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #BBF7D0',
                                      backgroundColor: '#E8F7EE',
                                      color: '#16A34A',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Activate
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => changeStatus(detail.company.id, 'suspended')}
                                    style={{
                                      height: '32px',
                                      padding: '0 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #FECACA',
                                      backgroundColor: '#FEECEC',
                                      color: '#DC2626',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Suspend
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => changeStatus(detail.company.id, 'cancelled')}
                                    style={{
                                      height: '32px',
                                      padding: '0 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #D0D5DD',
                                      backgroundColor: '#FFFFFF',
                                      color: '#6B7280',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteCompany(detail.company)}
                                    style={{
                                      height: '32px',
                                      padding: '0 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #FCA5A5',
                                      backgroundColor: '#FFFFFF',
                                      color: '#DC2626',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      marginLeft: 'auto',
                                    }}
                                  >
                                    Delete Permanently
                                  </button>
                                </div>

                                {/* Active Users Table */}
                                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E6E9EE', overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #E6E9EE', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
                                    Registered Tenant Users ({detail.users.length})
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                                    <tbody>
                                      {detail.users.map((u) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                          <td style={{ padding: '8px 14px', fontWeight: 700, color: '#111827' }}>{u.name}</td>
                                          <td style={{ padding: '8px 14px', color: '#4B5563' }}>{u.email}</td>
                                          <td style={{ padding: '8px 14px', textTransform: 'capitalize', color: '#6B7280' }}>{u.role}</td>
                                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: u.is_active ? '#16A34A' : '#9CA3AF' }}>
                                              {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                      {detail.users.length === 0 && (
                                        <tr>
                                          <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF' }}>
                                            No user accounts registered under this tenant yet.
                                          </td>
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E6E9EE',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#6B7280' }}>
            Showing <strong style={{ color: '#111827' }}>{showingFrom}</strong> to <strong style={{ color: '#111827' }}>{showingTo}</strong> of{' '}
            <strong style={{ color: '#111827' }}>{filtered.length}</strong> records
          </div>

          <div style={{ display: 'inline-flex', gap: '4px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(1)}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #D0D5DD',
                backgroundColor: '#FFFFFF',
                color: currentPage <= 1 ? '#D1D5DB' : '#374151',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              First
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #D0D5DD',
                backgroundColor: '#FFFFFF',
                color: currentPage <= 1 ? '#D1D5DB' : '#374151',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Prev
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: '12px', fontWeight: 800, color: '#111827' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #D0D5DD',
                backgroundColor: '#FFFFFF',
                color: currentPage >= totalPages ? '#D1D5DB' : '#374151',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(totalPages)}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #D0D5DD',
                backgroundColor: '#FFFFFF',
                color: currentPage >= totalPages ? '#D1D5DB' : '#374151',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* 6. Edit Company Modal */}
      {editingCompany && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 17, 24, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !editBusy) closeEditModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E6E9EE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                  Edit Company Details
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6B7280' }}>
                  Updating company #{editingCompany.id}: {editingCompany.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editBusy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} style={{ padding: '24px' }}>
              {editError && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEECEC', color: '#DC2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="sa-field-label">Company Name *</label>
                  <input value={editForm.name} onChange={(e) => updateEditField('name', e.target.value)} required className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">Company Email *</label>
                  <input type="email" value={editForm.email} onChange={(e) => updateEditField('email', e.target.value)} required className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">Phone</label>
                  <input value={editForm.phone} onChange={(e) => updateEditField('phone', e.target.value)} className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">Industry</label>
                  <input value={editForm.industry} onChange={(e) => updateEditField('industry', e.target.value)} className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">City</label>
                  <input value={editForm.city} onChange={(e) => updateEditField('city', e.target.value)} className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">State</label>
                  <input value={editForm.state} onChange={(e) => updateEditField('state', e.target.value)} className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">Plan</label>
                  <select
                    value={editForm.plan_id}
                    onChange={(e) => updateEditField('plan_id', e.target.value)}
                    className="sa-form-input"
                  >
                    <option value="">Trial Plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {money(p.price_monthly)}/mo
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="sa-field-label">Billing Cycle</label>
                  <select
                    value={editForm.billing_cycle}
                    onChange={(e) => updateEditField('billing_cycle', e.target.value)}
                    className="sa-form-input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="sa-field-label">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => updateEditField('status', e.target.value)}
                    className="sa-form-input"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="sa-field-label">Admin Name</label>
                  <input value={editForm.admin_name} onChange={(e) => updateEditField('admin_name', e.target.value)} className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">Admin Email</label>
                  <input type="email" value={editForm.admin_email} onChange={(e) => updateEditField('admin_email', e.target.value)} className="sa-form-input" />
                </div>
                <div>
                  <label className="sa-field-label">New Password (leave blank to keep)</label>
                  <input
                    type="password"
                    value={editForm.admin_password}
                    onChange={(e) => updateEditField('admin_password', e.target.value)}
                    placeholder="Leave empty to keep unchanged"
                    className="sa-form-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="sa-field-label">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => updateEditField('notes', e.target.value)}
                  rows={2}
                  className="sa-form-input"
                  style={{ height: 'auto', padding: '10px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E6E9EE', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editBusy}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBusy}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: editBusy ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(3, 111, 69, 0.35)',
                  }}
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
