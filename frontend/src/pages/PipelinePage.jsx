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
  Lock,
  IndianRupee,
  Users,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

const STAGE_CONFIG = [
  { key: 'new_pool', title: 'New Leads (Pool)', icon: <Zap size={14} />, color: '#f59e0b', bg: '#fef3c7', subtitle: 'Unassigned leads' },
  { key: 'contacted', title: 'Contacted / Claimed', icon: <Phone size={14} />, color: '#0d9488', bg: '#ccfbf1', subtitle: 'Connected by rep' },
  { key: 'interested', title: 'Interested', icon: <Star size={14} />, color: '#16a34a', bg: '#dcfce7', subtitle: 'Auto-reminders active' },
  { key: 'followup', title: 'Follow-Up', icon: <RotateCw size={14} />, color: '#2563eb', bg: '#eff6ff', subtitle: 'Calls & negotiations' },
  { key: 'quotation_requested', title: 'Quotation Requested', icon: <FileText size={14} />, color: '#ea580c', bg: '#fff7ed', subtitle: 'Waiting for admin quote' },
  { key: 'quotation_sent', title: 'Quotation Sent', icon: <Send size={14} />, color: '#9333ea', bg: '#faf5ff', subtitle: 'Admin sent quote' },
  { key: 'won', title: 'Won Deals', icon: <Trophy size={14} />, color: '#10b981', bg: '#ecfdf5', subtitle: 'Deal converted' },
  { key: 'lost', title: 'Lost Deals', icon: <XCircle size={14} />, color: '#ef4444', bg: '#fef2f2', subtitle: 'Deal lost' },
  { key: 'not_interested', title: 'Not Interested', icon: <Ban size={14} />, color: '#64748b', bg: '#f1f5f9', subtitle: 'Disqualified' },
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

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [pipeData, teamData] = await Promise.all([
        salesApi.pipeline(),
        companyPortalApi.team().catch(() => ({ team: [] })),
      ]);
      setPipeline(pipeData.pipeline || {});
      setTeamMembers(teamData.team || []);
    } catch (err) {
      setError(err.message || 'Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
    <div style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0d9488', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Company Pipeline Overview
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0 0 0' }}>
            Live Sales Funnel
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Monitor reps, stage progression, quotations, and closed deals in real-time
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Salesperson Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
            <Users size={14} color="#64748b" />
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
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
              <option value="all">All Sales Representatives</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              width: '260px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search leads, phone, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Total In Funnel</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>{stats.totalLeads}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Won Revenue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a' }}>
              ₹{stats.totalWonRevenue.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
              <span>Quotes In Review</span>
              <Link to="/company/quotations" style={{ color: '#ea580c', textDecoration: 'none', fontWeight: '700', fontSize: '0.72rem' }}>
                Open Queue →
              </Link>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ea580c' }}>{stats.pendingQuotes}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCw size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Active Negotiations</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2563eb' }}>{stats.activeFollowups}</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* 9 Kanban Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, minmax(280px, 1fr))',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1.5rem',
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
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '280px',
                maxHeight: 'calc(100vh - 270px)',
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
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      backgroundColor: col.bg,
                      color: col.color,
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {colLeads.length}
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
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
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
                  colLeads.map((lead) => {
                    return (
                      <div
                        key={lead.id}
                        style={{
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          padding: '0.8rem',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        {/* Lead Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.2 }}>
                              {lead.name}
                            </strong>
                            {lead.lead_company && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {lead.lead_company}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            #{lead.id}
                          </span>
                        </div>

                        {/* Phone & Direct Contact */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.3rem',
                            paddingTop: '0.35rem',
                            borderTop: '1px dashed #f1f5f9',
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: '700', color: '#1e293b' }}>
                            {lead.phone || 'No phone'}
                          </span>

                          {lead.phone && (
                            <div style={{ display: 'flex', gap: '4px' }}>
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
                                <Phone size={11} />
                              </a>
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ecfdf5',
                                  color: '#10b981',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                }}
                                title="WhatsApp"
                              >
                                <MessageSquare size={11} />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Claimed Salesperson Tag */}
                        <div
                          style={{
                            marginTop: '0.3rem',
                            padding: '3px 6px',
                            backgroundColor: lead.claimed_by ? '#f0fdfa' : '#fef3c7',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: lead.claimed_by ? '#0f766e' : '#b45309',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600',
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
                              marginTop: '0.3rem',
                              padding: '4px 8px',
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Trophy size={13} color="#059669" />
                            <span>Deal: ₹{Number(lead.deal_value).toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Lost Reason Badge */}
                        {lead.lost_reason && (
                          <div
                            style={{
                              marginTop: '0.3rem',
                              padding: '4px 8px',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: '#dc2626',
                            }}
                          >
                            Lost: {lead.lost_reason}
                          </div>
                        )}

                        {/* Quotation Services Badge */}
                        {lead.quotation_services && (
                          <div
                            style={{
                              marginTop: '0.3rem',
                              padding: '3px 6px',
                              backgroundColor: '#faf5ff',
                              border: '1px solid #e9d5ff',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              color: '#7c3aed',
                            }}
                          >
                            Quote: {lead.quotation_services}
                          </div>
                        )}

                        {/* Admin Action Bar */}
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {col.key === 'quotation_requested' && (
                            <Link
                              to="/company/quotations"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '5px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                backgroundColor: '#fff7ed',
                                color: '#ea580c',
                                border: '1px solid #fed7aa',
                                borderRadius: '6px',
                                textDecoration: 'none',
                              }}
                            >
                              <span>Send Official Quotation</span>
                              <ArrowRight size={12} />
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
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    backgroundColor: '#10b981',
                                    color: '#fff',
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
                                  <Trophy size={12} />
                                  <span>Won</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLostModalLead(lead)}
                                  disabled={actingId === lead.id}
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                  }}
                                  title="Mark Lost & Record Reason"
                                >
                                  <XCircle size={12} />
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
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  borderRadius: '5px',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#fff',
                                  color: '#64748b',
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
                                backgroundColor: '#ecfdf5',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                color: '#16a34a',
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
                                fontSize: '0.74rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#fff',
                                color: '#334155',
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
