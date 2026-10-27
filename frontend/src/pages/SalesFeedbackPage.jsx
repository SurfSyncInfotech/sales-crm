import React, { useEffect, useState } from 'react';
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
    default:
      return { bg: '#F1F3F6', color: '#4B5563', label: status || 'Lead' };
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
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Discussion & Feedback Logs
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.86rem' }}>
            Audit trail of rep notes, client requirements, and stage transition feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={loadFeedbacks}
          disabled={loading}
          className="btn-secondary-action"
          style={{ padding: '0.45rem 0.85rem' }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar (Foundation 02, 2.4) */}
      <div className="sales-card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '200px' }}>
          <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search client, phone, company, or discussion note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '7px 10px 7px 32px',
              fontSize: '0.82rem',
              border: '1px solid #E6E9EE',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value);
            setPage(1);
          }}
          style={{ padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #E6E9EE', borderRadius: '6px', backgroundColor: '#FFFFFF', outline: 'none' }}
        >
          <option value="all">All Transition Stages</option>
          <option value="interested">Interested</option>
          <option value="followup">Follow-Up</option>
          <option value="quotation_requested">Quote Requested</option>
          <option value="quotation_sent">Quote Sent</option>
          <option value="won">Won Deals</option>
          <option value="lost">Lost Deals</option>
          <option value="not_interested">Not Interested</option>
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6B7280' }}>
          Total Entries: <strong className="num" style={{ color: '#111827' }}>{pagination.total}</strong>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* High-Density Data Table (Component 3.2) */}
      <div className="surfsync-table-container">
        <table className="surfsync-table">
          <thead>
            <tr>
              <th>Client / Account</th>
              <th>Transition</th>
              <th>Discussion Notes & Feedback</th>
              <th>Recorded By</th>
              <th>Date & Time</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                  Loading feedback records…
                </td>
              </tr>
            ) : feedbacks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                  <MessageSquareText size={32} color="#D1D5DB" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>No feedback entries found</p>
                  <small style={{ fontSize: '0.78rem' }}>When stage changes occur, mandatory conversation notes will appear here.</small>
                </td>
              </tr>
            ) : (
              feedbacks.map((fb) => {
                const fromBadge = getStatusBadge(fb.from_status);
                const toBadge = getStatusBadge(fb.to_status);

                return (
                  <tr key={fb.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#111827' }}>{fb.lead_name}</div>
                      <div className="num" style={{ fontSize: '0.74rem', color: '#6B7280' }}>{fb.lead_phone}</div>
                      {fb.lead_company && (
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{fb.lead_company}</div>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span className="badge-status" style={{ backgroundColor: fromBadge.bg, color: fromBadge.color, fontSize: '0.66rem' }}>
                          {fromBadge.label}
                        </span>
                        <ArrowRight size={11} color="#9CA3AF" />
                        <span className="badge-status" style={{ backgroundColor: toBadge.bg, color: toBadge.color, fontSize: '0.66rem' }}>
                          {toBadge.label}
                        </span>
                      </div>
                    </td>

                    <td style={{ maxWidth: '420px' }}>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#1F2937',
                          lineHeight: '1.4',
                          backgroundColor: '#F9FAFB',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #E6E9EE',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {fb.feedback}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#374151', fontWeight: '600' }}>
                        <User size={12} color="#2A9CB8" />
                        <span>{fb.salesperson_name || 'Representative'}</span>
                      </div>
                    </td>

                    <td>
                      <div className="num" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#111827' }}>
                        {new Date(fb.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="num" style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                        {timeAgo(fb.created_at)}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {fb.lead_phone && (
                          <>
                            <a
                              href={`tel:${fb.lead_phone}`}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                              title="Call"
                            >
                              <Phone size={12} />
                            </a>
                            <button
                              type="button"
                              onClick={() => setActiveChatLead({ id: fb.lead_id, name: fb.lead_name, phone: fb.lead_phone })}
                              style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#16A34A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              title="WhatsApp"
                            >
                              <MessageSquare size={12} />
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
      {pagination.total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
            Showing <strong className="num" style={{ color: '#111827' }}>{(page - 1) * limit + 1}</strong> to{' '}
            <strong className="num" style={{ color: '#111827' }}>{Math.min(page * limit, pagination.total)}</strong> of{' '}
            <strong className="num" style={{ color: '#111827' }}>{pagination.total}</strong> records
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E6E9EE', fontSize: '0.78rem', backgroundColor: '#FFFFFF', outline: 'none' }}
            >
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary-action"
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <ChevronLeft size={13} />
              </button>
              <span className="num" style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0 6px', color: '#111827' }}>
                {page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-secondary-action"
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

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
