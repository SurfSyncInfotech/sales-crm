import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { salesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import QuotationRequestModal from '../components/QuotationRequestModal';
import WonDealModal from '../components/WonDealModal';
import LostDealModal from '../components/LostDealModal';
import WhatsAppChatModal from '../components/WhatsAppChatModal';
import {
  Users,
  Zap,
  Building2,
  PhoneIncoming,
  Search,
  Filter,
  Tag,
  Calendar,
  Download,
  Plus,
  Bell,
  Phone,
  MessageSquare,
  Mail,
  MoreHorizontal,
  Check,
  Lock,
  X,
  Trophy,
  XCircle,
  Clock,
  ArrowUpRight,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import StatusFeedbackModal from '../components/StatusFeedbackModal';

// Avatar pastel color palette matching reference design
const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1e40af' }, // Blue
  { bg: '#ffedd5', color: '#9a3412' }, // Orange
  { bg: '#fce7f3', color: '#9d174d' }, // Pink
  { bg: '#e0e7ff', color: '#3730a3' }, // Indigo
  { bg: '#dcfce7', color: '#166534' }, // Green
  { bg: '#ede9fe', color: '#5b21b6' }, // Purple
  { bg: '#fef3c7', color: '#854d0e' }, // Amber
];

function getAvatarStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatDateStandard(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SalesLeadsPage() {
  const { user } = useAuth('sales');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'all'; // 'all', 'available', 'my'

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
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || 'all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addLeadData, setAddLeadData] = useState({ name: '', phone: '', email: '', lead_company: '', source_name: 'Direct Entry', notes: '' });
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

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [leadsData, statsData] = await Promise.all([
        salesApi.leads(currentTab),
        salesApi.stats().catch(() => ({})),
      ]);
      setLeads(leadsData.leads || []);
      setStats({
        all_leads: statsData.all_leads || statsData.total_company_leads || leadsData.leads?.length || 0,
        available_leads: statsData.available_leads || statsData.pool_leads || 0,
        my_total_leads: statsData.my_total_leads || leadsData.leads?.filter((l) => l.claimed_by === user?.id).length || 0,
        contacted_today: statsData.contacted_today || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load leads data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    setSelectedLeadIds([]);
    setActionMenuLeadId(null);
  }, [currentTab]);

  async function handleClaim(leadId) {
    setClaimingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Lead could not be claimed');
      loadData();
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
      await loadData();
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
      await loadData();
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
      await loadData();
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
      await loadData();
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
      await loadData();
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

      return matchesSearch && matchesStage && matchesSource && matchesTime;
    });
  }, [leads, search, stageFilter, sourceFilter, timeFilter]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, sourceFilter, timeFilter, currentTab]);

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
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  }

  function toggleSelectRow(id) {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
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

  // Source badge color mapper
  function getSourceBadge(source = '') {
    const s = (source || '').toLowerCase();
    if (s.includes('linkedin')) return { bg: '#f3e8ff', color: '#7c3aed', label: 'LinkedIn' };
    if (s.includes('referral')) return { bg: '#fff7ed', color: '#c2410c', label: 'Referral' };
    if (s.includes('facebook') || s.includes('fb')) return { bg: '#fdf2f8', color: '#db2777', label: 'Facebook' };
    if (s.includes('google')) return { bg: '#ecfdf5', color: '#059669', label: 'Google Ads' };
    if (s.includes('instagram')) return { bg: '#fdf4ff', color: '#c026d3', label: 'Instagram' };
    if (s.includes('trade') || s.includes('event')) return { bg: '#f1f5f9', color: '#475569', label: 'Trade Show' };
    if (s.includes('excel') || s.includes('csv')) return { bg: '#f0fdfa', color: '#0f766e', label: 'Excel Upload' };
    return { bg: '#eff6ff', color: '#2563eb', label: source || 'Website' };
  }

  // Stage badge color mapper
  function getStageBadge(status = '', dealValue = null) {
    switch (status) {
      case 'won':
        return {
          bg: '#ecfdf5',
          color: '#16a34a',
          label: 'Won',
          sub: dealValue ? `₹${Number(dealValue).toLocaleString('en-IN')}` : null,
        };
      case 'followup':
        return { bg: '#eff6ff', color: '#4f46e5', label: 'Follow-Up' };
      case 'interested':
        return { bg: '#fef3c7', color: '#d97706', label: 'Interested' };
      case 'quotation_requested':
        return { bg: '#fff7ed', color: '#ea580c', label: 'Quotation Requested' };
      case 'quotation_sent':
        return { bg: '#faf5ff', color: '#9333ea', label: 'Quotation Sent' };
      case 'contacted':
        return { bg: '#ccfbf1', color: '#0f766e', label: 'Contacted' };
      case 'demo_requested':
        return { bg: '#e0f2fe', color: '#0284c7', label: 'Demo / Details Requested' };
      case 'not_interested':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Not Interested' };
      case 'lost':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Lost' };
      default:
        return { bg: '#e0f2fe', color: '#0284c7', label: 'New Lead' };
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0d9488', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Lead Management
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0 0 0', letterSpacing: '-0.02em' }}>
            Leads
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.86rem' }}>
            All incoming leads are available to connect. First to connect claims the lead.
          </p>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Quick Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search leads, clients, or companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '0.84rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                backgroundColor: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Bell Notifications */}
          <button
            type="button"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              position: 'relative',
            }}
            title="Notifications"
          >
            <Bell size={17} />
            <span
              style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
              }}
            />
          </button>

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

      {/* 4 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Card 1: All Incoming Leads */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>All Incoming Leads</span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              {stats.all_leads}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>↑ 18% from last week</span>
            </div>
          </div>
          {/* Mini Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '42px', paddingLeft: '8px' }}>
            <div style={{ width: '6px', height: '14px', backgroundColor: '#bfdbfe', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '22px', backgroundColor: '#bfdbfe', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '28px', backgroundColor: '#93c5fd', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '36px', backgroundColor: '#60a5fa', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '42px', backgroundColor: '#3b82f6', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Card 2: Available to Claim */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Available to Claim</span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              {stats.available_leads}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>Ready for first connect</span>
            </div>
          </div>
          {/* Mini Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '42px', paddingLeft: '8px' }}>
            <div style={{ width: '6px', height: '22px', backgroundColor: '#fef08a', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '18px', backgroundColor: '#fef08a', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '30px', backgroundColor: '#fde047', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '26px', backgroundColor: '#fde047', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '40px', backgroundColor: '#eab308', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Card 3: My Claimed Leads */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={18} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>My Claimed Leads</span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              {stats.my_total_leads}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>Actively managed by you</span>
            </div>
          </div>
          {/* Mini Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '42px', paddingLeft: '8px' }}>
            <div style={{ width: '6px', height: '16px', backgroundColor: '#99f6e4', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '24px', backgroundColor: '#99f6e4', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '20px', backgroundColor: '#99f6e4', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '32px', backgroundColor: '#5eead4', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '42px', backgroundColor: '#14b8a6', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Card 4: Contacted Today */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PhoneIncoming size={18} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Contacted Today</span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              {stats.contacted_today}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>↑ 20% from yesterday</span>
            </div>
          </div>
          {/* Mini Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '42px', paddingLeft: '8px' }}>
            <div style={{ width: '6px', height: '18px', backgroundColor: '#a7f3d0', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '26px', backgroundColor: '#a7f3d0', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '22px', backgroundColor: '#6ee7b7', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '34px', backgroundColor: '#34d399', borderRadius: '2px' }} />
            <div style={{ width: '6px', height: '42px', backgroundColor: '#10b981', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

      {/* Tabs and Export Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        {/* Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Tab 1: All Leads (Default) */}
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'all' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 16px',
              borderRadius: '999px',
              fontSize: '0.84rem',
              fontWeight: '700',
              border: currentTab === 'all' ? '1.5px solid #072423' : '1px solid #e2e8f0',
              backgroundColor: currentTab === 'all' ? '#072423' : '#fff',
              color: currentTab === 'all' ? '#fff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={14} color={currentTab === 'all' ? '#5eead4' : '#64748b'} />
            <span>All Leads</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: currentTab === 'all' ? 'rgba(255,255,255,0.18)' : '#f1f5f9',
                color: currentTab === 'all' ? '#fff' : '#64748b',
                padding: '1px 7px',
                borderRadius: '999px',
              }}
            >
              {stats.all_leads}
            </span>
          </button>

          {/* Tab 2: Available to Claim */}
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'available' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 16px',
              borderRadius: '999px',
              fontSize: '0.84rem',
              fontWeight: '700',
              border: currentTab === 'available' ? '1.5px solid #072423' : '1px solid #e2e8f0',
              backgroundColor: currentTab === 'available' ? '#072423' : '#fff',
              color: currentTab === 'available' ? '#fff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Zap size={14} color={currentTab === 'available' ? '#facc15' : '#d97706'} />
            <span>Available to Claim</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: currentTab === 'available' ? 'rgba(255,255,255,0.18)' : '#fef3c7',
                color: currentTab === 'available' ? '#fff' : '#b45309',
                padding: '1px 7px',
                borderRadius: '999px',
              }}
            >
              {stats.available_leads}
            </span>
          </button>

          {/* Tab 3: My Claimed Leads */}
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'my' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 16px',
              borderRadius: '999px',
              fontSize: '0.84rem',
              fontWeight: '700',
              border: currentTab === 'my' ? '1.5px solid #072423' : '1px solid #e2e8f0',
              backgroundColor: currentTab === 'my' ? '#072423' : '#fff',
              color: currentTab === 'my' ? '#fff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Check size={14} color={currentTab === 'my' ? '#5eead4' : '#0d9488'} />
            <span>My Claimed Leads</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: currentTab === 'my' ? 'rgba(255,255,255,0.18)' : '#f0fdfa',
                color: currentTab === 'my' ? '#fff' : '#0f766e',
                padding: '1px 7px',
                borderRadius: '999px',
              }}
            >
              {stats.my_total_leads}
            </span>
          </button>
        </div>

        {/* Export Button */}
        <button
          type="button"
          onClick={handleExportCSV}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            backgroundColor: '#fff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '0.82rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <Download size={14} color="#64748b" />
          <span>Export</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Main Search Input */}
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by name, phone, email, or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '0.84rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter 1: Stages */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <Filter size={14} color="#64748b" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              padding: '8px 4px',
              fontSize: '0.82rem',
              fontWeight: '600',
              color: '#334155',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Stages</option>
            <option value="new">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="demo_requested">Demo / Details Requested</option>
            <option value="interested">Interested</option>
            <option value="followup">Follow-Up</option>
            <option value="quotation_requested">Quotation Requested</option>
            <option value="quotation_sent">Quotation Sent</option>
            <option value="won">Won Deals</option>
            <option value="lost">Lost Deals</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>

        {/* Filter 2: Sources */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <Tag size={14} color="#64748b" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              padding: '8px 4px',
              fontSize: '0.82rem',
              fontWeight: '600',
              color: '#334155',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="facebook">Facebook Ads</option>
            <option value="instagram">Instagram</option>
            <option value="google">Google Ads</option>
            <option value="linkedin">LinkedIn</option>
            <option value="referral">Referral</option>
            <option value="excel">Excel Upload</option>
            <option value="direct">Direct Entry</option>
          </select>
        </div>

        {/* Filter 3: Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <Calendar size={14} color="#64748b" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              padding: '8px 4px',
              fontSize: '0.82rem',
              fontWeight: '600',
              color: '#334155',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Main Data Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.85rem 1rem', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', borderRadius: '4px' }}
                  />
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Client / Company
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Details
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Source
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status / Stage
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ownership
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Received
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    Loading leads data…
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>No leads found</div>
                    <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try switching tabs or adjusting search filters.</div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const isClaimedByMe = lead.claimed_by === user?.id;
                  const isClaimedByOther = lead.is_locked_by_other || (lead.claimed_by && lead.claimed_by !== user?.id && user?.role !== 'company_admin');
                  const isUnclaimed = !lead.claimed_by || lead.claimed_by === 0;

                  const avatarStyle = getAvatarStyle(lead.name || 'L');
                  const initial = (lead.name || 'L').charAt(0).toUpperCase();

                  const sourceBadge = getSourceBadge(lead.source_name);
                  const stageBadge = getStageBadge(lead.status, lead.deal_value);

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: selectedLeadIds.includes(lead.id) ? '#f0fdfa' : '#fff',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleSelectRow(lead.id)}
                          style={{ cursor: 'pointer', borderRadius: '4px' }}
                        />
                      </td>

                      {/* Client / Company with Initials Avatar */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: avatarStyle.bg,
                              color: avatarStyle.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.25 }}>
                              {lead.name}
                            </div>
                            {lead.lead_company && (
                              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                                {lead.lead_company}
                              </div>
                            )}
                            {lead.latest_wa_reply && (
                              <div
                                onClick={() => setActiveChatLead(lead)}
                                style={{
                                  marginTop: '4px',
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
                                title="Click to open conversation"
                              >
                                <span>🟢</span>
                                <span style={{ fontWeight: '700' }}>WA:</span>
                                <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  "{lead.latest_wa_reply}"
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: '700', color: '#1e293b' }}>
                            <Phone size={12} color="#64748b" />
                            <span>{lead.phone || 'No phone'}</span>
                          </div>
                          {lead.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                              <Mail size={12} color="#94a3b8" />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                {lead.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor: sourceBadge.bg,
                            color: sourceBadge.color,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {sourceBadge.label}
                        </span>
                      </td>

                      {/* Status / Stage with Deal Value */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor: stageBadge.bg,
                            color: stageBadge.color,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {stageBadge.label}
                        </span>
                        {stageBadge.sub && (
                          <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#16a34a', marginTop: '3px' }}>
                            {stageBadge.sub}
                          </div>
                        )}
                        {lead.lost_reason && (
                          <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '2px', maxWidth: '150px' }}>
                            {lead.lost_reason}
                          </div>
                        )}
                      </td>

                      {/* Ownership */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isClaimedByOther ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                            }}
                          >
                            <Lock size={11} color="#64748b" />
                            <span>Claimed by {lead.claimed_by_name || 'another rep'}</span>
                          </div>
                        ) : isClaimedByMe ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#ccfbf1',
                              color: '#0f766e',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                            }}
                          >
                            <Check size={12} color="#0f766e" />
                            <span>Claimed by You</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClaim(lead.id)}
                            disabled={claimingId === lead.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#072423',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            <Zap size={11} color="#facc15" fill="#facc15" />
                            <span>{claimingId === lead.id ? 'Claiming…' : 'Claim & Call'}</span>
                          </button>
                        )}
                      </td>

                      {/* Received */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#334155' }}>
                          {formatDateStandard(lead.created_at || lead.lead_date)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {formatRelativeTime(lead.created_at || lead.lead_date)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                          {isClaimedByOther ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                color: '#94a3b8',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: '600',
                              }}
                              title={`Owned by ${lead.claimed_by_name || 'another rep'}`}
                            >
                              <Lock size={11} color="#94a3b8" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <>
                              {lead.phone && (
                                <>
                                  <a
                                    href={`tel:${lead.phone}`}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      backgroundColor: '#f0fdf4',
                                      color: '#16a34a',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      textDecoration: 'none',
                                    }}
                                    title="Direct Phone Call"
                                  >
                                    <Phone size={13} />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setActiveChatLead(lead)}
                                    style={{
                                      position: 'relative',
                                      width: '28px',
                                      height: '28px',
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
                                    <MessageSquare size={13} />
                                    {Boolean(lead.unread_wa_count > 0 || lead.latest_wa_reply) && (
                                      <span
                                        style={{
                                          position: 'absolute',
                                          top: '-2px',
                                          right: '-2px',
                                          width: '8px',
                                          height: '8px',
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
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textDecoration: 'none',
                                  }}
                                  title="Send Email"
                                >
                                  <Mail size={13} />
                                </a>
                              )}

                              {/* More ··· Menu */}
                              <button
                                type="button"
                                onClick={() => setActionMenuLeadId(actionMenuLeadId === lead.id ? null : lead.id)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#64748b',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                                title="More actions"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </>
                          )}

                          {/* Dropdown Menu */}
                          {actionMenuLeadId === lead.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '34px',
                                zIndex: 100,
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                                border: '1px solid #e2e8f0',
                                padding: '4px',
                                width: '180px',
                                textAlign: 'left',
                              }}
                            >
                              {lead.status === 'quotation_sent' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuLeadId(null);
                                      setQuoteModalLead(lead);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '6px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      color: '#ea580c',
                                      backgroundColor: '#fff7ed',
                                      border: 'none',
                                      borderRadius: '4px',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      marginBottom: '4px',
                                    }}
                                  >
                                    <RotateCcw size={13} />
                                    <span>Negotiate / Re-Quote</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(lead, 'won')}
                                    style={{
                                      width: '100%',
                                      padding: '6px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      color: '#16a34a',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderRadius: '4px',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <Trophy size={13} />
                                    <span>Mark as Won (₹)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(lead, 'lost')}
                                    style={{
                                      width: '100%',
                                      padding: '6px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      color: '#dc2626',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderRadius: '4px',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <XCircle size={13} />
                                    <span>Mark as Lost</span>
                                  </button>
                                </>
                              )}

                              {lead.status !== 'demo_requested' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(lead, 'demo_requested')}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#0284c7',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Set: Demo / Details Requested
                                </button>
                              )}
                              {lead.status !== 'interested' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(lead, 'interested')}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#334155',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Set: Interested
                                </button>
                              )}
                              {lead.status !== 'followup' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(lead, 'followup')}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#334155',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Set: Follow-Up
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(lead, 'quotation_requested')}
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: '#ea580c',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                }}
                              >
                                Request Quotation
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(lead, 'not_interested')}
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: '#64748b',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                }}
                              >
                                Not Interested
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Bar */}
          {filteredLeads.length > 0 && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fafbfc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '0.78rem',
                color: '#64748b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length} leads</span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '3px 6px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.76rem',
                    outline: 'none',
                    backgroundColor: '#fff',
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

              {/* Prev / Page / Next Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: page <= 1 ? '#f1f5f9' : '#fff',
                    color: page <= 1 ? '#94a3b8' : '#334155',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.76rem',
                    fontWeight: '600',
                  }}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>

                <span style={{ padding: '0 6px', fontWeight: '700', color: '#0f172a' }}>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: page >= totalPages ? '#f1f5f9' : '#fff',
                    color: page >= totalPages ? '#94a3b8' : '#334155',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.76rem',
                    fontWeight: '600',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                  placeholder="e.g. Rahul Mehta"
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
                  placeholder="e.g. TechNova Solutions"
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
                  placeholder="e.g. rahul@technova.com"
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
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Website">Website</option>
                  <option value="Trade Show">Trade Show / Event</option>
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
