import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import {
  Building2,
  CheckCircle2,
  Clock,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react';

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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

// 1. Company Status Donut Chart
function DonutChart({ active = 0, inactive = 0, trial = 0 }) {
  const total = active + inactive + trial;
  if (total === 0) {
    return (
      <div style={{ height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9CA3AF', fontSize: '13px' }}>
        No tenant records available
      </div>
    );
  }

  const pctActive = (active / total) * 100;
  const pctTrial = (trial / total) * 100;
  const pctInactive = (inactive / total) * 100;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const strokeActive = (pctActive / 100) * circumference;
  const strokeTrial = (pctTrial / 100) * circumference;
  const strokeInactive = (pctInactive / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px' }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F1F3F6" strokeWidth="10" />

          {strokeInactive > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#D0D5DD"
              strokeWidth="9"
              strokeDasharray={`${strokeInactive} ${circumference - strokeInactive}`}
              strokeDashoffset={-(strokeActive + strokeTrial)}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}

          {strokeTrial > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#0B6BE6"
              strokeWidth="9"
              strokeDasharray={`${strokeTrial} ${circumference - strokeTrial}`}
              strokeDashoffset={-strokeActive}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}

          {strokeActive > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#07A96A"
              strokeWidth="9"
              strokeDasharray={`${strokeActive} ${circumference - strokeActive}`}
              strokeDashoffset="0"
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}
        </svg>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#111827', display: 'block', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', fontSize: '12.5px', flexWrap: 'wrap', borderTop: '1px solid #E6E9EE', paddingTop: '12px', width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#374151' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#07A96A', borderRadius: '50%' }} />
          Active ({active})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#374151' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#0B6BE6', borderRadius: '50%' }} />
          Trial ({trial})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#374151' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#D0D5DD', borderRadius: '50%' }} />
          Inactive ({inactive})
        </span>
      </div>
    </div>
  );
}

// 2. Invoice Status Donut Chart
function InvoiceDonutChart({ paid = 0, pending = 0 }) {
  const total = paid + pending;
  if (total === 0) {
    return (
      <div style={{ height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9CA3AF', fontSize: '13px' }}>
        No invoice records available
      </div>
    );
  }

  const pctPaid = (paid / total) * 100;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokePaid = (pctPaid / 100) * circumference;
  const strokePending = circumference - strokePaid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px' }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F1F3F6" strokeWidth="10" />

          {strokePending > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#CA8A04"
              strokeWidth="9"
              strokeDasharray={`${strokePending} ${circumference - strokePending}`}
              strokeDashoffset={-strokePaid}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}

          {strokePaid > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#07A96A"
              strokeWidth="9"
              strokeDasharray={`${strokePaid} ${circumference - strokePaid}`}
              strokeDashoffset="0"
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
            />
          )}
        </svg>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#111827', display: 'block', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '12.5px', borderTop: '1px solid #E6E9EE', paddingTop: '12px', width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#374151' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#07A96A', borderRadius: '50%' }} />
          Paid ({paid})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#374151' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#CA8A04', borderRadius: '50%' }} />
          Pending ({pending})
        </span>
      </div>
    </div>
  );
}

// 3. Monthly Companies Bar Chart
function MonthlyCompaniesBarChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return (
      <div style={{ height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9CA3AF', fontSize: '13px' }}>
        No historical data
      </div>
    );
  }

  const maxCount = Math.max(...monthlyData.map((d) => d.company_count), 1);

  return (
    <div style={{ display: 'flex', height: '180px', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px', width: '100%', padding: '10px 0' }}>
      {monthlyData.map((d, idx) => {
        const heightPct = Math.max((d.company_count / maxCount) * 100, 6);
        return (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%', height: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E6E9EE' }} />
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                  borderRadius: '6px',
                  position: 'relative',
                  transition: 'height 0.4s ease',
                  zIndex: 2,
                }}
              >
                <div style={{ position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 800, color: '#111827' }}>
                  {d.company_count}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', marginTop: '10px', whiteSpace: 'nowrap' }}>
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 4. Smooth Area Line Chart for Revenue
function RevenueLineChart({ monthly = [] }) {
  if (monthly.length === 0) {
    return (
      <div style={{ height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9CA3AF', fontSize: '13px' }}>
        No revenue trends recorded
      </div>
    );
  }

  const maxRevenue = Math.max(...monthly.map((m) => Number(m.revenue)), 1);
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
          <linearGradient id="revenueGreenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07A96A" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#07A96A" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E6E9EE" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E6E9EE" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E6E9EE" strokeWidth="1.5" />

        {smoothAreaPath && <path d={smoothAreaPath} fill="url(#revenueGreenGrad)" style={{ transition: 'all 0.5s ease' }} />}

        {smoothLinePath && (
          <path
            d={smoothLinePath}
            fill="none"
            stroke="#07A96A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#FFFFFF" stroke="#07A96A" strokeWidth="2.5" />
            <title>{`${p.month}: ${money(p.revenue)}`}</title>
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, fontSize: '11px', fontWeight: 700, color: '#6B7280', marginTop: '10px' }}>
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
      <div style={{ padding: '20px', backgroundColor: '#FEECEC', color: '#DC2626', borderRadius: '14px', border: '1px solid #FECACA', fontSize: '14px', fontWeight: 600 }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '40px', width: '280px', backgroundColor: '#E6E9EE', borderRadius: '8px' }} />
        <div style={{ height: '140px', backgroundColor: '#E6E9EE', borderRadius: '18px' }} />
        <div style={{ height: '280px', backgroundColor: '#E6E9EE', borderRadius: '18px' }} />
      </div>
    );
  }

  const inactiveCompaniesCount = Math.max(
    data.counts.total_companies - data.counts.active_companies - data.counts.trial_companies,
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#07A96A',
              marginBottom: '4px',
            }}
          >
            <span>PatronPing Platform Telemetry</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Command Center</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Overview
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13.5px' }}>
            System dashboard, multi-tenant fleet health, and subscription trajectory.
          </p>
        </div>

        <Link
          to="/admin/companies"
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(3, 111, 69, 0.35)',
          }}
        >
          <Plus size={16} />
          <span>Create Company</span>
        </Link>
      </div>

      {/* 2. Primary KPI Row (4 Stats) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Total Companies</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#07A96A' }}>
              <Building2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {data.counts.total_companies}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Registered tenant organizations
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Active Subscriptions</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EDF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B6BE6' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0B6BE6', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {data.counts.active_companies}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Paid & unlocked commercial accounts
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>On Trial</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF7E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A16207' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#A16207', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {data.counts.trial_companies}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Evaluation period active
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Platform Revenue</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#067C52' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#067C52', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {money(data.revenue.total_revenue)}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            All-time collected revenue
          </div>
        </div>
      </div>

      {/* 3. Secondary Metrics Strip (Wells) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Plans Available', value: data.counts.total_plans, color: '#111827' },
          { label: 'Pending Invoices', value: data.counts.pending_invoices, color: '#CA8A04' },
          { label: 'Paid Invoices', value: data.counts.paid_invoices, color: '#07A96A' },
          { label: 'Expired Trials', value: data.counts.expired_trials, color: '#DC2626' },
          { label: 'Active Modules', value: '8/8', color: '#0B6BE6' },
          { label: 'Suspended Companies', value: data.counts.suspended_companies, color: '#DC2626' },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 1px 2px rgba(16,24,40,0.02)',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
              {item.label}
            </span>
            <strong style={{ fontSize: '20px', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </strong>
          </div>
        ))}
      </div>

      {/* 4. 2x2 Telemetry Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Chart 1: Company Status */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Company Status</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>Breakdown of active, trial and inactive tenant access.</p>
          </div>
          <DonutChart active={data.counts.active_companies} inactive={inactiveCompaniesCount} trial={data.counts.trial_companies} />
        </div>

        {/* Chart 2: Monthly Inflow */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>New Companies (6 Months)</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>System onboarding registrations tracked monthly.</p>
          </div>
          <MonthlyCompaniesBarChart monthlyData={data.newCompaniesMonthly || []} />
        </div>

        {/* Chart 3: Revenue Trend */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Revenue Trajectory</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>Subscription revenue velocity over recent months.</p>
          </div>
          <RevenueLineChart monthly={data.monthly || []} />
        </div>

        {/* Chart 4: Invoice Status */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Invoice Collection</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>Distribution of settled vs pending invoices.</p>
          </div>
          <InvoiceDonutChart paid={data.counts.paid_invoices} pending={data.counts.pending_invoices} />
        </div>
      </div>

      {/* 5. Bottom 3 Data Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Table 1: Recent Companies */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>
              Recent Companies
            </span>
            <Link to="/admin/companies" style={{ color: '#07A96A', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {data.recentCompanies.slice(0, 5).map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 20px', fontWeight: 700, color: '#111827' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: c.status === 'active' ? '#E8F7EE' : c.status === 'trial' ? '#FEF7E1' : '#F1F3F6',
                        color: c.status === 'active' ? '#16A34A' : c.status === 'trial' ? '#A16207' : '#4B5563',
                        textTransform: 'capitalize',
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', color: '#6B7280' }}>
                    {c.plan_name || 'Trial'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table 2: Expiring Trials */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>
              Expiring Trials
            </span>
            <Link to="/admin/trials" style={{ color: '#07A96A', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {(data.expiringTrials || []).length === 0 ? (
                <tr>
                  <td style={{ padding: '28px', textAlign: 'center', color: '#9CA3AF' }}>No trials expiring soon</td>
                </tr>
              ) : (
                (data.expiringTrials || []).slice(0, 5).map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#111827' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', color: '#A16207', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(c.subscription_end)}
                      <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginLeft: '4px' }}>
                        ({c.days_left}d)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table 3: Recent Invoices */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>
              Recent Invoices
            </span>
            <Link to="/admin/billing" style={{ color: '#07A96A', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {data.recentPayments.length === 0 ? (
                <tr>
                  <td style={{ padding: '28px', textAlign: 'center', color: '#9CA3AF' }}>No recent invoices</td>
                </tr>
              ) : (
                data.recentPayments.slice(0, 5).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#111827' }}>
                      {p.invoice_number}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#4B5563' }}>
                      {p.company_name}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: p.status === 'paid' ? '#16A34A' : '#CA8A04',
                      }}
                    >
                      {money(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
