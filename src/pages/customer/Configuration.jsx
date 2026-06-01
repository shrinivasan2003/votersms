/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Radio, AtSign, Phone, Settings2, Globe, Sparkles,
  Eye, EyeOff, CheckCircle, XCircle, Loader2, Info,
} from 'lucide-react';
import SmsProviders from '../masters/SmsProviders';
import EmailProviders from '../masters/EmailProviders';
import WhatsappProviders from '../masters/WhatsappProviders';

// ── helpers ───────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('auth_token') || '';
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium border mb-4
        ${isSuccess ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}
    >
      {isSuccess
        ? <CheckCircle size={17} className="mt-0.5 shrink-0 text-green-600" />
        : <XCircle    size={17} className="mt-0.5 shrink-0 text-red-500" />}
      <span>{toast.msg}</span>
    </div>
  );
}

// ── Usage progress bar ────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, unit = '' }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-indigo-500';
  const remaining = Math.max(0, limit - used);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-400 tabular-nums">
          {used.toLocaleString()}{unit} / {limit.toLocaleString()}{unit} used
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className={`font-bold tabular-nums ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-indigo-600'}`}>
          {pct}% used
        </span>
        <span className="text-gray-400 tabular-nums">{remaining.toLocaleString()}{unit} remaining</span>
      </div>
    </div>
  );
}

// ── Nadia AI configuration tab ────────────────────────────────────────────────

const PROVIDERS = [
  { key: 'deepseek', label: 'DeepSeek',     models: ['deepseek-chat', 'deepseek-reasoner'] },
  { key: 'openai',   label: 'OpenAI',       models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { key: 'groq',     label: 'Groq',         models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  { key: 'mistral',  label: 'Mistral AI',   models: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-7b'] },
  { key: 'together', label: 'Together AI',  models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct-Turbo'] },
  { key: 'anthropic',label: 'Anthropic',    models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-8'] },
  { key: 'gemini',   label: 'Google Gemini',models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
];

const NadiaAISettings = () => {
  const [provider,   setProvider]   = useState('deepseek');
  const [apiKey,     setApiKey]     = useState('');
  const [model,      setModel]      = useState('deepseek-chat');
  const [showKey,    setShowKey]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [usage,      setUsage]      = useState(null);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [validatedAt, setValidatedAt] = useState(null);

  const currentProvider = PROVIDERS.find(p => p.key === provider) || PROVIDERS[0];

  useEffect(() => {
    Promise.all([
      apiFetch('/ai/config').catch(() => null),
      apiFetch('/ai/usage').catch(() => null),
    ]).then(([cfg, usg]) => {
      if (cfg) {
        setProvider(cfg.provider || 'deepseek');
        setModel(cfg.model || 'deepseek-chat');
        setApiKey('');  // never pre-fill the key for security; show masked version separately
        setValidatedAt(cfg.updated_at || null);
      }
      if (usg) setUsage(usg);
    }).finally(() => setLoadingCfg(false));
  }, []);

  // When provider changes, default model to first in that provider's list
  const handleProviderChange = (key) => {
    const p = PROVIDERS.find(x => x.key === key);
    setProvider(key);
    setModel(p?.models[0] || '');
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setToast({ type: 'error', msg: 'Please enter your API key.' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await apiFetch('/ai/config', {
        method: 'PUT',
        body: JSON.stringify({ provider, api_key: apiKey, model }),
      });
      setToast({ type: 'success', msg: 'AI configuration saved and validated successfully. Nadia AI is ready to use.' });
      setValidatedAt(new Date().toISOString());
      setApiKey('');
      // Refresh usage
      apiFetch('/ai/usage').then(setUsage).catch(() => {});
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const nowMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loadingCfg) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader2 size={16} className="animate-spin" /> Loading AI configuration…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Panel A: API Configuration ── */}
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2">
            <Sparkles size={17} className="text-indigo-600" />
            Nadia AI — API Configuration
          </h3>
          <p className="text-sm text-brand-textMuted mt-1">
            Configure your own AI provider API key. Nadia AI uses this key to generate
            email templates. Your key is stored securely and never shared.
          </p>
        </div>

        <Toast toast={toast} onDismiss={() => setToast(null)} />

        {/* Provider */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-brand-textPrimary">AI Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleProviderChange(p.key)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-semibold text-left transition-all ${
                  provider === p.key
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-brand-textPrimary">Model</label>
          <div className="relative">
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white appearance-none text-sm transition-all"
            >
              {currentProvider.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-brand-textPrimary">API Key</label>
          {validatedAt && !apiKey && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-1">
              <CheckCircle size={13} className="shrink-0" />
              Key configured — last validated {new Date(validatedAt).toLocaleString()}. Enter a new key below to replace it.
            </div>
          )}
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={validatedAt ? 'Enter new key to replace existing…' : 'sk-…  or your provider API key'}
              className="block w-full rounded-lg border border-brand-border px-4 py-3 pr-12 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono transition-all"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-gray-700"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-brand-textMuted">
            Your key is validated against the provider before saving. If validation fails, the
            exact error from the provider will be shown above.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-200 disabled:cursor-not-allowed"
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Validating &amp; Saving…</>
            : <><Sparkles size={15} /> Save &amp; Validate Configuration</>}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* ── Panel B: Usage stats ── */}
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-bold text-brand-textPrimary flex items-center gap-2">
            <Info size={16} className="text-indigo-500" />
            AI Usage — {nowMonth}
          </h3>
          <p className="text-sm text-brand-textMuted mt-1">
            Usage resets on the 1st of each month. Quotas are managed by the platform administrator.
          </p>
        </div>

        {usage ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-indigo-50/40 rounded-xl border border-indigo-100">
            <UsageBar
              label="Generations"
              used={usage.generations_used}
              limit={usage.generations_limit}
            />
            <UsageBar
              label="Tokens Consumed"
              used={usage.tokens_used}
              limit={usage.tokens_limit}
              unit=" tk"
            />
          </div>
        ) : (
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-400 text-center">
            Configure your AI key above to start tracking usage.
          </div>
        )}
      </div>
    </div>
  );
};

// ── General / timezone settings ───────────────────────────────────────────────

const GeneralSettings = () => {
  const [timezone, setTimezone] = useState('UTC');
  const [options, setOptions]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch('/api/customers/my-settings')
      .then(r => r.json())
      .then(d => {
        setTimezone(d.timezone || 'UTC');
        setOptions(d.timezone_options || {});
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/customers/my-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) setSaved(true);
      else alert((await res.json()).detail || 'Failed to save settings');
    } catch {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p className="text-sm text-brand-textMuted">Loading settings…</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-base font-bold text-brand-textPrimary mb-1">Organization Timezone</h3>
        <p className="text-sm text-brand-textMuted mb-4">
          All scheduled job times are interpreted in this timezone. The scheduler runs in UTC
          internally — this setting controls how your entered times are converted.
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-brand-textPrimary">Timezone</label>
          <div className="relative">
            <select
              value={timezone}
              onChange={e => { setTimezone(e.target.value); setSaved(false); }}
              className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all"
            >
              {Object.entries(options).map(([iana, label]) => (
                <option key={iana} value={iana}>{label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-brand-textMuted">
            Currently selected: <span className="font-semibold text-brand-textPrimary">{timezone}</span>
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50
          ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        {loading ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
};

// ── Tab definitions ────────────────────────────────────────────────────────────

const tabs = [
  { key: 'sms',      label: 'SMS Providers',      icon: Radio,    component: SmsProviders },
  { key: 'email',    label: 'Email Providers',    icon: AtSign,   component: EmailProviders },
  { key: 'whatsapp', label: 'WhatsApp Providers', icon: Phone,    component: WhatsappProviders },
  { key: 'general',  label: 'General',            icon: Globe,    component: GeneralSettings },
  { key: 'nadia',    label: 'Nadia AI',           icon: Sparkles, component: NadiaAISettings },
];

// ── Page ───────────────────────────────────────────────────────────────────────

const Configuration = () => {
  const [active, setActive] = useState('sms');
  const ActiveComponent = tabs.find((t) => t.key === active)?.component;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy flex items-center gap-2">
          <Settings2 size={24} className="shrink-0" /> Configuration
        </h1>
        <p className="text-brand-textMuted mt-1">
          Manage your organization's communication provider settings
        </p>
      </div>

      <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
        <div className="flex border-b border-brand-border overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors -mb-px whitespace-nowrap
                ${active === key
                  ? key === 'nadia'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <Icon size={16} className={active === key && key === 'nadia' ? 'text-indigo-600' : ''} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
};

export default Configuration;
