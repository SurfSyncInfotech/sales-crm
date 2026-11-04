import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  Clock,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  User,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/admin/demo-requests', label: 'Demo Requests', icon: Sparkles },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/plans', label: 'Plans', icon: Package },
  { to: '/admin/billing', label: 'Billing', icon: CreditCard },
  { to: '/admin/trials', label: 'Trials', icon: Clock },
  { to: '/admin/whatsapp-reseller', label: 'WhatsApp Reseller', icon: MessageSquare },
];

export default function SuperadminLayout() {
  const { user, logout } = useAuth('superadmin');
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/superadmin');
  }

  const initial = (user?.name?.charAt(0) || 'S').toUpperCase();

  return (
    <div className="superadmin-shell">
      <style>{`
        .superadmin-shell,
        .superadmin-shell * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .superadmin-shell {
          min-height: 100vh;
          background-color: #F6F7F9;
          color: #111827;
          display: flex;
          flex-direction: column;
        }

        /* Top Bar Desktop */
        .sa-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 64px;
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid #E6E9EE;
        }
        .sa-topbar-inner {
          max-width: 1440px;
          margin: 0 auto;
          height: 100%;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        /* Desktop Nav Links */
        .sa-desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 100%;
        }
        .sa-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #4B5563;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .sa-nav-link:hover {
          color: #111827;
          background-color: #F1F3F6;
        }
        .sa-nav-link.active {
          color: #067C52;
          background-color: #E8F8F0;
          font-weight: 700;
        }
        .sa-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -13px;
          left: 12px;
          right: 12px;
          height: 3px;
          background-color: #07A96A;
          border-radius: 3px 3px 0 0;
        }

        /* User Profile Pill */
        .sa-user-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 4px 10px 4px 4px;
          border-radius: 9999px;
          border: 1px solid #E6E9EE;
          background-color: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sa-user-btn:hover {
          border-color: #D0D5DD;
          background-color: #F9FAFB;
        }

        /* Main Container */
        .sa-main {
          flex: 1;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 28px 48px 28px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1023px) {
          .sa-desktop-nav {
            display: none !important;
          }
          .sa-main {
            padding: 16px 16px 96px 16px;
          }
        }
        @media (min-width: 1024px) {
          .sa-mobile-nav-toggle,
          .sa-mobile-bottom-bar,
          .sa-mobile-sheet {
            display: none !important;
          }
        }

        /* Mobile Bottom Tab Bar */
        .sa-mobile-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          height: 64px;
          background-color: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid #E6E9EE;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .sa-mobile-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 100%;
          text-decoration: none;
          color: #6B7280;
          font-size: 10px;
          font-weight: 600;
          position: relative;
        }
        .sa-mobile-tab.active {
          color: #067C52;
          font-weight: 700;
        }
        .sa-mobile-tab.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 20%;
          right: 20%;
          height: 3px;
          background-color: #07A96A;
          border-radius: 0 0 3px 3px;
        }

        /* Mobile Bottom Sheet for More */
        .sa-mobile-sheet {
          position: fixed;
          bottom: 64px;
          left: 0;
          right: 0;
          z-index: 60;
          background-color: #FFFFFF;
          border-top: 1px solid #E6E9EE;
          border-radius: 20px 20px 0 0;
          padding: 20px 16px;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* Top Bar Header */}
      <header className="sa-topbar">
        <div className="sa-topbar-inner">
          {/* Brand Logo & Super Admin Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NavLink to="/admin" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img
                src="/patronping-logo.png"
                alt="PatronPing"
                style={{ height: '36px', width: 'auto', display: 'block' }}
              />
            </NavLink>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#067C52',
                backgroundColor: '#E8F8F0',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #B7E8D2',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Shield size={12} />
              Super Admin
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="sa-desktop-nav" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sa-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Account Menu */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="sa-user-btn"
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#07A96A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initial}
              </span>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  {user?.name || 'Administrator'}
                </span>
                <span style={{ fontSize: '10.5px', color: '#6B7280', lineHeight: 1.2 }}>
                  Operator
                </span>
              </div>
              <ChevronDown size={14} color="#6B7280" style={{ marginRight: '2px' }} />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    zIndex: 70,
                    width: '230px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '14px',
                    padding: '8px',
                    boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18), 0 4px 8px -4px rgba(16, 24, 40, 0.08)',
                  }}
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {user?.name || 'Super Admin'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                      {user?.email || 'admin@patronping.com'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#DC2626',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEECEC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="sa-main" id="main">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="sa-mobile-bottom-bar" aria-label="Mobile Navigation">
        <NavLink to="/admin" end className={({ isActive }) => `sa-mobile-tab ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/admin/companies" className={({ isActive }) => `sa-mobile-tab ${isActive ? 'active' : ''}`}>
          <Building2 size={20} />
          <span>Tenants</span>
        </NavLink>
        <NavLink to="/admin/billing" className={({ isActive }) => `sa-mobile-tab ${isActive ? 'active' : ''}`}>
          <CreditCard size={20} />
          <span>Billing</span>
        </NavLink>
        <NavLink to="/admin/trials" className={({ isActive }) => `sa-mobile-tab ${isActive ? 'active' : ''}`}>
          <Clock size={20} />
          <span>Trials</span>
        </NavLink>
        <button
          type="button"
          className={`sa-mobile-tab ${mobileMenuOpen ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Bottom Sheet */}
      {mobileMenuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 17, 24, 0.45)', zIndex: 55 }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="sa-mobile-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>Additional Modules</div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <NavLink
                to="/admin/plans"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#F9FAFB',
                  color: '#111827',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}
              >
                <Package size={18} color="#07A96A" />
                <span>Subscription Plans</span>
              </NavLink>

              <NavLink
                to="/admin/whatsapp-reseller"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#F9FAFB',
                  color: '#111827',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}
              >
                <MessageSquare size={18} color="#07A96A" />
                <span>WhatsApp Reseller Hub</span>
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FEECEC',
                  color: '#DC2626',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
