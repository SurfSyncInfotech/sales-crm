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
  Power,
  Calendar,
  ExternalLink,
  ChevronRight,
  Search,
  DollarSign,
  UserCheck,
} from 'lucide-react';

export default function AdminWabaPage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'accounts', 'recharges'
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

  async function handleCreateAccountSubmit(e) {
    e.preventDefault();
    setModalBusy(true);
    setActionErrorMsg('');
    try {
      const res = await adminWabaApi.createAccount(createForm);
      setShowCreateModal(false);
      setCreatedCredentials({
        username: res.username || res.data?.username,
        password: res.password || res.data?.password,
        apikey: res.apikey || res.data?.apikey,
      });
      setShowCredentialsModal(true);
      setActionSuccessMsg('WABA User Account created successfully!');
      loadData();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to create user account');
    } finally {
      setModalBusy(false);
    }
  }

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

  async function handleExpirySubmit(e) {
    e.preventDefault();
    if (!selectedAccount) return;
    setModalBusy(true);
    try {
      await adminWabaApi.updateExpiry({
        company_id: selectedAccount.company_id,
        waba_number: selectedAccount.waba_number,
        expiry_date: expiryDateInput,
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
        <RefreshCw size={20} className="spin" color="#07A96A" />
        <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600' }}>Loading WhatsApp Reseller Hub…</span>
      </div>
    );
  }

  return (
    <div className="sa-waba-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .sa-waba-page,
        .sa-waba-page * {
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

      {/* Notifications */}
      {actionSuccessMsg && (
        <div style={{ backgroundColor: '#E8F7EE', color: '#16A34A', padding: '12px 16px', borderRadius: '12px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
          <CheckCircle2 size={16} color="#16A34A" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div style={{ backgroundColor: '#FEECEC', color: '#DC2626', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
          <AlertCircle size={16} color="#DC2626" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

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
            <span>Meta Cloud Ecosystem</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>WABA Reseller Hub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
              WhatsApp Reseller Hub
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: hasResellerKey ? '#E8F7EE' : '#FEF7E1',
                color: hasResellerKey ? '#16A34A' : '#A16207',
                border: `1px solid ${hasResellerKey ? '#BBF7D0' : '#FDE68A'}`,
              }}
            >
              {hasResellerKey ? '● API Key Connected' : '○ Standalone / Custom Mode'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13.5px' }}>
            Provision client WABA accounts, manage message credits, update validity, and oversee Meta template migrations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '12px',
              border: '1px solid #D0D5DD',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

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
              height: '40px',
              padding: '0 18px',
              borderRadius: '12px',
              background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 2px rgba(3, 111, 69, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (4 Stats) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Active WABA Accounts</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <UserCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {stats?.activeAccounts || 0}
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500, marginLeft: '6px' }}>
              / {stats?.totalAccounts || 0} total
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>
            Live on Reseller Gateway
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Pending Requests</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF7E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A16207' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#A16207', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {stats?.pendingRequests || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            {stats?.paidRequests || 0} marked paid with Razorpay
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Total Recharges</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EDF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B6BE6' }}>
              <CreditCard size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0B6BE6', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            ₹{(stats?.totalRechargeAmount || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Across {stats?.totalRecharges || 0} top-up orders
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Suspended Accounts</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEECEC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <Power size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {stats?.suspendedAccounts || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Zero message dispatch capability
          </div>
        </div>
      </div>

      {/* 3. Segmented Navigation & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6E9EE', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#F1F3F6', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'requests', label: 'Activation Requests', count: requests.filter((r) => r.status === 'pending').length },
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
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeTab === tab.id ? '#111827' : '#6B7280',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 700 : 600,
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 2px rgba(16,24,40,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    backgroundColor: activeTab === tab.id ? '#E8F8F0' : '#E6E9EE',
                    color: activeTab === tab.id ? '#067C52' : '#6B7280',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search company, phone, ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 12px 0 34px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #D0D5DD',
              outline: 'none',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* 4. TAB 1: Incoming Service Requests */}
      {activeTab === 'requests' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E6E9EE', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.02)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', margin: 0 }}>
              Company WhatsApp Activation Requests
            </h3>
            <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
              Showing {filteredRequests.length} request(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
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
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>COMPANY</th>
                  <th style={{ padding: '12px 16px' }}>REQUESTED PLAN</th>
                  <th style={{ padding: '12px 16px' }}>PRICE</th>
                  <th style={{ padding: '12px 16px' }}>PAYMENT STATUS</th>
                  <th style={{ padding: '12px 16px' }}>RAZORPAY ID</th>
                  <th style={{ padding: '12px 16px' }}>REQUESTED ON</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                      No service requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{r.company_name || `Company #${r.company_id}`}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{r.company_email || r.company_phone}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#07A96A' }}>
                        {r.plan_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(r.price || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: r.payment_status === 'paid' ? '#E8F7EE' : '#FEF7E1',
                            color: r.payment_status === 'paid' ? '#16A34A' : '#A16207',
                            textTransform: 'uppercase',
                          }}
                        >
                          {r.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        {r.razorpay_payment_id || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: r.status === 'approved' ? '#E8F7EE' : '#FEF7E1',
                            color: r.status === 'approved' ? '#16A34A' : '#A16207',
                            textTransform: 'capitalize',
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {r.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateFromRequest(r)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <UserCheck size={13} />
                            <span>Provision Account</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700 }}>
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

      {/* 5. TAB 2: All WABA Accounts */}
      {activeTab === 'accounts' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E6E9EE', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.02)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', margin: 0 }}>
              Provisioned Client WABA Accounts
            </h3>
            <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
              Showing {filteredAccounts.length} account(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
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
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>COMPANY</th>
                  <th style={{ padding: '12px 16px' }}>WABA NUMBER</th>
                  <th style={{ padding: '12px 16px' }}>WABA ID</th>
                  <th style={{ padding: '12px 16px' }}>USERNAME</th>
                  <th style={{ padding: '12px 16px' }}>WALLET BALANCE</th>
                  <th style={{ padding: '12px 16px' }}>EXPIRY DATE</th>
                  <th style={{ padding: '12px 16px' }}>TYPE</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>MANAGEMENT</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                      No active WABA accounts yet. Click "Create User Account" to provision one.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{a.company_name || `Company #${a.company_id}`}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{a.plan_name}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                        +{a.waba_number}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                        {a.waba_id}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0B6BE6', fontSize: '12px' }}>
                        {a.username || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(a.wallet_balance || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                        {a.expiry_date ? String(a.expiry_date).slice(0, 10) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#6B7280', fontSize: '12px' }}>
                        {a.account_type || 'postpaid'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: a.status === 'active' ? '#E8F7EE' : '#FEECEC',
                            color: a.status === 'active' ? '#16A34A' : '#DC2626',
                            textTransform: 'capitalize',
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
                              backgroundColor: '#E8F7EE',
                              border: '1px solid #BBF7D0',
                              color: '#16A34A',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <DollarSign size={12} />
                            <span>Credit</span>
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
                              backgroundColor: '#F9FAFB',
                              border: '1px solid #D0D5DD',
                              color: '#374151',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Expiry
                          </button>

                          <button
                            type="button"
                            title="Migrate WhatsApp Templates"
                            onClick={() => handleMigrateTemplate(a)}
                            style={{
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#0B6BE6',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
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
                              backgroundColor: a.status === 'active' ? '#FEECEC' : '#E8F7EE',
                              border: `1px solid ${a.status === 'active' ? '#FECACA' : '#BBF7D0'}`,
                              color: a.status === 'active' ? '#DC2626' : '#16A34A',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Power size={12} />
                          </button>

                          {hasResellerKey && (
                            <button
                              type="button"
                              title="Check Live Pinbot API"
                              onClick={() => handleCheckLive(a)}
                              style={{
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E6E9EE',
                                color: '#6B7280',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <RefreshCw size={12} />
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

      {/* 6. TAB 3: Recharge Logs */}
      {activeTab === 'recharges' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E6E9EE', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.02)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', margin: 0 }}>
              Recharge & Balance Credit History
            </h3>
            <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
              Showing {recharges.length} transaction(s)
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
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
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>ID</th>
                  <th style={{ padding: '12px 16px' }}>COMPANY</th>
                  <th style={{ padding: '12px 16px' }}>AMOUNT</th>
                  <th style={{ padding: '12px 16px' }}>METHOD</th>
                  <th style={{ padding: '12px 16px' }}>TRANSACTION ID</th>
                  <th style={{ padding: '12px 16px' }}>DATE & TIME</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recharges.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                      No recharge transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recharges.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>#{r.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>
                        {r.company_name || `Company #${r.company_id}`}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(r.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'uppercase', color: '#6B7280', fontSize: '12px' }}>
                        {r.payment_method}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        {r.transaction_id || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(r.created_at).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: r.status === 'success' ? '#E8F7EE' : '#FEECEC',
                            color: r.status === 'success' ? '#16A34A' : '#DC2626',
                            textTransform: 'capitalize',
                          }}
                        >
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
            backgroundColor: 'rgba(11, 17, 24, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalBusy) setShowCreateModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Create WABA User Account (CDC Gateway)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6B7280' }}>
                  Registers tenant in Pinbot CDC, sets conversation tariffs, and assigns live credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="sa-field-label">Select CRM Company *</label>
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
                    className="sa-form-input"
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
                  <label className="sa-field-label">Plan Name</label>
                  <select
                    value={createForm.plan_name}
                    onChange={(e) => setCreateForm({ ...createForm, plan_name: e.target.value })}
                    className="sa-form-input"
                  >
                    <option value="Starter WABA">Starter WABA (₹1,499/mo)</option>
                    <option value="Growth WABA">Growth WABA (₹3,499/mo)</option>
                    <option value="Enterprise WABA">Enterprise WABA (₹7,999/mo)</option>
                  </select>
                </div>
              </div>

              {/* Personal & Billing Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="sa-field-label">First Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstname}
                    onChange={(e) => setCreateForm({ ...createForm, firstname: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
                <div>
                  <label className="sa-field-label">Last Name</label>
                  <input
                    type="text"
                    value={createForm.lastname}
                    onChange={(e) => setCreateForm({ ...createForm, lastname: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
                <div>
                  <label className="sa-field-label">Billing Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.billingname}
                    onChange={(e) => setCreateForm({ ...createForm, billingname: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="sa-field-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
                <div>
                  <label className="sa-field-label">Mobile Number (without +) *</label>
                  <input
                    type="text"
                    required
                    placeholder="919876543210"
                    value={createForm.mobileno}
                    onChange={(e) => setCreateForm({ ...createForm, mobileno: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
              </div>

              {/* WABA Gateway Specifics */}
              <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px', border: '1px solid #E6E9EE', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                  WhatsApp Business Account (WABA) Metadata
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="sa-field-label">WABA ID (from Meta) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12542351561"
                      value={createForm.waba_id}
                      onChange={(e) => setCreateForm({ ...createForm, waba_id: e.target.value })}
                      className="sa-form-input"
                    />
                  </div>
                  <div>
                    <label className="sa-field-label">WABA Phone Number (without +) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9177769654"
                      value={createForm.waba_number}
                      onChange={(e) => setCreateForm({ ...createForm, waba_number: e.target.value })}
                      className="sa-form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="sa-field-label">Account Type</label>
                    <select
                      value={createForm.account_type}
                      onChange={(e) => setCreateForm({ ...createForm, account_type: e.target.value })}
                      className="sa-form-input"
                    >
                      <option value="0">Postpaid (Default)</option>
                      <option value="1">Prepaid</option>
                    </select>
                  </div>
                  <div>
                    <label className="sa-field-label">Billing Type</label>
                    <select
                      value={createForm.billing_type}
                      onChange={(e) => setCreateForm({ ...createForm, billing_type: e.target.value })}
                      className="sa-form-input"
                    >
                      <option value="1">1 - Transaction based</option>
                      <option value="2">2 - Conversation based</option>
                    </select>
                  </div>
                  <div>
                    <label className="sa-field-label">Credit Limit (₹)</label>
                    <input
                      type="text"
                      value={createForm.credit_limit}
                      onChange={(e) => setCreateForm({ ...createForm, credit_limit: e.target.value })}
                      className="sa-form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="sa-field-label">Template Namespace</label>
                    <input
                      type="text"
                      placeholder="Optional, auto-generated if blank"
                      value={createForm.template_namespace}
                      onChange={(e) => setCreateForm({ ...createForm, template_namespace: e.target.value })}
                      className="sa-form-input"
                    />
                  </div>
                  <div>
                    <label className="sa-field-label">GST Number</label>
                    <input
                      type="text"
                      placeholder="Optional GSTIN"
                      value={createForm.gst_no}
                      onChange={(e) => setCreateForm({ ...createForm, gst_no: e.target.value })}
                      className="sa-form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Message Tariff Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label className="sa-field-label" style={{ fontSize: '11.5px' }}>Marketing (₹)</label>
                  <input
                    type="text"
                    value={createForm.marketing}
                    onChange={(e) => setCreateForm({ ...createForm, marketing: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
                <div>
                  <label className="sa-field-label" style={{ fontSize: '11.5px' }}>Utility (₹)</label>
                  <input
                    type="text"
                    value={createForm.utility}
                    onChange={(e) => setCreateForm({ ...createForm, utility: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
                <div>
                  <label className="sa-field-label" style={{ fontSize: '11.5px' }}>Auth (₹)</label>
                  <input
                    type="text"
                    value={createForm.authentication}
                    onChange={(e) => setCreateForm({ ...createForm, authentication: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
                <div>
                  <label className="sa-field-label" style={{ fontSize: '11.5px' }}>Service (₹)</label>
                  <input
                    type="text"
                    value={createForm.service}
                    onChange={(e) => setCreateForm({ ...createForm, service: e.target.value })}
                    className="sa-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  disabled={modalBusy}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: modalBusy ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {modalBusy ? <RefreshCw size={14} className="spin" /> : <UserCheck size={14} />}
                  <span>Provision Account</span>
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
            backgroundColor: 'rgba(11, 17, 24, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalBusy) setShowRechargeModal(false);
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
                Credit WABA Balance
              </h3>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
              Transfer wallet balance to <strong>{selectedAccount.company_name}</strong> (+{selectedAccount.waba_number}).
            </p>

            <form onSubmit={handleRechargeSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="sa-field-label">Select Quick Amount (INR)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(String(amt))}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '8px',
                        border: `1px solid ${rechargeAmount === String(amt) ? '#07A96A' : '#D0D5DD'}`,
                        backgroundColor: rechargeAmount === String(amt) ? '#E8F8F0' : '#FFFFFF',
                        color: rechargeAmount === String(amt) ? '#067C52' : '#374151',
                        fontWeight: 700,
                        fontSize: '13px',
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
                  className="sa-form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
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
                  disabled={modalBusy}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: modalBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {modalBusy ? 'Crediting…' : `Credit ₹${rechargeAmount}`}
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
            backgroundColor: 'rgba(11, 17, 24, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalBusy) setShowExpiryModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Update Account Expiry Date
              </h3>
              <button
                type="button"
                onClick={() => setShowExpiryModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
              Extend or update validity for <strong>{selectedAccount.company_name}</strong> (+{selectedAccount.waba_number}).
            </p>

            <form onSubmit={handleExpirySubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="sa-field-label">New Expiry Date</label>
                <input
                  type="date"
                  required
                  value={expiryDateInput}
                  onChange={(e) => setExpiryDateInput(e.target.value)}
                  className="sa-form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowExpiryModal(false)}
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
                  disabled={modalBusy}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: modalBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {modalBusy ? 'Updating…' : 'Save Expiry'}
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
            backgroundColor: 'rgba(11, 17, 24, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E8F7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#16A34A' }}>
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                WABA User Account Created!
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
                The account was provisioned in Pinbot CDC and linked to the tenant company.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px', border: '1px solid #E6E9EE', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Username</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <code style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>{createdCredentials.username}</code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCredentials.username, 'user')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                  >
                    {copiedKey === 'user' ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Temporary Password</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <code style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>{createdCredentials.password}</code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCredentials.password, 'pass')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                  >
                    {copiedKey === 'pass' ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>API Key</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <code style={{ fontSize: '12px', color: '#07A96A', wordBreak: 'break-all' }}>{createdCredentials.apikey}</code>
                  <button
                    type="button"
                    onClick={() => copyText(createdCredentials.apikey, 'apikey')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', marginLeft: '6px' }}
                  >
                    {copiedKey === 'apikey' ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                style={{
                  height: '38px',
                  padding: '0 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
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
