import { useState } from 'react';
import { Radio, AtSign, Phone, Settings2 } from 'lucide-react';
import SmsProviders from '../masters/SmsProviders';
import EmailProviders from '../masters/EmailProviders';
import WhatsappProviders from '../masters/WhatsappProviders';

const tabs = [
  { key: 'sms',      label: 'SMS',      icon: Radio,    component: SmsProviders },
  { key: 'email',    label: 'Email',    icon: AtSign,   component: EmailProviders },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone,    component: WhatsappProviders },
];

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
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors -mb-px
                ${active === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <Icon size={16} />
              {label} Providers
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
