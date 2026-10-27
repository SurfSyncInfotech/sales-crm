import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  Users,
  Kanban,
  Clock,
  LogOut,
  ArrowLeft,
  Bell,
  Search,
  Zap,
  MessageSquareText,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const links = [
  { to: '/sales', label: 'Dashboard', end: true, icon: <LayoutGrid size={19} /> },
  { to: '/sales/leads', label: 'Leads', icon: <Users size={19} /> },
  { to: '/sales/pipeline', label: 'Sales Pipeline', icon: <Kanban size={19} /> },
  { to: '/sales/reminders', label: 'Auto-Reminders', icon: <Clock size={19} /> },
  { to: '/sales/feedback', label: 'Feedback', icon: <MessageSquareText size={19} /> },
];

export default function SalesLayout() {
  const { user, logout, companyUser } = useAuth('sales');
  const navigate = useNavigate();

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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'inherit' }}>
      {/* Dark Teal Premium Sidebar */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#072423',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxSizing: 'border-box',
          padding: '1.25rem 1rem',
          zIndex: 40,
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#072423',
              fontWeight: '900',
              fontSize: '14px',
            }}
          >
            <Zap size={16} color="#072423" fill="#072423" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {user?.company?.name || 'AeuxGlobal'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: '600', letterSpacing: '0.04em' }}>
              SALES CRM
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.65rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: isActive ? '700' : '500',
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? 'rgba(20, 78, 73, 0.9)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer Area */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Back to Company Admin Button */}
          {companyUser && (
            <button
              type="button"
              onClick={handleBackToCompany}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.18)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <ArrowLeft size={14} /> Back to Company Admin
            </button>
          )}

          {/* User Profile Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.25rem 0.4rem' }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#14b8a6',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>
              <span
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '2px solid #072423',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Sales Representative'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Sales Representative
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
              padding: '0.45rem 0.5rem',
              color: '#94a3b8',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '500',
              textAlign: 'left',
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, padding: '1.5rem 2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
