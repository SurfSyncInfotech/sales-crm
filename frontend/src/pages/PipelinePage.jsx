import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesApi, companyPortalApi } from '../api/client';
import QuotationRequestModal from '../components/QuotationRequestModal';
import WonDealModal from '../components/WonDealModal';
import LostDealModal from '../components/LostDealModal';
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
  IndianRupee,
  Users,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const STAGE_CONFIG = [
  { key: 'new_pool', title: 'New Leads (Pool)', icon: <Zap size={14} />, color: '#F68713', bg: '#FFF3E6', subtitle: 'Unassigned pool' },
  { key: 'contacted', title: 'Contacted / Claimed', icon: <Phone size={14} />, color: '#2A9CB8', bg: '#E8F6FA', subtitle: 'Connected by rep' },
  { key: 'interested', title: 'Interested', icon: <Star size={14} />, color: '#059669', bg: '#ECFDF5', subtitle: 'Auto-cadence on' },
  { key: 'followup', title: 'Follow-Up', icon: <RotateCw size={14} />, color: '#2563EB', bg: '#EFF6FF', subtitle: 'Active discussion' },
  { key: 'quotation_requested', title: 'Quotation Requested', icon: <FileText size={14} />, color: '#D97706', bg: '#FEF3C7', subtitle: 'Admin quote needed' },
  { key: 'quotation_sent', title: 'Quotation Sent', icon: <Send size={14} />, color: '#7C3AED', bg: '#F5F3FF', subtitle: 'Phase 2 closing' },
  { key: 'won', title: 'Won Deals', icon: <Trophy size={14} />, color: '#059669', bg: '#ECFDF5', subtitle: 'Deal converted' },
  { key: 'lost', title: 'Lost Deals', icon: <XCircle size={14} />, color: '#DC2626', bg: '#FEF2F2', subtitle: 'Deal lost' },
  { key: 'not_interested', title: 'Not Interested', icon: <Ban size={14} />, color: '#6B7280', bg: '#F3F4F6', subtitle: 'Disqualified' },
];

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedRep, setSelectedRep] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [quoteModalLead, setQuoteModalLead] = useState(null);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [wonModalLead, setWonModalLead] = useState(null);
  const [submittingWon, setSubmittingWon] = useState(false);
  const [lostModalLead, setLostModalLead] = useState(null);
  const [submittingLost, setSubmittingLost] = useState(false);
  const [actingId, setActingId] = useState(null);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [pipeData, teamData] = await Promise.all([
        salesApi.pipeline(),
        companyPortalApi.team().catch(() => ({ team: [] })),
      ]);
      setPipeline(pipeData.pipeline || {});
      setTeamMembers(teamData.team || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load pipeline data');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Background polling every 15 seconds
    const interval = setInterval(() => {
      if (!quoteModalLead && !wonModalLead && !lostModalLead) {
        loadData(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [quoteModalLead, wonModalLead, lostModalLead]);

  async function handleClaim(leadId) {
    setActingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to claim lead');
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

    setActingId(lead.id);
    try {
      await salesApi.updateStatus(lead.id, { status: newStatus });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to move stage');
    } finally {
      setActingId(null);
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

  // Calculate high-level pipeline stats
  const stats = useMemo(() => {
    let totalLeads = 0;
    let totalWonRevenue = 0;
    let pendingQuotes = 0;
    let activeFollowups = 0;

    Object.entries(pipeline).forEach(([stage, leads]) => {
      leads.forEach((l) => {
        totalLeads += 1;
        if (stage === 'won' && l.deal_value) {
          totalWonRevenue += Number(l.deal_value) || 0;
        }
        if (stage === 'quotation_requested') {
          pendingQuotes += 1;
        }
        if (stage === 'interested' || stage === 'followup' || stage === 'quotation_sent') {
          activeFollowups += 1;
        }
      });
    });

    return { totalLeads, totalWonRevenue, pendingQuotes, activeFollowups };
  }, [pipeline]);

  return (
    <div className="company-pipeline-page" style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Revenue Pipeline</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
            Enterprise Pipeline Kanban
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Track deal progression, sales rep velocity, pending admin quotation approvals, and closed won transactions.
          </p>
        </div>

        {/* Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Salesperson Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '8px', padding: '0 10px', height: '38px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <Users size={14} color="#6B7280" />
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Representatives</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
              }}
            />
            <input
              type="text"
              placeholder="Search leads, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px 0 34px',
                fontSize: '13px',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #E6E9EE',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar (Component 3.1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total In Funnel */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E6E9EE', borderLeft: '4px solid #111827', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Pipeline</div>
            <div className="num" style={{ fontSize: '26px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif', marginTop: '4px' }}>{stats.totalLeads}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F3F4F6', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} />
          </div>
        </div>

        {/* Won Revenue */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E6E9EE', borderLeft: '4px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Won Revenue</div>
            <div className="num" style={{ fontSize: '26px', fontWeight: 800, color: '#059669', fontFamily: 'Manrope, sans-serif', marginTop: '4px' }}>
              ₹{stats.totalWonRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={18} />
          </div>
        </div>

        {/* Quotes In Review */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E6E9EE', borderLeft: '4px solid #F68713', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Quotes in Queue</span>
              <Link to="/company/quotations" style={{ color: '#F68713', textDecoration: 'none', fontWeight: 700, fontSize: '11px' }}>
                Open →
              </Link>
            </div>
            <div className="num" style={{ fontSize: '26px', fontWeight: 800, color: '#F68713', fontFamily: 'Manrope, sans-serif', marginTop: '4px' }}>{stats.pendingQuotes}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFF3E6', color: '#F68713', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} />
          </div>
        </div>

        {/* Active Negotiations */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E6E9EE', borderLeft: '4px solid #2A9CB8', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Negotiations</div>
            <div className="num" style={{ fontSize: '26px', fontWeight: 800, color: '#2A9CB8', fontFamily: 'Manrope, sans-serif', marginTop: '4px' }}>{stats.activeFollowups}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCw size={18} />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* 9 Kanban Columns (Fluid Horizontal Scroll) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, minmax(290px, 1fr))',
          gap: '14px',
          overflowX: 'auto',
          paddingBottom: '24px',
        }}
      >
        {STAGE_CONFIG.map((col) => {
          const colLeads = (pipeline[col.key] || []).filter((l) => {
            const matchesSearch =
              !search ||
              (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
              (l.phone && l.phone.includes(search)) ||
              (l.lead_company && l.lead_company.toLowerCase().includes(search.toLowerCase()));

            const matchesRep =
              selectedRep === 'all' ||
              (selectedRep === 'unassigned' && (!l.claimed_by || l.claimed_by === 0)) ||
              String(l.claimed_by) === String(selectedRep);

            return matchesSearch && matchesRep;
          });

          return (
            <div
              key={col.key}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E6E9EE',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '290px',
                maxHeight: 'calc(100vh - 280px)',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #E6E9EE',
                  backgroundColor: '#FFFFFF',
                  borderTopLeftRadius: '12px',
                  borderTopRightRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        color: col.color,
                        backgroundColor: col.bg,
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {col.icon}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>{col.title}</strong>
                  </div>
                  <span
                    className="num"
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: col.bg,
                      color: col.color,
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {colLeads.length}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                  {col.subtitle}
                </div>
              </div>

              {/* Cards Container */}
              <div
                style={{
                  padding: '12px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  flex: 1,
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9CA3AF', fontSize: '12px' }}>
                    Loading…
                  </div>
                ) : colLeads.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '12px',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    No deals in this stage
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    return (
                      <div
                        key={lead.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          border: '1px solid #E6E9EE',
                          padding: '12px 14px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E6E9EE'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
                      >
                        {/* Lead Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
                              {lead.name}
                            </strong>
                            {lead.lead_company && (
                              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>
                                {lead.lead_company}
                              </div>
                            )}
                          </div>
                          <span className="num" style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700 }}>
                            #{lead.id}
                          </span>
                        </div>

                        {/* Phone & Direct Contact */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '2px',
                            paddingTop: '6px',
                            borderTop: '1px dashed #F1F5F9',
                          }}
                        >
                          <span className="num" style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                            {lead.phone || 'No phone'}
                          </span>

                          {lead.phone && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <a
                                href={`tel:${lead.phone}`}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ECFDF5',
                                  color: '#059669',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                }}
                                title="Call directly"
                              >
                                <Phone size={11} />
                              </a>
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ECFDF5',
                                  color: '#047857',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                }}
                                title="WhatsApp chat"
                              >
                                <MessageSquare size={11} />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Claimed Salesperson Tag */}
                        <div
                          style={{
                            marginTop: '2px',
                            padding: '3px 8px',
                            backgroundColor: lead.claimed_by ? '#F0FDF4' : '#FFF3E6',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: lead.claimed_by ? '#15803D' : '#B65807',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700,
                          }}
                        >
                          {lead.claimed_by ? (
                            <>
                              <Users size={11} />
                              <span>Rep: {lead.claimed_by_name || 'Assigned'}</span>
                            </>
                          ) : (
                            <>
                              <Zap size={11} />
                              <span>Unclaimed Pool Lead</span>
                            </>
                          )}
                        </div>

                        {/* Deal Value Badge */}
                        {lead.deal_value && (
                          <div
                            style={{
                              marginTop: '2px',
                              padding: '4px 8px',
                              backgroundColor: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Trophy size={12} color="#059669" />
                            <span className="num">Deal: ₹{Number(lead.deal_value).toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Lost Reason Badge */}
                        {lead.lost_reason && (
                          <div
                            style={{
                              marginTop: '2px',
                              padding: '4px 8px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#DC2626',
                            }}
                          >
                            Lost: {lead.lost_reason}
                          </div>
                        )}

                        {/* Quotation Services Badge */}
                        {lead.quotation_services && (
                          <div
                            style={{
                              marginTop: '2px',
                              padding: '3px 8px',
                              backgroundColor: '#FAF5FF',
                              border: '1px solid #E9D5FF',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: '#7C3AED',
                              fontWeight: 600,
                            }}
                          >
                            Quote: {lead.quotation_services}
                          </div>
                        )}

                        {/* Admin Action Bar */}
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {col.key === 'quotation_requested' && (
                            <Link
                              to="/company/quotations"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                padding: '6px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#FFF3E6',
                                color: '#F68713',
                                border: '1px solid #FED7AA',
                                borderRadius: '6px',
                                textDecoration: 'none',
                              }}
                            >
                              <span>Send Official Quotation</span>
                              <ArrowRight size={11} />
                            </Link>
                          )}

                          {lead.status === 'quotation_sent' ? (
                            /* Direct Closing Buttons */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => setWonModalLead(lead)}
                                  disabled={actingId === lead.id}
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: '#059669',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                  }}
                                  title="Mark Won & Enter ₹ Deal Value"
                                >
                                  <Trophy size={11} />
                                  <span>Won</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLostModalLead(lead)}
                                  disabled={actingId === lead.id}
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                  }}
                                  title="Mark Lost & Record Reason"
                                >
                                  <XCircle size={11} />
                                  <span>Lost</span>
                                </button>
                              </div>
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleMoveStage(lead, e.target.value);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: '1px solid #E6E9EE',
                                  backgroundColor: '#FFFFFF',
                                  color: '#6B7280',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="">Other stage actions…</option>
                                <option value="quotation_requested">Need Quote Revision</option>
                                <option value="followup">Back to Follow-Up</option>
                                <option value="not_interested">Not Interested</option>
                              </select>
                            </div>
                          ) : lead.status === 'won' ? (
                            <div
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ECFDF5',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#059669',
                                textAlign: 'center',
                              }}
                            >
                              ✓ Closed & Won
                            </div>
                          ) : (
                            <select
                              value={lead.status || 'contacted'}
                              onChange={(e) => handleMoveStage(lead, e.target.value)}
                              disabled={actingId === lead.id}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #E6E9EE',
                                backgroundColor: '#FFFFFF',
                                color: '#374151',
                                cursor: 'pointer',
                              }}
                            >
                              <option value={lead.status} disabled>
                                Current: {lead.status}
                              </option>
                              <option value="interested">Stage: Interested</option>
                              <option value="followup">Stage: Follow-Up</option>
                              <option value="quotation_requested">Stage: Quotation Requested</option>
                              <option value="won">Mark as Won (Enter ₹)</option>
                              <option value="lost">Mark as Lost (Reason)</option>
                              <option value="not_interested">Not Interested</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
