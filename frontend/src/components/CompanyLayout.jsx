import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Users,
  Workflow,
  Building,
  AlertCircle,
  Info,
  MessageSquare,
  MessageSquareText,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Building2,
  Zap,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const titles = {
  '': 'Admin Dashboard',
  '/': 'Admin Dashboard',
  '/dashboard': 'Admin Dashboard',
  '/leads': 'Leads Management',
  '/pipeline': 'Sales Pipeline',
  '/tasks': 'Follow-Up Tasks',
  '/quotations': 'Quotations & Pricing',
  '/feedbacks': 'Sales Rep Feedback Logs',
  '/feedback': 'Sales Rep Feedback Logs',
  '/automation': 'Workflow Automation',
  '/whatsapp-api': 'Official WhatsApp API',
  '/team': 'Team & Sales Reps',
  '/settings': 'Company Settings',
  '/workflow-settings': 'Company Settings',
  '/company': 'Admin Dashboard',
  '/company/leads': 'Leads Management',
  '/company/pipeline': 'Sales Pipeline',
  '/company/tasks': 'Follow-Up Tasks',
  '/company/quotations': 'Quotations & Pricing',
  '/company/feedbacks': 'Sales Rep Feedback Logs',
  '/company/automation': 'Workflow Automation',
  '/company/whatsapp-api': 'Official WhatsApp API',
  '/company/team': 'Team & Sales Reps',
  '/company/settings': 'Company Settings',
  '/company/workflow-settings': 'Company Settings',
};

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

export default function CompanyLayout() {
  const { user, logout } = useAuth('company');
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active company slug (e.g. 'surfsync' or user's company slug)
  const slug = companySlug || user?.company?.slug || user?.company_slug || 'company';
  const basePath = `/${slug}`;

  // Seamless auto-redirect from legacy /company to /:companySlug if user has a real slug
  useEffect(() => {
    const realSlug = user?.company?.slug || user?.company_slug;
    if (realSlug && location.pathname.startsWith('/company')) {
      const newPath = location.pathname.replace('/company', `/${realSlug}`);
      navigate(newPath, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const links = useMemo(() => [
    { to: `${basePath}`, label: 'Dashboard', id: 'dashboard', end: true, icon: <LayoutDashboard size={18} /> },
    { to: `${basePath}/leads`, label: 'Leads', id: 'leads', icon: <Inbox size={18} /> },
    { to: `${basePath}/pipeline`, label: 'Pipeline', id: 'pipeline', icon: <KanbanSquare size={18} /> },
    { to: `${basePath}/quotations`, label: 'Quotations', id: 'quotations', icon: <FileText size={18} /> },
    { to: `${basePath}/feedbacks`, label: 'Feedback Logs', id: 'feedbacks', icon: <MessageSquareText size={18} /> },
    { to: `${basePath}/automation`, label: 'Automation', id: 'automation', icon: <Workflow size={18} /> },
    { to: `${basePath}/whatsapp-api`, label: 'WhatsApp API', id: 'whatsapp', icon: <MessageSquare size={18} /> },
    { to: `${basePath}/team`, label: 'Team', id: 'team', icon: <Users size={18} /> },
    { to: `${basePath}/settings`, label: 'Settings', id: 'settings', icon: <Settings size={18} /> },
  ], [basePath]);

  // Page title resolution
  const subPath = location.pathname.replace(new RegExp(`^/(${slug}|company)`), '') || '';
  const pageTitle = titles[subPath] || titles[`/company${subPath}`] || titles[location.pathname] || 'Company Workspace';

  function handleLogout() {
    logout();
    const loginSlug = user?.company?.slug || user?.company_slug;
    navigate(loginSlug ? `/${loginSlug}/login` : '/company/login');
  }

  const pendingInvoice = user?.company?.pending_invoice;

  // Pending Invoice Screen (preserved)
  if (pendingInvoice) {
    const handlePrint = () => {
      window.print();
    };

    return (
      <div style={{ backgroundColor: '#F6F7F9', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E6E9EE', maxWidth: '640px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ backgroundColor: '#FFF3E6', borderBottom: '1px solid #FED7AA', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F68713', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
              <AlertCircle size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#B65807' }}>
              Subscription Payment Pending
            </h2>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.86rem', color: '#9A3412' }}>
              Invoice #{pendingInvoice.invoice_number} is pending for {user?.company?.name || 'your company'}.
            </p>
          </div>

          <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ border: '1px solid #E6E9EE', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <small style={{ color: '#6B7280', fontSize: '0.78rem' }}>Plan</small>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#111827' }}>{pendingInvoice.plan_name || 'Enterprise'}</strong>
                </div>
                <div>
                  <small style={{ color: '#6B7280', fontSize: '0.78rem' }}>Billing Cycle</small>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#111827', textTransform: 'uppercase' }}>{pendingInvoice.billing_cycle}</strong>
                </div>
                <div>
                  <small style={{ color: '#6B7280', fontSize: '0.78rem' }}>Total Amount</small>
                  <strong className="num" style={{ display: 'block', fontSize: '1.15rem', color: '#16A34A', fontWeight: '800' }}>{money(pendingInvoice.amount)}</strong>
                </div>
                <div>
                  <small style={{ color: '#6B7280', fontSize: '0.78rem' }}>Due Date</small>
                  <strong className="num" style={{ display: 'block', fontSize: '0.95rem', color: '#DC2626' }}>{formatDate(pendingInvoice.due_date)}</strong>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E6E9EE', borderRadius: '10px', padding: '1rem', fontSize: '0.84rem' }}>
              <strong style={{ color: '#111827', display: 'block', marginBottom: '6px' }}>Bank & UPI Transfer Details:</strong>
              <div>Company: <strong>SURFSYNC INFOTECH PRIVATE LIMITED</strong></div>
              <div>Bank: <strong>State Bank of India</strong></div>
              <div>Account: <strong className="num">45182936194</strong></div>
              <div>IFSC: <strong>SBIN0001483</strong></div>
              <div>UPI: <strong>9429693456 / surfsync@sbi</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary-action"
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Print / Download Invoice
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary-action"
                style={{ padding: '0.65rem 1rem' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'CA';

  return (
    <div className="sales-workspace-root" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F6F7F9', fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 15, 20, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 49,
          }}
        />
      )}

      {/* SurfSync Light Reference Sidebar */}
      <aside
        style={{
          width: '256px',
          backgroundColor: '#FFFFFF',
          color: '#334155',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          borderRight: '1px solid #E6E9EE',
          boxSizing: 'border-box',
          padding: '1.25rem 1rem',
          zIndex: 50,
          transition: 'transform 0.25s ease-in-out',
        }}
        className={`company-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Logo & Mobile Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <img
              src="/patronping-logo.png"
              alt="PatronPing"
              style={{
                height: '38px',
                width: 'auto',
                maxWidth: '175px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{ fontSize: '0.70rem', color: '#000000', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '2px' }}>
              Company Portal
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="mobile-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
              display: 'none',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Section */}
        <div style={{ paddingLeft: '0.5rem', marginBottom: '0.5rem', fontSize: '0.68rem', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Operations
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
          {links.filter((link) => {
            if (user?.role === 'company_admin' && (!user?.permissions || user.permissions.length === 0)) return true;
            const perms = Array.isArray(user?.permissions) ? user.permissions : [];
            if (perms.length > 0) return perms.includes(link.id);
            return true;
          }).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileMenuOpen(false)}
              className="side-nav-pill"
              style={({ isActive }) => ({
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                fontSize: '0.86rem',
                fontWeight: isActive ? '700' : '600',
                textDecoration: 'none',
                color: isActive ? '#C2410C' : '#475569',
                backgroundColor: isActive ? '#FFF7ED' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: '-16px',
                        width: '4px',
                        height: '24px',
                        borderRadius: '0 4px 4px 0',
                        backgroundColor: '#F68713',
                      }}
                    />
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#EA580C' : '#64748B' }}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer Area */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* User Profile Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0.55rem 0.7rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF3E6',
                  color: '#F68713',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #FED7AA',
                }}
              >
                {initials}
              </div>
              <span
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  border: '2px solid #F8FAFC',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Company Admin'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} color="#059669" /> {user?.custom_role || (user?.role === 'company_admin' ? 'Administrator' : 'Team Member')}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.5rem 0.65rem',
              color: '#64748B',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '600',
              textAlign: 'left',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#DC2626';
              e.currentTarget.style.backgroundColor = '#FEF2F2';
              e.currentTarget.style.borderColor = '#FECACA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748B';
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Sticky Top Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            borderBottom: '1px solid #E6E9EE',
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Left: Mobile hamburger & breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="company-mobile-toggle"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #E6E9EE',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                cursor: 'pointer',
              }}
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#111827', letterSpacing: '-0.01em' }}>
                {pageTitle}
              </span>
              <span
                className="badge-status"
                style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  border: '1px solid #BBF7D0',
                }}
              >
                <span className="badge-status-dot" style={{ backgroundColor: '#16A34A' }} />
                Admin Active
              </span>
            </div>
          </div>

          {/* Right: Notification bell & company chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <NotificationBell portal="company" />
            <div style={{ height: '22px', width: '1px', backgroundColor: '#E6E9EE' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF3E6',
                  color: '#F68713',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #FED7AA',
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#4B5563' }} className="company-header-user-name">
                {user?.company?.name || user?.name || 'Company Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main style={{ flex: 1, padding: '1.5rem', boxSizing: 'border-box' }} className="company-main-container">
          <Outlet />
        </main>
      </div>

      {/* Embedded CSS for responsive behavior and nav pills */}
      <style>{`
        .side-nav-pill:not(.active):hover {
          background-color: #F8FAFC !important;
          color: #0F172A !important;
        }
        .side-nav-pill:not(.active):hover span {
          color: #1E293B !important;
        }
        @media (max-width: 1024px) {
          .company-sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
          .company-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .company-mobile-toggle {
            display: inline-flex !important;
          }
          .mobile-close-btn {
            display: inline-flex !important;
          }
        }
        @media (max-width: 640px) {
          .company-main-container {
            padding: 1rem 0.75rem !important;
          }
          .company-header-user-name {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
