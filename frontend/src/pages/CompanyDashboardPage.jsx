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
  Calendar,
  Building2,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const QUICK = [
  { to: '/company/pipeline', icon: KanbanSquare, title: 'Sales Pipeline', text: 'Stage velocity & deals', color: '#2A9CB8', bg: '#E8F6FA' },
  { to: '/company/tasks', icon: CheckSquare, title: 'Tasks & Cadence', text: 'Follow-ups and reminders', color: '#16A34A', bg: '#DCFCE7' },
  { to: '/company/quotations', icon: FileText, title: 'Quotations', text: 'Pricing approvals & reviews', color: '#F68713', bg: '#FFF3E6' },
  { to: '/company/automation', icon: Workflow, title: 'Automation', text: 'Lead capture & workflows', color: '#6D28D9', bg: '#F3E8FF' },
];

export default function CompanyDashboardPage() {
  const { user } = useAuth('company');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    companyPortalApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(err.message));

    // Background polling every 20 seconds
    const interval = setInterval(() => {
      companyPortalApi
        .dashboard()
        .then(setData)
        .catch(() => { });
    }, 20000);

    return () => clearInterval(interval);
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

  const { company, counts } = data;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            {company.name}
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.86rem' }}>
            Company command center. Oversee team performance, pipeline velocity, and quotation approvals.
          </p>
        </div>

        {user?.role === 'company_admin' && (
          <Link to="/company/team" className="btn-primary-action">
            <Plus size={15} /> Add Salesperson
          </Link>
        )}
      </div>

      {/* SurfSync KPI Stat Widgets Matrix (Component 3.1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
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

        {/* KPI 3: Company Admins */}
        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Supervisors & Admins</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {counts.admins}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#1D667C', fontWeight: '600', marginTop: '0.4rem' }}>
            Administrative accounts
          </div>
        </div>

        {/* KPI 4: Subscription */}
        {/* <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Subscription Validity</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F3E8FF', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', marginTop: '0.7rem', lineHeight: 1.1 }}>
            {company.subscription_end || 'Active'}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: '0.4rem' }}>
            Billing cycle: {company.billing_cycle}
          </div>
        </div> */}
      </div>

      {/* Quick Launch Hub */}
      <div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827', margin: '0.5rem 0 0.85rem 0' }}>
          Operational Modules
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
      <div className="sales-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E6E9EE', paddingBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111827', margin: 0 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
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
