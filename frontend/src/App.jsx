import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperadminLayout from './components/SuperadminLayout';
import CompanyLayout from './components/CompanyLayout';
import SalesLayout from './components/SalesLayout';
import LoginPage from './pages/LoginPage';
import CompanyLoginPage from './pages/CompanyLoginPage';
import SalesLoginPage from './pages/SalesLoginPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import SalesLeadsPage from './pages/SalesLeadsPage';
import SalesPipelinePage from './pages/SalesPipelinePage';
import SalesInvoicesPage from './pages/SalesInvoicesPage';
import SalesRemindersPage from './pages/SalesRemindersPage';
import SalesFeedbackPage from './pages/SalesFeedbackPage';
import OverviewPage from './pages/OverviewPage';
import SuperadminDemoRequestsPage from './pages/SuperadminDemoRequestsPage';
import CompaniesPage from './pages/CompaniesPage';
import PlansPage from './pages/PlansPage';
import BillingPage from './pages/BillingPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import CompanyTeamPage from './pages/CompanyTeamPage';
import TrialPage from './pages/TrialPage';
import CompanyLeadsPage from './pages/CompanyLeadsPage';
import PipelinePage from './pages/PipelinePage';
import TasksPage from './pages/TasksPage';
import QuotationsPage from './pages/QuotationsPage';
import CompanyFeedbackPage from './pages/CompanyFeedbackPage';
import AutomationPage from './pages/AutomationPage';
import CompanyWabaPage from './pages/CompanyWabaPage';
import AdminWabaPage from './pages/AdminWabaPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import WorkflowProvider from './features/workflow/WorkflowProvider';
import PublicLeadCapturePage from './pages/PublicLeadCapturePage';
import LandingPage from './landing/LandingPage';
import './index.css';
import './ui.css';

function HomeRedirect() {
  const { superadminUser, companyUser, salesUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-orb" />
        <p>Loading SurfSync…</p>
      </div>
    );
  }
  if (superadminUser) return <Navigate to="/admin" replace />;
  if (companyUser) {
    const slug = companyUser?.company?.slug || companyUser?.company_slug;
    return <Navigate to={slug ? `/${slug}` : '/company'} replace />;
  }
  if (salesUser) return <Navigate to="/sales" replace />;
  return <Navigate to="/superadmin" replace />;
}

function LegacyCompanyLoginRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/${slug}/login` : '/company/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/superadmin" element={<LoginPage />} />
          <Route path="/superadmin/login" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/superadmin" replace />} />
          <Route path="/company/login" element={<CompanyLoginPage />} />
          <Route path="/:slug/login" element={<CompanyLoginPage />} />
          <Route path="/c/:slug/login" element={<LegacyCompanyLoginRedirect />} />
          <Route path="/sales/login" element={<SalesLoginPage />} />
          <Route path="/capture/:webhookKey" element={<PublicLeadCapturePage />} />

          {/* Superadmin Panel */}
          <Route
            element={<ProtectedRoute portal="superadmin" roles={['superadmin']} loginPath="/superadmin" />}
          >
            <Route path="/admin" element={<SuperadminLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="demo-requests" element={<SuperadminDemoRequestsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="trials" element={<TrialPage />} />
              <Route path="whatsapp-reseller" element={<AdminWabaPage />} />
            </Route>
          </Route>

          {/* Company Admin Panel (Legacy /company & Dynamic /:companySlug root format) */}
          <Route
            element={
              <ProtectedRoute
                portal="company"
                roles={['company_admin']}
                loginPath="/company/login"
              />
            }
          >
            {/* 1. Legacy /company routes */}
            <Route
              path="/company"
              element={
                <WorkflowProvider>
                  <CompanyLayout />
                </WorkflowProvider>
              }
            >
              <Route index element={<CompanyDashboardPage />} />
              <Route path="dashboard" element={<CompanyDashboardPage />} />
              <Route path="leads" element={<CompanyLeadsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="feedbacks" element={<CompanyFeedbackPage />} />
              <Route path="feedback" element={<CompanyFeedbackPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="whatsapp-api" element={<CompanyWabaPage />} />
              <Route path="team" element={<CompanyTeamPage />} />
              <Route path="settings" element={<CompanySettingsPage />} />
              <Route path="workflow-settings" element={<CompanySettingsPage />} />
            </Route>

            {/* 2. Direct Root Company Slug Routes: patronping.com/:companySlug (e.g. /surfsync, /surfsync/leads) */}
            <Route
              path="/:companySlug"
              element={
                <WorkflowProvider>
                  <CompanyLayout />
                </WorkflowProvider>
              }
            >
              <Route index element={<CompanyDashboardPage />} />
              <Route path="dashboard" element={<CompanyDashboardPage />} />
              <Route path="leads" element={<CompanyLeadsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="feedbacks" element={<CompanyFeedbackPage />} />
              <Route path="feedback" element={<CompanyFeedbackPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="whatsapp-api" element={<CompanyWabaPage />} />
              <Route path="team" element={<CompanyTeamPage />} />
              <Route path="settings" element={<CompanySettingsPage />} />
              <Route path="workflow-settings" element={<CompanySettingsPage />} />
            </Route>
          </Route>

          {/* Dedicated Sales CRM Panel */}
          <Route
            element={
              <ProtectedRoute
                portal="sales"
                roles={['salesperson']}
                loginPath="/sales/login"
              />
            }
          >
            <Route path="/sales" element={<SalesLayout />}>
              <Route index element={<SalesDashboardPage />} />
              <Route path="leads" element={<SalesLeadsPage />} />
              <Route path="pipeline" element={<SalesPipelinePage />} />
              <Route path="invoices" element={<SalesInvoicesPage />} />
              <Route path="reminders" element={<SalesRemindersPage />} />
              <Route path="feedback" element={<SalesFeedbackPage />} />
            </Route>
          </Route>

          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
