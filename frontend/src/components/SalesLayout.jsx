import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  Users,
  Kanban,
  Clock,
  LogOut,
  ArrowLeft,
  Zap,
  MessageSquareText,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const links = [
  { to: '/sales', label: 'Dashboard', end: true, icon: <LayoutGrid size={18} /> },
  { to: '/sales/leads', label: 'Leads', icon: <Users size={18} /> },
  { to: '/sales/pipeline', label: 'Sales Pipeline', icon: <Kanban size={18} /> },
  { to: '/sales/reminders', label: 'Auto-Reminders', icon: <Clock size={18} /> },
  { to: '/sales/feedback', label: 'Feedback Logs', icon: <MessageSquareText size={18} /> },
];

export default function SalesLayout() {
  const { user, logout, companyUser } = useAuth('sales');
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/sales/login');
  }

  function handleBackToCompany() {
    navigate('/company/team');
  }

  const initials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'SR';

  return (
    <div className="sales-workspace-root" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F6F7F9' }}>
      {/* Mobile Backdrop */}
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
        className={`sales-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
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
              Sales Enterprise
            </div>
          </div>

          {/* Close button inside mobile drawer */}
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
          Workspace
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {links.map((link) => (
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
          {/* Back to Company Admin Button if authorized */}
          {companyUser && (
            <button
              type="button"
              onClick={handleBackToCompany}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #E6E9EE',
                backgroundColor: '#F8FAFC',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#BFDBFE';
                e.currentTarget.style.color = '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E6E9EE';
                e.currentTarget.style.color = '#334155';
              }}
            >
              <ArrowLeft size={13} />
              <span>Back to Admin</span>
            </button>
          )}

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
                title="Active"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Sales Representative'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} color="#059669" /> Rep Account
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
        {/* SurfSync Sticky Top Header */}
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
          {/* Left: Mobile hamburger & breadcrumb / title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="sales-mobile-toggle"
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
                Sales Console
              </span>
              <span
                className="badge-status"
                style={{
                  backgroundColor: '#DCFCE7', // Success green soft
                  color: '#166534',
                  border: '1px solid #BBF7D0',
                }}
              >
                <span className="badge-status-dot" style={{ backgroundColor: '#16A34A' }} />
                Live Hub
              </span>
            </div>
          </div>

          {/* Right: Notification bell & profile pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <NotificationBell portal="sales" />
            <div style={{ height: '22px', width: '1px', backgroundColor: '#E6E9EE' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#E8F6FA',
                  color: '#1D667C',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #BEE1EB',
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#4B5563' }} className="sales-header-user-name">
                {user?.name || 'Sales Rep'}
              </span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main style={{ flex: 1, padding: '1.5rem', boxSizing: 'border-box' }} className="sales-main-container">
          <Outlet />
        </main>
      </div>

      {/* Embedded CSS for responsive sidebar behavior and nav pills */}
      <style>{`
        .side-nav-pill:not(.active):hover {
          background-color: #F8FAFC !important;
          color: #0F172A !important;
        }
        .side-nav-pill:not(.active):hover span {
          color: #1E293B !important;
        }
        @media (max-width: 1024px) {
          .sales-sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
          .sales-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .sales-mobile-toggle {
            display: inline-flex !important;
          }
          .mobile-close-btn {
            display: inline-flex !important;
          }
        }
        @media (max-width: 640px) {
          .sales-main-container {
            padding: 1rem 0.75rem !important;
          }
          .sales-header-user-name {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
