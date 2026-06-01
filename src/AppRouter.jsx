import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/shared/ErrorBoundary';

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
const EmailReplies        = lazy(() => import('./pages/transactions/EmailReplies'));
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

/** Wraps a page element in a per-page error boundary */
const P = ({ children }) => (
  <ErrorBoundary variant="page">{children}</ErrorBoundary>
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
        <Route path="/"               element={<P><LandingPage /></P>} />
        <Route path="/login"          element={<P><Login /></P>} />
        <Route path="/forgot-password"element={<P><ForgotPassword /></P>} />
        <Route path="/reset-password" element={<P><ResetPasswordPage /></P>} />

        {/* Admin Panel — standalone, no main-app layout */}
        <Route path="/admin" element={<P><AdminPanel /></P>} />

        {/* Main application — customer users only */}
        <Route path="/" element={<CustomerRoute><AppLayout /></CustomerRoute>}>
          <Route path="dashboard" element={<P><Dashboard /></P>} />

          {/* Masters */}
          <Route path="organization"       element={<P><Organization /></P>} />
          <Route path="voters"             element={<P><Voters /></P>} />
          <Route path="recipients"         element={<P><Voters /></P>} />
          <Route path="sms-templates"      element={<P><SmsTemplates /></P>} />
          <Route path="email-templates"    element={<P><EmailTemplates /></P>} />
          <Route path="whatsapp-templates" element={<P><WhatsappTemplates /></P>} />

          {/* Transactions */}
          <Route path="sms-jobs"           element={<P><SmsJobs /></P>} />
          <Route path="email-jobs"         element={<P><EmailJobs /></P>} />
          <Route path="email-replies"      element={<P><EmailReplies /></P>} />
          <Route path="whatsapp-jobs"      element={<P><WhatsappJobs /></P>} />
          <Route path="process-job"        element={<P><ProcessJobs /></P>} />

          {/* Reports */}
          <Route path="sms-delivery-report"   element={<P><SmsDeliveryReport /></P>} />
          <Route path="email-delivery-report" element={<P><EmailDeliveryReport /></P>} />

          {/* Configuration */}
          <Route path="configuration" element={<P><Configuration /></P>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
