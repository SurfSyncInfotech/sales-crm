import { useEffect, useState } from 'react';
import {
  FileCheck2,
  FilePen,
  Send,
  Hourglass,
  Mail,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Phone,
  AlertCircle,
  Wrench,
  RefreshCw,
  Check,
  Monitor,
  Globe,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { companyPortalApi } from '../api/client';
import AdminSendQuotationModal from '../components/AdminSendQuotationModal';
import AdminProvideDemoModal from '../components/AdminProvideDemoModal';

export default function QuotationsPage() {
  const [requestedLeads, setRequestedLeads] = useState([]);
  const [sentLeads, setSentLeads] = useState([]);
  const [wonLeads, setWonLeads] = useState([]);
  const [demoLeads, setDemoLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [activeModalLead, setActiveModalLead] = useState(null);
  const [activeDemoLead, setActiveDemoLead] = useState(null);
  const [activeDemoChannel, setActiveDemoChannel] = useState('whatsapp');

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      const [reqRes, sentRes, wonRes, demoRes] = await Promise.all([
        companyPortalApi.leads({ status: 'quotation_requested', limit: 100 }),
        companyPortalApi.leads({ status: 'quotation_sent', limit: 100 }),
        companyPortalApi.leads({ status: 'won', limit: 100 }),
        companyPortalApi.leads({ status: 'demo_requested', limit: 100 }),
      ]);
      setRequestedLeads(reqRes.leads || []);
      setSentLeads(sentRes.leads || []);
      setWonLeads(wonRes.leads || []);
      setDemoLeads(demoRes.leads || []);
    } catch (err) {
      console.error('Failed to load quotation requests:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Background polling every 15 seconds
    const interval = setInterval(() => {
      // Pause polling if an admin modal is open
      if (!activeModalLead && !activeDemoLead) {
        loadData(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeModalLead, activeDemoLead]);

  async function handleMarkSent(lead) {
    if (!confirm(`Mark quotation as sent to ${lead.name} (${lead.email || lead.phone})? This will return the lead to the salesperson for Phase 2 follow-up.`)) {
      return;
    }
    setActingId(lead.id);
    try {
      await companyPortalApi.updateLead(lead.id, { status: 'quotation_sent' });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update quotation status');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="quotations-page" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Admin Queue</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
            Quotation Workflow & Delivery Queue
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Review sales rep pricing requests, configure custom service proposals, deliver demo websites, and monitor closing status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={loading}
          style={{
            height: '38px',
            padding: '0 16px',
            borderRadius: '9px',
            border: '1px solid #E6E9EE',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '13px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Refreshing…' : 'Refresh Queue'}</span>
        </button>
      </div>

      {/* KPI Stat Widgets (Component 3.1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Card 1: Awaiting Admin Quote */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #F68713',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Awaiting Admin Quote
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFF3E6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F68713' }}>
              <Hourglass size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {requestedLeads.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F68713', backgroundColor: '#FFF3E6', padding: '2px 8px', borderRadius: '999px' }}>
              Pending Pricing
            </span>
          </div>
        </div>

        {/* Card 2: Demo Requested */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #2A9CB8',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Demo & Specs Requested
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A9CB8' }}>
              <Monitor size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {demoLeads.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A9CB8', backgroundColor: '#E8F6FA', padding: '2px 8px', borderRadius: '999px' }}>
              Needs Prototype Link
            </span>
          </div>
        </div>

        {/* Card 3: Quote Sent */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #3B82F6',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quote Sent (In Follow-Up)
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <Send size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {sentLeads.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '999px' }}>
              Phase 2 Active
            </span>
          </div>
        </div>

        {/* Card 4: Won Deals */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #059669',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Closed & Won
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <FileCheck2 size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {wonLeads.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '999px' }}>
              Converted Deals
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Live Queue Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Column 1: Demo & Details Requests */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid #E6E9EE',
            backgroundColor: '#FBFDFE',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#E8F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A9CB8' }}>
                <Monitor size={15} />
              </div>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                  Demo & Prototype Queue
                </h2>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Websites & feature overviews</span>
              </div>
            </div>
            <span className="num" style={{
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: '#E8F6FA',
              color: '#1D667C',
              padding: '3px 10px',
              borderRadius: '999px',
            }}>
              {demoLeads.length} Pending
            </span>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '720px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', color: '#9CA3AF', fontSize: '13px' }}>Loading requests…</p>
            ) : demoLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#9CA3AF' }}>
                <CheckCircle2 size={32} color="#2A9CB8" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                <p style={{ fontWeight: 700, margin: 0, color: '#374151', fontSize: '14px' }}>Demo Queue Clear</p>
                <span style={{ fontSize: '12px' }}>No pending demo website requests from clients.</span>
              </div>
            ) : (
              demoLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '10px',
                    padding: '14px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A9CB8'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(42,156,184,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E6E9EE'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
                        {lead.name}
                      </span>
                      {lead.lead_company && (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>{lead.lead_company}</div>
                      )}
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {lead.phone && (
                          <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#374151', fontWeight: 600 }}>
                            <Phone size={12} color="#6B7280" /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span style={{ color: '#2A9CB8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {lead.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}>
                      Rep: {lead.assigned_name || lead.claimed_by_name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Requirements Box */}
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}>
                    <div style={{ fontWeight: 700, color: '#1D667C', marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Monitor size={12} color="#2A9CB8" />
                      <span>Client Demo Requirement:</span>
                    </div>
                    <div style={{ color: '#334155', lineHeight: 1.45 }}>
                      {lead.demo_notes || lead.notes || 'Client requested live demo website and product capabilities review.'}
                    </div>
                    {lead.demo_link && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '11px' }}>Current Demo:</span>
                        <a
                          href={lead.demo_link.startsWith('http') ? lead.demo_link : `https://${lead.demo_link}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2A9CB8', textDecoration: 'underline', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          {lead.demo_link} <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDemoLead(lead);
                        setActiveDemoChannel('whatsapp');
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#ECFDF5',
                        color: '#047857',
                        border: '1px solid #A7F3D0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDemoLead(lead);
                        setActiveDemoChannel('email');
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Mail size={12} />
                      <span>Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDemoLead(lead);
                        setActiveDemoChannel(lead.phone ? 'whatsapp' : 'email');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#2A9CB8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 2px rgba(42,156,184,0.2)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Globe size={12} />
                      <span>{lead.demo_link ? 'Edit Demo' : 'Deliver Demo'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Quotation Requests from Sales */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid #E6E9EE',
            backgroundColor: '#FFFCFA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#FFF3E6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F68713' }}>
                <Hourglass size={15} />
              </div>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                  Quotation Requests
                </h2>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Submitted by sales representatives</span>
              </div>
            </div>
            <span className="num" style={{
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: '#FFF3E6',
              color: '#B65807',
              padding: '3px 10px',
              borderRadius: '999px',
            }}>
              {requestedLeads.length} Pending
            </span>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '720px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', color: '#9CA3AF', fontSize: '13px' }}>Loading requests…</p>
            ) : requestedLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#9CA3AF' }}>
                <CheckCircle2 size={32} color="#F68713" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                <p style={{ fontWeight: 700, margin: 0, color: '#374151', fontSize: '14px' }}>All Quotes Prepared</p>
                <span style={{ fontSize: '12px' }}>No pending quotation requests from sales representatives.</span>
              </div>
            ) : (
              requestedLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '10px',
                    padding: '14px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F68713'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(246,135,19,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E6E9EE'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
                          {lead.name}
                        </span>
                        {lead.quotation_notes?.includes('[REVISION') && (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: '#FFF3E6',
                            color: '#C2410C',
                            border: '1px solid #FDBA74',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}>
                            <RefreshCw size={9} /> Revision
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {lead.phone && (
                          <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#374151', fontWeight: 600 }}>
                            <Phone size={12} color="#6B7280" /> {lead.phone}
                          </span>
                        )}
                        {lead.email ? (
                          <span style={{ color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {lead.email}
                          </span>
                        ) : (
                          <span style={{ color: '#D97706', fontSize: '11px', backgroundColor: '#FEF3C7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={10} /> No email recorded
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}>
                      Rep: {lead.assigned_name || lead.claimed_by_name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Requirements Details Box */}
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}>
                    <div style={{ fontWeight: 700, color: '#1F2937', marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Wrench size={12} color="#F68713" />
                      <span>Services: {lead.quotation_services || 'Custom Scope'}</span>
                    </div>
                    {lead.quotation_scope && (
                      <div style={{ color: '#4B5563', marginBottom: '4px', lineHeight: 1.4 }}>
                        <strong style={{ color: '#1F2937' }}>Scope:</strong> {lead.quotation_scope}
                      </div>
                    )}
                    {lead.quotation_notes && (
                      <div style={{ color: '#4B5563', lineHeight: 1.4 }}>
                        <strong style={{ color: '#1F2937' }}>Notes / Budget:</strong> {lead.quotation_notes}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setActiveModalLead(lead)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#ECFDF5',
                        color: '#047857',
                        border: '1px solid #A7F3D0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModalLead(lead)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Mail size={12} />
                      <span>Email Proposal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkSent(lead)}
                      disabled={actingId === lead.id}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#F68713',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: actingId === lead.id ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 2px rgba(246,135,19,0.2)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Send size={12} />
                      <span>{actingId === lead.id ? 'Updating…' : 'Mark as Sent'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Quotes Sent (Phase 2 Follow-Up) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid #E6E9EE',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                <Send size={15} />
              </div>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                  Quotes Delivered
                </h2>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Sales reps actively following up</span>
              </div>
            </div>
            <span className="num" style={{
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              padding: '3px 10px',
              borderRadius: '999px',
            }}>
              {sentLeads.length} Active
            </span>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '720px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', color: '#9CA3AF', fontSize: '13px' }}>Loading…</p>
            ) : sentLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#9CA3AF' }}>
                <p style={{ margin: 0, fontSize: '13px' }}>No leads currently in post-quotation follow-up.</p>
              </div>
            ) : (
              sentLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '8px',
                    padding: '12px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E6E9EE'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>{lead.name}</strong>
                      <div className="num" style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                        {lead.phone || lead.email}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#4B5563', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Rep: {lead.assigned_name || 'Assigned'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <Check size={12} />
                    <span>Quotation delivered • Rep in closing negotiation</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin Direct Quotation Delivery Modal (WhatsApp / Email / Manual) */}
      <AdminSendQuotationModal
        lead={activeModalLead}
        isOpen={Boolean(activeModalLead)}
        onClose={() => setActiveModalLead(null)}
        onSuccess={loadData}
      />

      {/* Admin Provide Demo Website Modal */}
      <AdminProvideDemoModal
        lead={activeDemoLead}
        isOpen={Boolean(activeDemoLead)}
        initialChannel={activeDemoChannel}
        onClose={() => setActiveDemoLead(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
