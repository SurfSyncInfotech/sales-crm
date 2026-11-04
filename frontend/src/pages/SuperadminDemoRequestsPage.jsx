import { useState, useEffect, useCallback } from 'react';
import { demoRequestsApi } from '../api/client';
import {
  Sparkles,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Trash2,
  ChevronRight,
  ExternalLink,
  Filter,
} from 'lucide-react';

export default function SuperadminDemoRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, newRequests: 0, contacted: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await demoRequestsApi.list({
        status: statusFilter,
        search: searchTerm.trim(),
      });
      if (data) {
        setRequests(data.requests || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load demo requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    try {
      await demoRequestsApi.updateStatus(id, newStatus);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      fetchRequests();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this demo request?')) return;
    try {
      await demoRequestsApi.delete(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      fetchRequests();
    } catch (err) {
      console.error('Failed to delete request:', err);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'new':
        return {
          bg: '#FEF3C7',
          color: '#B45309',
          border: '#FDE68A',
          label: 'New Request',
        };
      case 'contacted':
        return {
          bg: '#EFF6FF',
          color: '#1D4ED8',
          border: '#BFDBFE',
          label: 'Contacted',
        };
      case 'converted':
        return {
          bg: '#DCFCE7',
          color: '#15803D',
          border: '#BBF7D0',
          label: 'Converted',
        };
      case 'closed':
        return {
          bg: '#F3F4F6',
          color: '#4B5563',
          border: '#E5E7EB',
          label: 'Closed',
        };
      default:
        return {
          bg: '#F3F4F6',
          color: '#374151',
          border: '#E5E7EB',
          label: status,
        };
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: '800',
                color: '#111827',
                margin: 0,
              }}
            >
              Landing Page Demo Requests
            </h1>
          </div>
          <p
            style={{
              fontSize: '0.84rem',
              color: '#6B7280',
              margin: '4px 0 0 0',
            }}
          >
            Direct service inquiries and live demo bookings submitted by company owners from patronping.com.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '9px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            color: '#374151',
            fontSize: '0.82rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E6E9EE',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>
            Total Inquiries
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
            {metrics.total}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>All-time landing requests</span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #FDE68A',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>
            New / Uncontacted
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#D97706', marginTop: '4px' }}>
            {metrics.newRequests}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#B45309' }}>Action required</span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #BFDBFE',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase' }}>
            Contacted
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2563EB', marginTop: '4px' }}>
            {metrics.contacted}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#1D4ED8' }}>In discussion</span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #BBF7D0',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#15803D', textTransform: 'uppercase' }}>
            Converted Clients
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#16A34A', marginTop: '4px' }}>
            {metrics.converted}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#15803D' }}>Onboarded to PatronPing</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #E6E9EE',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, company, email, or phone..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.84rem',
              color: '#111827',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#6B7280' }}>Status:</span>
          {['all', 'new', 'contacted', 'converted', 'closed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                border: 'none',
                padding: '5px 12px',
                borderRadius: '7px',
                fontSize: '0.76rem',
                fontWeight: statusFilter === st ? '700' : '500',
                backgroundColor: statusFilter === st ? '#111827' : '#F3F4F6',
                color: statusFilter === st ? '#FFFFFF' : '#4B5563',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E6E9EE',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6E9EE', color: '#4B5563', fontWeight: '700' }}>
                <th style={{ padding: '12px 16px' }}>Prospect Name</th>
                <th style={{ padding: '12px 16px' }}>Company</th>
                <th style={{ padding: '12px 16px' }}>Contact Details</th>
                <th style={{ padding: '12px 16px' }}>Requirement</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Requested At</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#9CA3AF' }}>
                    Loading demo requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={28} color="#D1D5DB" />
                      <div style={{ fontWeight: '700', fontSize: '0.94rem', color: '#374151' }}>
                        No demo requests found
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                        {statusFilter !== 'all' ? `No requests with status "${statusFilter}"` : 'When someone fills the form on patronping.com, their request appears here instantly.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const badge = getStatusBadge(r.status);
                  const cleanPhone = String(r.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#111827' }}>{r.full_name}</div>
                        <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>ID: #{r.id}</span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="#6B7280" />
                          <span style={{ fontWeight: '600', color: '#374151' }}>{r.company_name}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={13} color="#9CA3AF" />
                            <a
                              href={`mailto:${r.email}`}
                              style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '500' }}
                            >
                              {r.email}
                            </a>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#374151', fontWeight: '600' }}>{r.phone}</span>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <a
                                href={`tel:${r.phone}`}
                                title="Click to Call"
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#EFF6FF',
                                  borderRadius: '4px',
                                  color: '#2563EB',
                                  fontSize: '0.72rem',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                }}
                              >
                                Call
                              </a>
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open WhatsApp Chat"
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#DCFCE7',
                                  borderRadius: '4px',
                                  color: '#16A34A',
                                  fontSize: '0.72rem',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                }}
                              >
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.76rem',
                            fontWeight: '600',
                            color: '#334155',
                          }}
                        >
                          {r.requirement || 'General PatronPing Service'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={r.status}
                          disabled={updatingId === r.id}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="new">New Request</option>
                          <option value="contacted">Contacted</option>
                          <option value="converted">Converted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '0.78rem' }}>
                        {new Date(r.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          title="Delete Request"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
