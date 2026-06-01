import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, User, Loader2, ShieldCheck,
  Building2, Mail, UserPlus, Activity, Trash2, PowerOff,
  CheckCircle, XCircle, Power, Settings, Send, PauseCircle,
  LogOut, ChevronRight, Users, BarChart3, Database, SlidersHorizontal, X,
  ClipboardList, Menu, Sparkles, Info, Pencil, Check, RefreshCw,
} from 'lucide-react';
import AuditLog from './AuditLog';
import SliderCaptcha from '../../components/shared/SliderCaptcha';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useApi } from '../../hooks/useApi';
import { useForm } from '../../hooks/useForm';
import { customersApi } from '../../api/customers';
import { customerLimitsApi } from '../../api/customerLimits';
import { adminApi } from '../../api/admin';
import { CACHE_KEYS } from '../../config/constants';
import FormField from '../../components/shared/FormField';
import Pagination from '../../components/shared/Pagination';
import bdaLogo from '../../assets/bda-logo.webp';

// ── Toast display component ────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`mb-5 flex items-start gap-3 p-4 rounded-xl text-sm font-medium border
      ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
      {toast.type === 'success'
        ? <CheckCircle size={17} className="mt-0.5 shrink-0 text-green-600" />
        : <XCircle size={17} className="mt-0.5 shrink-0 text-red-500" />}
      <span>{toast.msg}</span>
    </div>
  );
};

// ── Admin Login Form ───────────────────────────────────────────────────────────
function AdminLoginForm({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(username, password);
      if (userData?.customer_id) {
        setError('This is a customer account. Please use Customer Login.');
        return;
      }
      if (userData?.role?.toLowerCase() !== 'admin') {
        setError('You do not have administrator privileges.');
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Invalid credentials');
      setCaptchaVerified(false);
      setCaptchaKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#001F3F] to-[#002d5c] p-7 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <ShieldCheck size={18} className="text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Platform Admin</h2>
              <p className="text-blue-300/80 text-xs mt-0.5">Restricted — administrators only</p>
            </div>
          </div>
        </div>

        <div className="p-7">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <XCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-600">Username</label>
              <div className="relative group">
                <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors" />
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-600">Password</label>
              <div className="relative group">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors" />
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-gray-900"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F] transition-colors">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <SliderCaptcha
              key={captchaKey}
              onVerify={(v) => setCaptchaVerified(v)}
            />

            <button type="submit" disabled={loading || !captchaVerified}
              className="w-full h-12 bg-gradient-to-r from-[#001F3F] to-[#002d5c] hover:from-[#002d5c] hover:to-[#003d7a] disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-[#001F3F]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign in as Admin'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center mt-5 text-xs text-gray-400">© 2026 BallotDA Enterprise. All rights reserved.</p>
    </div>
  );
}

// ── Create Customer tab ────────────────────────────────────────────────────────
function CreateCustomerTab() {
  const INITIAL = { organization_name: '', first_name: '', last_name: '', email: '', username: '', password: '' };
  const { values, handleChange, reset } = useForm(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await customersApi.create(values);
      const emailNote = data.email_sent
        ? `Welcome email sent to ${values.email}.`
        : 'Account created (configure Postmark to send welcome emails).';
      showToast(`Account created for ${values.organization_name}. ${emailNote}`);
      reset();
    } catch (err) {
      showToast(err.message || 'Failed to create account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Toast toast={toast} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
          <div className="w-9 h-9 bg-[#001F3F]/8 rounded-xl flex items-center justify-center">
            <UserPlus size={17} className="text-[#001F3F]" />
          </div>
          <div>
            <h2 className="font-bold text-[#001F3F] text-base">New Customer Account</h2>
            <p className="text-xs text-gray-500 mt-0.5">Login credentials will be emailed to the customer via Postmark</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="p-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField label="Organization Name *" name="organization_name" placeholder="Acme County Democrats" icon={Building2}
              value={values.organization_name} onChange={handleChange} />
          </div>
          <FormField label="First Name *" name="first_name" placeholder="Jane" icon={User}
            value={values.first_name} onChange={handleChange} />
          <FormField label="Last Name *" name="last_name" placeholder="Smith" icon={User}
            value={values.last_name} onChange={handleChange} />
          <div className="md:col-span-2">
            <FormField label="Email Address *" name="email" type="email" placeholder="jane@acme.org" icon={Mail}
              value={values.email} onChange={handleChange} />
          </div>
          <FormField label="Username *" name="username" placeholder="jane_acme" icon={User}
            value={values.username} onChange={handleChange} />
          <FormField label="Initial Password *" name="password" placeholder="••••••••" icon={Lock}
            value={values.password} onChange={handleChange}
            showPassword={showPassword} onTogglePassword={() => setShowPassword((v) => !v)} />

          <div className="md:col-span-2 pt-2">
            <button type="submit" disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-[#001F3F] to-[#002d5c] hover:from-[#002d5c] hover:to-[#003d7a] disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#001F3F]/15">
              {submitting
                ? <Loader2 className="animate-spin" size={18} />
                : <><UserPlus size={18} /> Create Account &amp; Send Welcome Email</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Customer Limits Modal ──────────────────────────────────────────────────────
const LIMIT_CONFIG = [
  { key: 'max_voters',             usageKey: 'voters',              label: 'Voters',              section: 'Resources' },
  { key: 'max_contact_lists',      usageKey: 'contact_lists',       label: 'Contact Lists',       section: 'Resources' },
  { key: 'max_sms_templates',      usageKey: 'sms_templates',       label: 'SMS Templates',       section: 'Templates' },
  { key: 'max_email_templates',    usageKey: 'email_templates',     label: 'Email Templates',     section: 'Templates' },
  { key: 'max_whatsapp_templates', usageKey: 'whatsapp_templates',  label: 'WhatsApp Templates',  section: 'Templates' },
  { key: 'max_sms_jobs',           usageKey: 'sms_jobs',            label: 'SMS Jobs (total)',     section: 'Jobs' },
  { key: 'max_email_jobs',         usageKey: 'email_jobs',          label: 'Email Jobs (total)',   section: 'Jobs' },
  { key: 'max_whatsapp_jobs',      usageKey: 'whatsapp_jobs',       label: 'WhatsApp Jobs (total)',section: 'Jobs' },
  { key: 'max_sms_per_month',      usageKey: 'sms_this_month',      label: 'SMS / Month',         section: 'Monthly Volume' },
  { key: 'max_emails_per_month',   usageKey: 'emails_this_month',   label: 'Emails / Month',      section: 'Monthly Volume' },
  { key: 'max_whatsapp_per_month', usageKey: 'whatsapp_this_month', label: 'WhatsApp / Month',    section: 'Monthly Volume' },
];

function CustomerLimitsModal({ customer, onClose }) {
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const result = await customerLimitsApi.get(customer.customer_id);
        setData(result);
        // Seed drafts with current limits
        const initial = {};
        LIMIT_CONFIG.forEach(({ key }) => {
          initial[key] = result.limits[key] ?? '';
        });
        setDrafts(initial);
      } catch (err) {
        showToast(err.message || 'Failed to load limits', 'error');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.customer_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      LIMIT_CONFIG.forEach(({ key }) => {
        const v = parseInt(drafts[key], 10);
        if (!isNaN(v) && v >= 0) updates[key] = v;
      });
      await customerLimitsApi.update(customer.customer_id, updates);
      // Refresh
      const result = await customerLimitsApi.get(customer.customer_id);
      setData(result);
      showToast('Limits updated successfully');
    } catch (err) {
      showToast(err.message || 'Failed to update limits', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Group by section
  const sections = [...new Set(LIMIT_CONFIG.map((c) => c.section))];

  const pct = (used, max) => {
    if (!max || max === 0) return 0;
    return Math.min(100, Math.round((used / max) * 100));
  };

  const barColor = (p) => {
    if (p >= 90) return 'bg-red-500';
    if (p >= 70) return 'bg-amber-400';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#001F3F]/8 rounded-xl flex items-center justify-center">
              <SlidersHorizontal size={17} className="text-[#001F3F]" />
            </div>
            <div>
              <h2 className="font-bold text-[#001F3F] text-base">Usage &amp; Limits</h2>
              <p className="text-xs text-gray-500 mt-0.5">{customer.organization_name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-sm">
              <Loader2 className="animate-spin" size={18} /> Loading limits...
            </div>
          ) : (
            <>
              <Toast toast={toast} />
              {sections.map((section) => (
                <div key={section}>
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">{section}</h3>
                  <div className="space-y-3">
                    {LIMIT_CONFIG.filter((c) => c.section === section).map(({ key, usageKey, label }) => {
                      const used = data?.usage?.[usageKey] ?? 0;
                      const max  = parseInt(drafts[key], 10) || 0;
                      const p    = pct(used, max);
                      return (
                        <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-sm font-semibold text-gray-700">{label}</span>
                            <span className="text-xs text-gray-400 tabular-nums">{used.toLocaleString()} / {max.toLocaleString()} used</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full transition-all ${barColor(p)}`}
                              style={{ width: `${p}%` }}
                            />
                          </div>
                          {/* Editable max input */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 shrink-0">Max:</label>
                            <input
                              type="number" min="0"
                              value={drafts[key] ?? ''}
                              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                              className="flex-1 h-8 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-[#001F3F]/40 focus:ring-2 focus:ring-[#001F3F]/5 transition-all"
                            />
                            <span className={`text-xs font-bold tabular-nums ${
                              p >= 90 ? 'text-red-500' : p >= 70 ? 'text-amber-500' : 'text-gray-400'
                            }`}>{p}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-2xl bg-gray-50">
            <button onClick={onClose}
              className="px-5 h-10 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 h-10 bg-gradient-to-r from-[#001F3F] to-[#002d5c] hover:from-[#002d5c] hover:to-[#003d7a] disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-bold shadow-md shadow-[#001F3F]/15 transition-all flex items-center gap-2">
              {saving ? <Loader2 className="animate-spin" size={15} /> : <><SlidersHorizontal size={15} /> Save Limits</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monitor Accounts tab ───────────────────────────────────────────────────────
function MonitorAccountsTab() {
  const fetchCustomers = useCallback(() => customersApi.list(), []);
  const { data: users = [], loading, reload } = useApi(fetchCustomers, CACHE_KEYS.CUSTOMERS);
  const [actionLoading, setActionLoading] = useState(null);
  const [limitsCustomer, setLimitsCustomer] = useState(null);
  const { toast, showToast } = useToast();
  const [monitorPage, setMonitorPage]         = useState(1);
  const [monitorPageSize, setMonitorPageSize] = useState(10);

  const doAction = async (userId, action) => {
    setActionLoading(userId + action);
    try {
      if (action === 'delete') await customersApi.remove(userId);
      else if (action === 'pause') await customersApi.pause(userId);
      else if (action === 'activate') await customersApi.activate(userId);
      else if (action === 'deactivate') await customersApi.deactivate(userId);
      const label = action === 'delete' ? 'deleted' : action === 'pause' ? 'paused' : `${action}d`;
      showToast(`Account ${label}`);
      reload();
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dt) => dt ? new Date(dt).toLocaleString() : '—';

  const statusBadge = (status) => {
    const styles = {
      Active:   { pill: 'bg-green-50 text-green-700 border border-green-200',  dot: 'bg-green-500' },
      Inactive: { pill: 'bg-red-50 text-red-600 border border-red-200',        dot: 'bg-red-400' },
      Paused:   { pill: 'bg-amber-50 text-amber-700 border border-amber-200',  dot: 'bg-amber-400' },
    };
    const s = styles[status] || { pill: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {status}
      </span>
    );
  };

  return (
    <div>
      {limitsCustomer && (
        <CustomerLimitsModal
          customer={limitsCustomer}
          onClose={() => setLimitsCustomer(null)}
        />
      )}

      <Toast toast={toast} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#001F3F]/8 rounded-xl flex items-center justify-center">
              <Users size={17} className="text-[#001F3F]" />
            </div>
            <div>
              <h2 className="font-bold text-[#001F3F] text-base">Customer Accounts</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {users.length} account{users.length !== 1 ? 's' : ''} registered
              </p>
            </div>
          </div>
          <button onClick={reload}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#001F3F] border border-gray-200 hover:border-[#001F3F]/30 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all font-semibold">
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No customer accounts yet</p>
            <p className="text-gray-400 text-sm mt-1">Create one from the "Create Customer" tab</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Organization', 'Contact', 'Username', 'Email', 'Last Login', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.slice((monitorPage-1)*monitorPageSize, monitorPage*monitorPageSize).map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                          <Building2 size={15} className="text-blue-500" />
                        </div>
                        <span className="font-semibold text-[#001F3F] text-sm">{u.organization_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-medium">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-0.5 rounded-md">{u.username}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{u.email || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-400 tabular-nums">{formatDate(u.last_login)}</td>
                    <td className="px-5 py-4">{statusBadge(u.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setLimitsCustomer(u)}
                          title="View / edit limits"
                          className="p-2 text-[#001F3F] hover:bg-blue-50 rounded-lg transition-all">
                          <SlidersHorizontal size={15} />
                        </button>
                        {u.status === 'Active' && (
                          <button onClick={() => doAction(u.id, 'pause')}
                            disabled={actionLoading === u.id + 'pause'}
                            title="Pause account"
                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-40">
                            {actionLoading === u.id + 'pause' ? <Loader2 size={15} className="animate-spin" /> : <PauseCircle size={15} />}
                          </button>
                        )}
                        {(u.status === 'Active' || u.status === 'Paused') && (
                          <button onClick={() => doAction(u.id, 'deactivate')}
                            disabled={actionLoading === u.id + 'deactivate'}
                            title="Deactivate account"
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-40">
                            {actionLoading === u.id + 'deactivate' ? <Loader2 size={15} className="animate-spin" /> : <PowerOff size={15} />}
                          </button>
                        )}
                        {(u.status === 'Inactive' || u.status === 'Paused') && (
                          <button onClick={() => doAction(u.id, 'activate')}
                            disabled={actionLoading === u.id + 'activate'}
                            title="Activate account"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-40">
                            {actionLoading === u.id + 'activate' ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete account for "${u.username}"? This cannot be undone.`)) {
                              doAction(u.id, 'delete');
                            }
                          }}
                          disabled={actionLoading === u.id + 'delete'}
                          title="Delete account"
                          className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all disabled:opacity-40">
                          {actionLoading === u.id + 'delete' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {users.length > monitorPageSize && (
          <div className="px-5 border-t border-gray-100">
            <Pagination
              page={monitorPage}
              pageSize={monitorPageSize}
              total={users.length}
              onPageChange={setMonitorPage}
              onSizeChange={(s) => { setMonitorPageSize(s); setMonitorPage(1); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Master Settings tab ────────────────────────────────────────────────────────
// ── AI Usage tab ─────────────────────────────────────────────────────────────

function AIUsageTab() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState({});
  const [saving, setSaving]       = useState({});
  const [aiPage, setAiPage]       = useState(1);
  const AI_PAGE_SIZE              = 10;
  const [showInfo, setShowInfo]   = useState(false);
  const { toast, showToast }      = useToast();

  const token = localStorage.getItem('auth_token') || '';

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/admin/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || 'Failed to load AI usage data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsage(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditStart = (cid, currentLimit) => {
    setEditing(prev => ({ ...prev, [cid]: String(currentLimit) }));
  };

  const handleEditSave = async (cid) => {
    const val = parseInt(editing[cid], 10);
    if (isNaN(val) || val < 0) { showToast('Enter a valid positive number', 'error'); return; }
    setSaving(prev => ({ ...prev, [cid]: true }));
    try {
      const res = await fetch(`/api/ai/admin/usage/${cid}/limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ai_monthly_limit: val }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      showToast('Limit updated successfully');
      setEditing(prev => { const n = { ...prev }; delete n[cid]; return n; });
      fetchUsage();
    } catch (err) {
      showToast(err.message || 'Failed to update limit', 'error');
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[cid]; return n; });
    }
  };

  const pct = (used, limit) => limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = (p) => p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-400' : 'bg-indigo-500';
  const textColor = (p) => p >= 90 ? 'text-red-600' : p >= 70 ? 'text-amber-600' : 'text-indigo-600';

  const nowMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 relative pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#001F3F] flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500" />
            AI Usage — {nowMonth}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor AI generation usage per organization and adjust monthly quotas.
            Counts reset on the 1st of each month.
          </p>
        </div>
        <button
          onClick={fetchUsage}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.type === 'success'
            ? <CheckCircle size={16} className="mt-0.5 shrink-0 text-green-600" />
            : <XCircle    size={16} className="mt-0.5 shrink-0 text-red-500" />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 size={18} className="animate-spin" /> Loading usage data…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No organizations found.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Organization</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Generations Used</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly Limit</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tokens Used</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.slice((aiPage-1)*AI_PAGE_SIZE, aiPage*AI_PAGE_SIZE).map((row) => {
                  const p = pct(row.generations_used, row.ai_monthly_limit);
                  const isEditing = editing[row.customer_id] !== undefined;
                  return (
                    <tr key={row.customer_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#001F3F] text-sm">{row.organization_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">ID {row.customer_id}</p>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums">
                        <span className={`font-bold ${textColor(p)}`}>{row.generations_used.toLocaleString()}</span>
                        <span className="text-gray-400"> / {row.ai_monthly_limit.toLocaleString()}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{row.generations_remaining.toLocaleString()} left</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                min={0}
                                value={editing[row.customer_id]}
                                onChange={e => setEditing(prev => ({ ...prev, [row.customer_id]: e.target.value }))}
                                className="w-20 border border-indigo-300 rounded-lg px-2 py-1 text-sm font-mono outline-none focus:border-indigo-500"
                              />
                              <button
                                onClick={() => handleEditSave(row.customer_id)}
                                disabled={saving[row.customer_id]}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                              >
                                {saving[row.customer_id]
                                  ? <Loader2 size={12} className="animate-spin" />
                                  : <Check size={12} />}
                              </button>
                              <button
                                onClick={() => setEditing(prev => { const n = { ...prev }; delete n[row.customer_id]; return n; })}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-gray-700 tabular-nums">
                                {row.ai_monthly_limit.toLocaleString()}
                              </span>
                              <button
                                onClick={() => handleEditStart(row.customer_id, row.ai_monthly_limit)}
                                className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"
                                title="Edit limit"
                              >
                                <Pencil size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 tabular-nums">
                        {row.tokens_used.toLocaleString()}
                        <p className="text-xs text-gray-400 mt-0.5">/ {row.ai_tokens_monthly_limit.toLocaleString()}</p>
                      </td>
                      <td className="px-5 py-4 min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-32">
                            <div className={`h-full rounded-full transition-all ${barColor(p)}`} style={{ width: `${p}%` }} />
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${textColor(p)}`}>{p}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > AI_PAGE_SIZE && (
            <div className="px-5 border-t border-gray-100">
              <Pagination
                page={aiPage}
                pageSize={AI_PAGE_SIZE}
                total={rows.length}
                onPageChange={setAiPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Info button — bottom-left ── */}
      <div className="fixed bottom-6 left-6 z-30">
        <div className="relative">
          {showInfo && (
            <div className="absolute bottom-12 left-0 w-80 bg-white border border-indigo-100 rounded-2xl shadow-xl p-5 text-sm space-y-3 z-10">
              <div className="flex items-center gap-2 font-bold text-[#001F3F]">
                <Sparkles size={16} className="text-indigo-500" />
                How AI Quotas Work
              </div>
              <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
                <p><strong>Monthly reset:</strong> Generation counts and token totals reset automatically on the 1st of every calendar month.</p>
                <p><strong>Per-org key:</strong> Every organization must configure their own AI provider API key from <em>Configuration → Nadia AI</em>. There is no shared platform key.</p>
                <p><strong>Quota enforcement:</strong> Limits are stored in <code className="bg-gray-100 px-1 rounded">customer_limits.ai_monthly_limit</code>. When an org hits their limit, the Generate button returns a 429 error with a friendly message.</p>
                <p><strong>Token tracking:</strong> Token usage is recorded for analytics and future billing. Multiply <code className="bg-gray-100 px-1 rounded">tokens_used</code> by the per-token rate of the customer's plan to calculate cost.</p>
                <p><strong>Billing path:</strong> The <code className="bg-gray-100 px-1 rounded">ai_usage_logs</code> table stores every generation with provider, model, and token breakdown — ready for invoice generation.</p>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg py-1.5"
              >
                Close
              </button>
            </div>
          )}
          <button
            onClick={() => setShowInfo(v => !v)}
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-300/40 transition-all"
            title="How AI quotas work"
          >
            <Info size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Master Settings tab ────────────────────────────────────────────────────────

function MasterSettingsTab() {
  const fetchSettings = useCallback(() => adminApi.getSettings(), []);
  const { data: settingsData, loading: settingsLoading } = useApi(fetchSettings, CACHE_KEYS.ADMIN_SETTINGS);
  const [settings, setSettings] = useState({ postmark_sender_email: '', postmark_sender_name: '', postmark_configured: false });
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (settingsData) setSettings(settingsData);
  }, [settingsData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.saveSettings({
        postmark_sender_email: settings.postmark_sender_email,
        postmark_sender_name: settings.postmark_sender_name,
      });
      showToast('Settings saved successfully');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading) return (
    <div className="flex items-center justify-center p-16 text-gray-400 gap-2 text-sm">
      <Loader2 className="animate-spin" size={18} /> Loading settings...
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Toast toast={toast} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
          <div className="w-9 h-9 bg-[#001F3F]/8 rounded-xl flex items-center justify-center">
            <Send size={16} className="text-[#001F3F]" />
          </div>
          <div>
            <h2 className="font-bold text-[#001F3F] text-base">Postmark Email Service</h2>
            <p className="text-xs text-gray-500 mt-0.5">System-wide email delivery configuration</p>
          </div>
        </div>

        <div className="p-7 space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            settings.postmark_configured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full shrink-0 ${settings.postmark_configured ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-400'}`} />
            <div>
              <p className={`text-sm font-bold ${settings.postmark_configured ? 'text-green-800' : 'text-red-700'}`}>
                {settings.postmark_configured ? 'Postmark Connected' : 'Postmark Not Configured'}
              </p>
              <p className={`text-xs mt-0.5 ${settings.postmark_configured ? 'text-green-600' : 'text-red-500'}`}>
                {settings.postmark_configured
                  ? 'API key is set — welcome emails will be sent automatically.'
                  : 'Set POSTMARK_API_KEY in the backend .env file to enable email delivery.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Sender Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={settings.postmark_sender_name}
                  onChange={(e) => setSettings((s) => ({ ...s, postmark_sender_name: e.target.value }))}
                  placeholder="BallotDA"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#001F3F]/40 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400">Displayed as the "From" name in all outgoing emails</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Sender Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" value={settings.postmark_sender_email}
                  onChange={(e) => setSettings((s) => ({ ...s, postmark_sender_email: e.target.value }))}
                  placeholder="noreply@ballotda.com"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#001F3F]/40 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400">Must be a verified sender address in your Postmark account</p>
            </div>

            <button type="submit" disabled={saving}
              className="w-full h-11 bg-gradient-to-r from-[#001F3F] to-[#002d5c] hover:from-[#002d5c] hover:to-[#003d7a] disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#001F3F]/15">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <><Settings size={16} /> Save Settings</>}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-bold text-blue-800 mb-1.5 flex items-center gap-2">
          <Database size={14} /> About Platform Settings
        </p>
        <p className="text-xs text-blue-600 leading-relaxed">
          These settings apply globally across all customer accounts. The Postmark API key is
          stored securely in the backend environment and is never exposed to the frontend.
          Customer-specific provider configurations are managed by each customer from their
          own Configuration page.
        </p>
      </div>
    </div>
  );
}

// ── Main AdminPanel ────────────────────────────────────────────────────────────
const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin' && !user?.customer_id;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const tabs = [
    { key: 'create',   label: 'Create Customer',  Icon: UserPlus      },
    { key: 'monitor',  label: 'Monitor Accounts', Icon: Activity      },
    { key: 'audit',    label: 'Audit Log',        Icon: ClipboardList },
    { key: 'ai',       label: 'AI Usage',         Icon: Sparkles      },
    { key: 'settings', label: 'Settings',         Icon: Settings      },
  ];

  // ── Login state ──────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#001F3F] flex-col p-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-[120px]" />
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)',
              backgroundSize: '32px 32px',
            }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <Link to="/" className="flex items-center bg-white w-fit p-3 rounded-2xl shadow-sm mb-8 self-start hover:opacity-80 transition-opacity">
              <img src={bdaLogo} alt="BallotDA" className="h-8 md:h-10 w-auto object-contain" />
            </Link>

            <h1 className="text-4xl font-extrabold text-white mb-3 leading-tight">
              Platform<br />
              <span className="text-blue-300">Administration</span>
            </h1>
            <p className="text-blue-200/70 text-base mb-10 leading-relaxed">
              Secure management console for the BallotDA Outreach Platform.
            </p>

            <div className="space-y-4">
              {[
                { Icon: ShieldCheck, title: 'Role-based Access',    desc: 'Only authorized administrators can access this portal.' },
                { Icon: Users,       title: 'Customer Management',  desc: 'Create and manage all customer accounts from one place.' },
                { Icon: BarChart3,   title: 'Usage Monitoring',     desc: 'Track activity and account status across all organizations.' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 bg-white/8 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/12 transition-colors">
                    <Icon size={18} className="text-blue-300" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{title}</p>
                    <p className="text-blue-200/60 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/8">
            <p className="text-blue-300/50 text-xs">© 2026 BallotDA Enterprise</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-[#F8FAFC] flex flex-col">
          <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
            <Link to="/"><img src={bdaLogo} alt="BallotDA" className="h-8 w-auto object-contain lg:hidden hover:opacity-80 transition-opacity" /></Link>
            <div className="hidden lg:block" />
            <Link to="/login"
              className="text-sm text-gray-500 hover:text-[#001F3F] font-semibold transition-colors">
              Customer Login
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <AdminLoginForm onSuccess={() => {}} />
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated state ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* ── Top Header ── */}
      <nav className="w-full bg-white border-b border-gray-100 px-4 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img src={bdaLogo} alt="BallotDA" className="h-8 lg:h-9 w-auto object-contain" />
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-px h-5 bg-gray-200" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Platform Administration
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <div className="w-6 h-6 bg-[#001F3F] rounded-lg flex items-center justify-center">
              <ShieldCheck size={13} className="text-blue-300" />
            </div>
            <span className="text-sm text-gray-500">
              <strong className="text-[#001F3F] font-bold">{user?.username}</strong>
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 hover:bg-red-50 px-3.5 py-2 rounded-xl transition-all"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 relative">

        {/* ── Sidebar backdrop (mobile) ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left Sidebar — mobile only ── */}
        <aside className={`
          fixed top-[61px] left-0 bottom-0 w-64 bg-white border-r border-gray-100 z-20
          flex flex-col shadow-sm transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Nav items */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                  tab === key
                    ? 'bg-[#001F3F] text-white shadow-md shadow-[#001F3F]/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-[#001F3F]'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                {label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">© 2026 BallotDA Enterprise</p>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">

          {/* Horizontal tabs — desktop only ── */}
          <div className="hidden lg:block bg-white border-b border-gray-100 px-6 lg:px-8">
            <div className="flex gap-1 max-w-5xl mx-auto">
              {tabs.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all ${
                    tab === key
                      ? 'border-[#001F3F] text-[#001F3F]'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">
            {tab === 'create'   && <CreateCustomerTab />}
            {tab === 'monitor'  && <MonitorAccountsTab />}
            {tab === 'audit'    && <AuditLog />}
            {tab === 'ai'       && <AIUsageTab />}
            {tab === 'settings' && <MasterSettingsTab />}
          </div>
        </main>

      </div>
    </div>
  );
};

export default AdminPanel;
