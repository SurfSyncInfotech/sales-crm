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
} from 'lucide-react';
import { Avatar, Badge, Card, PageHeader, StatCard } from '../components/ui';
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

  async function loadData() {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
    <div className="page" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
      <PageHeader
        eyebrow="Quotations"
        title="Quotation Workflow & Admin Queue"
        subtitle="Review salesperson quotation requests, see requested services & client specifications, and notify sales upon sending."
      />

      <section className="ui-stat-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Hourglass} label="Awaiting Admin Quote" value={requestedLeads.length} tone="warm" />
        <StatCard icon={Monitor} label="Demo & Details Requested" value={demoLeads.length} tone="blue" />
        <StatCard icon={Send} label="Quote Sent (In Follow-up)" value={sentLeads.length} tone="neutral" />
        <StatCard icon={FileCheck2} label="Closed & Won Deals" value={wonLeads.length} tone="green" />
      </section>

      {/* 3-Column Live Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Column 1: Demo Website & Client Detailed Requests */}
        <div className="panel" style={{ padding: '1.25rem', borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={17} color="#0284c7" />
              <span>Demo & Details Requests</span>
            </h2>
            <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>
              {demoLeads.length} Pending
            </span>
          </div>

          {loading ? (
            <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>Loading requests…</p>
          ) : demoLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
              <CheckCircle2 size={36} color="#0284c7" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: 0 }}>All caught up!</p>
              <small>No pending demo website requests from clients.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {demoLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{lead.name}</strong>
                      {lead.lead_company && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{lead.lead_company}</div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {lead.phone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span style={{ color: '#0369a1', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {lead.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                      }}
                    >
                      Rep: {lead.assigned_name || lead.claimed_by_name || 'Sales Rep'}
                    </span>
                  </div>

                  {/* Demo requirements box */}
                  <div
                    style={{
                      margin: '0.75rem 0',
                      padding: '0.75rem',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#0369a1', marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Monitor size={13} color="#0284c7" />
                      <span>Requested Demo Website & Specs:</span>
                    </div>
                    <div style={{ color: '#334155', lineHeight: 1.45 }}>
                      {lead.demo_notes || lead.notes || 'Client requested demo website and feature overview.'}
                    </div>
                    {lead.demo_link && (
                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #bae6fd' }}>
                        <span style={{ fontWeight: '700', color: '#059669' }}>Existing Demo: </span>
                        <a
                          href={lead.demo_link.startsWith('http') ? lead.demo_link : `https://${lead.demo_link}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: '600' }}
                        >
                          {lead.demo_link}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Send via WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDemoLead(lead);
                        setActiveDemoChannel('whatsapp');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title="Send demo website directly to lead WhatsApp"
                    >
                      <MessageSquare size={13} />
                      <span>Send via WhatsApp</span>
                    </button>

                    {/* Send via Email */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDemoLead(lead);
                        setActiveDemoChannel('email');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title="Send demo website link via Email"
                    >
                      <Mail size={13} />
                      <span>Send via Email</span>
                    </button>

                    {/* Deliver / Edit Button */}
                    <button
                      type="button"
                      className="primary-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                      onClick={() => {
                        setActiveDemoLead(lead);
                        setActiveDemoChannel(lead.phone ? 'whatsapp' : 'email');
                      }}
                    >
                      <Globe size={13} />
                      <span>{lead.demo_link ? 'Edit Demo' : 'Deliver Demo'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Awaiting Admin Quotation */}
        <div className="panel" style={{ padding: '1.25rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>
              ⏳ Quotation Requests from Salespersons
            </h2>
            <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '700' }}>
              {requestedLeads.length} Pending
            </span>
          </div>

          {loading ? (
            <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>Loading requests…</p>
          ) : requestedLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: '600', margin: 0 }}>All caught up!</p>
              <small>No pending quotation requests from salespersons.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requestedLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{lead.name}</strong>
                      {lead.quotation_notes?.includes('[REVISION') && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.72rem',
                            backgroundColor: '#ffedd5',
                            color: '#c2410c',
                            border: '1px solid #fdba74',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <RefreshCw size={11} />
                          <span>Revision / Negotiation</span>
                        </span>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {lead.phone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {lead.phone}
                          </span>
                        )}
                        {lead.email ? (
                          <span style={{ color: '#0369a1', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {lead.email}
                          </span>
                        ) : (
                          <span style={{ color: '#d97706', fontSize: '0.73rem', backgroundColor: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> No email recorded
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#ccfbf1',
                        color: '#0f766e',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                      }}
                    >
                      Rep: {lead.assigned_name || lead.claimed_by_name || 'Sales Rep'}
                    </span>
                  </div>

                  {/* Requirements box */}
                  <div
                    style={{
                      margin: '0.75rem 0',
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Wrench size={13} color="#0f766e" />
                      <span>Services: {lead.quotation_services || 'Custom Requirement'}</span>
                    </div>
                    {lead.quotation_scope && (
                      <div style={{ color: '#475569', marginBottom: '4px' }}>
                        <strong>Scope:</strong> {lead.quotation_scope}
                      </div>
                    )}
                    {lead.quotation_notes && (
                      <div style={{ color: '#475569' }}>
                        <strong>Notes & Budget:</strong> {lead.quotation_notes}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Send on WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => setActiveModalLead(lead)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title="Send quotation directly to lead WhatsApp"
                    >
                      <MessageSquare size={13} />
                      <span>Send via WhatsApp</span>
                    </button>

                    {/* Send on Email Button */}
                    <button
                      type="button"
                      onClick={() => setActiveModalLead(lead)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title="Send quotation proposal via Email"
                    >
                      <Mail size={13} />
                      <span>Send via Email</span>
                    </button>

                    {/* Manual Mark Sent Button */}
                    <button
                      type="button"
                      className="primary-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        backgroundColor: '#0d9488',
                        color: '#fff',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => handleMarkSent(lead)}
                      disabled={actingId === lead.id}
                      title="Mark as sent manually if already delivered"
                    >
                      <Send size={13} />
                      <span>{actingId === lead.id ? 'Updating…' : 'Mark as Sent'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Quotations Sent (Phase 2 Rep Follow-up) */}
        <div className="panel" style={{ padding: '1.25rem', borderTop: '4px solid #0d9488' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={16} color="#0d9488" />
              <span>Quotes Sent (Rep in Phase 2 Follow-Up)</span>
            </h2>
            <span className="badge" style={{ backgroundColor: '#ccfbf1', color: '#0f766e', fontWeight: '700' }}>
              {sentLeads.length} Active
            </span>
          </div>

          {loading ? (
            <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>Loading…</p>
          ) : sentLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
              <p style={{ margin: 0 }}>No leads in post-quotation follow-up right now.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sentLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong>{lead.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Rep: {lead.assigned_name || 'Assigned'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    {lead.phone || lead.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} />
                    <span>Quote sent • Sales rep currently following up with client to close</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
