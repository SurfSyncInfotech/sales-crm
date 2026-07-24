import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperadminLayout from './components/SuperadminLayout';
import CompanyLayout from './components/CompanyLayout';
import LoginPage from './pages/LoginPage';
import CompanyLoginPage from './pages/CompanyLoginPage';
import OverviewPage from './pages/OverviewPage';
import CompaniesPage from './pages/CompaniesPage';
import PlansPage from './pages/PlansPage';
import RevenuePage from './pages/RevenuePage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import CompanyTeamPage from './pages/CompanyTeamPage';
import CompanyLeadsPage from './pages/CompanyLeadsPage';
import PublicLeadCapturePage from './pages/PublicLeadCapturePage';
import './index.css';

function HomeRedirect() {
  const { superadminUser, companyUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-orb" />
        <p>Loading SurfSync…</p>
      </div>
    );
  }
  if (superadminUser) return <Navigate to="/admin" replace />;
  if (companyUser) return <Navigate to="/company" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/company/login" element={<CompanyLoginPage />} />
          <Route path="/c/:slug/login" element={<CompanyLoginPage />} />
          <Route path="/capture/:webhookKey" element={<PublicLeadCapturePage />} />

          <Route
            element={<ProtectedRoute portal="superadmin" roles={['superadmin']} loginPath="/login" />}
          >
            <Route path="/admin" element={<SuperadminLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="revenue" element={<RevenuePage />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute
                portal="company"
                roles={['company_admin', 'salesperson']}
                loginPath="/company/login"
              />
            }
          >
            <Route path="/company" element={<CompanyLayout />}>
              <Route index element={<CompanyDashboardPage />} />
              <Route path="leads" element={<CompanyLeadsPage />} />
              <Route path="team" element={<CompanyTeamPage />} />
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
