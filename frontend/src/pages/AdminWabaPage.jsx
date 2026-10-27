import { useEffect, useMemo, useState } from 'react';
import { adminWabaApi, companiesApi } from '../api/client';
import {
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Plus,
  X,
  Copy,
  Check,
  Sliders,
  DollarSign,
  UserCheck,
  Power,
  Calendar,
  ExternalLink,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';

export default function AdminWabaPage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'accounts', 'create', 'recharges'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hasResellerKey, setHasResellerKey] = useState(false);
  const [requests, setRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications / feedback
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);

  // Form states for Create Account
  const [createForm, setCreateForm] = useState({
    company_id: '',
    request_id: null,
    firstname: '',
    lastname: '',
    billingname: '',
    email: '',
    mobileno: '',
    waba_id: '',
    waba_number: '',
    template_namespace: '',
    account_type: '0', // 0: postpaid, 1: prepaid
    billing_type: '1', // 1: transaction, 2: conversation
    credit_limit_assign: '0', // 0: unlimited, 1: limited
    credit_limit: '10000',
    gst_no: '',
    plan_name: 'Growth WABA',
    marketing: '0.20',
    utility: '0.20',
    authentication: '0.20',
    service: '0.20',
  });

  // Recharge Modal state
  const [rechargeAmount, setRechargeAmount] = useState('500');

  // Expiry Modal state
  const [expiryDateInput, setExpiryDateInput] = useState('');

  // Created credentials modal state
  const [createdCredentials, setCreatedCredentials] = useState(null);

  async function loadData() {
    setLoading(true);
    setActionErrorMsg('');
    try {
      const [overviewRes, reqRes, accRes, recRes, compRes] = await Promise.all([
        adminWabaApi.overview(),
        adminWabaApi.requests(),
        adminWabaApi.accounts(),
        adminWabaApi.recharges(),
        companiesApi.list(),
      ]);

      setStats(overviewRes.stats);
      setHasResellerKey(overviewRes.hasResellerKey);
      setRequests(reqRes.requests || []);
      setAccounts(accRes.accounts || []);
      setRecharges(recRes.recharges || []);
      setCompanies(compRes.companies || []);
    } catch (err) {
      console.error('Failed to load admin WABA data:', err);
      setActionErrorMsg(err.message || 'Failed to load WABA Reseller data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function copyText(val, keyName) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(''), 2000);
  }

  // Handle open create modal from a request
  function handleOpenCreateFromRequest(req) {
    const comp = companies.find((c) => c.id === req.company_id);
    setCreateForm({
      company_id: req.company_id,
      request_id: req.id,
      firstname: comp?.name?.split(' ')[0] || comp?.admin_name || 'Admin',
      lastname: comp?.name?.split(' ')[1] || 'User',
      billingname: comp?.name || 'Company Billing',
      email: comp?.email || comp?.admin_email || req.company_email || '',
      mobileno: comp?.phone || req.company_phone || '',
      waba_id: '',
      waba_number: comp?.phone ? comp.phone.replace(/\D/g, '') : '',
      template_namespace: '',
      account_type: '0',
      billing_type: '1',
      credit_limit_assign: '0',
      credit_limit: '10000',
      gst_no: '',
      plan_name: req.plan_name || 'Growth WABA',
      marketing: '0.20',
      utility: '0.20',
      authentication: '0.20',
      service: '0.20',
    });
    setShowCreateModal(true);
  }

  // Submit Create Account
  async function handleCreateAccountSubmit(e) {
    e.preventDefault();
    if (!createForm.company_id) {
      setActionErrorMsg('Please select a company');
      return;
    }
    if (!createForm.waba_id || !createForm.waba_number) {
      setActionErrorMsg('WABA ID and WABA Number are mandatory');
      return;
    }

    setModalBusy(true);
    setActionErrorMsg('');
    try {
      const payload = {
        ...createForm,
        product_details: {
          marketing: createForm.marketing || '0.20',
          utility: createForm.utility || '0.20',
          authentication: createForm.authentication || '0.20',
          service: createForm.service || '0.20',
          response: '0.20',
          feedback: '0.20',
          whatsappsetupcharges: '1000',
          botcharges: '1000',
          servercharges: '1000',
          activitycharges: '1000',
          othercharges: '1000',
          livechatagentcharges: '1000',
        },
      };

      const res = await adminWabaApi.createAccount(payload);
      setShowCreateModal(false);
      setCreatedCredentials(res.data);
      setShowCredentialsModal(true);
      setActionSuccessMsg('User account created and activated successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to create user account');
    } finally {
      setModalBusy(false);
    }
  }

  // Handle Balance Transfer / Recharge
  async function handleRechargeSubmit(e) {
    e.preventDefault();
    if (!selectedAccount) return;
    setModalBusy(true);
    try {
      await adminWabaApi.recharge({
        company_id: selectedAccount.company_id,
        waba_number: selectedAccount.waba_number,
        amount: Number(rechargeAmount),
      });
      setShowRechargeModal(false);
      setActionSuccessMsg(`Successfully credited ₹${rechargeAmount} to ${selectedAccount.company_name || selectedAccount.waba_number}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to recharge account');
    } finally {
      setModalBusy(false);
    }
  }

  // Handle Update Expiry
  async function handleExpirySubmit(e) {
    e.preventDefault();
    if (!selectedAccount || !expiryDateInput) return;
    setModalBusy(true);
    try {
      await adminWabaApi.updateExpiry({
        company_id: selectedAccount.company_id,
        waba_number: selectedAccount.waba_number,
        expirydate: expiryDateInput,
      });
      setShowExpiryModal(false);
      setActionSuccessMsg(`Expiry date updated to ${expiryDateInput}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to update expiry');
    } finally {
      setModalBusy(false);
    }
  }

  // Handle Status Toggle (Active / Suspend)
  async function handleToggleStatus(acc) {
    const nextStatus = acc.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = acc.status === 'active' 
      ? `Suspend WhatsApp account for ${acc.company_name || acc.waba_number}?` 
      : `Reactivate WhatsApp account for ${acc.company_name || acc.waba_number}?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminWabaApi.changeStatus({
        company_id: acc.company_id,
        waba_number: acc.waba_number,
        status: nextStatus === 'active' ? 1 : 0,
      });
      setActionSuccessMsg(`Account status changed to ${nextStatus}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to update status');
    }
  }

  // Live Sync
  async function handleCheckLive(acc) {
    try {
      setActionSuccessMsg(`Checking live status for ${acc.waba_number}…`);
      const res = await adminWabaApi.checkLive(acc.waba_number);
      alert(`Pinbot Live Data:\nBalance: ${JSON.stringify(res.balanceData || 'N/A')}\nExpiry: ${JSON.stringify(res.expiryData || 'N/A')}`);
      setActionSuccessMsg('');
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to fetch live Pinbot data');
    }
  }

  // Handle WhatsApp Template Migration
  async function handleMigrateTemplate(acc) {
    if (!acc.waba_id || !acc.waba_number) {
      alert('Account must have both WABA ID and WABA Phone Number for template migration');
      return;
    }
    if (!window.confirm(`Initiate official WhatsApp template migration for ${acc.company_name} (WABA ID: ${acc.waba_id})?`)) {
      return;
    }
    try {
      setActionSuccessMsg(`Migrating templates for +${acc.waba_number}…`);
      const res = await adminWabaApi.migrateTemplate({
        waba_id: acc.waba_id,
        waba_number: acc.waba_number,
      });
      setActionSuccessMsg(res.message || 'Template migration executed successfully');
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (err) {
      setActionErrorMsg(err.message || 'Template migration failed. Please ensure PINBOT_RESELLER_API_KEY and META_SYSTEM_ACCESS_TOKEN are set in .env');
    }
  }

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        r.company_name?.toLowerCase().includes(q) ||
        r.plan_name?.toLowerCase().includes(q) ||
        r.company_email?.toLowerCase().includes(q) ||
        r.razorpay_payment_id?.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) =>
        a.company_name?.toLowerCase().includes(q) ||
        a.waba_number?.includes(q) ||
        a.waba_id?.includes(q) ||
        a.username?.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '10px' }}>
        <RefreshCw size={20} className="spin" color="#0d9488" />
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Loading WhatsApp Reseller Hub…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Notifications */}
      {actionSuccessMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600' }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600' }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(6, 78, 59, 0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                WhatsApp Reseller Operations (CDC Hub)
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: hasResellerKey ? 'rgba(52, 211, 153, 0.25)' : 'rgba(251, 191, 36, 0.25)',
                  color: hasResellerKey ? '#6ee7b7' : '#fde68a',
                  border: `1px solid ${hasResellerKey ? '#34d399' : '#f59e0b'}`,
                }}
              >
                {hasResellerKey ? '● API Key Connected' : '○ Standalone / Custom Mode'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#a7f3d0' }}>
              Provision client WABA accounts, transfer balances, update expiries, and manage company WhatsApp integrations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setCreateForm({
                company_id: '',
                request_id: null,
                firstname: '',
                lastname: '',
                billingname: '',
                email: '',
                mobileno: '',
                waba_id: '',
                waba_number: '',
                template_namespace: '',
                account_type: '0',
                billing_type: '1',
                credit_limit_assign: '0',
                credit_limit: '10000',
                gst_no: '',
                plan_name: 'Growth WABA',
                marketing: '0.20',
                utility: '0.20',
                authentication: '0.20',
                service: '0.20',
              });
              setShowCreateModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <Plus size={16} />
            Create User Account
          </button>
          <button
            type="button"
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.25)',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>
            <span>Active WABA Accounts</span>
            <UserCheck size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
            {stats?.activeAccounts || 0}
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500', marginLeft: '6px' }}>
              / {stats?.totalAccounts || 0} total
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: '600' }}>Live on Reseller Gateway</div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>
            <span>Pending Requests</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
            {stats?.pendingRequests || 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: stats?.pendingRequests > 0 ? '#b45309' : '#64748b', fontWeight: '600' }}>
            {stats?.paidRequests || 0} marked paid with Razorpay
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>
            <span>Total Recharges</span>
            <CreditCard size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
            ₹{(stats?.totalRechargeAmount || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
            Across {stats?.totalRecharges || 0} top-up orders
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>
            <span>Suspended Accounts</span>
            <Power size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px 0' }}>
            {stats?.suspendedAccounts || 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
            Zero message delivery capability
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'requests', label: 'Incoming Requests', count: requests.filter((r) => r.status === 'pending').length },
            { id: 'accounts', label: 'All WABA Accounts', count: accounts.length },
            { id: 'recharges', label: 'Recharge Logs', count: recharges.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#0f172a' : '#f1f5f9',
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    color: activeTab === tab.id ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: '12px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search company, phone, ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.1rem',
              fontSize: '0.82rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* TAB 1: Incoming Service Requests */}
      {activeTab === 'requests' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Company WhatsApp Activation Requests
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Showing {filteredRequests.length} request(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Requested Plan</th>
                  <th>Price</th>
                  <th>Razorpay Status</th>
                  <th>Payment ID</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No service requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.company_name || `Company #${r.company_id}`}</strong>
                        <small style={{ display: 'block', color: '#64748b' }}>{r.company_email || r.company_phone}</small>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#047857' }}>{r.plan_name}</span>
                      </td>
                      <td>
                        <strong>₹{Number(r.price || 0).toLocaleString()}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.payment_status === 'paid' || r.payment_status === 'demo_verified'
                              ? 'badge-paid'
                              : 'badge-pending'
                          }`}
                        >
                          {r.payment_status}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.74rem', color: '#334155' }}>
                          {r.razorpay_payment_id || '—'}
                        </code>
                      </td>
                      <td>
                        <small>{new Date(r.created_at).toLocaleDateString('en-IN')}</small>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === 'approved' ? 'badge-active' : r.status === 'pending' ? 'badge-trial' : 'badge-suspended'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {r.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateFromRequest(r)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: '#059669',
                              color: '#fff',
                              border: 'none',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            <UserCheck size={14} />
                            Provision Account
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>
                            ✓ Account Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: All WABA Accounts */}
      {activeTab === 'accounts' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Provisioned Client WABA Accounts
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Showing {filteredAccounts.length} account(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>WABA Number</th>
                  <th>WABA ID</th>
                  <th>Username</th>
                  <th>Wallet Balance</th>
                  <th>Expiry Date</th>
                  <th>Billing / Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Management</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No active WABA accounts yet. Click "Create User Account" to provision one.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.company_name || `Company #${a.company_id}`}</strong>
                        <small style={{ display: 'block', color: '#64748b' }}>{a.plan_name}</small>
                      </td>
                      <td>
                        <strong>+{a.waba_number}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.74rem' }}>{a.waba_id}</code>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0f766e', fontWeight: '700' }}>
                          {a.username || '—'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                          ₹{Number(a.wallet_balance || 0).toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                          <Calendar size={13} color="#64748b" />
                          <span>{a.expiry_date ? String(a.expiry_date).slice(0, 10) : '—'}</span>
                        </div>
                      </td>
                      <td>
                        <small style={{ textTransform: 'capitalize' }}>
                          {a.account_type || 'postpaid'} ({a.billing_type || 'tx'})
                        </small>
                      </td>
                      <td>
                        <span className={`badge ${a.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            title="Credit / Transfer Balance"
                            onClick={() => {
                              setSelectedAccount(a);
                              setRechargeAmount('500');
                              setShowRechargeModal(true);
                            }}
                            style={{
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#065f46',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <DollarSign size={13} />
                            Credit
                          </button>

                          <button
                            type="button"
                            title="Update Expiry"
                            onClick={() => {
                              setSelectedAccount(a);
                              setExpiryDateInput(a.expiry_date ? String(a.expiry_date).slice(0, 10) : '');
                              setShowExpiryModal(true);
                            }}
                            style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Expiry
                          </button>

                          <button
                            type="button"
                            title="Migrate WhatsApp Templates (Meta/CDC)"
                            onClick={() => handleMigrateTemplate(a)}
                            style={{
                              backgroundColor: '#f0fdfa',
                              border: '1px solid #99f6e4',
                              color: '#0f766e',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Migrate
                          </button>

                          <button
                            type="button"
                            title={a.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                            onClick={() => handleToggleStatus(a)}
                            style={{
                              backgroundColor: a.status === 'active' ? '#fef2f2' : '#f0fdf4',
                              border: `1px solid ${a.status === 'active' ? '#fecaca' : '#bbf7d0'}`,
                              color: a.status === 'active' ? '#dc2626' : '#16a34a',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            <Power size={13} />
                          </button>

                          {hasResellerKey && (
                            <button
                              type="button"
                              title="Check Live Pinbot API"
                              onClick={() => handleCheckLive(a)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Recharge Logs */}
      {activeTab === 'recharges' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Recharge & Balance Credit History
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Showing last {recharges.length} transaction(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recharges.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No recharge transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recharges.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <strong>{r.company_name || `Company #${r.company_id}`}</strong>
                      </td>
                      <td>
                        <strong style={{ color: '#059669' }}>₹{Number(r.amount || 0).toLocaleString()}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748b' }}>
                          {r.payment_method}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.74rem' }}>{r.transaction_id || '—'}</code>
                      </td>
                      <td>
                        <small>{new Date(r.created_at).toLocaleString('en-IN')}</small>
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'success' ? 'badge-active' : 'badge-suspended'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Create User Account (CDC Panel) */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Create WABA User Account (CDC Reseller API)
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Registers the user in Pinbot CDC, sets message charges, and assigns live API credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Select CRM Company *
                  </label>
                  <select
                    value={createForm.company_id}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const c = companies.find((comp) => String(comp.id) === String(cId));
                      setCreateForm((prev) => ({
                        ...prev,
                        company_id: cId,
                        firstname: c?.name?.split(' ')[0] || prev.firstname,
                        lastname: c?.name?.split(' ')[1] || prev.lastname,
                        billingname: c?.name || prev.billingname,
                        email: c?.email || prev.email,
                        mobileno: c?.phone || prev.mobileno,
                      }));
                    }}
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Choose Company --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Plan Name
                  </label>
                  <select
                    value={createForm.plan_name}
                    onChange={(e) => setCreateForm({ ...createForm, plan_name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Starter WABA">Starter WABA (₹1,499/mo)</option>
                    <option value="Growth WABA">Growth WABA (₹3,499/mo)</option>
                    <option value="Enterprise WABA">Enterprise WABA (₹7,999/mo)</option>
                  </select>
                </div>
              </div>

              {/* Personal & Billing Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.firstname}
                    onChange={(e) => setCreateForm({ ...createForm, firstname: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={createForm.lastname}
                    onChange={(e) => setCreateForm({ ...createForm, lastname: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Billing Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.billingname}
                    onChange={(e) => setCreateForm({ ...createForm, billingname: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Mobile Number (without +) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="919876543210"
                    value={createForm.mobileno}
                    onChange={(e) => setCreateForm({ ...createForm, mobileno: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* WABA Gateway Specifics */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                  WhatsApp Business Account (WABA) Info
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      WABA ID (from Meta) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12542351561"
                      value={createForm.waba_id}
                      onChange={(e) => setCreateForm({ ...createForm, waba_id: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      WABA Phone Number (without +) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9177769654"
                      value={createForm.waba_number}
                      onChange={(e) => setCreateForm({ ...createForm, waba_number: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Account Type
                    </label>
                    <select
                      value={createForm.account_type}
                      onChange={(e) => setCreateForm({ ...createForm, account_type: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    >
                      <option value="0">Postpaid (Default)</option>
                      <option value="1">Prepaid</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Billing Type
                    </label>
                    <select
                      value={createForm.billing_type}
                      onChange={(e) => setCreateForm({ ...createForm, billing_type: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    >
                      <option value="1">1 - Transaction based</option>
                      <option value="2">2 - Conversation based</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Credit Limit (₹)
                    </label>
                    <input
                      type="text"
                      value={createForm.credit_limit}
                      onChange={(e) => setCreateForm({ ...createForm, credit_limit: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Template Namespace
                    </label>
                    <input
                      type="text"
                      placeholder="Optional, auto-generated if blank"
                      value={createForm.template_namespace}
                      onChange={(e) => setCreateForm({ ...createForm, template_namespace: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      GST Number
                    </label>
                    <input
                      type="text"
                      placeholder="Optional GSTIN"
                      value={createForm.gst_no}
                      onChange={(e) => setCreateForm({ ...createForm, gst_no: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Message Tariff Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                    Marketing (₹)
                  </label>
                  <input
                    type="text"
                    value={createForm.marketing}
                    onChange={(e) => setCreateForm({ ...createForm, marketing: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                    Utility (₹)
                  </label>
                  <input
                    type="text"
                    value={createForm.utility}
                    onChange={(e) => setCreateForm({ ...createForm, utility: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                    Auth (₹)
                  </label>
                  <input
                    type="text"
                    value={createForm.authentication}
                    onChange={(e) => setCreateForm({ ...createForm, authentication: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
                    Service (₹)
                  </label>
                  <input
                    type="text"
                    value={createForm.service}
                    onChange={(e) => setCreateForm({ ...createForm, service: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: modalBusy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {modalBusy ? <RefreshCw size={15} className="spin" /> : <UserCheck size={16} />}
                  Provision & Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Credit / Balance Transfer Modal */}
      {showRechargeModal && selectedAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Credit WABA Balance
              </h3>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0 }}>
              Transfer wallet balance to <strong>{selectedAccount.company_name}</strong> (+{selectedAccount.waba_number}).
            </p>

            <form onSubmit={handleRechargeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Select or Enter Amount (₹)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(String(amt))}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: `1px solid ${rechargeAmount === String(amt) ? '#059669' : '#cbd5e1'}`,
                        backgroundColor: rechargeAmount === String(amt) ? '#ecfdf5' : '#ffffff',
                        color: rechargeAmount === String(amt) ? '#065f46' : '#334155',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: modalBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {modalBusy ? 'Processing…' : `Credit ₹${rechargeAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Update Expiry Modal */}
      {showExpiryModal && selectedAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Update Account Expiry Date
              </h3>
              <button
                type="button"
                onClick={() => setShowExpiryModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0 }}>
              Extend or update validity for <strong>{selectedAccount.company_name}</strong> (+{selectedAccount.waba_number}).
            </p>

            <form onSubmit={handleExpirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  New Expiry Date
                </label>
                <input
                  type="date"
                  required
                  value={expiryDateInput}
                  onChange={(e) => setExpiryDateInput(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowExpiryModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: modalBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {modalBusy ? 'Updating…' : 'Save Expiry Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Newly Created Credentials Modal */}
      {showCredentialsModal && createdCredentials && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                <CheckCircle2 size={28} color="#059669" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                WABA User Account Created!
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0 0' }}>
                The user account was provisioned in Pinbot CDC and linked to the company portal.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Username</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <code style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>{createdCredentials.username}</code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCredentials.username, 'user')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    {copiedKey === 'user' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Temporary Password</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <code style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>{createdCredentials.password}</code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCredentials.password, 'pass')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    {copiedKey === 'pass' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>API Key</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <code style={{ fontSize: '0.78rem', color: '#0f766e', wordBreak: 'break-all' }}>{createdCredentials.apikey}</code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCredentials.apikey, 'apikey')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginLeft: '6px' }}
                  >
                    {copiedKey === 'apikey' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 2rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
