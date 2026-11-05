import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { salesApi } from '../api/client';
import { subscribeLiveSync } from '../services/liveSyncService';
import { useAuth } from '../context/AuthContext';
import QuotationRequestModal from '../components/QuotationRequestModal';
import WonDealModal from '../components/WonDealModal';
import LostDealModal from '../components/LostDealModal';
import WhatsAppChatModal from '../components/WhatsAppChatModal';
import StatusFeedbackModal from '../components/StatusFeedbackModal';
import CampaignFilterDropdown from '../components/CampaignFilterDropdown';
import {
  Users,
  Zap,
  Building2,
  Search,
  Filter,
  Plus,
  Phone,
  MessageSquare,
  Mail,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Clock,
  UserCheck,
  CheckCircle2,
  X,
  Calendar,
  Target,
} from 'lucide-react';

function getLocalDateStr(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeAgo(dateString) {
  if (!dateString) return 'Recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function SalesLeadsPage() {
  const { user } = useAuth('sales');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'all'; // 'all', 'pool', 'my'

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    all_leads: 0,
    available_leads: 0,
    my_total_leads: 0,
    contacted_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || 'all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  // Dynamic campaigns extracted from loaded leads
  const dynamicCampaigns = useMemo(() => {
    const set = new Set();
    let hasDirectWhatsApp = false;
    if (Array.isArray(leads)) {
      leads.forEach((l) => {
        if (l.campaign && String(l.campaign).trim()) {
          set.add(String(l.campaign).trim());
        } else {
          hasDirectWhatsApp = true;
        }
      });
    }
    const list = Array.from(set).sort();
    if (!list.includes('Direct WhatsApp')) {
      list.push('Direct WhatsApp');
    }
    return list;
  }, [leads]);

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addLeadData, setAddLeadData] = useState({
    name: '',
    phone: '',
    email: '',
    lead_company: '',
    source_name: 'Direct Entry',
    notes: '',
  });
  const [addingLead, setAddingLead] = useState(false);

  const [quoteModalLead, setQuoteModalLead] = useState(null);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [wonModalLead, setWonModalLead] = useState(null);
  const [submittingWon, setSubmittingWon] = useState(false);
  const [lostModalLead, setLostModalLead] = useState(null);
  const [submittingLost, setSubmittingLost] = useState(false);
  const [activeChatLead, setActiveChatLead] = useState(null);

  const [claimingId, setClaimingId] = useState(null);
  const [actionMenuLeadId, setActionMenuLeadId] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Mandatory Feedback on Stage Transition
  const [feedbackModalLead, setFeedbackModalLead] = useState(null);
  const [feedbackTargetStatus, setFeedbackTargetStatus] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [leadsData, statsData] = await Promise.all([
        salesApi.leads(currentTab === 'available' ? 'pool' : currentTab),
        salesApi.stats().catch(() => ({})),
      ]);
      setLeads(leadsData.leads || []);
      setStats({
        all_leads: statsData.all_leads || statsData.total_company_leads || leadsData.leads?.length || 0,
        available_leads: statsData.available_leads || statsData.pool_leads || 0,
        my_total_leads: statsData.my_total_leads || statsData.my_leads || 0,
        contacted_today: statsData.contacted_today || 0,
      });
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load leads data');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    setSelectedLeadIds([]);
    setActionMenuLeadId(null);

    // Universal live cross-tab & component sync
    const unsubscribe = subscribeLiveSync(() => {
      loadData(true);
    });

    // Background polling every 12 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 12000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [currentTab]);

  async function handleClaim(leadId) {
    setClaimingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Lead could not be claimed');
      loadData(true);
    } finally {
      setClaimingId(null);
    }
  }

  async function handleStatusChange(lead, newStatus) {
    setActionMenuLeadId(null);
    if (newStatus === 'quotation_requested') {
      setQuoteModalLead(lead);
      return;
    }
    if (newStatus === 'won') {
      setWonModalLead(lead);
      return;
    }
    if (newStatus === 'lost') {
      setLostModalLead(lead);
      return;
    }

    // Require feedback for all other status updates
    setFeedbackModalLead(lead);
    setFeedbackTargetStatus(newStatus);
  }

  async function handleFeedbackSubmit(payload) {
    if (!feedbackModalLead || !feedbackTargetStatus) return;
    setSubmittingFeedback(true);
    try {
      const feedbackText = typeof payload === 'string' ? payload : payload.feedback;
      const demoNotes = typeof payload === 'object' ? payload.demo_notes : undefined;
      await salesApi.updateStatus(feedbackModalLead.id, {
        status: feedbackTargetStatus,
        feedback: feedbackText,
        demo_notes: demoNotes || (feedbackTargetStatus === 'demo_requested' ? feedbackText : undefined),
      });
      setFeedbackModalLead(null);
      setFeedbackTargetStatus('');
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Failed to update status with feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function handleCreateLead(e) {
    e.preventDefault();
    if (!addLeadData.name || !addLeadData.phone) {
      alert('Please provide Name and Phone number');
      return;
    }
    setAddingLead(true);
    try {
      await salesApi.createLead(addLeadData);
      setShowAddLeadModal(false);
      setAddLeadData({ name: '', phone: '', email: '', lead_company: '', source_name: 'Direct Entry', notes: '' });
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Failed to add lead');
    } finally {
      setAddingLead(false);
    }
  }

  async function handleQuoteSubmit(modalData) {
    if (!quoteModalLead) return;
    setSubmittingQuote(true);
    try {
      await salesApi.updateStatus(quoteModalLead.id, modalData);
      setQuoteModalLead(null);
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Failed to submit quotation request');
    } finally {
      setSubmittingQuote(false);
    }
  }

  async function handleWonSubmit(modalData) {
    if (!wonModalLead) return;
    setSubmittingWon(true);
    try {
      await salesApi.updateStatus(wonModalLead.id, modalData);
      setWonModalLead(null);
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Failed to mark deal as won');
    } finally {
      setSubmittingWon(false);
    }
  }

  async function handleLostSubmit(modalData) {
    if (!lostModalLead) return;
    setSubmittingLost(true);
    try {
      await salesApi.updateStatus(lostModalLead.id, modalData);
      setLostModalLead(null);
      await loadData(true);
    } catch (err) {
      alert(err.message || 'Failed to mark deal as lost');
    } finally {
      setSubmittingLost(false);
    }
  }

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.lead_company && l.lead_company.toLowerCase().includes(q));

      const matchesStage = stageFilter === 'all' || l.status === stageFilter;
      const matchesSource =
        sourceFilter === 'all' ||
        (Boolean(l.source_name) && l.source_name.toLowerCase().includes((sourceFilter || '').toLowerCase()));
      const matchesCampaign =
        campaignFilter === 'all' ||
        (campaignFilter === 'Direct WhatsApp'
          ? (!l.campaign || !String(l.campaign).trim())
          : Boolean(l.campaign) && l.campaign.toLowerCase().trim() === campaignFilter.toLowerCase().trim());

      let matchesTime = true;
      if (timeFilter !== 'all') {
        const todayStr = getLocalDateStr(new Date());
        const leadCreatedStr = getLocalDateStr(l.created_at);
        const leadDateStr = getLocalDateStr(l.lead_date);
        const leadUpdatedStr = getLocalDateStr(l.updated_at);

        if (timeFilter === 'today') {
          matchesTime = leadCreatedStr === todayStr || leadDateStr === todayStr || leadUpdatedStr === todayStr;
        } else if (timeFilter === 'yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const yStr = getLocalDateStr(y);
          matchesTime = leadCreatedStr === yStr || leadDateStr === yStr || leadUpdatedStr === yStr;
        } else if (timeFilter === 'week') {
          const leadTime = new Date(l.updated_at || l.created_at || l.lead_date).getTime();
          matchesTime = Date.now() - leadTime <= 7 * 24 * 60 * 60 * 1000;
        } else if (timeFilter === 'month') {
          const leadTime = new Date(l.updated_at || l.created_at || l.lead_date).getTime();
          matchesTime = Date.now() - leadTime <= 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesStage && matchesSource && matchesCampaign && matchesTime;
    });
  }, [leads, search, stageFilter, sourceFilter, timeFilter, campaignFilter]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, sourceFilter, timeFilter, campaignFilter, currentTab]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page, pageSize]);

  // Export filtered leads to CSV
  function handleExportCSV() {
    if (!filteredLeads.length) {
      alert('No leads to export');
      return;
    }
    const headers = ['Lead ID', 'Name', 'Company', 'Phone', 'Email', 'Source', 'Stage', 'Deal Value', 'Ownership', 'Created At'];
    const rows = filteredLeads.map((l) => [
      l.id,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.lead_company || '').replace(/"/g, '""')}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.source_name || 'Website'}"`,
      `"${l.status}"`,
      `"${l.deal_value || ''}"`,
      `"${l.claimed_by ? l.claimed_by_name || 'Assigned' : 'Unclaimed'}"`,
      `"${l.created_at || l.lead_date || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${currentTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function toggleSelectAll() {
    if (selectedLeadIds.length === paginatedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(paginatedLeads.map((l) => l.id));
    }
  }

  function toggleSelectRow(id) {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  }

  // SurfSync Status Badge Matrix (Foundation 02, 2.3)
  function getStageBadgeConfig(status) {
    switch (status) {
      case 'won':
        return { bg: '#DCFCE7', color: '#166534', dot: '#16A34A', label: 'Won Deal' };
      case 'contacted':
        return { bg: '#E8F6FA', color: '#1D667C', dot: '#2A9CB8', label: 'Contacted' };
      case 'interested':
        return { bg: '#FEF3C7', color: '#92400E', dot: '#CA8A04', label: 'Interested' };
      case 'followup':
        return { bg: '#E0E7FF', color: '#3730A3', dot: '#6366F1', label: 'Follow-Up' };
      case 'demo_requested':
        return { bg: '#E0F2FE', color: '#0369A1', dot: '#0284C7', label: 'Demo Requested' };
      case 'quotation_requested':
        return { bg: '#FFF3E6', color: '#B65807', dot: '#F68713', label: 'Quote Requested' };
      case 'quotation_sent':
        return { bg: '#F3E8FF', color: '#6D28D9', dot: '#9333EA', label: 'Quote Sent' };
      case 'lost':
        return { bg: '#FEE2E2', color: '#991B1B', dot: '#DC2626', label: 'Lost' };
      case 'not_interested':
        return { bg: '#F1F3F6', color: '#4B5563', dot: '#9CA3AF', label: 'Not Interested' };
      default:
        return { bg: '#E8F6FA', color: '#1D667C', dot: '#2A9CB8', label: 'New Lead' };
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Lead Directory
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.86rem' }}>
            Central repository of prospective accounts, claim pool, and communication logs.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary-action"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowAddLeadModal(true)}
            className="btn-primary-action"
          >
            <Plus size={15} /> Add New Lead
          </button>
        </div>
      </div>

      {/* KPI Stat Widgets Matrix (Component 3.1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Total Accounts</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F1F3F6', color: '#4B5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {stats.all_leads}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: '0.4rem' }}>
            Total directory records
          </div>
        </div>

        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Available in Pool</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#2A9CB8', marginTop: '0.5rem', lineHeight: 1 }}>
            {stats.available_leads}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#1D667C', marginTop: '0.4rem', fontWeight: '600' }}>
            Unassigned opportunities
          </div>
        </div>

        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>My Claimed Leads</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FFF3E6', color: '#F68713', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#F68713', marginTop: '0.5rem', lineHeight: 1 }}>
            {stats.my_total_leads}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#B65807', marginTop: '0.4rem', fontWeight: '600' }}>
            Under your management
          </div>
        </div>

        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Contacted Today</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16A34A', marginTop: '0.5rem', lineHeight: 1 }}>
            {stats.contacted_today}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '0.4rem', fontWeight: '600' }}>
            Active touchpoints
          </div>
        </div>
      </div>

      {/* Segmented Controls (Tabs) & Filter Bar */}
      <div className="sales-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Top: Segmented Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #E6E9EE', paddingBottom: '0.85rem' }}>
          {/* Segmented Track */}
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              backgroundColor: '#F1F3F6',
              borderRadius: '8px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'all' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'all' ? '700' : '500',
                color: currentTab === 'all' ? '#111827' : '#6B7280',
                backgroundColor: currentTab === 'all' ? '#FFFFFF' : 'transparent',
                border: 'none',
                boxShadow: currentTab === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>All Leads</span>
              <span className="num" style={{ fontSize: '0.72rem', padding: '1px 5px', borderRadius: '999px', backgroundColor: currentTab === 'all' ? '#F1F3F6' : '#E5E7EB' }}>
                {stats.all_leads}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'pool' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'pool' || currentTab === 'available' ? '700' : '500',
                color: currentTab === 'pool' || currentTab === 'available' ? '#111827' : '#6B7280',
                backgroundColor: currentTab === 'pool' || currentTab === 'available' ? '#FFFFFF' : 'transparent',
                border: 'none',
                boxShadow: currentTab === 'pool' || currentTab === 'available' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Available to Claim</span>
              <span className="num" style={{ fontSize: '0.72rem', padding: '1px 5px', borderRadius: '999px', backgroundColor: '#E8F6FA', color: '#1D667C', fontWeight: '700' }}>
                {stats.available_leads}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'my' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: currentTab === 'my' ? '700' : '500',
                color: currentTab === 'my' ? '#111827' : '#6B7280',
                backgroundColor: currentTab === 'my' ? '#FFFFFF' : 'transparent',
                border: 'none',
                boxShadow: currentTab === 'my' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>My Claimed Leads</span>
              <span className="num" style={{ fontSize: '0.72rem', padding: '1px 5px', borderRadius: '999px', backgroundColor: '#FFF3E6', color: '#B65807', fontWeight: '700' }}>
                {stats.my_total_leads}
              </span>
            </button>
          </div>

          {/* Reset Filters button */}
          {(search || stageFilter !== 'all' || sourceFilter !== 'all' || timeFilter !== 'all' || campaignFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStageFilter('all');
                setSourceFilter('all');
                setTimeFilter('all');
                setCampaignFilter('all');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'none',
                border: 'none',
                color: '#DC2626',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Inputs Row (Foundation 02, 2.4) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, company..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 10px 7px 32px',
                borderRadius: '6px',
                border: '1px solid #E6E9EE',
                fontSize: '0.82rem',
                color: '#111827',
                outline: 'none',
              }}
            />
          </div>

          {/* Stage Dropdown */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #E6E9EE',
              fontSize: '0.82rem',
              color: '#111827',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="all">All Stages</option>
            <option value="new_pool">New / Pool</option>
            <option value="contacted">Contacted</option>
            <option value="demo_requested">Demo Requested</option>
            <option value="interested">Interested</option>
            <option value="followup">Follow-Up</option>
            <option value="quotation_requested">Quote Requested</option>
            <option value="quotation_sent">Quote Sent</option>
            <option value="won">Won Deals</option>
            <option value="lost">Lost Deals</option>
            <option value="not_interested">Not Interested</option>
          </select>

          {/* Source Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #E6E9EE',
              fontSize: '0.82rem',
              color: '#111827',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="linkedin">LinkedIn</option>
            <option value="google">Google Ads</option>
            <option value="facebook">Facebook</option>
            <option value="direct">Direct Entry</option>
            <option value="referral">Referral</option>
          </select>

          {/* Dynamic Campaign Filter */}
          <CampaignFilterDropdown
            value={campaignFilter}
            onChange={setCampaignFilter}
            campaigns={dynamicCampaigns}
            allLabel="All Campaigns"
            allValue="all"
            height="32px"
          />

          {/* Time Filter Dropdown */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #E6E9EE',
              fontSize: '0.82rem',
              color: '#111827',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Multi-Row Selection Action Bar (Component 3.2) */}
      {selectedLeadIds.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFF3E6',
            border: '1px solid #F68713',
            borderRadius: '8px',
            padding: '0.65rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B65807', fontSize: '0.84rem', fontWeight: '700' }}>
            <span>{selectedLeadIds.length} lead(s) selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary-action"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedLeadIds([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
              }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* High-Density Data Table (Component 3.2) */}
      <div className="surfsync-table-container">
        <table className="surfsync-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={paginatedLeads.length > 0 && selectedLeadIds.length === paginatedLeads.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Client / Contact</th>
              <th>Company</th>
              <th>Source</th>
              <th>Stage / Status</th>
              <th>Ownership</th>
              <th>Received</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#6B7280' }}>
                  Loading leads...
                </td>
              </tr>
            ) : paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                  <Users size={32} color="#D1D5DB" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>No leads found</p>
                  <small style={{ fontSize: '0.78rem' }}>Try clearing your filters or check a different tab.</small>
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => {
                const initials = lead.name ? lead.name.slice(0, 2).toUpperCase() : 'L';
                const isClaimedByMe = lead.claimed_by === user?.id;
                const isPool = !lead.claimed_by;
                const badge = getStageBadgeConfig(lead.status);

                return (
                  <tr key={lead.id} style={{ backgroundColor: selectedLeadIds.includes(lead.id) ? '#FFFDF8' : 'inherit' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleSelectRow(lead.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#E8F6FA',
                            color: '#1D667C',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.86rem' }}>
                            {lead.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#6B7280', marginTop: '2px' }}>
                            <span className="num">{lead.phone}</span>
                            {lead.email && <span>• {lead.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#374151', fontWeight: '500' }}>
                      {lead.lead_company || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                        <span
                          className="badge-status"
                          style={{
                            backgroundColor: '#F1F3F6',
                            color: '#374151',
                            fontSize: '0.68rem',
                          }}
                        >
                          {lead.source_name || 'Website'}
                        </span>
                        {lead.campaign ? (
                          <span
                            className="badge-status"
                            style={{
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #DBEAFE',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              maxWidth: '150px',
                            }}
                            title={`Campaign: ${lead.campaign}`}
                          >
                            <Target size={10} color="#2563EB" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.campaign}
                            </span>
                          </span>
                        ) : (
                          <span
                            className="badge-status"
                            style={{
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid #A7F3D0',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              maxWidth: '150px',
                            }}
                            title="Direct Inbound WhatsApp Lead"
                          >
                            <MessageSquare size={10} color="#059669" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Direct WhatsApp
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span
                          className="badge-status"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            fontSize: '0.7rem',
                            alignSelf: 'flex-start',
                          }}
                        >
                          <span className="badge-status-dot" style={{ backgroundColor: badge.dot }} />
                          {badge.label}
                        </span>
                        {lead.deal_value && (
                          <span className="num" style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: '700', paddingLeft: '4px' }}>
                            ₹{Number(lead.deal_value).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {lead.claimed_by ? (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: isClaimedByMe ? '#B65807' : '#4B5563',
                            fontWeight: isClaimedByMe ? '700' : '500',
                            backgroundColor: isClaimedByMe ? '#FFF3E6' : '#F1F3F6',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}
                        >
                          {isClaimedByMe ? 'Claimed by You' : lead.claimed_by_name || 'Assigned'}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: '#2A9CB8',
                            fontWeight: '700',
                            backgroundColor: '#E8F6FA',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}
                        >
                          Open Pool
                        </span>
                      )}
                    </td>
                    <td className="num" style={{ color: '#6B7280', fontSize: '0.78rem' }}>
                      {timeAgo(lead.created_at || lead.lead_date)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {isPool ? (
                          <button
                            type="button"
                            onClick={() => handleClaim(lead.id)}
                            disabled={claimingId === lead.id}
                            className="btn-primary-action"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                          >
                            <Zap size={12} />
                            {claimingId === lead.id ? 'Claiming…' : 'Claim'}
                          </button>
                        ) : (
                          <>
                            {/* Quick Stage Transition Dropdown */}
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #E6E9EE',
                                fontSize: '0.74rem',
                                color: '#111827',
                                backgroundColor: '#FFFFFF',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="contacted">Contacted</option>
                              <option value="demo_requested">Demo Requested</option>
                              <option value="interested">Interested</option>
                              <option value="followup">Follow-Up</option>
                              <option value="quotation_requested">Request Quote</option>
                              <option value="won">Mark Won</option>
                              <option value="lost">Mark Lost</option>
                              <option value="not_interested">Not Interested</option>
                            </select>

                            {/* Direct Call Button */}
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  backgroundColor: '#E8F6FA',
                                  color: '#2A9CB8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                }}
                                title="Call Client"
                              >
                                <Phone size={13} />
                              </a>
                            )}

                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => setActiveChatLead(lead)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.5rem 0', marginBottom: '3.5rem' }}>
        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
          Showing <strong className="num" style={{ color: '#111827' }}>{filteredLeads.length ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
          <strong className="num" style={{ color: '#111827' }}>{Math.min(page * pageSize, filteredLeads.length)}</strong> of{' '}
          <strong className="num" style={{ color: '#111827' }}>{filteredLeads.length}</strong> records
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #E6E9EE',
              fontSize: '0.78rem',
              color: '#111827',
              backgroundColor: '#FFFFFF',
              outline: 'none',
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-secondary-action"
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="num" style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0 6px', color: '#111827' }}>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-secondary-action"
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal (Component 3.3 Dialog Modal) */}
      {showAddLeadModal && (
        <div className="surfsync-modal-overlay">
          <div className="surfsync-modal-content">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#111827' }}>
                  Create New Lead
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.76rem', color: '#6B7280' }}>
                  Add a client directly into your assigned pipeline
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLeadModal(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={addLeadData.name}
                  onChange={(e) => setAddLeadData({ ...addLeadData, name: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={addLeadData.phone}
                    onChange={(e) => setAddLeadData({ ...addLeadData, phone: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={addLeadData.email}
                    onChange={(e) => setAddLeadData({ ...addLeadData, email: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={addLeadData.lead_company}
                    onChange={(e) => setAddLeadData({ ...addLeadData, lead_company: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    Lead Source
                  </label>
                  <select
                    value={addLeadData.source_name}
                    onChange={(e) => setAddLeadData({ ...addLeadData, source_name: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="Direct Entry">Direct Entry</option>
                    <option value="Website">Website</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Referral">Referral</option>
                    <option value="Phone Inquiry">Phone Inquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                  Initial Conversation Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of requirements..."
                  value={addLeadData.notes}
                  onChange={(e) => setAddLeadData({ ...addLeadData, notes: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #E6E9EE', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="btn-secondary-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLead}
                  className="btn-primary-action"
                >
                  {addingLead ? 'Saving…' : 'Save & Claim Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Feedback Modal */}
      {feedbackModalLead && (
        <StatusFeedbackModal
          lead={feedbackModalLead}
          targetStatus={feedbackTargetStatus}
          submitting={submittingFeedback}
          onSubmit={handleFeedbackSubmit}
          onClose={() => {
            setFeedbackModalLead(null);
            setFeedbackTargetStatus('');
          }}
        />
      )}

      {/* Quotation Request Modal */}
      {quoteModalLead && (
        <QuotationRequestModal
          lead={quoteModalLead}
          submitting={submittingQuote}
          onSubmit={handleQuoteSubmit}
          onClose={() => setQuoteModalLead(null)}
        />
      )}

      {/* Won Deal Modal */}
      {wonModalLead && (
        <WonDealModal
          lead={wonModalLead}
          submitting={submittingWon}
          onSubmit={handleWonSubmit}
          onClose={() => setWonModalLead(null)}
        />
      )}

      {/* Lost Deal Modal */}
      {lostModalLead && (
        <LostDealModal
          lead={lostModalLead}
          submitting={submittingLost}
          onSubmit={handleLostSubmit}
          onClose={() => setLostModalLead(null)}
        />
      )}

      {/* WhatsApp Chat Modal */}
      {activeChatLead && (
        <WhatsAppChatModal
          lead={activeChatLead}
          onClose={() => setActiveChatLead(null)}
        />
      )}
    </div>
  );
}
