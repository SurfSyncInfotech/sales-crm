import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesApi } from '../api/client';
import { subscribeLiveSync } from '../services/liveSyncService';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  FileText,
  Clock,
  Trophy,
  XCircle,
  Search,
  Phone,
  MessageCircle,
  Zap,
  ArrowRight,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';

function timeAgo(date) {
  if (!date) return 'Recently';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SalesDashboardPage() {
  const { user } = useAuth('sales');
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [poolLeads, setPoolLeads] = useState([]);
  const [pipelineData, setPipelineData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [statsRes, poolRes, pipeRes, tasksRes, actRes] = await Promise.all([
        salesApi.stats(),
        salesApi.leads('pool'),
        salesApi.pipeline(),
        salesApi.followups(),
        salesApi.activity(),
      ]);
      setStats(statsRes);
      setPoolLeads((poolRes.leads || []).slice(0, 5));
      setPipelineData(pipeRes.pipeline || {});
      setTasks((tasksRes.followups || []).slice(0, 5));
      setActivities((actRes.activities || []).slice(0, 6));
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Universal live cross-tab & component sync
    const unsubscribe = subscribeLiveSync(() => {
      loadData(true);
    });

    // Background polling every 15 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  async function handleClaim(leadId) {
    setClaimingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadData(true);
      navigate('/sales/pipeline');
    } catch (err) {
      alert(err.message || 'Could not claim lead');
      loadData(true);
    } finally {
      setClaimingId(null);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/sales/leads?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  // Pipeline funnel steps
  const funnel = [
    { label: 'New Leads', count: pipelineData.new_pool?.length || stats?.pool_leads || 0, color: '#2A9CB8' },
    { label: 'Contacted', count: pipelineData.contacted?.length || 0, color: '#38BDF8' },
    { label: 'Interested', count: pipelineData.interested?.length || 0, color: '#34D399' },
    { label: 'Follow-Up', count: pipelineData.followup?.length || 0, color: '#FBBF24' },
    { label: 'Quote Req.', count: pipelineData.quotation_requested?.length || stats?.pending_quotes || 0, color: '#F68713' },
    { label: 'Quote Sent', count: pipelineData.quotation_sent?.length || 0, color: '#818CF8' },
    { label: 'Won', count: pipelineData.won?.length || stats?.won || 0, color: '#16A34A' },
    { label: 'Lost', count: pipelineData.lost?.length || stats?.lost || 0, color: '#DC2626' },
  ];

  const maxCount = Math.max(...funnel.map((f) => f.count), 1);
  const totalLeadsCount = funnel.reduce((acc, curr) => acc + curr.count, 0);
  const wonCount = pipelineData.won?.length || stats?.won || 0;
  const activeLeadsCount = (stats?.my_leads || 0) + (stats?.pool_leads || 0);

  const claimedTotal =
    stats?.my_total_leads ||
    (stats?.my_leads || 0) + wonCount + (stats?.lost || 0) + (stats?.not_interested || 0);
  const conversionRate =
    claimedTotal > 0 ? Math.min(100, Math.round((wonCount / claimedTotal) * 100)) : 0;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: "'Manrope', sans-serif" }}>
      {/* Top Hero Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em', fontFamily: "'Manrope', sans-serif" }}>
            Sales Overview
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.86rem', fontFamily: "'Manrope', sans-serif" }}>
            Welcome back, <strong style={{ color: '#111827' }}>{user?.name || 'Representative'}</strong>. Real-time lead flow and operational velocity.
          </p>
        </div>

        {/* Global Search form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, phone, company..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #E6E9EE',
                backgroundColor: '#FFFFFF',
                fontSize: '0.82rem',
                color: '#111827',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#F68713')}
              onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
            />
          </div>
          <button type="submit" className="btn-secondary-action" style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
            Search
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* SurfSync KPI Stat Widget Matrix (Component 3.1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* KPI 1: Open Lead Pool */}
        <Link to="/sales/leads?tab=pool" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="sales-card" style={{ padding: '1.2rem', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>
                Open Lead Pool
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#E8F6FA', // Ocean Cyan soft
                  color: '#2A9CB8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={16} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '0.6rem', lineHeight: 1.1 }}>
              {stats?.pool_leads ?? 0}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
              <span className="badge-status" style={{ backgroundColor: '#E8F6FA', color: '#1D667C', padding: '2px 6px', fontSize: '0.68rem' }}>
                Unclaimed
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Ready to claim</span>
            </div>
          </div>
        </Link>

        {/* KPI 2: My Active Leads */}
        <Link to="/sales/leads?tab=my" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="sales-card" style={{ padding: '1.2rem', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>
                My Pipeline
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#FFF3E6', // Tangerine soft
                  color: '#F68713',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={16} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '0.6rem', lineHeight: 1.1 }}>
              {stats?.my_leads ?? 0}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
              <span className="badge-status" style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', fontSize: '0.68rem' }}>
                Active
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>In discussion</span>
            </div>
          </div>
        </Link>

        {/* KPI 3: Quotes Pending Admin */}
        <Link to="/sales/pipeline" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="sales-card" style={{ padding: '1.2rem', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>
                Pending Quotes
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF3C7', // Amber warning soft
                  color: '#CA8A04',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={16} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '0.6rem', lineHeight: 1.1 }}>
              {stats?.pending_quotes ?? 0}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
              <span className="badge-status" style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 6px', fontSize: '0.68rem' }}>
                Review
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Awaiting admin</span>
            </div>
          </div>
        </Link>

        {/* KPI 4: Due Auto-Reminders */}
        <Link to="/sales/reminders" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="sales-card" style={{ padding: '1.2rem', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>
                Follow-Ups Due
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: (stats?.due_reminders || 0) > 0 ? '#FEE2E2' : '#F1F3F6',
                  color: (stats?.due_reminders || 0) > 0 ? '#DC2626' : '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '0.6rem', lineHeight: 1.1 }}>
              {stats?.due_reminders ?? 0}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
              <span
                className="badge-status"
                style={{
                  backgroundColor: (stats?.due_reminders || 0) > 0 ? '#FEE2E2' : '#F1F3F6',
                  color: (stats?.due_reminders || 0) > 0 ? '#DC2626' : '#4B5563',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                }}
              >
                {(stats?.due_reminders || 0) > 0 ? 'Action Needed' : 'Cleared'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Scheduled cadence</span>
            </div>
          </div>
        </Link>

        {/* KPI 5: Won Deals */}
        <div className="sales-card" style={{ padding: '1.2rem', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>
              Deals Won
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7', // Success Green soft
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={16} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '0.6rem', lineHeight: 1.1 }}>
            {stats?.won ?? 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
            <span className="badge-status" style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', fontSize: '0.68rem' }}>
              Won
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Successfully closed</span>
          </div>
        </div>

        {/* KPI 6: Lost / Dropped */}
        <Link to="/sales/leads?stage=not_interested" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="sales-card" style={{ padding: '1.2rem', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>
                Lost / Dropped
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F3F6',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XCircle size={16} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', marginTop: '0.6rem', lineHeight: 1.1 }}>
              {(stats?.lost || 0) + (stats?.not_interested || 0)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
              <span className="badge-status" style={{ backgroundColor: '#F1F3F6', color: '#4B5563', padding: '2px 6px', fontSize: '0.68rem' }}>
                Closed
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Not converted</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Middle Grid: Funnel (Left) + Conversion Velocity (Center) + Today's Follow-Ups (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* Pipeline Funnel Velocity */}
        <div className="sales-card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
                Pipeline Stage Velocity
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.76rem', color: '#6B7280' }}>
                Real distribution of all leads in workflow
              </p>
            </div>
            <span
              className="num"
              style={{
                fontSize: '0.74rem',
                backgroundColor: '#F1F3F6',
                color: '#374151',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: '700',
              }}
            >
              {totalLeadsCount} Total Leads
            </span>
          </div>

          {/* Bar Chart Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '190px',
              paddingBottom: '2.2rem',
              position: 'relative',
              gap: '6px',
              marginTop: 'auto',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            {funnel.map((item, idx) => {
              const maxScale = Math.max(Math.ceil(maxCount * 1.15), 10);
              const heightPct = item.count > 0 ? Math.max(8, Math.round((item.count / maxScale) * 100)) : 0;
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  <span
                    className="num"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      color: item.count > 0 ? item.color : '#9CA3AF',
                      marginBottom: '4px',
                      fontFamily: "'Manrope', sans-serif",
                    }}
                  >
                    {item.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '28px',
                      height: item.count > 0 ? `${heightPct}%` : '3px',
                      backgroundColor: item.count > 0 ? item.color : '#E5E7EB',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      color: '#4B5563',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      transform: 'translateY(100%)',
                      paddingTop: '6px',
                      maxWidth: '44px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div
          className="sales-card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.96rem', fontWeight: '800', color: '#111827' }}>
              Conversion Velocity
            </span>
            <span
              className="badge-status"
              style={{
                backgroundColor: '#DCFCE7',
                color: '#166534',
                fontSize: '0.68rem',
              }}
            >
              <TrendingUp size={11} /> Real-Time
            </span>
          </div>

          {/* Metric display */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', margin: 'auto 0', padding: '0.75rem 0' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#F1F3F6" strokeWidth="9" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#F68713" // Tangerine brand accent
                  strokeWidth="9"
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * conversionRate) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span className="num" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', lineHeight: 1 }}>
                  {conversionRate}%
                </span>
                <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginTop: '2px' }}>
                  Win Rate
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827' }}>
                Win Ratio
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                Claimed to Won deals
              </div>
              <div className="num" style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: '700', marginTop: '2px' }}>
                {wonCount} deals closed
              </div>
            </div>
          </div>

          {/* Breakdown summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', borderTop: '1px solid #E6E9EE', paddingTop: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Active in Pipeline</span>
              <strong className="num" style={{ color: '#111827' }}>{activeLeadsCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Won Conversions</span>
              <strong className="num" style={{ color: '#16A34A' }}>{wonCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Lost / Dropped</span>
              <strong className="num" style={{ color: '#DC2626' }}>{stats?.lost || 0}</strong>
            </div>
          </div>
        </div>

        {/* Today's Follow-Up Tasks */}
        <div className="sales-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
              Today's Cadence Tasks
            </h3>
            <span
              className="badge-status"
              style={{
                backgroundColor: tasks.length > 0 ? '#FFF3E6' : '#F1F3F6',
                color: tasks.length > 0 ? '#B65807' : '#4B5563',
                fontSize: '0.68rem',
              }}
            >
              {tasks.length} Due
            </span>
          </div>

          {/* Task list items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {tasks.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6B7280', margin: 'auto' }}>
                <CheckCircle2 size={28} color="#16A34A" style={{ margin: '0 auto 0.4rem auto' }} />
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.82rem', color: '#111827' }}>No pending tasks</p>
                <small style={{ fontSize: '0.74rem' }}>Scheduled auto-followups will appear here.</small>
              </div>
            ) : (
              tasks.map((task, i) => {
                const initial = task.name ? task.name.charAt(0).toUpperCase() : 'L';
                const waLink = task.phone ? `https://wa.me/${task.phone.replace(/[^0-9]/g, '')}` : null;
                const statusBadge = task.day_number ? `Day ${task.day_number}` : task.status;

                return (
                  <div
                    key={task.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      borderBottom: i < tasks.length - 1 ? '1px solid #F1F3F6' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: '#E8F6FA',
                          color: '#2A9CB8',
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {initial}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.lead_company || task.phone || 'Inquiry'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span className="badge-status" style={{ backgroundColor: '#F1F3F6', color: '#374151', fontSize: '0.66rem', padding: '1px 6px' }}>
                        {statusBadge}
                      </span>
                      {task.phone && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <a
                            href={`tel:${task.phone}`}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              backgroundColor: '#E8F6FA',
                              color: '#2A9CB8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                            }}
                            title="Call"
                          >
                            <Phone size={11} />
                          </a>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                              }}
                              title="WhatsApp"
                            >
                              <MessageCircle size={11} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link
            to="/sales/reminders"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: '#2A9CB8',
              textDecoration: 'none',
              paddingTop: '0.75rem',
              borderTop: '1px solid #F1F3F6',
              marginTop: '0.5rem',
            }}
          >
            <span>View All Follow-Ups</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Bottom Grid: Unclaimed Open Pool Leads (Left) + Live Activity Stream (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* Unclaimed Open Pool Table */}
        <div className="sales-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
                Unclaimed Pool Leads
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.76rem', color: '#6B7280' }}>
                First-come first-serve incoming opportunities
              </p>
            </div>
            <Link
              to="/sales/leads?tab=pool"
              style={{ fontSize: '0.78rem', fontWeight: '700', color: '#2A9CB8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View Open Pool</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* High-density table */}
          <div className="surfsync-table-container">
            <table className="surfsync-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Received</th>
                  <th>Source</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {poolLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                      No unclaimed leads in pool right now.
                    </td>
                  </tr>
                ) : (
                  poolLeads.map((lead) => {
                    const initials = lead.name ? lead.name.slice(0, 2).toUpperCase() : 'L';

                    return (
                      <tr key={lead.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                backgroundColor: '#FFF3E6',
                                color: '#F68713',
                                fontWeight: '700',
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <span style={{ fontWeight: '700', color: '#111827' }}>{lead.name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#4B5563' }}>{lead.lead_company || '—'}</td>
                        <td className="num" style={{ color: '#6B7280', fontSize: '0.78rem' }}>
                          {timeAgo(lead.created_at || lead.lead_date)}
                        </td>
                        <td>
                          <span
                            className="badge-status"
                            style={{
                              backgroundColor: '#E8F6FA',
                              color: '#1D667C',
                              fontSize: '0.68rem',
                            }}
                          >
                            {lead.source_name || 'Website'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleClaim(lead.id)}
                            disabled={claimingId === lead.id}
                            className="btn-primary-action"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                          >
                            <Zap size={11} />
                            {claimingId === lead.id ? 'Claiming…' : 'Claim'}
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

        {/* Live Stream Activity */}
        <div className="sales-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
                Recent Operational Activity
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.76rem', color: '#6B7280' }}>
                Audit log of lead transitions & updates
              </p>
            </div>
            <span className="badge-status" style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '0.68rem' }}>
              <span className="badge-status-dot" style={{ backgroundColor: '#16A34A' }} /> Live
            </span>
          </div>

          {/* Timeline Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                <Activity size={24} color="#9CA3AF" style={{ margin: '0 auto 0.4rem auto' }} />
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.82rem' }}>No recent activity</p>
                <small style={{ fontSize: '0.74rem' }}>Status changes and claims will log here.</small>
              </div>
            ) : (
              activities.map((act, i) => {
                let icon = <UserCheck size={12} />;
                let bg = '#E8F6FA';
                let color = '#2A9CB8';

                if (act.status === 'won') {
                  icon = <Trophy size={12} />;
                  bg = '#DCFCE7';
                  color = '#16A34A';
                } else if (act.status === 'interested') {
                  icon = <Star size={12} />;
                  bg = '#FEF3C7';
                  color = '#CA8A04';
                } else if (act.status === 'quotation_requested' || act.status === 'quotation_sent') {
                  icon = <FileText size={12} />;
                  bg = '#FFF3E6';
                  color = '#F68713';
                } else if (act.status === 'lost') {
                  icon = <XCircle size={12} />;
                  bg = '#FEE2E2';
                  color = '#DC2626';
                }

                return (
                  <div key={act.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: bg,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827', lineHeight: 1.25 }}>
                        {String(act.title || '').replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {act.subtitle}
                      </div>
                    </div>
                    <div className="num" style={{ fontSize: '0.7rem', color: '#9CA3AF', flexShrink: 0 }}>
                      {timeAgo(act.time)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
