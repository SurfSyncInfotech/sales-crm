import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const links = [
  {
    to: '/company',
    label: 'Home',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    to: '/company/leads',
    label: 'Leads',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v2.2H4V5Zm0 5.9h16V13H4v-2.1Zm0 5.9h10.5V19H4v-2.2Z" />
      </svg>
    ),
  },
  {
    to: '/company/team',
    label: 'Team',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7.5 8a7.5 7.5 0 0 1 15 0v1H4.5v-1Z" />
      </svg>
    ),
  },
];

const titles = {
  '/company': 'Dashboard',
  '/company/leads': 'Leads',
  '/company/team': 'Team',
};

export default function CompanyLayout() {
  const { user, logout } = useAuth('company');
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = titles[location.pathname] || 'Company';

  function handleLogout() {
    logout();
    navigate('/company/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar desktop-only">
        <BrandLogo />
        <p className="sidebar-kicker">{user?.company?.name || 'Company'}</p>

        <nav className="side-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{link.icon}</span>
              {link.label === 'Home' ? 'Dashboard' : link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{user?.name?.charAt(0) || 'C'}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role === 'company_admin' ? 'Company admin' : 'Salesperson'}</small>
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
              <p className="eyebrow">{user?.company?.name || 'Company'}</p>
              <strong>{pageTitle}</strong>
            </div>
            <button type="button" className="avatar-btn" onClick={handleLogout} title="Sign out">
              <span className="avatar">{user?.name?.charAt(0) || 'C'}</span>
            </button>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>

        <nav className="mobile-tabbar mobile-tabbar-3 mobile-only" aria-label="Primary">
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
