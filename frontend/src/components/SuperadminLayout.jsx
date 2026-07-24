import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const links = [
  {
    to: '/admin',
    label: 'Home',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    to: '/admin/companies',
    label: 'Companies',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V8.8L12 4l8 4.8V20h-6.2v-5.4H10.2V20H4Zm2.2-2.2h1.8v-3.2h7.9v3.2h1.8V9.7L12 6.2 6.2 9.7v8.1Z" />
      </svg>
    ),
  },
  {
    to: '/admin/plans',
    label: 'Plans',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h12a2 2 0 0 1 2 2v12.4l-3.4-2.2-2.6 2-2.5-2-2.5 2-2.6-2L4 18.4V6a2 2 0 0 1 2-2Zm0 2v9.1l1.4-.9 2.6 2 2.5-2 2.5 2 2.6-2 1.4.9V6H6Z" />
      </svg>
    ),
  },
  {
    to: '/admin/revenue',
    label: 'Revenue',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16v-2H4v2Zm2.5-3.5 3.2-4.2 2.8 2.1L17 7l1.6 1.2-5.2 7.2-2.8-2.1-2.6 3.4L6.5 15.5Z" />
      </svg>
    ),
  },
];

const titles = {
  '/admin': 'Overview',
  '/admin/companies': 'Companies',
  '/admin/plans': 'Plans',
  '/admin/revenue': 'Revenue',
};

export default function SuperadminLayout() {
  const { user, logout } = useAuth('superadmin');
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = titles[location.pathname] || 'SurfSync';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar desktop-only">
        <BrandLogo />
        <p className="sidebar-kicker">Superadmin</p>

        <nav className="side-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{link.icon}</span>
              {link.label === 'Home' ? 'Overview' : link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{user?.name?.charAt(0) || 'S'}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-frame">
        <header className="mobile-topbar mobile-only">
          <BrandLogo variant="compact" />
          <div className="mobile-topbar-meta">
            <div>
              <p className="eyebrow">Superadmin</p>
              <strong>{pageTitle}</strong>
            </div>
            <button type="button" className="avatar-btn" onClick={handleLogout} title="Sign out">
              <span className="avatar">{user?.name?.charAt(0) || 'S'}</span>
            </button>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>

        <nav className="mobile-tabbar mobile-only" aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
