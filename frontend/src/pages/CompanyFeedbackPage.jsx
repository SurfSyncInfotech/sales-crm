import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquareText,
  Search,
  Filter,
  Phone,
  MessageSquare,
  ArrowRight,
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import WhatsAppChatModal from '../components/WhatsAppChatModal';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusBadge(status) {
  switch (status) {
    case 'interested':
      return { bg: '#FEF3C7', color: '#92400E', label: 'Interested' };
    case 'followup':
      return { bg: '#EFF6FF', color: '#1E40AF', label: 'Follow-Up' };
    case 'quotation_requested':
      return { bg: '#FFF3E6', color: '#B65807', label: 'Quote Requested' };
    case 'quotation_sent':
      return { bg: '#F3E8FF', color: '#6D28D9', label: 'Quote Sent' };
    case 'won':
      return { bg: '#DCFCE7', color: '#166534', label: 'Won Deal' };
    case 'lost':
      return { bg: '#FEE2E2', color: '#DC2626', label: 'Lost' };
    case 'not_interested':
      return { bg: '#F1F3F6', color: '#4B5563', label: 'Not Interested' };
    case 'contacted':
      return { bg: '#E8F6FA', color: '#1D667C', label: 'Contacted' };
    case 'claimed':
      return { bg: '#FFF3E6', color: '#B65807', label: 'Claimed' };
    case 'new_pool':
    case 'new':
      return { bg: '#FFF3E6', color: '#F68713', label: 'New Lead' };
    default:
      return { bg: '#F1F3F6', color: '#4B5563', label: status ? status.replace(/_/g, ' ') : 'Lead' };
  }
}

export default function CompanyFeedbackPage() {
  const { user } = useAuth('company');
  const isAdmin = user?.role === 'company_admin' || user?.role === 'superadmin';
  const isManager = String(user?.custom_role || '').trim().toLowerCase() === 'manager';
  const canChangeStatus = isAdmin || isManager;

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';

  const [feedbacks, setFeedbacks] = useState([]);
  const [reps, setReps] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, won: 0, lost: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState(urlSearch);
  const [stageFilter, setStageFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Expand / Collapse state (Set of lead keys)
  const [expandedLeads, setExpandedLeads] = useState(new Set());

  // WhatsApp Chat Modal
  const [activeChatLead, setActiveChatLead] = useState(null);

  async function loadFeedbacks() {
    try {
      setLoading(true);
      setError('');
      const res = await companyPortalApi.feedbacks({
        page,
        limit,
        q: search.trim(),
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        rep_id: repFilter !== 'all' ? repFilter : undefined,
      });
      setFeedbacks(res.feedbacks || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
      if (res.stats) setStats(res.stats);
      if (res.reps) setReps(res.reps);
    } catch (err) {
      console.error('Failed to load company feedbacks:', err);
      setError(err.message || 'Could not load feedback records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeedbacks();
  }, [page, stageFilter, repFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadFeedbacks();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Group feedbacks by Lead into clean cards
  const groupedLeads = useMemo(() => {
    const map = new Map();
    for (const fb of feedbacks) {
      const key = fb.lead_id
        ? `lead_${fb.lead_id}`
        : fb.lead_phone
        ? `phone_${fb.lead_phone}`
        : fb.lead_name
        ? `name_${fb.lead_name}`
        : `fb_${fb.id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          lead_id: fb.lead_id,
          lead_name: fb.lead_name || 'Unnamed Lead',
          lead_phone: fb.lead_phone || '',
          lead_email: fb.lead_email || '',
          lead_company: fb.lead_company || '',
          current_status: fb.current_lead_status || fb.to_status,
          feedbacks: [],
          latestFeedback: fb,
        });
      }
      const group = map.get(key);
      group.feedbacks.push(fb);
    }
    return Array.from(map.values());
  }, [feedbacks]);

  // If navigated with search term (e.g. from pipeline), auto-expand matching leads
  useEffect(() => {
    if (urlSearch && groupedLeads.length > 0) {
      setExpandedLeads(new Set(groupedLeads.map((g) => g.key)));
    }
  }, [urlSearch, groupedLeads]);

  function toggleExpand(key) {
    setExpandedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleToggleAll() {
    if (expandedLeads.size === groupedLeads.length) {
      // Collapse all
      setExpandedLeads(new Set());
    } else {
      // Expand all
      setExpandedLeads(new Set(groupedLeads.map((g) => g.key)));
    }
  }

  return (
    <div className="company-feedback-page" style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        .company-feedback-page,
        .company-feedback-page * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .feedback-stat-card {
          background: #FFFFFF;
          border: 1px solid #E6E9EE;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          flex: 1 1 200px;
        }
      `}</style>

      {/* 1. Page Header */}
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
              color: '#F68713',
              marginBottom: '4px',
            }}
          >
            <span>Audit & Insights</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Commercial Operations</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Sales Rep Feedback Logs
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Consolidated timeline of sales representative discussion notes, stage progression audits, and client feedback grouped by lead.
          </p>
        </div>

        <button
          type="button"
          onClick={loadFeedbacks}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6E9EE',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#374151',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* 2. Executive Metrics KPI */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <div className="feedback-stat-card">
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.04em' }}>
              Total Feedbacks Logged
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
              All-time transitions recorded
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F68713' }}>
            <MessageSquareText size={20} />
          </div>
        </div>

        <div className="feedback-stat-card">
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.04em' }}>
              Today's Entries
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
              {stats.today}
            </div>
            <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '2px', fontWeight: 700 }}>
              Recorded today
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="feedback-stat-card">
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.04em' }}>
              Closed Won Notes
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>
              {stats.won}
            </div>
            <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px', fontWeight: 700 }}>
              Successful conversions
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="feedback-stat-card">
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.04em' }}>
              Lost & Dropped Notes
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
              {stats.lost}
            </div>
            <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px', fontWeight: 700 }}>
              Lost or not interested
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search client name, phone, company, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              padding: '0 32px 0 34px',
              fontSize: '13px',
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              outline: 'none',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchParams({});
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Rep Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={repFilter}
            onChange={(e) => {
              setRepFilter(e.target.value);
              setPage(1);
            }}
            style={{
              height: '38px',
              padding: '0 12px',
              fontSize: '13px',
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Sales Representatives</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                Rep: {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stage Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            style={{
              height: '38px',
              padding: '0 12px',
              fontSize: '13px',
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Stage Transitions</option>
            <option value="interested">Interested</option>
            <option value="followup">Follow-Up</option>
            <option value="quotation_requested">Quote Requested</option>
            <option value="quotation_sent">Quote Sent</option>
            <option value="won">Won Deals</option>
            <option value="lost">Lost Deals</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>

        {/* Expand / Collapse All Toggle */}
        {groupedLeads.length > 0 && (
          <button
            type="button"
            onClick={handleToggleAll}
            style={{
              height: '38px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              backgroundColor: '#FAFAFA',
              color: '#374151',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Expand or collapse all lead feedback cards"
          >
            <ChevronsUpDown size={14} color="#6B7280" />
            <span>{expandedLeads.size === groupedLeads.length ? 'Collapse All' : 'Expand All'}</span>
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap' }}>
          Showing <strong style={{ color: '#111827' }}>{groupedLeads.length}</strong> Leads (
          <span style={{ fontWeight: 700 }}>{pagination.total}</span> total entries)
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* 4. Grouped Lead Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              padding: '50px 20px',
              textAlign: 'center',
              color: '#6B7280',
            }}
          >
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#F68713' }} />
            <div>Loading feedback audit trail…</div>
          </div>
        ) : groupedLeads.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#9CA3AF',
            }}
          >
            <MessageSquareText size={40} color="#D1D5DB" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#111827' }}>No feedback records found</div>
            <div style={{ fontSize: '13px', marginTop: '6px', color: '#6B7280' }}>
              {search
                ? `No lead feedback matching "${search}". Try searching by a different name or phone.`
                : 'When sales representatives update lead stages and log notes, entries will display here.'}
            </div>
          </div>
        ) : (
          groupedLeads.map((group) => {
            const isExpanded = expandedLeads.has(group.key);
            const latestFb = group.latestFeedback || group.feedbacks[0];
            const effectiveStatus = group.current_status || latestFb?.to_status || 'new';
            const currentBadge = getStatusBadge(effectiveStatus);
            const latestFromBadge = getStatusBadge(latestFb?.from_status);
            const latestToBadge = getStatusBadge(latestFb?.to_status);

            return (
              <div
                key={group.key}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: isExpanded ? '1.5px solid #F68713' : '1px solid #E6E9EE',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: isExpanded ? '0 4px 16px rgba(246,135,19,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Lead Summary Bar (Clickable to Expand/Collapse) */}
                <div
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    flexWrap: 'wrap',
                    backgroundColor: isExpanded ? '#FFFDFB' : '#FFFFFF',
                    borderBottom: isExpanded ? '1px solid #FEE2D1' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => toggleExpand(group.key)}
                >
                  {/* Left: Lead Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#FFF3E6',
                        color: '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px',
                        flexShrink: 0,
                        border: '1px solid #FED7AA',
                      }}
                    >
                      {(group.lead_name || 'L').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                          {group.lead_name}
                        </span>
                        {canChangeStatus ? (
                          <select
                            value={effectiveStatus}
                            onClick={(e) => e.stopPropagation()}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newStatus = e.target.value;
                              try {
                                await companyPortalApi.updateLead(group.lead_id, { status: newStatus });
                                await loadFeedbacks();
                              } catch (err) {
                                alert(err.message || 'Failed to update status');
                              }
                            }}
                            style={{
                              backgroundColor: currentBadge.bg,
                              color: currentBadge.color,
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #E6E9EE',
                              cursor: 'pointer',
                              outline: 'none',
                              textTransform: 'capitalize',
                            }}
                            title="Change lead status (Admin / Manager)"
                          >
                            <option value="new">New Lead</option>
                            <option value="claimed">Claimed</option>
                            <option value="contacted">Contacted</option>
                            <option value="interested">Interested</option>
                            <option value="followup">Follow-Up</option>
                            <option value="quotation_requested">Quote Requested</option>
                            <option value="quotation_sent">Quote Sent</option>
                            <option value="won">Won Deal</option>
                            <option value="lost">Lost</option>
                            <option value="not_interested">Not Interested</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              backgroundColor: currentBadge.bg,
                              color: currentBadge.color,
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                            title="Current lead stage"
                          >
                            {currentBadge.label}
                          </span>
                        )}
                        <span
                          style={{
                            backgroundColor: '#FFF7ED',
                            color: '#EA580C',
                            border: '1px solid #FFEDD5',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <MessageSquareText size={11} />
                          {group.feedbacks.length} {group.feedbacks.length === 1 ? 'Feedback' : 'Feedbacks'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '12px', color: '#6B7280' }}>
                        {group.lead_phone && (
                          <span style={{ fontWeight: 600, color: '#374151' }}>
                            {group.lead_phone}
                          </span>
                        )}
                        {group.lead_company && (
                          <span>• {group.lead_company}</span>
                        )}
                        {group.lead_email && (
                          <span>• {group.lead_email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Latest Activity Preview */}
                  {latestFb && (
                    <div
                      style={{
                        flex: '1 1 280px',
                        maxWidth: '480px',
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #F1F5F9',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Latest:</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>
                            {latestFromBadge.label} → {latestToBadge.label}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>
                            by {latestFb.salesperson_name || 'Rep'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                          {timeAgo(latestFb.created_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          color: '#4B5563',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '12px',
                        }}
                        title={latestFb.feedback}
                      >
                        "{latestFb.feedback || 'Stage updated'}"
                      </div>
                    </div>
                  )}

                  {/* Right: Actions & Collapse Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginLeft: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.lead_phone && (
                      <>
                        <a
                          href={`tel:${group.lead_phone}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                          }}
                          title="Call Client"
                        >
                          <Phone size={13} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setActiveChatLead({ id: group.lead_id, name: group.lead_name, phone: group.lead_phone })}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#ECFDF5',
                            color: '#047857',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Open WhatsApp Chat"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(group.key)}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        backgroundColor: isExpanded ? '#FFF3E6' : '#F9FAFB',
                        color: isExpanded ? '#EA580C' : '#374151',
                        border: isExpanded ? '1px solid #FED7AA' : '1px solid #E5E7EB',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} color="#EA580C" />
                          <span>Collapse Feedbacks</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} color="#6B7280" />
                          <span>View Feedbacks ({group.feedbacks.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Section: Tabular Format for this Lead */}
                {isExpanded && (
                  <div style={{ backgroundColor: '#FFFFFF' }}>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderBottom: '1px solid #E2E8F0',
                              color: '#64748B',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <th style={{ padding: '10px 18px', width: '220px' }}>RECORDED BY</th>
                            <th style={{ padding: '10px 18px', width: '230px' }}>STAGE TRANSITION</th>
                            <th style={{ padding: '10px 18px' }}>DISCUSSION NOTES & FEEDBACK</th>
                            <th style={{ padding: '10px 18px', width: '190px', textAlign: 'right' }}>DATE & TIME</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.feedbacks.map((fb, idx) => {
                            const fromBadge = getStatusBadge(fb.from_status);
                            const toBadge = getStatusBadge(fb.to_status);
                            return (
                              <tr
                                key={fb.id || idx}
                                style={{
                                  borderBottom: idx === group.feedbacks.length - 1 ? 'none' : '1px solid #F1F5F9',
                                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                }}
                              >
                                {/* Recorded By */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: '#E8F6FA',
                                        color: '#2A9CB8',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {(fb.salesperson_name || 'R').charAt(0).toUpperCase()}
                                    </span>
                                    <div>
                                      <div style={{ fontWeight: 700, color: '#111827', fontSize: '12.5px' }}>
                                        {fb.salesperson_name || 'Sales Representative'}
                                      </div>
                                      {fb.salesperson_email && (
                                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{fb.salesperson_email}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Stage Transition */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                                    <span
                                      style={{
                                        backgroundColor: fromBadge.bg,
                                        color: fromBadge.color,
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {fromBadge.label}
                                    </span>
                                    <ArrowRight size={12} color="#9CA3AF" />
                                    <span
                                      style={{
                                        backgroundColor: toBadge.bg,
                                        color: toBadge.color,
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {toBadge.label}
                                    </span>
                                  </div>
                                </td>

                                {/* Discussion Notes & Feedback */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                                  <div
                                    style={{
                                      fontSize: '13px',
                                      color: '#1F2937',
                                      lineHeight: '1.5',
                                      backgroundColor: '#FFFFFF',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #E5E7EB',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {fb.feedback}
                                  </div>
                                </td>

                                {/* Date & Time */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                                    {new Date(fb.created_at).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                    {', '}
                                    {new Date(fb.created_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                    {timeAgo(fb.created_at)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Pagination Footer */}
      {pagination.total > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #E6E9EE',
            borderRadius: '12px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Showing Page <strong style={{ color: '#111827' }}>{pagination.page}</strong> of{' '}
            <strong style={{ color: '#111827' }}>{pagination.totalPages}</strong> (
            <span style={{ fontWeight: 700 }}>{pagination.total}</span> total entries)
          </div>

          <div style={{ display: 'inline-flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #E6E9EE',
                backgroundColor: '#FFFFFF',
                color: pagination.page <= 1 ? '#D1D5DB' : '#374151',
                fontSize: '12px',
                fontWeight: 700,
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #E6E9EE',
                backgroundColor: '#FFFFFF',
                color: pagination.page >= pagination.totalPages ? '#D1D5DB' : '#374151',
                fontSize: '12px',
                fontWeight: 700,
                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
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

      {/* Live WhatsApp Chat Modal */}
      {activeChatLead && (
        <WhatsAppChatModal
          isOpen={Boolean(activeChatLead)}
          onClose={() => setActiveChatLead(null)}
          initialLeadId={activeChatLead?.id}
        />
      )}
    </div>
  );
}
