import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import LandingPage    from './pages/LandingPage';
import Login          from './pages/auth/Login';
import AdminPanel     from './pages/admin/AdminPanel';
import Dashboard      from './pages/Dashboard';
import Organization   from './pages/masters/Organization';
import Voters         from './pages/masters/Voters';
import SmsTemplates   from './pages/masters/SmsTemplates';
import EmailTemplates from './pages/masters/EmailTemplates';
import WhatsappTemplates from './pages/masters/WhatsappTemplates';
import SmsJobs        from './pages/transactions/SmsJobs';
import EmailJobs      from './pages/transactions/EmailJobs';
import WhatsappJobs   from './pages/transactions/WhatsappJobs';
import ProcessJobs    from './pages/transactions/ProcessJobs';
import SmsDeliveryReport   from './pages/reports/SmsDeliveryReport';
import EmailDeliveryReport from './pages/reports/EmailDeliveryReport';
import Configuration from './pages/customer/Configuration';

/** Route accessible only by logged-in customer users (has customer_id) */
const CustomerRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.customer_id && user.role?.toLowerCase() === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

      {/* Admin Panel — standalone, no main-app layout */}
      <Route path="/admin" element={<AdminPanel />} />

      {/* Main application — customer users only */}
      <Route path="/" element={<CustomerRoute><AppLayout /></CustomerRoute>}>
        <Route path="dashboard" element={<Dashboard />} />

        {/* Masters — templates + recipients only (providers moved to Configuration) */}
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

        {/* Configuration — customer-specific provider setup */}
        <Route path="configuration" element={<Configuration />} />

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
