import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-IN');
}

// Helper to generate bezier path for smooth line chart
function getBezierPath(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
}

// 1. Premium Donut Chart Component
function DonutChart({ active = 0, inactive = 0, trial = 0 }) {
  const total = active + inactive + trial;
  if (total === 0) return <div style={{ height: '160px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)' }}>No data available</div>;

  const pctActive = (active / total) * 100;
  const pctInactive = (inactive / total) * 100;
  const pctTrial = (trial / total) * 100;

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const strokeActive = (pctActive / 100) * circumference;
  const strokeTrial = (pctTrial / 100) * circumference;
  const strokeInactive = (pctInactive / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {/* Shadow filters for glow effect */}
          <defs>
            <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--ink)" floodOpacity="0.06" />
            </filter>
          </defs>
          
          {/* Base track */}
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#fdfbf9" strokeWidth="10" />

          {/* Inactive Slice */}
          {strokeInactive > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--line-strong)"
              strokeWidth="9"
              strokeDasharray={`${strokeInactive} ${circumference - strokeInactive}`}
              strokeDashoffset={-(strokeActive + strokeTrial)}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}

          {/* Trial Slice */}
          {strokeTrial > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--orange-500)"
              strokeWidth="9"
              strokeDasharray={`${strokeTrial} ${circumference - strokeTrial}`}
              strokeDashoffset={-strokeActive}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}

          {/* Active Slice */}
          {strokeActive > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--cyan)"
              strokeWidth="9"
              strokeDasharray={`${strokeActive} ${circumference - strokeActive}`}
              strokeDashoffset="0"
              filter="url(#donut-shadow)"
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}
        </svg>
        
        {/* Center label */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <span style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--ink)', display: 'block', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', fontSize: '0.8rem', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '0.75rem', width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: 'var(--ink-soft)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--cyan)', borderRadius: '50%' }} />
          Active ({active})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: 'var(--ink-soft)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--orange-500)', borderRadius: '50%' }} />
          Trial ({trial})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: 'var(--ink-soft)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--line-strong)', borderRadius: '50%' }} />
          Inactive ({inactive})
        </span>
      </div>
    </div>
  );
}

// 2. Premium Invoice Donut Chart Component
function InvoiceDonutChart({ paid = 0, pending = 0 }) {
  const total = paid + pending;
  if (total === 0) return <div style={{ height: '160px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)' }}>No data available</div>;

  const pctPaid = (paid / total) * 100;
  const pctPending = (pending / total) * 100;

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const strokePaid = (pctPaid / 100) * circumference;
  const strokePending = (pctPending / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <filter id="donut-shadow-inv" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--cyan)" floodOpacity="0.06" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#fdfbf9" strokeWidth="10" />

          {/* Pending Slice */}
          {strokePending > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--orange-500)"
              strokeWidth="9"
              strokeDasharray={`${strokePending} ${circumference - strokePending}`}
              strokeDashoffset={-strokePaid}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}

          {/* Paid Slice */}
          {strokePaid > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--cyan)"
              strokeWidth="9"
              strokeDasharray={`${strokePaid} ${circumference - strokePaid}`}
              strokeDashoffset="0"
              filter="url(#donut-shadow-inv)"
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <span style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--ink)', display: 'block', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.8rem', borderTop: '1px solid var(--line)', paddingTop: '0.75rem', width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: 'var(--ink-soft)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--cyan)', borderRadius: '50%' }} />
          Paid ({paid})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: 'var(--ink-soft)' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--orange-500)', borderRadius: '50%' }} />
          Pending ({pending})
        </span>
      </div>
    </div>
  );
}

// 3. Premium Bar Chart with Gradient Fills
function MonthlyCompaniesBarChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return <div style={{ height: '160px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)' }}>No data available</div>;
  }

  const maxCount = Math.max(...monthlyData.map(d => d.company_count), 1);

  return (
    <div style={{ display: 'flex', height: '160px', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', width: '100%', padding: '0.5rem 0' }}>
      {monthlyData.map((d, idx) => {
        const heightPct = (d.company_count / maxCount) * 100;
        return (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%', height: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {/* Background Track */}
              <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#fdfbf9', borderRadius: '6px', border: '1px solid #f9f5f0' }} />
              
              {/* Bar Fill */}
              <div 
                style={{ 
                  width: '100%', 
                  height: `${heightPct}%`, 
                  background: 'linear-gradient(180deg, var(--cyan) 0%, #1e9fc2 100%)',
                  borderRadius: '6px', 
                  position: 'relative',
                  boxShadow: '0 4px 10px rgba(46, 196, 232, 0.15)',
                  transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 2
                }}
              >
                {/* Floating label inside/above bar */}
                <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.72rem', fontWeight: '800', color: 'var(--ink)' }}>
                  {d.company_count}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted)', marginTop: '0.65rem', whiteSpace: 'nowrap' }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// 4. Premium Smooth Area Line Chart
function RevenueLineChart({ monthly = [] }) {
  if (monthly.length === 0) {
    return <div style={{ height: '160px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)' }}>No data available</div>;
  }

  const maxRevenue = Math.max(...monthly.map(m => Number(m.revenue)), 1);
  const width = 500;
  const height = 150;
  const padding = 20;

  const points = monthly.map((m, idx) => {
    const x = padding + (idx * (width - 2 * padding)) / Math.max(monthly.length - 1, 1);
    const y = height - padding - (Number(m.revenue) * (height - 2 * padding)) / maxRevenue;
    return { x, y, month: m.month, revenue: m.revenue };
  });

  const smoothLinePath = getBezierPath(points);
  const smoothAreaPath = points.length > 0 
    ? `${smoothLinePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
    : '';

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="150" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="premiumOrangeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--orange-500)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--orange-500)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Soft Grid Lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#faf6f2" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#faf6f2" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--line)" strokeWidth="1.5" />

        {/* Fill Area with Gradient */}
        {smoothAreaPath && <path d={smoothAreaPath} fill="url(#premiumOrangeGrad)" style={{ transition: 'all 0.5s ease' }} />}

        {/* Bezier Spline Path */}
        {smoothLinePath && (
          <path 
            d={smoothLinePath} 
            fill="none" 
            stroke="var(--orange-600)" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(232, 111, 12, 0.15))' }}
          />
        )}

        {/* Glowing node coordinates */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="var(--orange-600)" strokeWidth="2.5" />
            <title>{`${p.month}: ${money(p.revenue)}`}</title>
          </g>
        ))}
      </svg>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted)', marginTop: '0.65rem' }}>
        {monthly.map((m, idx) => (
          <span key={idx}>{m.month.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .overview()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="skeleton-block" />
      </div>
    );
  }

  const inactiveCompaniesCount = Math.max(
    data.counts.total_companies - data.counts.active_companies - data.counts.trial_companies,
    0
  );

  return (
    <div className="page" style={{ paddingBottom: '3rem', maxWidth: '1280px', margin: '0 auto' }}>
      <header className="page-head" style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--line)', paddingBottom: '1.25rem' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--orange-600)', fontWeight: '700', letterSpacing: '0.05em' }}>SURFSYNC PLATFORM MANAGEMENT</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', margin: '0.25rem 0', fontFamily: "'Fraunces', serif" }}>Overview</h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            System dashboard and performance analytics.
          </p>
        </div>
        <Link 
          to="/admin/companies" 
          className="primary-btn" 
          style={{ 
            backgroundColor: 'var(--orange-600)', 
            border: 'none', 
            boxShadow: '0 4px 14px rgba(232, 111, 12, 0.3)',
            padding: '0.65rem 1.25rem',
            fontWeight: '600'
          }}
        >
          + Create Company
        </Link>
      </header>

      {/* STAT CARDS - ROW 1 (PREMIUM GRADIENTS) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <article className="stat-card" style={{ border: '1px solid var(--line)', background: 'linear-gradient(135deg, rgba(232, 111, 12, 0.04) 0%, #fff 100%)', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', transition: 'transform 0.2s ease' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Companies</span>
          <strong style={{ fontSize: '2.25rem', fontWeight: '800', display: 'block', margin: '0.25rem 0', color: 'var(--ink)' }}>{data.counts.total_companies}</strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Registered organizations</span>
        </article>
        <article className="stat-card" style={{ border: '1px solid var(--line)', background: 'linear-gradient(135deg, rgba(46, 196, 232, 0.04) 0%, #fff 100%)', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', transition: 'transform 0.2s ease' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Subscriptions</span>
          <strong style={{ fontSize: '2.25rem', fontWeight: '800', display: 'block', margin: '0.25rem 0', color: 'var(--cyan)' }}>{data.counts.active_companies}</strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Paid & unlock accounts</span>
        </article>
        <article className="stat-card" style={{ border: '1px solid var(--line)', background: 'linear-gradient(135deg, rgba(245, 130, 32, 0.04) 0%, #fff 100%)', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', transition: 'transform 0.2s ease' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>On Trial</span>
          <strong style={{ fontSize: '2.25rem', fontWeight: '800', display: 'block', margin: '0.25rem 0', color: 'var(--orange-400)' }}>{data.counts.trial_companies}</strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Evaluation period active</span>
        </article>
        <article className="stat-card" style={{ border: '1px solid var(--line)', background: 'linear-gradient(135deg, rgba(232, 111, 12, 0.04) 0%, #fff 100%)', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', transition: 'transform 0.2s ease' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Revenue</span>
          <strong style={{ fontSize: '2.25rem', fontWeight: '800', display: 'block', margin: '0.25rem 0', color: 'var(--orange-700)' }}>{money(data.revenue.total_revenue)}</strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>All-time collected</span>
        </article>
      </section>

      {/* STAT CARDS - ROW 2 (CLEAN BRUSHED CARDS) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        { [
          { label: 'Plans Available', value: data.counts.total_plans, color: 'var(--ink)' },
          { label: 'Pending Invoices', value: data.counts.pending_invoices, color: '#c65911' },
          { label: 'Paid Invoices', value: data.counts.paid_invoices, color: 'var(--cyan)' },
          { label: 'Expired Trials', value: data.counts.expired_trials, color: '#c65911' },
          { label: 'Active Modules', value: '8/8', color: 'var(--ink)' },
          { label: 'Suspended Companies', value: data.counts.suspended_companies, color: '#d9534f' }
        ].map((item, idx) => (
          <div key={idx} style={{ border: '1px solid var(--line)', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.005)' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>{item.label}</span>
            <strong style={{ fontSize: '1.35rem', fontWeight: '850', color: item.color }}>{item.value}</strong>
          </div>
        ))}
      </section>

      {/* CHARTS GRID 2x2 (MODERN SEAMLESS DESIGN) */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', marginBottom: '2rem' }}>
        
        {/* Chart 1: Company Status */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Status</h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Breakdown of active, trial and inactive portal access.</p>
            </div>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
            <DonutChart active={data.counts.active_companies} inactive={inactiveCompaniesCount} trial={data.counts.trial_companies} />
          </div>
        </div>

        {/* Chart 2: New Companies (6 Months) */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Companies (6 Months)</h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>System registrations tracked monthly.</p>
            </div>
          </div>
          <div style={{ padding: '1.5rem', minHeight: '220px', display: 'flex', alignItems: 'center' }}>
            <MonthlyCompaniesBarChart monthlyData={data.newCompaniesMonthly || []} />
          </div>
        </div>

        {/* Chart 3: Revenue Trend */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Trend</h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Subscription revenue trajectory over the past months.</p>
            </div>
          </div>
          <div style={{ padding: '1.5rem 1.5rem 1.25rem 1.5rem', minHeight: '220px', display: 'flex', alignItems: 'center' }}>
            <RevenueLineChart monthly={data.monthly || []} />
          </div>
        </div>

        {/* Chart 4: Invoice Status */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice Status</h3>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Distribution of paid vs pending invoice records.</p>
            </div>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
            <InvoiceDonutChart paid={data.counts.paid_invoices} pending={data.counts.pending_invoices} />
          </div>
        </div>

      </section>

      {/* TABLES ROW (3 COLUMNS SPLIT) */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
        
        {/* Table 1: Recent Companies */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.75rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RECENT COMPANIES</span>
            <Link to="/admin/companies" style={{ color: 'var(--orange-600)', fontSize: '0.75rem', fontWeight: '700', textDecoration: 'none' }}>VIEW ALL</Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {data.recentCompanies.slice(0, 5).map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--ink)', width: '50%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '0.75rem 0.25rem', width: '25%', verticalAlign: 'middle' }}>
                      <span className={`badge badge-${c.status}`} style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', textTransform: 'uppercase', fontWeight: '800' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'right', width: '25%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.plan_name || 'Trial'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Expiring Trials */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.75rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXPIRING TRIALS</span>
            <Link to="/admin/trials" style={{ color: 'var(--orange-600)', fontSize: '0.75rem', fontWeight: '700', textDecoration: 'none' }}>MANAGE</Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {data.expiringTrials.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>No trials expiring soon.</td>
                  </tr>
                ) : (
                  data.expiringTrials.slice(0, 5).map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--ink)', width: '60%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.82rem', color: '#c65911', fontWeight: '700', textAlign: 'right', width: '40%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {formatDate(c.subscription_end)}
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: '500', marginLeft: '0.35rem' }}>
                          ({c.days_left}d)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Recent Invoices */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.75rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RECENT INVOICES</span>
            <Link to="/admin/billing" style={{ color: 'var(--orange-600)', fontSize: '0.75rem', fontWeight: '700', textDecoration: 'none' }}>VIEW ALL</Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {data.recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>No recent invoices.</td>
                  </tr>
                ) : (
                  data.recentPayments.slice(0, 5).map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', fontWeight: '750', color: 'var(--ink)', width: '35%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {p.invoice_number}
                      </td>
                      <td style={{ padding: '0.75rem 0.25rem', fontSize: '0.82rem', color: 'var(--ink-soft)', width: '35%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {p.company_name}
                      </td>
                      <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', fontWeight: '700', textAlign: 'right', color: p.status === 'paid' ? 'var(--cyan)' : '#c65911', width: '30%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {money(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </section>
    </div>
  );
}
