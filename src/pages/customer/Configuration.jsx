import { useState, useEffect } from 'react';
import { Radio, AtSign, Phone, Settings2, Globe } from 'lucide-react';
import SmsProviders from '../masters/SmsProviders';
import EmailProviders from '../masters/EmailProviders';
import WhatsappProviders from '../masters/WhatsappProviders';

// ── General / timezone settings ───────────────────────────────────────────────

const GeneralSettings = () => {
  const [timezone, setTimezone]   = useState('UTC');
  const [options, setOptions]     = useState({});
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(false);
  const [fetching, setFetching]   = useState(true);

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
            {/* Chevron */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
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

      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
        <div className="flex border-b border-brand-border overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors -mb-px whitespace-nowrap
                ${active === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <Icon size={16} />
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
