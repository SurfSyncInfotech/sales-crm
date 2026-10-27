import { useEffect, useMemo, useState } from 'react';
import { salesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import QuotationRequestModal from '../components/QuotationRequestModal';
import WonDealModal from '../components/WonDealModal';
import LostDealModal from '../components/LostDealModal';
import WhatsAppChatModal from '../components/WhatsAppChatModal';
import StatusFeedbackModal from '../components/StatusFeedbackModal';
import {
  Zap,
  Phone,
  Star,
  RotateCw,
  FileText,
  Send,
  Trophy,
  XCircle,
  Ban,
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
  Clock,
  ArrowRight,
  Filter,
  RotateCcw,
  Monitor,
} from 'lucide-react';

const STAGE_CONFIG = [
  { key: 'new_pool', title: 'New Incoming Leads', icon: <Zap size={15} />, color: '#f59e0b', bg: '#fef3c7', subtitle: 'Available to claim' },
  { key: 'contacted', title: 'Contacted / Claimed', icon: <Phone size={15} />, color: '#0d9488', bg: '#ccfbf1', subtitle: 'Connected by rep' },
  { key: 'demo_requested', title: 'Demo / Details Requested', icon: <Monitor size={15} />, color: '#0284c7', bg: '#e0f2fe', subtitle: 'Demo website & client specs' },
  { key: 'interested', title: 'Interested', icon: <Star size={15} />, color: '#16a34a', bg: '#dcfce7', subtitle: 'Auto-reminders active' },
  { key: 'followup', title: 'Follow-Up', icon: <RotateCw size={15} />, color: '#2563eb', bg: '#eff6ff', subtitle: 'Calls & negotiations' },
  { key: 'quotation_requested', title: 'Quotation Requested', icon: <FileText size={15} />, color: '#ea580c', bg: '#fff7ed', subtitle: 'Waiting for admin quote' },
  { key: 'quotation_sent', title: 'Quotation Sent', icon: <Send size={15} />, color: '#9333ea', bg: '#faf5ff', subtitle: 'Admin sent quote' },
  { key: 'won', title: 'Won Deals', icon: <Trophy size={15} />, color: '#10b981', bg: '#ecfdf5', subtitle: 'Deal converted' },
  { key: 'lost', title: 'Lost Deals', icon: <XCircle size={15} />, color: '#ef4444', bg: '#fef2f2', subtitle: 'Deal lost' },
];

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
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

function getSourceBadge(source = '') {
  const s = (source || '').toLowerCase();
  if (s.includes('linkedin')) return { bg: '#f3e8ff', color: '#7c3aed', label: 'LinkedIn' };
  if (s.includes('referral')) return { bg: '#fff7ed', color: '#c2410c', label: 'Referral' };
  if (s.includes('facebook') || s.includes('fb')) return { bg: '#fdf2f8', color: '#db2777', label: 'Facebook' };
  if (s.includes('google')) return { bg: '#ecfdf5', color: '#059669', label: 'Google Ads' };
  if (s.includes('instagram')) return { bg: '#fdf4ff', color: '#c026d3', label: 'Instagram' };
  if (s.includes('trade') || s.includes('event')) return { bg: '#f1f5f9', color: '#475569', label: 'Trade Show' };
  return { bg: '#eff6ff', color: '#2563eb', label: source || 'Website' };
}

export default function SalesPipelinePage() {
  const { user } = useAuth('sales');
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View switch: 'kanban' or 'list'
  const [viewMode, setViewMode] = useState('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'this_week', 'this_month', 'custom'
  const [specificDate, setSpecificDate] = useState('');
  const [replyFilter, setReplyFilter] = useState('all'); // 'all', 'replied'

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

  // Mandatory Feedback on Stage Transition
  const [feedbackModalLead, setFeedbackModalLead] = useState(null);
  const [feedbackTargetStatus, setFeedbackTargetStatus] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  async function loadPipeline() {
    setLoading(true);
    setError('');
    try {
      const data = await salesApi.pipeline();
      setPipeline(data.pipeline || {});
    } catch (err) {
      setError(err.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipeline();
  }, []);

  async function handleClaim(leadId) {
    setActingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadPipeline();
    } catch (err) {
      alert(err.message || 'Failed to claim lead');
      loadPipeline();
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
      await loadPipeline();
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
      await loadPipeline();
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
      await loadPipeline();
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
      await loadPipeline();
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
      await loadPipeline();
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
        // Search filter
        const matchesSearch =
          !q ||
          (lead.name && lead.name.toLowerCase().includes(q)) ||
          (lead.phone && lead.phone.includes(q)) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.lead_company && lead.lead_company.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // WhatsApp Reply filter
        if (replyFilter === 'replied') {
          const hasReply = Boolean(lead.latest_wa_reply || (lead.unread_wa_count && lead.unread_wa_count > 0));
          if (!hasReply) return false;
        }

        // Date filter
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
  }, [pipeline, search, dateFilter, specificDate, replyFilter]);

  // Progressive column pagination for Kanban view
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

  // Reset list page to 1 when filters change
  useEffect(() => {
    setListPage(1);
  }, [search, dateFilter, specificDate, replyFilter]);

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0d9488', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Pipeline
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0 0 0', letterSpacing: '-0.02em' }}>
            Sales Funnel
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.86rem' }}>
            Drag and manage leads across the pipeline
          </p>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* + Add Lead Button */}
          <button
            type="button"
            onClick={() => setShowAddLeadModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#072423',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(7,36,35,0.15)',
            }}
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Sleek Unified Filter & Controls Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: '#fff',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Left: Filters (Search, Date, WhatsApp, Reset) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search leads, clients, companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 26px 6px 32px',
                fontSize: '0.82rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: dateFilter !== 'all' ? '#eff6ff' : '#f8fafc',
              border: dateFilter !== 'all' ? '1px solid #93c5fd' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
            }}
          >
            <Calendar size={13} color={dateFilter !== 'all' ? '#2563eb' : '#64748b'} />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') setSpecificDate('');
              }}
              style={{
                border: 'none',
                outline: 'none',
                padding: '2px',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: dateFilter !== 'all' ? '#1d4ed8' : '#334155',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Specific Date…</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 5px',
                  fontSize: '0.76rem',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#fff',
                }}
              />
            )}
            {specificDate && (
              <button
                type="button"
                onClick={() => setSpecificDate('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
                title="Clear specific date"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* WhatsApp Reply Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: replyFilter === 'replied' ? '#ecfdf5' : '#f8fafc',
              border: replyFilter === 'replied' ? '1px solid #6ee7b7' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
            }}
          >
            <MessageSquare size={13} color={replyFilter === 'replied' ? '#10b981' : '#64748b'} />
            <select
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                padding: '2px',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: replyFilter === 'replied' ? '#047857' : '#334155',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Leads</option>
              <option value="replied">🟢 Has WA Reply</option>
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {(search || dateFilter !== 'all' || replyFilter !== 'all' || specificDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDateFilter('all');
                setSpecificDate('');
                setReplyFilter('all');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: '700',
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Reset all filters"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'kanban' ? '#072423' : 'transparent',
                color: viewMode === 'kanban' ? '#fff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <LayoutGrid size={13} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'list' ? '#072423' : 'transparent',
                color: viewMode === 'list' ? '#fff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <List size={13} />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Process Flow Chevron Funnel Bar (All 9 Stages in Single Row) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, minmax(150px, 1fr))',
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
                padding: '0.75rem 0.9rem',
                borderRight: idx < STAGE_CONFIG.length - 1 ? '1px solid #f1f5f9' : 'none',
                minWidth: '150px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                  <span style={{ color: stage.color, flexShrink: 0 }}>{stage.icon}</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', lineHeight: 1.25, wordBreak: 'break-word' }}>
                    {stage.title}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.15 }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.25, wordBreak: 'break-word' }}>
                  {stage.subtitle}
                </div>
              </div>
              {idx < STAGE_CONFIG.length - 1 && (
                <ChevronRight size={13} color="#cbd5e1" style={{ flexShrink: 0, marginLeft: '4px' }} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Main View: Kanban Board vs List View */}
      {viewMode === 'kanban' ? (
        /* 9 Kanban Columns */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, minmax(295px, 1fr))',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1.5rem',
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
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: '295px',
                  maxHeight: 'calc(100vh - 310px)',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
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
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {col.icon}
                      </span>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{col.title}</strong>
                    </div>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        backgroundColor: col.bg,
                        color: col.color,
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                      title={colLeads.length > limit ? `Showing ${visibleLeads.length} of ${colLeads.length} leads` : `${colLeads.length} leads`}
                    >
                      {colLeads.length > limit ? `${visibleLeads.length}/${colLeads.length}` : colLeads.length}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {col.subtitle}
                  </div>
                </div>

                {/* Cards Container */}
                <div
                  style={{
                    padding: '0.75rem',
                    paddingBottom: '1.5rem',
                    overflowY: 'auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    flex: 1,
                  }}
                >
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                      Loading…
                    </div>
                  ) : colLeads.length === 0 ? (
                    <div
                      style={{
                        padding: '1.5rem 0.5rem',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
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

                        const sourceBadge = getSourceBadge(lead.source_name);

                        return (
                          <div
                            key={lead.id}
                            style={{
                              backgroundColor: '#fff',
                              borderRadius: '10px',
                              border: '1px solid #e2e8f0',
                              padding: '0.8rem 0.75rem',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              flexShrink: 0,
                              position: 'relative',
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Client Name & Company */}
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.25, display: 'block' }}>
                                {lead.name}
                              </strong>
                              {lead.lead_company && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                                  {lead.lead_company}
                                </div>
                              )}
                            </div>

                            {/* Tags Row: Source + Cadence / Services / Deal Value + Time */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                {/* Source Badge */}
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    backgroundColor: sourceBadge.bg,
                                    color: sourceBadge.color,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {sourceBadge.label}
                                </span>

                                {/* Day Cadence Badge in Interested Stage */}
                                {col.key === 'interested' && lead.next_reminder_day && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: '800',
                                      backgroundColor: '#fef3c7',
                                      color: '#b45309',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #fde68a',
                                    }}
                                  >
                                    Day {lead.next_reminder_day}
                                  </span>
                                )}

                                {/* Quotation Service Badge */}
                                {lead.quotation_services && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: '600',
                                      backgroundColor: '#fff7ed',
                                      color: '#c2410c',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #ffedd5',
                                    }}
                                  >
                                    {lead.quotation_services}
                                  </span>
                                )}

                                {/* Negotiation / Revision Requested Badge */}
                                {lead.status === 'quotation_requested' && lead.quotation_notes?.includes('[REVISION') && (
                                  <span
                                    style={{
                                      fontSize: '0.66rem',
                                      fontWeight: '700',
                                      backgroundColor: '#ffedd5',
                                      color: '#9a3412',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #fdba74',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <RotateCcw size={9} />
                                    <span>Revision Requested</span>
                                  </span>
                                )}

                                {/* Won Deal Value */}
                                {lead.deal_value && (
                                  <span
                                    style={{
                                      fontSize: '0.78rem',
                                      fontWeight: '800',
                                      color: '#16a34a',
                                    }}
                                  >
                                    ₹{Number(lead.deal_value).toLocaleString('en-IN')}
                                  </span>
                                )}

                                {/* Demo Status Badge */}
                                {(lead.status === 'demo_requested' || lead.demo_notes || lead.demo_link) && (
                                  <span
                                    style={{
                                      fontSize: '0.66rem',
                                      fontWeight: '700',
                                      backgroundColor: lead.demo_link ? '#ecfdf5' : '#e0f2fe',
                                      color: lead.demo_link ? '#047857' : '#0369a1',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: `1px solid ${lead.demo_link ? '#a7f3d0' : '#bae6fd'}`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Monitor size={9} />
                                    <span>{lead.demo_link ? 'Demo Ready' : 'Demo Requested'}</span>
                                  </span>
                                )}
                              </div>

                              {/* Relative Time */}
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                {formatRelativeTime(lead.created_at || lead.lead_date)}
                              </span>
                            </div>

                            {/* Demo Requirements Snippet or Link */}
                            {lead.demo_notes && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#0369a1',
                                  backgroundColor: '#f0f9ff',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e0f2fe',
                                  marginTop: '2px',
                                  lineHeight: 1.35,
                                }}
                              >
                                <strong style={{ fontWeight: '700' }}>Demo Specs:</strong>{' '}
                                <span>{lead.demo_notes.length > 70 ? `${lead.demo_notes.slice(0, 70)}…` : lead.demo_notes}</span>
                              </div>
                            )}

                            {lead.demo_link && (
                              <div style={{ marginTop: '2px' }}>
                                <a
                                  href={lead.demo_link.startsWith('http') ? lead.demo_link : `https://${lead.demo_link}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: '0.72rem',
                                    color: '#047857',
                                    backgroundColor: '#ecfdf5',
                                    padding: '3px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #a7f3d0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    textDecoration: 'none',
                                    fontWeight: '700',
                                  }}
                                >
                                  <span>🌐 Demo Ready: Open Link</span>
                                </a>
                              </div>
                            )}

                            {/* WhatsApp Reply Snippet if received */}
                            {lead.latest_wa_reply && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChatLead(lead);
                                }}
                                style={{
                                  marginTop: '0.45rem',
                                  padding: '4px 8px',
                                  backgroundColor: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  color: '#15803d',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  overflow: 'hidden',
                                }}
                                title="Click to view conversation in CRM"
                              >
                                <span style={{ fontSize: '0.65rem' }}>🟢</span>
                                <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Reply:</span>
                                <span
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: '#166534',
                                    fontWeight: '500',
                                  }}
                                >
                                  "{lead.latest_wa_reply}"
                                </span>
                              </div>
                            )}

                            {/* Lock Tag if claimed by another rep */}
                            {isClaimedByOther && (
                              <div
                                style={{
                                  padding: '3px 6px',
                                  backgroundColor: '#f1f5f9',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Lock size={11} />
                                <span>Claimed by {lead.claimed_by_name || 'another rep'}</span>
                              </div>
                            )}

                            {/* Action Row */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '6px',
                                marginTop: '0.4rem',
                                paddingTop: '0.45rem',
                                borderTop: '1px solid #f1f5f9',
                                minHeight: '28px',
                              }}
                            >
                              {/* Left: Call / WhatsApp / Mail Icons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                {lead.phone && !isClaimedByOther && (
                                  <>
                                    <a
                                      href={`tel:${lead.phone}`}
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        backgroundColor: '#f0fdf4',
                                        color: '#16a34a',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textDecoration: 'none',
                                      }}
                                      title="Call"
                                    >
                                      <Phone size={10} />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveChatLead(lead);
                                      }}
                                      style={{
                                        position: 'relative',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        backgroundColor: lead.latest_wa_reply || lead.unread_wa_count > 0 ? '#dcfce7' : '#ecfdf5',
                                        color: '#10b981',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: lead.unread_wa_count > 0 ? '1.5px solid #22c55e' : 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        boxShadow: lead.unread_wa_count > 0 ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
                                      }}
                                      title={lead.latest_wa_reply ? `WhatsApp Reply: "${lead.latest_wa_reply}"` : 'Open WhatsApp Chat'}
                                    >
                                      <MessageSquare size={10} />
                                      {Boolean(lead.unread_wa_count > 0 || lead.latest_wa_reply) && (
                                        <span
                                          style={{
                                            position: 'absolute',
                                            top: '-2px',
                                            right: '-2px',
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: '#22c55e',
                                            boxShadow: '0 0 0 1.5px #ffffff',
                                          }}
                                        />
                                      )}
                                    </button>
                                  </>
                                )}
                                {lead.email && (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '50%',
                                      backgroundColor: '#eff6ff',
                                      color: '#2563eb',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      textDecoration: 'none',
                                    }}
                                    title="Email"
                                  >
                                    <Mail size={10} />
                                  </a>
                                )}
                              </div>

                              {/* Right: Stage Action / Claim & Call */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                {isUnclaimed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleClaim(lead.id)}
                                    disabled={actingId === lead.id}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: '700',
                                      backgroundColor: '#072423',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <Zap size={10} color="#facc15" fill="#facc15" />
                                    <span>{actingId === lead.id ? 'Claiming…' : 'Claim & Call'}</span>
                                  </button>
                                ) : isClaimedByOther ? (
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Locked</span>
                                ) : lead.status === 'quotation_sent' ? (
                                  <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => setQuoteModalLead(lead)}
                                      style={{
                                        padding: '3px 6px',
                                        fontSize: '0.68rem',
                                        fontWeight: '700',
                                        backgroundColor: '#fff7ed',
                                        color: '#c2410c',
                                        border: '1px solid #fed7aa',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title="Client Negotiating / Request Revised Quote from Admin"
                                    >
                                      <RotateCcw size={10} />
                                      <span>Re-Quote</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setWonModalLead(lead)}
                                      style={{
                                        padding: '3px 7px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        backgroundColor: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title="Mark Won & Enter ₹"
                                    >
                                      Won
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLostModalLead(lead)}
                                      style={{
                                        padding: '3px 7px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        backgroundColor: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fecaca',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title="Mark Lost"
                                    >
                                      Lost
                                    </button>
                                  </div>
                                ) : lead.status === 'quotation_requested' ? (
                                  <span style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: '700' }}>
                                    In Review…
                                  </span>
                                ) : lead.status === 'won' ? (
                                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '800' }}>
                                    ✓ Closed
                                  </span>
                                ) : (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) handleMoveStage(lead, e.target.value);
                                    }}
                                    style={{
                                      padding: '4px 6px',
                                      fontSize: '0.72rem',
                                      fontWeight: '600',
                                      borderRadius: '5px',
                                      border: '1px solid #cbd5e1',
                                      backgroundColor: '#fff',
                                      color: '#334155',
                                      cursor: 'pointer',
                                      maxWidth: '120px',
                                      outline: 'none',
                                    }}
                                  >
                                    <option value="" disabled>Move to Next ▾</option>
                                    {lead.status !== 'demo_requested' && <option value="demo_requested">Demo / Details Requested</option>}
                                    {lead.status !== 'interested' && <option value="interested">Interested</option>}
                                    {lead.status !== 'followup' && <option value="followup">Follow-Up</option>}
                                    {lead.status !== 'quotation_requested' && <option value="quotation_requested">Request Quotation</option>}
                                    {lead.status !== 'won' && <option value="won">Mark as Won</option>}
                                    {lead.status !== 'lost' && <option value="lost">Mark as Lost</option>}
                                    {lead.status !== 'not_interested' && <option value="not_interested">Not Interested</option>}
                                  </select>
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
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: '#fff',
                            color: '#0f172a',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s',
                            marginTop: '0.25rem',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#94a3b8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          <span>Load +15 More</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>
                            ({remainingCount} remaining)
                          </span>
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
        /* List View Mode */
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Client / Company
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Contact
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Source
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Stage
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Deal Value
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Created Date
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {totalListLeads === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      No pipeline leads match the selected date/search filter.
                    </td>
                  </tr>
                ) : (
                  paginatedListLeads.map((lead) => {
                    const sourceBadge = getSourceBadge(lead.source_name);
                    return (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{lead.name}</strong>
                          {lead.lead_company && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{lead.lead_company}</div>}
                          {lead.latest_wa_reply && (
                            <div
                              onClick={() => setActiveChatLead(lead)}
                              style={{
                                marginTop: '3px',
                                fontSize: '0.7rem',
                                color: '#15803d',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#f0fdf4',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #bbf7d0',
                              }}
                              title="Click to view conversation"
                            >
                              <span>🟢</span>
                              <span style={{ fontWeight: '600' }}>WA:</span>
                              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{lead.latest_wa_reply}"
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.82rem', color: '#1e293b' }}>
                          {lead.phone || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: sourceBadge.bg, color: sourceBadge.color, padding: '2px 8px', borderRadius: '4px' }}>
                            {sourceBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'capitalize', color: '#334155' }}>
                            {lead.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: lead.deal_value ? '#16a34a' : '#94a3b8', fontSize: '0.82rem' }}>
                          {lead.deal_value ? `₹${Number(lead.deal_value).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>
                          {new Date(lead.created_at || lead.lead_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Phone size={12} />
                              </a>
                            )}
                            {lead.phone && (
                              <button
                                type="button"
                                onClick={() => setActiveChatLead(lead)}
                                style={{
                                  position: 'relative',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: lead.latest_wa_reply || lead.unread_wa_count > 0 ? '#dcfce7' : '#ecfdf5',
                                  color: '#10b981',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: lead.unread_wa_count > 0 ? '1.5px solid #22c55e' : 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                title={lead.latest_wa_reply ? `WhatsApp Reply: "${lead.latest_wa_reply}"` : 'Open WhatsApp Chat'}
                              >
                                <MessageSquare size={12} />
                                {Boolean(lead.unread_wa_count > 0 || lead.latest_wa_reply) && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: '-2px',
                                      right: '-2px',
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      backgroundColor: '#22c55e',
                                      boxShadow: '0 0 0 1.5px #ffffff',
                                    }}
                                  />
                                )}
                              </button>
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

          {/* List View Pagination Footer */}
          {totalListLeads > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#fafbfc',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Showing{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {(listPage - 1) * listLimit + 1}
                  </strong>{' '}
                  to{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {Math.min(listPage * listLimit, totalListLeads)}
                  </strong>{' '}
                  of <strong style={{ color: '#0f172a' }}>{totalListLeads}</strong> leads
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Rows:</span>
                  <select
                    value={listLimit}
                    onChange={(e) => {
                      setListLimit(Number(e.target.value));
                      setListPage(1);
                    }}
                    style={{
                      padding: '3px 6px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#fff',
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  disabled={listPage <= 1}
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: listPage <= 1 ? '#f8fafc' : '#fff',
                    color: listPage <= 1 ? '#94a3b8' : '#334155',
                    cursor: listPage <= 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>

                <span style={{ fontSize: '0.8rem', color: '#475569', padding: '0 6px', fontWeight: '600' }}>
                  Page {listPage} of {totalListPages}
                </span>

                <button
                  type="button"
                  onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                  disabled={listPage >= totalListPages}
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: listPage >= totalListPages ? '#f8fafc' : '#fff',
                    color: listPage >= totalListPages ? '#94a3b8' : '#334155',
                    cursor: listPage >= totalListPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Lead Modal */}
      {showAddLeadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '460px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Add New Lead</h2>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Assigned directly to you</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLeadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={addLeadData.name}
                  onChange={(e) => setAddLeadData({ ...addLeadData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Phone / WhatsApp Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={addLeadData.phone}
                  onChange={(e) => setAddLeadData({ ...addLeadData, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Company / Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Enterprises"
                  value={addLeadData.lead_company}
                  onChange={(e) => setAddLeadData({ ...addLeadData, lead_company: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. rohit@sharma.com"
                  value={addLeadData.email}
                  onChange={(e) => setAddLeadData({ ...addLeadData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Source
                </label>
                <select
                  value={addLeadData.source_name}
                  onChange={(e) => setAddLeadData({ ...addLeadData, source_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Direct Entry">Direct Entry / Walk-in</option>
                  <option value="Website">Website</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontSize: '0.84rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLead}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#072423', color: '#fff', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  {addingLead ? 'Saving…' : 'Save Lead'}
                </button>
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

      {/* WhatsApp Chat Conversation Drawer / Modal */}
      <WhatsAppChatModal
        isOpen={Boolean(activeChatLead)}
        onClose={() => setActiveChatLead(null)}
        initialLeadId={activeChatLead?.id}
      />

      {/* Mandatory Stage Feedback Modal */}
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
