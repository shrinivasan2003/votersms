import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Organization from './pages/masters/Organization';
import Voters from './pages/masters/Voters';
import SmsTemplates from './pages/masters/SmsTemplates';
import EmailTemplates from './pages/masters/EmailTemplates';
import WhatsappTemplates from './pages/masters/WhatsappTemplates';
import SmsProviders from './pages/masters/SmsProviders';
import EmailProviders from './pages/masters/EmailProviders';
import WhatsappProviders from './pages/masters/WhatsappProviders';
import SmsJobs from './pages/transactions/SmsJobs';
import EmailJobs from './pages/transactions/EmailJobs';
import WhatsappJobs from './pages/transactions/WhatsappJobs';
import ProcessJobs from './pages/transactions/ProcessJobs';
import SmsDeliveryReport from './pages/reports/SmsDeliveryReport';
import EmailDeliveryReport from './pages/reports/EmailDeliveryReport';
import Users from './pages/admin/Users';
import Roles from './pages/admin/Roles';
import Permissions from './pages/admin/Permissions';
import ResetPassword from './pages/admin/ResetPassword';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Masters */}
          <Route path="organization" element={<Organization />} />
          <Route path="voters" element={<Voters />} />
          <Route path="recipients" element={<Voters />} />
          <Route path="sms-templates" element={<SmsTemplates />} />
          <Route path="email-templates" element={<EmailTemplates />} />
          <Route path="whatsapp-templates" element={<WhatsappTemplates />} />
          <Route path="sms-providers" element={<SmsProviders />} />
          <Route path="email-providers" element={<EmailProviders />} />
          <Route path="whatsapp-providers" element={<WhatsappProviders />} />
          
          {/* Transactions */}
          <Route path="sms-jobs" element={<SmsJobs />} />
          <Route path="email-jobs" element={<EmailJobs />} />
          <Route path="whatsapp-jobs" element={<WhatsappJobs />} />
          <Route path="process-job" element={<ProcessJobs />} />
          
          {/* Reports */}
          <Route path="sms-delivery-report" element={<SmsDeliveryReport />} />
          <Route path="email-delivery-report" element={<EmailDeliveryReport />} />
          
          {/* Admin */}
          <Route path="users" element={<Users />} />
          <Route path="roles" element={<Roles />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
