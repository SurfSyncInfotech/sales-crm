import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import SalesRemindersPage from './pages/SalesRemindersPage';
import SalesFeedbackPage from './pages/SalesFeedbackPage';
import OverviewPage from './pages/OverviewPage';
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
import AutomationPage from './pages/AutomationPage';
import WorkflowSettingsPage from './pages/WorkflowSettingsPage';
import WorkflowProvider from './features/workflow/WorkflowProvider';
import PublicLeadCapturePage from './pages/PublicLeadCapturePage';
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
  if (companyUser) return <Navigate to="/company" replace />;
  if (salesUser) return <Navigate to="/sales" replace />;
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
          <Route path="/sales/login" element={<SalesLoginPage />} />
          <Route path="/capture/:webhookKey" element={<PublicLeadCapturePage />} />

          {/* Superadmin Panel */}
          <Route
            element={<ProtectedRoute portal="superadmin" roles={['superadmin']} loginPath="/login" />}
          >
            <Route path="/admin" element={<SuperadminLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="trials" element={<TrialPage />} />
            </Route>
          </Route>

          {/* Company Admin Panel */}
          <Route
            element={
              <ProtectedRoute
                portal="company"
                roles={['company_admin', 'salesperson']}
                loginPath="/company/login"
              />
            }
          >
            <Route
              path="/company"
              element={
                <WorkflowProvider>
                  <CompanyLayout />
                </WorkflowProvider>
              }
            >
              <Route index element={<CompanyDashboardPage />} />
              <Route path="leads" element={<CompanyLeadsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="team" element={<CompanyTeamPage />} />
              <Route path="workflow-settings" element={<WorkflowSettingsPage />} />
            </Route>
          </Route>

          {/* Dedicated Sales CRM Panel */}
          <Route
            element={
              <ProtectedRoute
                portal="sales"
                roles={['salesperson', 'company_admin']}
                loginPath="/sales/login"
              />
            }
          >
            <Route path="/sales" element={<SalesLayout />}>
              <Route index element={<SalesDashboardPage />} />
              <Route path="leads" element={<SalesLeadsPage />} />
              <Route path="pipeline" element={<SalesPipelinePage />} />
              <Route path="reminders" element={<SalesRemindersPage />} />
              <Route path="feedback" element={<SalesFeedbackPage />} />
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
