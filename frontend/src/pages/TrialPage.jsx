import { useEffect, useState } from 'react';
import { companiesApi, plansApi, paymentsApi } from '../api/client';

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

export default function TrialPage() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Modal states
  const [activeCompany, setActiveCompany] = useState(null);
  const [modalType, setModalType] = useState(null); // 'invoice' | 'extend' | 'convert' | 'expire'

  // Form states inside modals
  const [extendDays, setExtendDays] = useState(7);
  const [payForm, setPayForm] = useState({
    amount: '',
    plan_id: '',
    billing_cycle: 'monthly',
    notes: '',
  });

  async function loadData() {
    try {
      setLoading(true);
      const [cRes, pRes] = await Promise.all([companiesApi.list(), plansApi.list()]);
      // Filter only companies on trial
      const trials = cRes.companies.filter((c) => c.status === 'trial');
      setCompanies(trials);
      setPlans(pRes.plans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const calculateDaysLeft = (endDateStr) => {
    if (!endDateStr) return '—';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    return `${diffDays} days left`;
  };

  const handleActionClick = (company, type) => {
    setActiveCompany(company);
    setModalType(type);
    if (type === 'extend') {
      setExtendDays(7);
    } else if (type === 'invoice' || type === 'convert') {
      const defaultPlan = plans[0]?.id || '';
      const defaultAmount = plans[0]?.price_monthly || '';
      setPayForm({
        amount: defaultAmount,
        plan_id: defaultPlan,
        billing_cycle: 'monthly',
        notes: type === 'convert' ? 'Converted from trial' : 'Manual invoice payment',
      });
    }
  };

  const closeModal = () => {
    setActiveCompany(null);
    setModalType(null);
  };

  const handlePlanChange = (planId) => {
    const selectedPlan = plans.find((p) => String(p.id) === String(planId));
    if (selectedPlan) {
      const isYearly = payForm.billing_cycle === 'yearly';
      setPayForm((prev) => ({
        ...prev,
        plan_id: planId,
        amount: isYearly ? selectedPlan.price_yearly : selectedPlan.price_monthly,
      }));
    } else {
      setPayForm((prev) => ({ ...prev, plan_id: planId }));
    }
  };

  const handleCycleChange = (cycle) => {
    const selectedPlan = plans.find((p) => String(p.id) === String(payForm.plan_id));
    if (selectedPlan) {
      const isYearly = cycle === 'yearly';
      setPayForm((prev) => ({
        ...prev,
        billing_cycle: cycle,
        amount: isYearly ? selectedPlan.price_yearly : selectedPlan.price_monthly,
      }));
    } else {
      setPayForm((prev) => ({ ...prev, billing_cycle: cycle }));
    }
  };

  const executeExtend = async () => {
    if (!activeCompany) return;
    setBusy(true);
    setError('');
    try {
      await companiesApi.extendTrial(activeCompany.id, extendDays);
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const executeExpire = async () => {
    if (!activeCompany) return;
    setBusy(true);
    setError('');
    try {
      await companiesApi.expireTrial(activeCompany.id);
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const executePayment = async (e) => {
    e.preventDefault();
    if (!activeCompany) return;
    setBusy(true);
    setError('');
    try {
      await paymentsApi.create({
        company_id: activeCompany.id,
        plan_id: payForm.plan_id ? Number(payForm.plan_id) : null,
        amount: Number(payForm.amount),
        billing_cycle: payForm.billing_cycle,
        status: 'paid',
        notes: payForm.notes,
      });
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Tenants</p>
          <h1>Trial Management</h1>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="gov-empty">Loading trials…</div>
      ) : (
        <div className="gov-table-stack" style={{ marginTop: '1rem' }}>
          <div className="gov-table-wrap">
            <div className="gov-table-scroll">
              <table className="gov-table">
                <thead style={{ backgroundColor: '#0f5132', color: '#ffffff' }}>
                  <tr>
                    <th style={{ color: '#ffffff' }}>COMPANY</th>
                    <th style={{ color: '#ffffff' }}>CONTACT</th>
                    <th style={{ color: '#ffffff' }}>PLAN</th>
                    <th style={{ color: '#ffffff' }}>TRIAL ENDS</th>
                    <th style={{ color: '#ffffff' }}>DAYS LEFT</th>
                    <th style={{ color: '#ffffff' }}>EXTENDED</th>
                    <th style={{ color: '#ffffff' }}>STATUS</th>
                    <th style={{ color: '#ffffff' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="gov-empty" style={{ textAlign: 'center', padding: '2rem' }}>
                        No companies are currently on trial.
                      </td>
                    </tr>
                  ) : (
                    companies.map((c, index) => {
                      const daysLeftText = calculateDaysLeft(c.subscription_end);
                      const isExpired = daysLeftText === 'Expired';
                      return (
                        <tr key={c.id} className={index % 2 === 1 ? 'gov-row-alt' : ''}>
                          <td className="gov-strong" style={{ color: '#0f5132' }}>{c.name}</td>
                          <td>
                            {c.admin_email || c.email}
                            {c.phone && <div className="gov-sub">{c.phone}</div>}
                          </td>
                          <td>Trial</td>
                          <td>{formatDate(c.subscription_end)}</td>
                          <td style={{ fontWeight: isExpired ? '600' : 'normal', color: isExpired ? '#d9534f' : 'inherit' }}>
                            {daysLeftText}
                          </td>
                          <td>{c.trial_extended_days ? `${c.trial_extended_days} days` : '0 days'}</td>
                          <td>
                            <span className="badge badge-trial" style={{ background: '#fcf8e3', color: '#8a6d3b', border: '1px solid #faebcc' }}>
                              TRIAL
                            </span>
                          </td>
                          <td>
                            <div className="gov-actions" style={{ gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="gov-btn"
                                style={{ backgroundColor: '#e2f0d9', color: '#385723', borderColor: '#c5e0b4' }}
                                onClick={() => handleActionClick(c, 'invoice')}
                              >
                                Invoice
                              </button>
                              <button
                                type="button"
                                className="gov-btn"
                                style={{ backgroundColor: '#f2f2f2', color: '#333', borderColor: '#ccc' }}
                                onClick={() => handleActionClick(c, 'extend')}
                              >
                                Extend
                              </button>
                              <button
                                type="button"
                                className="gov-btn"
                                style={{ backgroundColor: '#e2f0d9', color: '#385723', borderColor: '#c5e0b4' }}
                                onClick={() => handleActionClick(c, 'convert')}
                              >
                                Convert
                              </button>
                              <button
                                type="button"
                                className="gov-btn gov-btn-danger"
                                style={{ backgroundColor: '#fce4d6', color: '#c65911', borderColor: '#f8cbad' }}
                                onClick={() => handleActionClick(c, 'expire')}
                              >
                                Expire
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND TRIAL MODAL */}
      {modalType === 'extend' && activeCompany && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Extend Trial: {activeCompany.name}</h3>
            <p className="muted" style={{ marginBottom: '1.25rem' }}>
              Select the number of days to extend the trial for this company. The new end date will be calculated based on their current end date or today's date (whichever is later).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                Days to Extend
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="gov-btn"
                onClick={closeModal}
                disabled={busy}
                style={{ backgroundColor: '#f2f2f2', border: '1px solid #ccc' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={executeExtend}
                disabled={busy}
                style={{ background: 'var(--orange-600)', color: '#fff', border: 'none' }}
              >
                {busy ? 'Saving…' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPIRE TRIAL CONFIRMATION MODAL */}
      {modalType === 'expire' && activeCompany && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Expire Trial: {activeCompany.name}</h3>
            <p className="muted" style={{ marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Are you sure you want to expire the trial for **{activeCompany.name}**? This will set their subscription end date to yesterday, marking the trial as expired immediately.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="gov-btn"
                onClick={closeModal}
                disabled={busy}
                style={{ backgroundColor: '#f2f2f2', border: '1px solid #ccc' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-danger"
                onClick={executeExpire}
                disabled={busy}
                style={{ backgroundColor: '#d9534f', color: '#fff', border: 'none' }}
              >
                {busy ? 'Expiring…' : 'Expire Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE / CONVERT MODAL */}
      {(modalType === 'invoice' || modalType === 'convert') && activeCompany && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '550px' }}>
            <h3>
              {modalType === 'convert' ? 'Convert to Paid Subscription' : 'Record Manual Invoice / Payment'}
            </h3>
            <form onSubmit={executePayment} className="form-grid" style={{ display: 'grid', gap: '0.85rem' }}>
              <p className="muted" style={{ gridColumn: 'span 2', marginBottom: '0.5rem' }}>
                Recording a paid invoice will convert this company from **Trial** to **Active** status and assign them the chosen subscription plan.
              </p>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Subscription Plan
                <select
                  value={payForm.plan_id}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Billing Cycle
                <select
                  value={payForm.billing_cycle}
                  onChange={(e) => handleCycleChange(e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
                Amount Paid (INR)
                <input
                  type="number"
                  min="1"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
                Notes / Reference
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
                />
              </label>

              <div className="modal-actions" style={{ gridColumn: 'span 2', margin: 0 }}>
                <button
                  type="button"
                  className="gov-btn"
                  onClick={closeModal}
                  disabled={busy}
                  style={{ backgroundColor: '#f2f2f2', border: '1px solid #ccc' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={busy}
                  style={{ background: 'var(--orange-600)', color: '#fff', border: 'none' }}
                >
                  {busy ? 'Saving…' : 'Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
