import { useEffect, useState } from 'react';
import { companiesApi, plansApi, paymentsApi } from '../api/client';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Calendar,
  X,
  Building2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

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
      const trials = (cRes.companies || []).filter((c) => c.status === 'trial');
      setCompanies(trials);
      setPlans(pRes.plans || []);
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
    <div className="sa-trials-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .sa-trials-page,
        .sa-trials-page * {
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
            <span>Conversions & Growth</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Active Evaluations</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Trial Management
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13.5px' }}>
            Monitor trial lifecycles, extend evaluation periods, and convert prospective organizations to paid subscriptions.
          </p>
        </div>

        <div style={{ fontSize: '13px', color: '#6B7280', backgroundColor: '#FFFFFF', padding: '8px 14px', borderRadius: '10px', border: '1px solid #E6E9EE' }}>
          Active Trials: <strong style={{ color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{companies.length}</strong>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#FEECEC', color: '#DC2626', border: '1px solid #FECACA', fontSize: '13.5px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* 2. High-Density Enterprise Table */}
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
          <table style={{ width: '100%', minWidth: '940px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
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
                <th style={{ padding: '12px 16px', minWidth: '180px' }}>COMPANY</th>
                <th style={{ padding: '12px 16px', minWidth: '180px' }}>CONTACT</th>
                <th style={{ padding: '12px 16px', minWidth: '100px' }}>PLAN</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>TRIAL ENDS</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>DAYS LEFT</th>
                <th style={{ padding: '12px 16px', minWidth: '100px' }}>EXTENDED</th>
                <th style={{ padding: '12px 16px', minWidth: '100px' }}>STATUS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '240px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#6B7280' }}>
                    Loading trial telemetry…
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                    No companies are currently on trial.
                  </td>
                </tr>
              ) : (
                companies.map((c, index) => {
                  const daysLeftText = calculateDaysLeft(c.subscription_end);
                  const isExpired = daysLeftText === 'Expired';
                  const isSoon = daysLeftText.includes('Expires today') || (parseInt(daysLeftText) <= 3 && !isExpired);

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: index % 2 === 1 ? '#FAFBFC' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{c.name}</div>
                        {c.industry && <div style={{ fontSize: '11px', color: '#6B7280' }}>{c.industry}</div>}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#111827' }}>{c.admin_email || c.email}</div>
                        {c.phone && <div style={{ fontSize: '11px', color: '#6B7280' }}>{c.phone}</div>}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6B7280' }}>
                        Trial
                      </td>

                      <td style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums', color: '#4B5563' }}>
                        {formatDate(c.subscription_end)}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            color: isExpired ? '#DC2626' : isSoon ? '#CA8A04' : '#111827',
                          }}
                        >
                          {daysLeftText}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums', color: '#4B5563' }}>
                        {c.trial_extended_days ? `${c.trial_extended_days} days` : '0 days'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#A16207',
                            backgroundColor: '#FEF7E1',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid #FDE68A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={10} />
                          TRIAL
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleActionClick(c, 'invoice')}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #E6E9EE',
                              backgroundColor: '#FFFFFF',
                              color: '#374151',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Invoice
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActionClick(c, 'extend')}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #D0D5DD',
                              backgroundColor: '#F9FAFB',
                              color: '#111827',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Extend
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActionClick(c, 'convert')}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Convert
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActionClick(c, 'expire')}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #FCA5A5',
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
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

      {/* 3. EXTEND TRIAL MODAL */}
      {modalType === 'extend' && activeCompany && (
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
            if (e.target === e.currentTarget && !busy) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Extend Trial: {activeCompany.name}
              </h3>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Select the number of days to extend this tenant's evaluation. The new expiry date will be calculated automatically.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="sa-field-label">Days to Extend</label>
              <select
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="sa-form-input"
              >
                <option value={7}>7 Days Extension</option>
                <option value={14}>14 Days Extension</option>
                <option value={30}>30 Days Extension</option>
                <option value={60}>60 Days Extension</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
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
                type="button"
                onClick={executeExtend}
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
                }}
              >
                {busy ? 'Extending…' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXPIRE TRIAL MODAL */}
      {modalType === 'expire' && activeCompany && (
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
            if (e.target === e.currentTarget && !busy) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                Expire Trial: {activeCompany.name}
              </h3>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to immediately expire the trial for <strong>{activeCompany.name}</strong>? Their portal access will be set to expired and reps will be prompted to upgrade.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
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
                type="button"
                onClick={executeExpire}
                disabled={busy}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Expiring…' : 'Expire Immediately'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. INVOICE / CONVERT MODAL */}
      {(modalType === 'invoice' || modalType === 'convert') && activeCompany && (
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
            if (e.target === e.currentTarget && !busy) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                {modalType === 'convert' ? 'Convert Trial to Paid Subscription' : 'Record Invoice Payment'}
              </h3>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
              Assign subscription plan and record settled transaction for <strong>{activeCompany.name}</strong>.
            </p>

            <form onSubmit={executePayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="sa-field-label">Target Plan *</label>
                  <select
                    value={payForm.plan_id}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    required
                    className="sa-form-input"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="sa-field-label">Billing Cycle *</label>
                  <select
                    value={payForm.billing_cycle}
                    onChange={(e) => handleCycleChange(e.target.value)}
                    className="sa-form-input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="sa-field-label">Total Amount (INR) *</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  placeholder="e.g. 4999"
                  className="sa-form-input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="sa-field-label">Transaction Reference / Notes</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="sa-form-input"
                  style={{ height: 'auto', padding: '10px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
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
                  }}
                >
                  {busy ? 'Processing…' : 'Record & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
