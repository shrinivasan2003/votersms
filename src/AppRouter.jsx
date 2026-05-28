import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Lazy-loaded pages
const LandingPage         = lazy(() => import('./pages/LandingPage'));
const Login               = lazy(() => import('./pages/auth/Login'));
const ForgotPassword      = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPasswordPage   = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AdminPanel          = lazy(() => import('./pages/admin/AdminPanel'));
const Dashboard           = lazy(() => import('./pages/Dashboard'));
const Organization        = lazy(() => import('./pages/masters/Organization'));
const Voters              = lazy(() => import('./pages/masters/Voters'));
const SmsTemplates        = lazy(() => import('./pages/masters/SmsTemplates'));
const EmailTemplates      = lazy(() => import('./pages/masters/EmailTemplates'));
const WhatsappTemplates   = lazy(() => import('./pages/masters/WhatsappTemplates'));
const SmsJobs             = lazy(() => import('./pages/transactions/SmsJobs'));
const EmailJobs           = lazy(() => import('./pages/transactions/EmailJobs'));
const WhatsappJobs        = lazy(() => import('./pages/transactions/WhatsappJobs'));
const ProcessJobs         = lazy(() => import('./pages/transactions/ProcessJobs'));
const SmsDeliveryReport   = lazy(() => import('./pages/reports/SmsDeliveryReport'));
const EmailDeliveryReport = lazy(() => import('./pages/reports/EmailDeliveryReport'));
const Configuration       = lazy(() => import('./pages/customer/Configuration'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
    <div className="flex items-center gap-3 text-gray-400">
      <Loader2 className="animate-spin" size={22} />
      <span className="text-sm font-medium">Loading…</span>
    </div>
  </div>
);

/** Route accessible only by logged-in customer users (has customer_id) */
const CustomerRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.customer_id && user.role?.toLowerCase() === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin Panel — standalone, no main-app layout */}
        <Route path="/admin" element={<AdminPanel />} />

        {/* Main application — customer users only */}
        <Route path="/" element={<CustomerRoute><AppLayout /></CustomerRoute>}>
          <Route path="dashboard" element={<Dashboard />} />

          {/* Masters */}
          <Route path="organization"        element={<Organization />} />
          <Route path="voters"              element={<Voters />} />
          <Route path="recipients"          element={<Voters />} />
          <Route path="sms-templates"       element={<SmsTemplates />} />
          <Route path="email-templates"     element={<EmailTemplates />} />
          <Route path="whatsapp-templates"  element={<WhatsappTemplates />} />

          {/* Transactions */}
          <Route path="sms-jobs"      element={<SmsJobs />} />
          <Route path="email-jobs"    element={<EmailJobs />} />
          <Route path="whatsapp-jobs" element={<WhatsappJobs />} />
          <Route path="process-job"   element={<ProcessJobs />} />

          {/* Reports */}
          <Route path="sms-delivery-report"   element={<SmsDeliveryReport />} />
          <Route path="email-delivery-report" element={<EmailDeliveryReport />} />

          {/* Configuration */}
          <Route path="configuration" element={<Configuration />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
