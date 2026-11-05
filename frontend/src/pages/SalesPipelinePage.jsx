import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle,
  Zap,
  Phone,
  Star,
  RotateCw,
  FileText,
  Send,
  Trophy,
  XCircle,
  Search,
  MessageSquare,
  Mail,
  ChevronRight,
  ChevronLeft,
  Calendar,
  LayoutGrid,
  List,
  Plus,
  Lock,
  X,
  RotateCcw,
  Monitor,
  Ban,
  Target,
} from 'lucide-react';

const STAGE_CONFIG = [
  { key: 'new_pool', title: 'New Pool Leads', icon: <Zap size={14} />, color: '#2A9CB8', bg: '#E8F6FA', subtitle: 'Unassigned opportunities' },
  { key: 'claimed', title: 'Claimed', icon: <CheckCircle size={14} />, color: '#F68713', bg: '#FFF3E6', subtitle: 'Claimed by rep' },
  { key: 'contacted', title: 'Contacted', icon: <Phone size={14} />, color: '#38BDF8', bg: '#F0F9FF', subtitle: 'Initial call made' },
  { key: 'demo_requested', title: 'Demo Requested', icon: <Monitor size={14} />, color: '#6366F1', bg: '#EEF2FF', subtitle: 'Product demo & specs' },
  { key: 'interested', title: 'Interested', icon: <Star size={14} />, color: '#CA8A04', bg: '#FEF3C7', subtitle: 'Active cadence running' },
  { key: 'followup', title: 'Follow-Up', icon: <RotateCw size={14} />, color: '#2563EB', bg: '#EFF6FF', subtitle: 'Negotiations & reviews' },
  { key: 'quotation_requested', title: 'Quote Requested', icon: <FileText size={14} />, color: '#EA580C', bg: '#FFF7ED', subtitle: 'Waiting for admin quote' },
  { key: 'quotation_sent', title: 'Quote Sent', icon: <Send size={14} />, color: '#6D28D9', bg: '#F3E8FF', subtitle: 'Admin delivered quote' },
  { key: 'won', title: 'Won Deals', icon: <Trophy size={14} />, color: '#16A34A', bg: '#DCFCE7', subtitle: 'Successfully converted' },
  { key: 'lost', title: 'Lost Deals', icon: <XCircle size={14} />, color: '#DC2626', bg: '#FEE2E2', subtitle: 'Closed without deal' },
  { key: 'not_interested', title: 'Not Interested', icon: <Ban size={14} />, color: '#6B7280', bg: '#F3F4F6', subtitle: 'Disqualified / Dropped' },
];

function formatLeadDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString) {
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

function getLocalDateStr(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SalesPipelinePage() {
  const { user } = useAuth('sales');
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View switch: 'kanban' or 'list'
  const [viewMode, setViewMode] = useState('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [specificDate, setSpecificDate] = useState('');
  const [replyFilter, setReplyFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  // Dynamic campaigns extracted from loaded pipeline
  const dynamicCampaigns = useMemo(() => {
    const set = new Set();
    let hasDirectWhatsApp = false;
    Object.values(pipeline).forEach((stageLeads) => {
      if (Array.isArray(stageLeads)) {
        stageLeads.forEach((l) => {
          if (l.campaign && String(l.campaign).trim()) {
            set.add(String(l.campaign).trim());
          } else {
            hasDirectWhatsApp = true;
          }
        });
      }
    });
    const list = Array.from(set).sort();
    if (!list.includes('Direct WhatsApp')) {
      list.push('Direct WhatsApp');
    }
    return list;
  }, [pipeline]);

  // Modals
  const [activeChatLead, setActiveChatLead] = useState(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addLeadData, setAddLeadData] = useState({ name: '', phone: '', email: '', lead_company: '', source_name: 'Direct Entry', notes: '' });
  const [addingLead, setAddingLead] = useState(false);

  const [quoteModalLead, setQuoteModalLead] = useState(null);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [wonModalLead, setWonModalLead] = useState(null);
  const [submittingWon, setSubmittingWon] = useState(false);
  const [lostModalLead, setLostModalLead] = useState(null);
  const [submittingLost, setSubmittingLost] = useState(false);
  const [actingId, setActingId] = useState(null);

  // Mandatory Feedback on stage transition
  const [feedbackModalLead, setFeedbackModalLead] = useState(null);
  const [feedbackTargetStatus, setFeedbackTargetStatus] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  async function loadPipeline(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await salesApi.pipeline();
      setPipeline(data.pipeline || {});
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load pipeline');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadPipeline();

    // Universal cross-tab and live component sync
    const unsubscribe = subscribeLiveSync(() => {
      loadPipeline(true);
    });

    // Background polling every 15 seconds
    const interval = setInterval(() => {
      loadPipeline(true);
    }, 15000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  async function handleClaim(leadId) {
    setActingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadPipeline(true);
    } catch (err) {
      alert(err.message || 'Failed to claim lead');
      loadPipeline(true);
    } finally {
      setActingId(null);
    }
  }

  async function handleMoveStage(lead, newStatus) {
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

    // Mandatory Feedback on any stage update
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
      await loadPipeline(true);
    } catch (err) {
      alert(err.message || 'Failed to update stage with feedback');
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
      await loadPipeline(true);
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
      await loadPipeline(true);
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
      await loadPipeline(true);
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
      await loadPipeline(true);
    } catch (err) {
      alert(err.message || 'Failed to mark deal as lost');
    } finally {
      setSubmittingLost(false);
    }
  }

  // Filter leads based on Search and Date filter
  const filteredPipeline = useMemo(() => {
    const result = {};
    const q = search.toLowerCase().trim();

    STAGE_CONFIG.forEach((stage) => {
      const list = pipeline[stage.key] || [];
      result[stage.key] = list.filter((lead) => {
        const matchesSearch =
          !q ||
          (lead.name && lead.name.toLowerCase().includes(q)) ||
          (lead.phone && lead.phone.includes(q)) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.lead_company && lead.lead_company.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        if (campaignFilter !== 'all') {
          if (campaignFilter === 'Direct WhatsApp') {
            if (lead.campaign && String(lead.campaign).trim()) return false;
          } else {
            if (!lead.campaign || lead.campaign.trim().toLowerCase() !== campaignFilter.trim().toLowerCase()) {
              return false;
            }
          }
        }

        if (replyFilter === 'replied') {
          const hasReply = Boolean(lead.latest_wa_reply || (lead.unread_wa_count && lead.unread_wa_count > 0));
          if (!hasReply) return false;
        }

        if (replyFilter === 'transferred') {
          if (!lead.is_transferred) return false;
        }

        if (dateFilter === 'all') return true;

        const todayStr = getLocalDateStr(new Date());
        const leadCreatedStr = getLocalDateStr(lead.created_at);
        const leadDateStr = getLocalDateStr(lead.lead_date);
        const leadUpdatedStr = getLocalDateStr(lead.updated_at);

        if (dateFilter === 'custom' && specificDate) {
          return leadCreatedStr === specificDate || leadDateStr === specificDate || leadUpdatedStr === specificDate;
        }

        if (dateFilter === 'today') {
          return leadCreatedStr === todayStr || leadDateStr === todayStr || leadUpdatedStr === todayStr;
        }

        if (dateFilter === 'yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const yStr = getLocalDateStr(y);
          return leadCreatedStr === yStr || leadDateStr === yStr || leadUpdatedStr === yStr;
        }

        const leadTime = new Date(lead.updated_at || lead.created_at || lead.lead_date).getTime();
        if (dateFilter === 'this_week') {
          return Date.now() - leadTime <= 7 * 24 * 60 * 60 * 1000;
        }

        if (dateFilter === 'this_month') {
          return Date.now() - leadTime <= 30 * 24 * 60 * 60 * 1000;
        }

        return true;
      });
    });

    return result;
  }, [pipeline, search, dateFilter, specificDate, replyFilter, campaignFilter]);

  // Column limits for Kanban progressive loading
  const [columnLimits, setColumnLimits] = useState({});
  const getColLimit = (key) => columnLimits[key] || 15;
  const loadMoreForCol = (key) => {
    setColumnLimits((prev) => ({
      ...prev,
      [key]: (prev[key] || 15) + 15,
    }));
  };

  // Table pagination for List view
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(15);

  const allFlatLeads = useMemo(
    () => STAGE_CONFIG.flatMap((col) => filteredPipeline[col.key] || []),
    [filteredPipeline]
  );
  const totalListLeads = allFlatLeads.length;
  const totalListPages = Math.max(1, Math.ceil(totalListLeads / listLimit));
  const paginatedListLeads = useMemo(() => {
    const start = (listPage - 1) * listLimit;
    return allFlatLeads.slice(start, start + listLimit);
  }, [allFlatLeads, listPage, listLimit]);

  useEffect(() => {
    setListPage(1);
  }, [search, dateFilter, specificDate, replyFilter, campaignFilter]);

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px', fontFamily: 'Manrope, sans-serif' }}>
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Inbound Pipeline</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
            Enterprise Pipeline
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280', fontFamily: 'Manrope, sans-serif' }}>
            Track deal progression, sales rep velocity, pending admin quotation approvals, and closed won transactions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowAddLeadModal(true)}
            className="btn-primary-action"
          >
            <Plus size={15} /> Add Lead
          </button>
        </div>
      </div>

      {/* Unified Toolbar & Filters */}
      <div className="sales-card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Left: Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search leads, phone, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 28px 7px 32px',
                borderRadius: '6px',
                border: '1px solid #E6E9EE',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '8px', top: '9px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dynamic Campaign Filter */}
          <CampaignFilterDropdown
            value={campaignFilter}
            onChange={setCampaignFilter}
            campaigns={dynamicCampaigns}
            allLabel="All Campaigns"
            allValue="all"
            height="32px"
          />

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F9FAFB', border: '1px solid #E6E9EE', borderRadius: '6px', padding: '3px 8px' }}>
            <Calendar size={13} color="#6B7280" />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') setSpecificDate('');
              }}
              style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: '600', color: '#374151', backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">Past 7 Days</option>
              <option value="this_month">Past 30 Days</option>
              <option value="custom">Specific Date…</option>
            </select>
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                style={{ border: '1px solid #E6E9EE', borderRadius: '4px', padding: '2px 4px', fontSize: '0.76rem' }}
              />
            )}
          </div>

          {/* WhatsApp Reply Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: replyFilter === 'replied' ? '#DCFCE7' : '#F9FAFB', border: `1px solid ${replyFilter === 'replied' ? '#86EFAC' : '#E6E9EE'}`, borderRadius: '6px', padding: '3px 8px' }}>
            <MessageSquare size={13} color={replyFilter === 'replied' ? '#16A34A' : '#6B7280'} />
            <select
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: '600', color: replyFilter === 'replied' ? '#166534' : replyFilter === 'transferred' ? '#B45309' : '#374151', backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              <option value="all">All Leads</option>
              <option value="replied">🟢 WhatsApp Replied</option>
              <option value="transferred">🔄 Transferred Leads</option>
            </select>
          </div>

          {(search || dateFilter !== 'all' || replyFilter !== 'all' || specificDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDateFilter('all');
                setSpecificDate('');
                setReplyFilter('all');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#DC2626', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Right: View Switcher */}
        <div style={{ display: 'flex', backgroundColor: '#F1F3F6', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'kanban' ? '700' : '500',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: viewMode === 'kanban' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'kanban' ? '#111827' : '#6B7280',
              boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
            }}
          >
            <LayoutGrid size={13} /> Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'list' ? '700' : '500',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'list' ? '#111827' : '#6B7280',
              boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
            }}
          >
            <List size={13} /> List
          </button>
        </div>
      </div>

      {/* Horizontal Process Chevron Bar */}
      <div
        className="sales-card"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STAGE_CONFIG.length}, minmax(130px, 1fr))`,
          overflowX: 'auto',
          padding: 0,
        }}
      >
        {STAGE_CONFIG.map((stage, idx) => {
          const count = (filteredPipeline[stage.key] || []).length;
          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRight: idx < STAGE_CONFIG.length - 1 ? '1px solid #E6E9EE' : 'none',
                minWidth: '130px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                  <span style={{ color: stage.color }}>{stage.icon}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stage.title}
                  </span>
                </div>
                <div className="num" style={{ fontSize: '1.35rem', fontWeight: '800', color: '#111827', lineHeight: 1.15 }}>
                  {count}
                </div>
              </div>
              {idx < STAGE_CONFIG.length - 1 && (
                <ChevronRight size={12} color="#D1D5DB" style={{ flexShrink: 0, marginLeft: '4px' }} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* Kanban Board Mode */}
      {viewMode === 'kanban' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STAGE_CONFIG.length}, minmax(280px, 1fr))`,
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
          }}
        >
          {STAGE_CONFIG.map((col) => {
            const colLeads = filteredPipeline[col.key] || [];
            const limit = getColLimit(col.key);
            const visibleLeads = colLeads.slice(0, limit);
            const remainingCount = Math.max(0, colLeads.length - visibleLeads.length);

            return (
              <div
                key={col.key}
                style={{
                  backgroundColor: '#F9FAFB', // Track well surface-2
                  borderRadius: '12px',
                  border: '1px solid #E6E9EE',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: '280px',
                  maxHeight: 'calc(100vh - 300px)',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderBottom: '1px solid #E6E9EE',
                    backgroundColor: '#FFFFFF',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          color: col.color,
                          backgroundColor: col.bg,
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                        }}
                      >
                        {col.icon}
                      </span>
                      <strong style={{ fontSize: '0.82rem', color: '#111827' }}>{col.title}</strong>
                    </div>
                    <span
                      className="num"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        backgroundColor: col.bg,
                        color: col.color,
                        padding: '1px 7px',
                        borderRadius: '999px',
                      }}
                    >
                      {colLeads.length}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: '2px' }}>
                    {col.subtitle}
                  </div>
                </div>

                {/* Column Cards Container */}
                <div
                  style={{
                    padding: '0.65rem',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    flex: 1,
                  }}
                >
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.78rem' }}>
                      Loading…
                    </div>
                  ) : colLeads.length === 0 ? (
                    <div
                      style={{
                        padding: '1.5rem 0.5rem',
                        textAlign: 'center',
                        color: '#9CA3AF',
                        fontSize: '0.76rem',
                        border: '1px dashed #E6E9EE',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      No leads in this stage
                    </div>
                  ) : (
                    <>
                      {visibleLeads.map((lead) => {
                        const isClaimedByMe = lead.claimed_by === user?.id;
                        const isClaimedByOther = lead.is_locked_by_other || (lead.claimed_by && lead.claimed_by !== user?.id && user?.role !== 'company_admin');
                        const isUnclaimed = !lead.claimed_by || lead.claimed_by === 0;

                        return (
                          <div
                            key={lead.id}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '8px',
                              border: '1px solid #E6E9EE',
                              padding: '0.75rem',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                            }}
                          >
                            {/* Client Name & Company */}
                            <div>
                              <strong style={{ fontSize: '0.88rem', color: '#111827', lineHeight: 1.25, display: 'block' }}>
                                {lead.name}
                              </strong>
                              {lead.phone && (
                                <div style={{ fontSize: '0.75rem', color: '#0369A1', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={11} style={{ color: '#0284C7' }} />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                              {lead.lead_company && (
                                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '1px' }}>
                                  {lead.lead_company}
                                </div>
                              )}
                            </div>

                            {/* Prominent Lead Date & Time */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: '#475569',
                                  backgroundColor: '#F1F5F9',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  width: 'fit-content',
                                }}
                              >
                                <Calendar size={11} color="#64748B" />
                                <span>{formatLeadDate(lead.lead_date || lead.created_at) || 'Recently'}</span>
                              </div>

                              {Boolean(lead.is_transferred) && (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    color: '#92400E',
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #FCD34D',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                  title={`Transferred from ${lead.transferred_from_name || 'Previous Agent'}`}
                                >
                                  <span>🔄 Transferred</span>
                                  {lead.transferred_from_name && (
                                    <span style={{ opacity: 0.85 }}>({lead.transferred_from_name})</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Tags Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span
                                  className="badge-status"
                                  style={{
                                    backgroundColor: '#F1F3F6',
                                    color: '#374151',
                                    fontSize: '0.66rem',
                                    padding: '1px 6px',
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
                                      padding: '1px 6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      maxWidth: '140px',
                                    }}
                                    title={`Ad Campaign: ${lead.campaign}`}
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
                                      padding: '1px 6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      maxWidth: '140px',
                                    }}
                                    title="Direct WhatsApp Inbound Lead"
                                  >
                                    <MessageSquare size={10} color="#059669" style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      Direct WhatsApp
                                    </span>
                                  </span>
                                )}

                                {lead.deal_value && (
                                  <span className="num" style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16A34A' }}>
                                    ₹{Number(lead.deal_value).toLocaleString('en-IN')}
                                  </span>
                                )}

                                {col.key === 'interested' && lead.next_reminder_day && (
                                  <span className="badge-status" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.65rem', padding: '1px 5px' }}>
                                    Day {lead.next_reminder_day}
                                  </span>
                                )}
                              </div>

                              <span className="num" style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                                {formatRelativeTime(lead.created_at || lead.lead_date)}
                              </span>
                            </div>

                            {/* Demo Requirements Snippet or Link */}
                            {lead.demo_notes && (
                              <div style={{ fontSize: '0.7rem', color: '#1D667C', backgroundColor: '#E8F6FA', padding: '3px 6px', borderRadius: '4px' }}>
                                <strong>Demo:</strong> {lead.demo_notes.slice(0, 60)}{lead.demo_notes.length > 60 ? '…' : ''}
                              </div>
                            )}

                            {/* WhatsApp Reply Snippet */}
                            {lead.latest_wa_reply && (
                              <div
                                onClick={() => setActiveChatLead(lead)}
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#166534',
                                  backgroundColor: '#DCFCE7',
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>🟢</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  "{lead.latest_wa_reply}"
                                </span>
                              </div>
                            )}

                            {/* Lock chip if claimed by other */}
                            {isClaimedByOther && (
                              <div style={{ fontSize: '0.68rem', color: '#6B7280', backgroundColor: '#F1F3F6', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Lock size={10} /> Locked by {lead.claimed_by_name || 'rep'}
                              </div>
                            )}

                            {/* Card Action Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', borderTop: '1px solid #F1F3F6', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {lead.phone && !isClaimedByOther && (
                                  <>
                                    <a
                                      href={`tel:${lead.phone}`}
                                      style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                                      title="Call"
                                    >
                                      <Phone size={11} />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setActiveChatLead(lead)}
                                      style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#16A34A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                      title="WhatsApp"
                                    >
                                      <MessageSquare size={11} />
                                    </button>
                                  </>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isUnclaimed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleClaim(lead.id)}
                                    disabled={actingId === lead.id}
                                    className="btn-primary-action"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                  >
                                    <Zap size={10} /> Claim
                                  </button>
                                ) : isClaimedByOther ? (
                                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Locked</span>
                                ) : lead.status === 'quotation_sent' ? (
                                  <div style={{ display: 'inline-flex', gap: '3px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setQuoteModalLead(lead)}
                                      className="btn-secondary-action"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}
                                    >
                                      Re-Quote
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setWonModalLead(lead)}
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                      Won
                                    </button>
                                  </div>
                                ) : lead.status === 'won' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: '800' }}>
                                      ✓ Won
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => navigate('/sales/invoices')}
                                      style={{
                                        padding: '2px 7px',
                                        fontSize: '0.68rem',
                                        backgroundColor: '#FFF3E6',
                                        color: '#F68713',
                                        border: '1px solid #FED7AA',
                                        borderRadius: '4px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      + Invoice
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) handleMoveStage(lead, e.target.value);
                                      }}
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        borderRadius: '4px',
                                        border: '1px solid #E6E9EE',
                                        backgroundColor: '#FFFFFF',
                                        color: '#111827',
                                        cursor: 'pointer',
                                        outline: 'none',
                                      }}
                                    >
                                      <option value="" disabled>Move ▾</option>
                                      {lead.status !== 'contacted' && <option value="contacted">Contacted</option>}
                                      {lead.status !== 'demo_requested' && <option value="demo_requested">Demo Requested</option>}
                                      {lead.status !== 'interested' && <option value="interested">Interested</option>}
                                      {lead.status !== 'followup' && <option value="followup">Follow-Up</option>}
                                      {lead.status !== 'quotation_requested' && <option value="quotation_requested">Request Quote</option>}
                                      {lead.status !== 'won' && <option value="won">Mark Won</option>}
                                      {lead.status !== 'lost' && <option value="lost">Mark Lost</option>}
                                      {lead.status !== 'not_interested' && <option value="not_interested">Not Interested</option>}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {remainingCount > 0 && (
                        <button
                          type="button"
                          onClick={() => loadMoreForCol(col.key)}
                          className="btn-secondary-action"
                          style={{ width: '100%', padding: '0.4rem', fontSize: '0.72rem' }}
                        >
                          + {remainingCount} More
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density List View (Component 3.2) */
        <div className="surfsync-table-container">
          <table className="surfsync-table">
            <thead>
              <tr>
                <th>Client / Contact</th>
                <th>Company</th>
                <th>Source</th>
                <th>Stage</th>
                <th>Deal Value</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {totalListLeads === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF' }}>
                    No leads found matching current filter.
                  </td>
                </tr>
              ) : (
                paginatedListLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#111827' }}>{lead.name}</span>
                        {Boolean(lead.is_transferred) && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: '#92400E',
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FCD34D',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                            title={`Transferred from ${lead.transferred_from_name || 'Previous Agent'}`}
                          >
                            🔄 Transferred
                          </span>
                        )}
                      </div>
                      <div className="num" style={{ fontSize: '0.74rem', color: '#6B7280' }}>{lead.phone}</div>
                    </td>
                    <td style={{ color: '#4B5563' }}>{lead.lead_company || '—'}</td>
                    <td>
                      <span className="badge-status" style={{ backgroundColor: '#F1F3F6', color: '#374151', fontSize: '0.68rem' }}>
                        {lead.source_name || 'Website'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-status" style={{ backgroundColor: '#E8F6FA', color: '#1D667C', fontSize: '0.7rem' }}>
                        {lead.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="num" style={{ fontWeight: '700', color: lead.deal_value ? '#16A34A' : '#9CA3AF' }}>
                      {lead.deal_value ? `₹${Number(lead.deal_value).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="num" style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                      {formatRelativeTime(lead.created_at || lead.lead_date)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                            <Phone size={12} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveChatLead(lead)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#16A34A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <MessageSquare size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="surfsync-modal-overlay">
          <div className="surfsync-modal-content">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#111827' }}>Add Lead to Funnel</h3>
              <button type="button" onClick={() => setShowAddLeadModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateLead} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={addLeadData.name}
                  onChange={(e) => setAddLeadData({ ...addLeadData, name: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={addLeadData.phone}
                  onChange={(e) => setAddLeadData({ ...addLeadData, phone: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Company</label>
                <input
                  type="text"
                  placeholder="e.g. SurfSync Corp"
                  value={addLeadData.lead_company}
                  onChange={(e) => setAddLeadData({ ...addLeadData, lead_company: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.84rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #E6E9EE', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddLeadModal(false)} className="btn-secondary-action">Cancel</button>
                <button type="submit" disabled={addingLead} className="btn-primary-action">{addingLead ? 'Saving…' : 'Save Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Request Modal */}
      {quoteModalLead && (
        <QuotationRequestModal
          lead={quoteModalLead}
          onClose={() => setQuoteModalLead(null)}
          onSubmit={handleQuoteSubmit}
          busy={submittingQuote}
        />
      )}

      {/* Won Deal Modal */}
      {wonModalLead && (
        <WonDealModal
          lead={wonModalLead}
          onClose={() => setWonModalLead(null)}
          onSubmit={handleWonSubmit}
          busy={submittingWon}
        />
      )}

      {/* Lost Deal Modal */}
      {lostModalLead && (
        <LostDealModal
          lead={lostModalLead}
          onClose={() => setLostModalLead(null)}
          onSubmit={handleLostSubmit}
          busy={submittingLost}
        />
      )}

      {/* WhatsApp Chat Modal */}
      <WhatsAppChatModal
        isOpen={Boolean(activeChatLead)}
        onClose={() => setActiveChatLead(null)}
        initialLeadId={activeChatLead?.id}
      />

      {/* Mandatory Feedback Modal */}
      {feedbackModalLead && (
        <StatusFeedbackModal
          isOpen={Boolean(feedbackModalLead)}
          lead={feedbackModalLead}
          targetStatus={feedbackTargetStatus}
          onClose={() => {
            setFeedbackModalLead(null);
            setFeedbackTargetStatus('');
          }}
          onSubmit={handleFeedbackSubmit}
          isSubmitting={submittingFeedback}
        />
      )}
    </div>
  );
}
