import React, { useEffect, useState, useMemo } from 'react';
import {
  MessageSquareText,
  Search,
  Filter,
  Phone,
  MessageSquare,
  ArrowRight,
  User,
  Calendar,
  Building,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { salesApi } from '../api/client';
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
      return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Interested' };
    case 'followup':
      return { bg: '#fefce8', color: '#ca8a04', border: '#fef08a', label: 'Follow-Up' };
    case 'quotation_requested':
      return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', label: 'Quote Requested' };
    case 'quotation_sent':
      return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', label: 'Quote Sent' };
    case 'won':
      return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Won Deal' };
    case 'lost':
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Lost' };
    case 'not_interested':
      return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: 'Not Interested' };
    case 'contacted':
      return { bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4', label: 'Contacted' };
    default:
      return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: status || 'Lead' };
  }
}

export default function SalesFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // WhatsApp Chat Modal
  const [activeChatLead, setActiveChatLead] = useState(null);

  async function loadFeedbacks() {
    try {
      setLoading(true);
      setError('');
      const res = await salesApi.feedbacks({
        page,
        limit,
        q: search.trim(),
        stage: stageFilter !== 'all' ? stageFilter : undefined,
      });
      setFeedbacks(res.feedbacks || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
      setError(err.message || 'Could not load feedback records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeedbacks();
  }, [page, limit, stageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadFeedbacks();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquareText size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
              Lead Stage Feedback
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Complete audit trail of sales notes, client responses, and discussion feedback recorded at every stage.
          </p>
        </div>

        <button
          type="button"
          onClick={loadFeedbacks}
          disabled={loading}
          style={{
            padding: '7px 14px',
            fontSize: '0.82rem',
            fontWeight: '600',
            backgroundColor: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#334155',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search by client name, phone, company, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 34px',
              fontSize: '0.82rem',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Stage Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '0 8px', backgroundColor: '#fff' }}>
          <Filter size={13} color="#64748b" />
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: 'none',
              outline: 'none',
              padding: '7px 4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#334155',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Stages</option>
            <option value="interested">Interested</option>
            <option value="followup">Follow-Up</option>
            <option value="quotation_requested">Quote Requested</option>
            <option value="quotation_sent">Quote Sent</option>
            <option value="won">Won Deals</option>
            <option value="lost">Lost Deals</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>

        {/* Total records badge */}
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
          Total Feedbacks: <strong style={{ color: '#0f172a' }}>{pagination.total}</strong>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '0.85rem',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Feedbacks List / Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            <RefreshCw size={22} className="spin" style={{ margin: '0 auto 8px', display: 'block', color: '#059669' }} />
            Loading feedback records…
          </div>
        ) : feedbacks.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
            <MessageSquareText size={32} style={{ margin: '0 auto 8px', opacity: 0.5, display: 'block' }} />
            <h4 style={{ margin: '0 0 4px 0', color: '#334155', fontSize: '0.95rem' }}>No feedback entries found</h4>
            <p style={{ margin: 0, fontSize: '0.78rem' }}>
              Whenever salespeople update lead stages and enter call/discussion notes, they will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Client / Company
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Stage Transition
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Feedback & Discussion Notes
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Recorded By
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                    Date & Time
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((fb) => {
                  const fromBadge = getStatusBadge(fb.from_status);
                  const toBadge = getStatusBadge(fb.to_status);
                  return (
                    <tr
                      key={fb.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                      {/* Lead / Contact */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.86rem', color: '#0f172a' }}>
                          {fb.lead_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          {fb.lead_phone}
                        </div>
                        {fb.lead_company && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Building size={11} /> {fb.lead_company}
                          </div>
                        )}
                      </td>

                      {/* Stage Transition */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
                          <span
                            style={{
                              backgroundColor: fromBadge.bg,
                              color: fromBadge.color,
                              border: `1px solid ${fromBadge.border}`,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: '600',
                            }}
                          >
                            {fromBadge.label}
                          </span>
                          <ArrowRight size={12} color="#94a3b8" />
                          <span
                            style={{
                              backgroundColor: toBadge.bg,
                              color: toBadge.color,
                              border: `1px solid ${toBadge.border}`,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: '700',
                            }}
                          >
                            {toBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* Feedback Note Content */}
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '380px' }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: '#1e293b',
                            lineHeight: '1.45',
                            backgroundColor: '#f8fafc',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {fb.feedback}
                        </div>
                      </td>

                      {/* Salesperson */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                          <User size={13} color="#059669" />
                          <span>{fb.salesperson_name || 'Sales Rep'}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.76rem', color: '#64748b' }}>
                        <div>{new Date(fb.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                          {new Date(fb.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({timeAgo(fb.created_at)})
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {fb.lead_phone && (
                            <>
                              <a
                                href={`tel:${fb.lead_phone}`}
                                title="Call Client"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  backgroundColor: '#f0fdf4',
                                  color: '#16a34a',
                                  border: '1px solid #bbf7d0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                }}
                              >
                                <Phone size={12} />
                              </a>
                              <button
                                type="button"
                                title="WhatsApp Chat"
                                onClick={() => setActiveChatLead({ id: fb.lead_id, name: fb.lead_name, phone: fb.lead_phone })}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ecfdf5',
                                  color: '#059669',
                                  border: '1px solid #a7f3d0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <MessageSquare size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.total > 0 && (
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
              <span>Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total} records</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
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
                Page {page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: page >= pagination.totalPages ? '#f1f5f9' : '#fff',
                  color: page >= pagination.totalPages ? '#94a3b8' : '#334155',
                  cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
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

      {/* WhatsApp Chat Modal */}
      {activeChatLead && (
        <WhatsAppChatModal
          isOpen={Boolean(activeChatLead)}
          onClose={() => setActiveChatLead(null)}
          initialLeadId={activeChatLead.id}
        />
      )}
    </div>
  );
}
