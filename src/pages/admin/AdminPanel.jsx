import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, User, Loader2, ShieldCheck,
  Building2, Mail, UserPlus, Activity, Trash2, PowerOff,
  CheckCircle, XCircle, Power, Settings, Send, PauseCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import bdaLogo from '../../assets/bda-logo.webp';

// ── Field input — defined at module scope to prevent remount on re-render ──────
const Field = ({ label, name, type = 'text', placeholder, icon: Icon, value, onChange, showPassword, onTogglePassword }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-gray-600">{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type={name === 'password' ? (showPassword ? 'text' : 'password') : type}
        name={name} required value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#001F3F]/40 transition-all"
      />
      {name === 'password' && (
        <button type="button" onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  </div>
);

// ── Admin Login form ───────────────────────────────────────────────────────────
function AdminLoginForm({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
        <div className="bg-[#001F3F] p-6 text-white flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-blue-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Platform Admin</h2>
            <p className="text-gray-400 text-xs mt-0.5">Restricted — administrators only</p>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <XCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Username</label>
              <div className="relative group">
                <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors" />
                <input
                  type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Password</label>
              <div className="relative group">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F] transition-colors">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-12 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-gray-300 text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign in as Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Create User tab ────────────────────────────────────────────────────────────
function CreateUserTab({ getAuthHeaders }) {
  const [form, setForm] = useState({
    organization_name: '', first_name: '', last_name: '',
    email: '', username: '', password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        const emailNote = data.email_sent
          ? `Welcome email sent to ${form.email}.`
          : 'Account created (configure Postmark to send welcome emails).';
        showToast(`Account created for ${form.organization_name}. ${emailNote}`);
        setForm({ organization_name: '', first_name: '', last_name: '', email: '', username: '', password: '' });
      } else {
        showToast(data.detail || 'Failed to create account', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className={`mb-5 flex items-start gap-2 p-4 rounded-xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle size={17} className="mt-0.5 shrink-0" /> : <XCircle size={17} className="mt-0.5 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-[#001F3F]">New Customer Account</h2>
          <p className="text-xs text-gray-500 mt-0.5">Login credentials will be sent to the customer's email via Postmark</p>
        </div>

        <form onSubmit={handleCreate} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Organization Name" name="organization_name" placeholder="Acme County Democrats" icon={Building2}
              value={form.organization_name} onChange={handleChange} />
          </div>
          <Field label="First Name" name="first_name" placeholder="Jane" icon={User}
            value={form.first_name} onChange={handleChange} />
          <Field label="Last Name" name="last_name" placeholder="Smith" icon={User}
            value={form.last_name} onChange={handleChange} />
          <div className="md:col-span-2">
            <Field label="Email Address" name="email" type="email" placeholder="jane@acme.org" icon={Mail}
              value={form.email} onChange={handleChange} />
          </div>
          <Field label="Username" name="username" placeholder="jane_acme" icon={User}
            value={form.username} onChange={handleChange} />
          <Field label="Initial Password" name="password" placeholder="••••••••" icon={Lock}
            value={form.password} onChange={handleChange}
            showPassword={showPassword} onTogglePassword={() => setShowPassword((v) => !v)} />

          <div className="md:col-span-2 pt-2">
            <button type="submit" disabled={submitting}
              className="w-full h-12 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-gray-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md">
              {submitting
                ? <Loader2 className="animate-spin" size={18} />
                : <><UserPlus size={18} /> Create Account & Send Welcome Email</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Monitor Usage tab ──────────────────────────────────────────────────────────
function MonitorUsageTab({ getAuthHeaders }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/customers', { headers: getAuthHeaders() });
      if (res.ok) setUsers(await res.json());
    } catch { showToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const doAction = async (userId, action) => {
    setActionLoading(userId + action);
    try {
      const url = action === 'delete'
        ? `/api/customers/users/${userId}`
        : `/api/customers/users/${userId}/${action}`;
      const res = await fetch(url, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const label = action === 'delete' ? 'deleted' : action === 'pause' ? 'paused' : `${action}d`;
        showToast(`Account ${label}`);
        fetchUsers();
      } else {
        const d = await res.json();
        showToast(d.detail || 'Action failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(null); }
  };

  const formatDate = (dt) => dt ? new Date(dt).toLocaleString() : '—';

  const statusBadge = (status) => {
    const map = {
      Active:   'bg-green-50 text-green-700',
      Inactive: 'bg-red-50 text-red-600',
      Paused:   'bg-yellow-50 text-yellow-700',
    };
    const dot = { Active: 'bg-green-500', Inactive: 'bg-red-400', Paused: 'bg-yellow-400' };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || 'bg-gray-400'}`} />
        {status}
      </span>
    );
  };

  return (
    <div>
      {toast && (
        <div className={`mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#001F3F]">Customer Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">{users.length} account{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={fetchUsers} className="text-xs text-gray-500 hover:text-[#001F3F] border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-all font-medium">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Activity size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No customer accounts yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Organization', 'Name', 'Username', 'Email', 'Last Login', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-blue-500" />
                        </div>
                        <span className="font-semibold text-[#001F3F] text-sm">{u.organization_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-mono">{u.username}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{u.email || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(u.last_login)}</td>
                    <td className="px-5 py-4">{statusBadge(u.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {/* Pause — only when Active */}
                        {u.status === 'Active' && (
                          <button onClick={() => doAction(u.id, 'pause')}
                            disabled={actionLoading === u.id + 'pause'}
                            title="Pause account"
                            className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-lg transition-all disabled:opacity-50">
                            {actionLoading === u.id + 'pause' ? <Loader2 size={15} className="animate-spin" /> : <PauseCircle size={15} />}
                          </button>
                        )}
                        {/* Deactivate — only when Active or Paused */}
                        {(u.status === 'Active' || u.status === 'Paused') && (
                          <button onClick={() => doAction(u.id, 'deactivate')}
                            disabled={actionLoading === u.id + 'deactivate'}
                            title="Deactivate account"
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-50">
                            {actionLoading === u.id + 'deactivate' ? <Loader2 size={15} className="animate-spin" /> : <PowerOff size={15} />}
                          </button>
                        )}
                        {/* Activate — only when Inactive or Paused */}
                        {(u.status === 'Inactive' || u.status === 'Paused') && (
                          <button onClick={() => doAction(u.id, 'activate')}
                            disabled={actionLoading === u.id + 'activate'}
                            title="Activate account"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50">
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
                          className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all disabled:opacity-50">
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
      </div>
    </div>
  );
}

// ── Master Settings tab ────────────────────────────────────────────────────────
function MasterSettingsTab({ getAuthHeaders }) {
  const [settings, setSettings] = useState({ postmark_sender_email: '', postmark_sender_name: '', postmark_configured: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch('/api/admin/settings', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          postmark_sender_email: settings.postmark_sender_email,
          postmark_sender_name:  settings.postmark_sender_name,
        }),
      });
      if (res.ok) showToast('Settings saved successfully');
      else showToast('Failed to save settings', 'error');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-gray-400 gap-2">
      <Loader2 className="animate-spin" size={18} /> Loading settings...
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Postmark connection status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-[#001F3F] flex items-center gap-2">
            <Send size={16} /> Postmark Email Service
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">System-wide email delivery via Postmark</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 mb-6">
            <div className={`w-3 h-3 rounded-full ${settings.postmark_configured ? 'bg-green-500' : 'bg-red-400'}`} />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {settings.postmark_configured ? 'Postmark Connected' : 'Postmark Not Configured'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {settings.postmark_configured
                  ? 'API key is set. Welcome emails will be sent automatically.'
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
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#001F3F]/40 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400">Displayed as the "From" name in outgoing emails</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Sender Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" value={settings.postmark_sender_email}
                  onChange={(e) => setSettings((s) => ({ ...s, postmark_sender_email: e.target.value }))}
                  placeholder="noreply@ballotda.com"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#001F3F]/40 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400">Must be a verified sender address in your Postmark account</p>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saving}
                className="w-full h-11 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-gray-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <><Settings size={16} /> Save Settings</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-blue-800 mb-1">About Master Settings</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          These are platform-level settings that apply globally across all customers.
          The Postmark API key is stored securely in the backend environment and is never
          exposed to the frontend. Customer-specific provider configurations are managed
          by each customer from their own Configuration page.
        </p>
      </div>
    </div>
  );
}

// ── Main AdminPanel component ──────────────────────────────────────────────────
const AdminPanel = () => {
  const { user, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');

  const isAdmin = user?.role?.toLowerCase() === 'admin' && !user?.customer_id;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <nav className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="bg-[#001F3F] p-2 rounded-xl">
              <img src={bdaLogo} alt="BallotDA" className="h-7 w-auto object-contain" />
            </div>
            <div>
              <span className="font-bold text-[#001F3F]">BallotDA</span>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Platform Administration</p>
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="text-sm text-gray-500 hover:text-[#001F3F] font-medium">
            Customer Login →
          </button>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <AdminLoginForm onSuccess={() => {}} />
        </div>

        <p className="text-center pb-6 text-xs text-gray-400">© 2026 BallotDA Enterprise. All rights reserved.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <nav className="w-full bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-[#001F3F] p-2 rounded-xl">
            <img src={bdaLogo} alt="BallotDA" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <span className="font-bold text-[#001F3F]">BallotDA</span>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Platform Administration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">
            Signed in as <strong className="text-[#001F3F]">{user?.username}</strong>
          </span>
          <button onClick={handleLogout}
            className="text-sm font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
            Logout
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-1 max-w-5xl mx-auto">
          {[
            { key: 'create',  label: 'Create User',    Icon: UserPlus },
            { key: 'monitor', label: 'Monitor Usage',  Icon: Activity },
            { key: 'settings',label: 'Master Settings',Icon: Settings },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-colors
                ${tab === key
                  ? 'border-[#001F3F] text-[#001F3F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {tab === 'create'   && <CreateUserTab   getAuthHeaders={getAuthHeaders} />}
        {tab === 'monitor'  && <MonitorUsageTab getAuthHeaders={getAuthHeaders} />}
        {tab === 'settings' && <MasterSettingsTab getAuthHeaders={getAuthHeaders} />}
      </div>
    </div>
  );
};

export default AdminPanel;
