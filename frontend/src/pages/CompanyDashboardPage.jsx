import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { companyPortalApi } from '../api/client';
import {
  KanbanSquare,
  CheckSquare,
  FileText,
  Workflow,
  Users,
  ShieldCheck,
  Building2,
  Plus,
  ArrowRight,
  TrendingUp,
  Flame,
  Snowflake,
  Zap,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeLiveSync } from '../services/liveSyncService';

const QUICK = [
  { to: '/company/leads', icon: Inbox, title: 'Lead Directory', text: 'Central lead pool & sources', color: '#0B6BE6', bg: '#EFF6FF' },
  { to: '/company/pipeline', icon: KanbanSquare, title: 'Sales Pipeline', text: 'Stage velocity & deals', color: '#2A9CB8', bg: '#E8F6FA' },
  { to: '/company/quotations', icon: FileText, title: 'Quotations', text: 'Pricing approvals & reviews', color: '#F68713', bg: '#FFF3E6' },
  { to: '/company/whatsapp-api', icon: MessageSquare, title: 'WhatsApp API', text: 'Campaigns & Meta Cloud', color: '#16A34A', bg: '#DCFCE7' },
];

export default function CompanyDashboardPage() {
  const { user } = useAuth('company');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const refreshDashboard = () => {
      companyPortalApi
        .dashboard()
        .then(setData)
        .catch((err) => setError(err.message));
    };

    refreshDashboard();

    // Universal live cross-tab & component sync
    const unsubscribe = subscribeLiveSync(refreshDashboard);

    // Background polling every 20 seconds
    const interval = setInterval(refreshDashboard, 20000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.85rem' }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
        Loading company dashboard…
      </div>
    );
  }

  const { company, counts, analytics } = data;
  const temp = analytics?.temperature || { hot: 0, warm: 0, cold: 0, pool: 0 };
  const totalLeads = analytics?.total_leads || 0;
  const funnel = analytics?.funnel || [];

  // Temperature Percentages
  const hotPct = totalLeads > 0 ? Math.round((temp.hot / totalLeads) * 100) : 0;
  const warmPct = totalLeads > 0 ? Math.round((temp.warm / totalLeads) * 100) : 0;
  const coldPct = totalLeads > 0 ? Math.round((temp.cold / totalLeads) * 100) : 0;
  const poolPct = totalLeads > 0 ? Math.round((temp.pool / totalLeads) * 100) : 0;

  // SVG Donut calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  const donutSegments = [
    { key: 'hot', count: temp.hot, color: '#EF4444', pct: totalLeads > 0 ? temp.hot / totalLeads : 0 },
    { key: 'warm', count: temp.warm, color: '#F59E0B', pct: totalLeads > 0 ? temp.warm / totalLeads : 0 },
    { key: 'pool', count: temp.pool, color: '#0B6BE6', pct: totalLeads > 0 ? temp.pool / totalLeads : 0 },
    { key: 'cold', count: temp.cold, color: '#94A3B8', pct: totalLeads > 0 ? temp.cold / totalLeads : 0 },
  ];

  let cumulativeOffset = 0;

  // Max count for funnel bar scale
  const maxFunnelCount = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="company-dashboard-container" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.35rem', fontFamily: "'Manrope', sans-serif", boxSizing: 'border-box' }}>
      <style>{`
        .company-dashboard-container {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .company-top-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
        }
        .company-analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
          gap: 1.25rem;
          align-items: stretch;
          width: 100%;
          box-sizing: border-box;
        }
        .company-donut-row {
          display: flex;
          align-items: center;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 1.25rem;
          margin: auto 0;
          width: 100%;
          box-sizing: border-box;
        }
        .company-modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
        }
        .company-profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
          gap: 1.25rem;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .company-dashboard-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.85rem !important;
          }
          .company-header-actions {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 0.5rem !important;
          }
          .company-header-actions > * {
            flex: 1 !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 8px 10px !important;
            font-size: 0.78rem !important;
          }
          .company-top-kpis {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
          }
          .company-analytics-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .company-donut-row {
            flex-direction: column !important;
            align-items: center !important;
            gap: 1rem !important;
          }
          .company-donut-legend {
            width: 100% !important;
            min-width: 0 !important;
          }
          .company-modules-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .company-profile-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
          .company-dashboard-container .sales-card {
            padding: 1rem !important;
          }
        }

        @media (max-width: 480px) {
          .company-top-kpis {
            grid-template-columns: 1fr !important;
          }
          .company-profile-grid {
            grid-template-columns: 1fr !important;
          }
          .company-header-actions {
            flex-direction: column !important;
          }
          .company-header-actions > * {
            width: 100% !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="company-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em', fontFamily: "'Manrope', sans-serif" }}>
            {company.name}
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.86rem', fontFamily: "'Manrope', sans-serif" }}>
            Company command center. Monitor lead temperature, sales funnel velocity, and rep productivity in real-time.
          </p>
        </div>

        {user?.role === 'company_admin' && (
          <div className="company-header-actions" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Link to="/company/pipeline" className="btn-secondary-action" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <KanbanSquare size={15} /> Open Pipeline
            </Link>
            <Link to="/company/team" className="btn-primary-action" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> Add Salesperson
            </Link>
          </div>
        )}
      </div>

      {/* Top KPI Metrics Matrix */}
      <div
        className="company-top-kpis"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '1rem',
        }}
      >
        {/* KPI 1: Company Status */}
        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Portal Status</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1, textTransform: 'capitalize' }}>
            {company.status}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: '700', marginTop: '0.4rem' }}>
            {company.plan_name || 'Enterprise'} Plan
          </div>
        </div>

        {/* KPI 2: Salespersons Seats */}
        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Sales Reps Active</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FFF3E6', color: '#F68713', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {counts.salespersons}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: '0.4rem' }}>
            of {company.max_salespersons || 'unlimited'} licensed seats
          </div>
        </div>

        {/* KPI 3: Total Company Leads */}
        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Total CRM Leads</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#0B6BE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {totalLeads}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#0B6BE6', fontWeight: '700', marginTop: '0.4rem' }}>
            All Active & Pool Leads
          </div>
        </div>

        {/* KPI 4: Hot Leads (Interested) */}
        <div className="sales-card" style={{ padding: '1.15rem', borderLeft: '3px solid #EF4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>🔥 Hot Leads (Interested)</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={16} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#EF4444', marginTop: '0.5rem', lineHeight: 1 }}>
            {temp.hot}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#B91C1C', fontWeight: '700', marginTop: '0.4rem' }}>
            {hotPct}% conversion intent
          </div>
        </div>
      </div>

      {/* Analytics Section: Graphs 1 & 2 */}
      <div
        className="company-analytics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        {/* GRAPH 1: Lead Temperature Breakdown (Hot vs Warm vs Cold) */}
        <div className="sales-card" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={15} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
                  Lead Temperature Breakdown
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                Interested status = <strong>HOT</strong>, Not Interested = <strong>COLD</strong>
              </p>
            </div>
            <span
              className="num"
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#F1F3F6',
                color: '#374151',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontWeight: '700',
              }}
            >
              {totalLeads} Total Analyzed
            </span>
          </div>

          {/* Donut and Temperature Legend Row */}
          <div className="company-donut-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', margin: 'auto 0' }}>
            {/* SVG Donut Chart */}
            <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#F1F3F6"
                  strokeWidth="12"
                />

                {/* Segments */}
                {totalLeads > 0 && (() => {
                  let offset = 0;
                  return donutSegments.map((seg) => {
                    if (seg.pct <= 0) return null;
                    const dashLength = seg.pct * circumference;
                    const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
                    const strokeDashoffset = -offset;
                    offset += dashLength;

                    return (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Inside Donut Center Info */}
              <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <Flame size={18} color="#EF4444" style={{ margin: '0 auto 2px' }} />
                <span className="num" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', display: 'block', lineHeight: 1 }}>
                  {temp.hot}
                </span>
                <span style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' }}>
                  Hot Leads
                </span>
              </div>
            </div>

            {/* Metric Tiles / Legend */}
            <div className="company-donut-legend" style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Hot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={15} color="#EF4444" />
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#991B1B', display: 'block', lineHeight: 1.2 }}>HOT Leads</strong>
                    <span style={{ fontSize: '0.7rem', color: '#B91C1C' }}>Interested / High Intent</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#991B1B', display: 'block', lineHeight: 1 }}>
                    {temp.hot}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: '700' }}>
                    {hotPct}%
                  </span>
                </div>
              </div>

              {/* Warm */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={15} color="#F59E0B" />
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#92400E', display: 'block', lineHeight: 1.2 }}>WARM Leads</strong>
                    <span style={{ fontSize: '0.7rem', color: '#B45309' }}>Contacted</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#92400E', display: 'block', lineHeight: 1 }}>
                    {temp.warm}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: '700' }}>
                    {warmPct}%
                  </span>
                </div>
              </div>

              {/* Cold */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Snowflake size={15} color="#64748B" />
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#334155', display: 'block', lineHeight: 1.2 }}>COLD Leads</strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Not Interested / Lost</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#334155', display: 'block', lineHeight: 1 }}>
                    {temp.cold}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700' }}>
                    {coldPct}%
                  </span>
                </div>
              </div>

              {/* Unclaimed Pool */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={15} color="#0B6BE6" />
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#1E40AF', display: 'block', lineHeight: 1.2 }}>NEW POOL</strong>
                    <span style={{ fontSize: '0.7rem', color: '#2563EB' }}>Unassigned Pool</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="num" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1E40AF', display: 'block', lineHeight: 1 }}>
                    {temp.pool}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: '700' }}>
                    {poolPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Segmented Bar */}
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #F1F3F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#6B7280', marginBottom: '6px', fontWeight: '600' }}>
              <span>Conversion Ratio Bar</span>
              <span>{hotPct}% High Priority Leads</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F3F6', borderRadius: '9999px', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: `${hotPct}%`, backgroundColor: '#EF4444', transition: 'width 0.3s ease' }} title={`Hot: ${temp.hot}`} />
              <div style={{ width: `${warmPct}%`, backgroundColor: '#F59E0B', transition: 'width 0.3s ease' }} title={`Warm: ${temp.warm}`} />
              <div style={{ width: `${poolPct}%`, backgroundColor: '#0B6BE6', transition: 'width 0.3s ease' }} title={`Pool: ${temp.pool}`} />
              <div style={{ width: `${coldPct}%`, backgroundColor: '#94A3B8', transition: 'width 0.3s ease' }} title={`Cold: ${temp.cold}`} />
            </div>
          </div>
        </div>

        {/* GRAPH 2: Pipeline Funnel & Stage Velocity */}
        <div className="sales-card" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.15rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={15} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
                  Pipeline Funnel & Stage Velocity
                </h3>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                Distribution across all active sales qualification stages
              </p>
            </div>
            <Link
              to="/company/pipeline"
              style={{
                fontSize: '0.75rem',
                color: '#2A9CB8',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              Pipeline <ArrowRight size={13} />
            </Link>
          </div>

          {/* Funnel Stage Horizontal Progression Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: 'auto 0' }}>
            {funnel.map((item) => {
              const barWidthPct = item.count > 0 ? Math.max(6, Math.round((item.count / maxFunnelCount) * 100)) : 0;
              const pctOfTotal = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;

              return (
                <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                      <span style={{ fontWeight: '700', color: '#1F2937' }}>{item.stage}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="num" style={{ fontWeight: '800', color: item.count > 0 ? item.color : '#9CA3AF', fontSize: '0.84rem' }}>
                        {item.count}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#9CA3AF', minWidth: '32px', textAlign: 'right' }}>
                        {pctOfTotal}%
                      </span>
                    </div>
                  </div>

                  {/* Track and Fill Bar */}
                  <div style={{ width: '100%', height: '7px', backgroundColor: '#F1F3F6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barWidthPct}%`,
                        height: '100%',
                        backgroundColor: item.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Summary Footer */}
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #F1F3F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.73rem', color: '#6B7280' }}>
              Deals Closed Won:{' '}
              <strong style={{ color: '#16A34A' }}>
                {funnel.find((f) => f.key === 'won')?.count || 0}
              </strong>
            </span>
            <span style={{ fontSize: '0.73rem', color: '#6B7280' }}>
              Drop-offs / Lost:{' '}
              <strong style={{ color: '#94A3B8' }}>
                {funnel.find((f) => f.key === 'not_interested')?.count || 0}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launch Hub */}
      <div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827', margin: '0.5rem 0 0.85rem 0', fontFamily: "'Manrope', sans-serif" }}>
          Operational Modules
        </h2>
        <div className="company-modules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
          {QUICK.map(({ to, icon: Icon, title, text, color, bg }) => (
            <Link
              key={to}
              to={to}
              className="sales-card"
              style={{
                padding: '1.25rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: bg,
                  color: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '0.92rem', color: '#111827', display: 'block' }}>{title}</strong>
                <small style={{ fontSize: '0.76rem', color: '#6B7280' }}>{text}</small>
              </div>
              <ArrowRight size={14} color="#9CA3AF" />
            </Link>
          ))}
        </div>
      </div>

      {/* Company Profile Panel */}
      <div className="sales-card" style={{ padding: '1.5rem', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E6E9EE', paddingBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
            Company Profile & Account Details
          </h2>
          <span
            className="badge-status"
            style={{
              backgroundColor: '#DCFCE7',
              color: '#166534',
            }}
          >
            <span className="badge-status-dot" style={{ backgroundColor: '#16A34A' }} />
            Verified Company
          </span>
        </div>

        <div className="company-profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Admin Email</span>
            <strong style={{ fontSize: '0.88rem', color: '#111827', marginTop: '2px', display: 'block' }}>{company.email}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Contact Phone</span>
            <strong className="num" style={{ fontSize: '0.88rem', color: '#111827', marginTop: '2px', display: 'block' }}>{company.phone || '—'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Industry Domain</span>
            <strong style={{ fontSize: '0.88rem', color: '#111827', marginTop: '2px', display: 'block' }}>{company.industry || 'IT & Software'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Location</span>
            <strong style={{ fontSize: '0.88rem', color: '#111827', marginTop: '2px', display: 'block' }}>{[company.city, company.state].filter(Boolean).join(', ') || 'India'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Plan Tier</span>
            <strong style={{ fontSize: '0.88rem', color: '#F68713', marginTop: '2px', display: 'block', fontWeight: '800' }}>{company.plan_name || 'Enterprise'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Billing Interval</span>
            <strong style={{ fontSize: '0.88rem', color: '#111827', marginTop: '2px', display: 'block', textTransform: 'uppercase' }}>{company.billing_cycle}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
