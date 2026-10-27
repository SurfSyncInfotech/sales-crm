import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  FileText,
  Clock,
  Trophy,
  XCircle,
  Search,
  Bell,
  Phone,
  MessageCircle,
  Zap,
  ArrowRight,
  Star,
  CheckCircle2,
} from 'lucide-react';

function timeAgo(date) {
  if (!date) return 'Recently';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
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

  async function loadData() {
    try {
      setLoading(true);
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
      setActivities((actRes.activities || []).slice(0, 5));
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleClaim(leadId) {
    setClaimingId(leadId);
    try {
      await salesApi.claimLead(leadId);
      await loadData();
      navigate('/sales/pipeline');
    } catch (err) {
      alert(err.message || 'Could not claim lead');
      loadData();
    } finally {
      setClaimingId(null);
    }
  }

  // Calculate funnel counts directly from DB
  const funnel = [
    { label: 'New Leads', count: pipelineData.new_pool?.length || stats?.pool_leads || 0, color: '#60a5fa' },
    { label: 'Contacted', count: pipelineData.contacted?.length || 0, color: '#2dd4bf' },
    { label: 'Interested', count: pipelineData.interested?.length || 0, color: '#4ade80' },
    { label: 'Follow-Up', count: pipelineData.followup?.length || 0, color: '#facc15' },
    { label: 'Quote Requested', count: pipelineData.quotation_requested?.length || stats?.pending_quotes || 0, color: '#fb923c' },
    { label: 'Quote Sent', count: pipelineData.quotation_sent?.length || 0, color: '#f87171' },
    { label: 'Won', count: pipelineData.won?.length || stats?.won || 0, color: '#c084fc' },
    { label: 'Lost', count: pipelineData.lost?.length || stats?.lost || 0, color: '#f472b6' },
    { label: 'Not Interested', count: pipelineData.not_interested?.length || 0, color: '#94a3b8' },
  ];

  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

  // Conversion calculations from real DB counts
  const totalLeadsCount = funnel.reduce((acc, curr) => acc + curr.count, 0);
  const wonCount = pipelineData.won?.length || stats?.won || 0;
  const activeLeadsCount = (stats?.my_leads || 0) + (stats?.pool_leads || 0);
  // Salesperson Conversion Rate based on Total Claimed Leads (does not drop on Not Interested)
  const claimedTotal = stats?.my_total_leads || ((stats?.my_leads || 0) + wonCount + (stats?.lost || 0) + (stats?.not_interested || 0));
  const conversionRate = claimedTotal > 0 ? Math.min(100, Math.round((wonCount / claimedTotal) * 100)) : 0;

  // Mini sparkline renderer
  const renderSparkline = (color) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '24px' }}>
      <div style={{ width: '4px', height: '8px', backgroundColor: color, borderRadius: '2px', opacity: 0.5 }} />
      <div style={{ width: '4px', height: '14px', backgroundColor: color, borderRadius: '2px', opacity: 0.7 }} />
      <div style={{ width: '4px', height: '11px', backgroundColor: color, borderRadius: '2px', opacity: 0.6 }} />
      <div style={{ width: '4px', height: '19px', backgroundColor: color, borderRadius: '2px', opacity: 0.9 }} />
      <div style={{ width: '4px', height: '24px', backgroundColor: color, borderRadius: '2px' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header Row with Search & Notification */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Welcome back, {user?.name || 'Sales Rep'}! Here's your sales overview for today.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search leads, clients, or companies..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px 8px 36px',
                borderRadius: '999px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Bell Icon */}
          <div
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={18} color="#475569" />
            {(stats?.due_reminders || 0) > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '7px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  border: '2px solid #fff',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 6 Top Metric Cards (Direct from Live DB) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Card 1: Open Lead Pool */}
        <Link to="/sales/leads?tab=pool" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '1.15rem',
              border: '1px solid #edf2f7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={17} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginTop: '0.75rem' }}>
              Open Lead Pool
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                {stats?.pool_leads ?? 0}
              </div>
              {renderSparkline('#3b82f6')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700', marginTop: '0.5rem' }}>
              Available in pool
            </div>
          </div>
        </Link>

        {/* Card 2: My Claimed Leads */}
        <Link to="/sales/leads?tab=my" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '1.15rem',
              border: '1px solid #edf2f7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={17} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginTop: '0.75rem' }}>
              My Claimed Leads
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                {stats?.my_total_leads ?? stats?.my_leads ?? 0}
              </div>
              {renderSparkline('#10b981')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700', marginTop: '0.5rem' }}>
              {stats?.my_leads ?? 0} active in pipeline
            </div>
          </div>
        </Link>

        {/* Card 3: Quotes Pending Admin */}
        <Link to="/sales/pipeline" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '1.15rem',
              border: '1px solid #edf2f7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#fffbeb',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={17} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginTop: '0.75rem' }}>
              Quotes Pending Admin
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                {stats?.pending_quotes ?? 0}
              </div>
              {renderSparkline('#f59e0b')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#ea580c', fontWeight: '700', marginTop: '0.5rem' }}>
              Waiting for Admin quote
            </div>
          </div>
        </Link>

        {/* Card 4: Due Auto-Reminders */}
        <Link to="/sales/reminders" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '1.15rem',
              border: '1px solid #edf2f7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#f5f3ff',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={17} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginTop: '0.75rem' }}>
              Due Auto-Reminders
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                {stats?.due_reminders ?? 0}
              </div>
              {renderSparkline('#ec4899')}
            </div>
            <div style={{ fontSize: '0.74rem', color: (stats?.due_reminders || 0) > 0 ? '#e11d48' : '#64748b', fontWeight: '700', marginTop: '0.5rem' }}>
              {(stats?.due_reminders || 0) > 0 ? `${stats.due_reminders} due now` : 'All caught up'}
            </div>
          </div>
        </Link>

        {/* Card 5: Won Deals */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '1.15rem',
            border: '1px solid #edf2f7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={17} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginTop: '0.75rem' }}>
            Won Deals
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {stats?.won ?? 0}
            </div>
            {renderSparkline('#16a34a')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '700', marginTop: '0.5rem' }}>
            Converted clients
          </div>
        </div>

        {/* Card 6: Lost / Not Interested Leads */}
        <Link to="/sales/leads?stage=not_interested" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '1.15rem',
              border: '1px solid #edf2f7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XCircle size={17} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginTop: '0.75rem' }}>
              Lost / Not Interested
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                {(stats?.lost || 0) + (stats?.not_interested || 0)}
              </div>
              {renderSparkline('#ef4444')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: '700', marginTop: '0.5rem' }}>
              {stats?.not_interested || 0} not interested • {stats?.lost || 0} lost
            </div>
          </div>
        </Link>
      </div>

      {/* Middle Row: Funnel Overview, Conversion Rate, Today's Follow-ups */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 0.9fr 1fr',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* Column 1: Sales Funnel Overview (Real DB Counts) */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #edf2f7',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Sales Funnel Overview
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Your leads across the pipeline
              </p>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: '600',
              }}
            >
              Total: {totalLeadsCount} Leads
            </span>
          </div>

          {/* Bar Chart Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '160px',
              paddingBottom: '2.5rem',
              position: 'relative',
              gap: '6px',
              flex: 1,
            }}
          >
            {funnel.map((item, idx) => {
              const heightPct = maxCount > 0 ? Math.max(12, Math.round((item.count / maxCount) * 100)) : 12;
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
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>
                    {item.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      height: `${heightPct}%`,
                      backgroundColor: item.color,
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      fontSize: '0.66rem',
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      transform: 'translateY(100%)',
                      paddingTop: '6px',
                      maxWidth: '40px',
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

        {/* Column 2: Conversion Rate Card (Real DB Numbers) */}
        <div
          style={{
            backgroundColor: '#072423',
            color: '#fff',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0' }}>Conversion Rate</span>
            {/* <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>Live DB</span> */}
          </div>

          {/* Circular Gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.8rem 0' }}>
            <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#0e3d3b" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * conversionRate) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>{conversionRate}%</span>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '6px' }}>Claimed to Won Conversion</div>
          </div>

          {/* Metrics Breakdown from Real DB */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#38bdf8' }} /> Total Leads
              </span>
              <strong style={{ color: '#fff' }}>{totalLeadsCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#34d399' }} /> Active In Funnel
              </span>
              <strong style={{ color: '#fff' }}>{activeLeadsCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#facc15' }} /> Deals Won
              </span>
              <strong style={{ color: '#fff' }}>{wonCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f87171' }} /> Deals Lost
              </span>
              <strong style={{ color: '#fff' }}>{stats?.lost || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#94a3b8' }} /> Not Interested
              </span>
              <strong style={{ color: '#fff' }}>{stats?.not_interested ?? pipelineData.not_interested?.length ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Column 3: Today's Follow-Up Tasks (REAL DB DATA) */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #edf2f7',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Today's Follow-Up Tasks
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.72rem', fontWeight: '700', padding: '2px 7px', borderRadius: '999px' }}>
                {tasks.length} active
              </span>
              <ArrowRight size={14} color="#64748b" />
            </div>
          </div>

          {/* Real Task list items from DB */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {tasks.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.4rem auto' }} />
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem' }}>No pending follow-ups today</p>
                <small style={{ fontSize: '0.75rem' }}>Leads moved to "Interested" or "Follow-Up" appear here.</small>
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
                      padding: '6px 0',
                      borderBottom: i < tasks.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '0.75rem',
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
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.lead_company || task.phone || 'Inquiry'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                        {statusBadge}
                      </span>
                      {task.phone && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <a
                            href={`tel:${task.phone}`}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                            title="Call"
                          >
                            <Phone size={10} />
                          </a>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                              title="WhatsApp"
                            >
                              <MessageCircle size={10} />
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
              display: 'block',
              textAlign: 'center',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: '#475569',
              textDecoration: 'none',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              marginTop: '0.5rem',
            }}
          >
            View All Follow-Ups &gt;
          </Link>
        </div>
      </div>

      {/* Bottom Row: Latest Incoming Leads & Recent Activity (REAL DB DATA) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: Latest Incoming Leads (Top 5 from DB) */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #edf2f7',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Latest Incoming Leads (Top 5)
            </h3>
            <Link
              to="/sales/leads?tab=pool"
              style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View All in Open Pool →
            </Link>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ paddingBottom: '0.6rem', fontWeight: '600' }}>Client Name</th>
                <th style={{ paddingBottom: '0.6rem', fontWeight: '600' }}>Company</th>
                <th style={{ paddingBottom: '0.6rem', fontWeight: '600' }}>Received</th>
                <th style={{ paddingBottom: '0.6rem', fontWeight: '600' }}>Source</th>
                <th style={{ paddingBottom: '0.6rem', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {poolLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem 0', textAlign: 'center', color: '#94a3b8' }}>
                    No unclaimed leads in pool right now.
                  </td>
                </tr>
              ) : (
                poolLeads.map((lead, idx) => {
                  const initials = lead.name ? lead.name.charAt(0) : 'L';
                  const bgColors = ['#eff6ff', '#fef2f2', '#ecfdf5', '#fffbeb', '#f5f3ff'];
                  const textColors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed'];

                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '0.75rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: bgColors[idx % bgColors.length],
                              color: textColors[idx % textColors.length],
                              fontWeight: '800',
                              fontSize: '0.72rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {initials}
                          </div>
                          <strong style={{ color: '#0f172a' }}>{lead.name}</strong>
                        </div>
                      </td>
                      <td style={{ color: '#475569' }}>{lead.lead_company || '—'}</td>
                      <td style={{ color: '#64748b' }}>
                        {timeAgo(lead.created_at || lead.lead_date)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            padding: '3px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {lead.source_name || 'Website'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleClaim(lead.id)}
                          disabled={claimingId === lead.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#072423',
                            color: '#fff',
                            border: 'none',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          <Zap size={11} color="#facc15" fill="#facc15" />
                          {claimingId === lead.id ? 'Claiming…' : 'Claim & Call'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #edf2f7',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Recent Activity
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
              Live Stream
            </span>
          </div>

          {/* Timeline Items from Real DB */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '2.5rem 0', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem' }}>No recent activity</p>
                <small style={{ fontSize: '0.75rem' }}>Status changes and lead claims will appear here live.</small>
              </div>
            ) : (
              activities.map((act, i) => {
                let icon = <UserCheck size={13} />;
                let bg = '#ecfdf5';
                let color = '#10b981';

                if (act.status === 'won') {
                  icon = <Trophy size={13} />;
                  bg = '#fef3c7';
                  color = '#d97706';
                } else if (act.status === 'interested') {
                  icon = <Star size={13} />;
                  bg = '#fffbeb';
                  color = '#f59e0b';
                } else if (act.status === 'quotation_requested' || act.status === 'quotation_sent') {
                  icon = <FileText size={13} />;
                  bg = '#f5f3ff';
                  color = '#8b5cf6';
                } else if (act.status === 'lost') {
                  icon = <XCircle size={13} />;
                  bg = '#fef2f2';
                  color = '#ef4444';
                }

                return (
                  <div key={act.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: bg,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                        {String(act.title || '').replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.subtitle}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
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
