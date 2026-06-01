/**
 * NadiaAI — single floating assistant with two built-in capabilities:
 *
 *  1. Campaign Wizard   — step-by-step guided setup for any campaign type.
 *                         Works on every page. No AI / API calls needed.
 *
 *  2. Email Generator   — AI-powered email subject + body generation.
 *                         Active only when the EmailTemplates form is open
 *                         (detected via NadiaContext). On all other pages a
 *                         gentle nudge is shown instead.
 *
 * Lives in AppLayout so it is rendered exactly once, globally.
 */

/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, Info, Loader2, CheckCircle, CheckCircle2, AlertCircle,
  Copy, Check, Sparkles, ChevronRight, ArrowRight,
  Users, FileText, Mail, MessageSquare, Rocket, RotateCcw,
  Navigation, Smartphone,
} from 'lucide-react';
import nadiaAvatar from '../../assets/nadia-avatar.jpg';
import { aiApi } from '../../api/ai';
import { useNadia } from '../../contexts/NadiaContext';

// ─────────────────────────────────────────────────────────────────────────────
// Wizard data
// ─────────────────────────────────────────────────────────────────────────────

const WIZARDS = {
  email_full: {
    key:         'email_full',
    label:       'Email Campaign',
    Icon:        Mail,
    color:       'blue',
    description: 'Build a complete email campaign — from recipients to delivery.',
    steps: [
      { title: 'Add Recipients',        desc: 'Upload a CSV or manage your existing recipient lists.',                          route: '/recipients',       Icon: Users         },
      { title: 'Create Email Template', desc: 'Design your email. Use the Generate tab in Nadia to write content with AI.',    route: '/email-templates',  Icon: FileText      },
      { title: 'Create Email Job',      desc: 'Pick a recipient list and template, then schedule your campaign.',              route: '/email-jobs',        Icon: Mail          },
      { title: 'Process & Send',        desc: 'Review all pending jobs and launch your campaign.',                             route: '/process-job',       Icon: Rocket        },
    ],
  },
  sms_full: {
    key:         'sms_full',
    label:       'SMS Campaign',
    Icon:        MessageSquare,
    color:       'green',
    description: 'Build a complete SMS campaign — from recipients to delivery.',
    steps: [
      { title: 'Add Recipients',      desc: 'Upload a CSV or manage your existing recipient lists.',                           route: '/recipients',      Icon: Users         },
      { title: 'Create SMS Template', desc: 'Write your SMS message with personalisation variables.',                         route: '/sms-templates',   Icon: FileText      },
      { title: 'Create SMS Job',      desc: 'Pick a recipient list and template, then schedule your campaign.',               route: '/sms-jobs',        Icon: MessageSquare },
      { title: 'Process & Send',      desc: 'Review all pending jobs and launch your campaign.',                              route: '/process-job',     Icon: Rocket        },
    ],
  },
  email_job: {
    key:         'email_job',
    label:       'Just an Email Job',
    Icon:        FileText,
    color:       'purple',
    description: 'Skip to creating an email job and processing it.',
    steps: [
      { title: 'Create Email Job', desc: 'Pick a recipient list and template, then schedule your campaign.',                  route: '/email-jobs',  Icon: Mail   },
      { title: 'Process & Send',   desc: 'Review all pending jobs and launch your campaign.',                                 route: '/process-job', Icon: Rocket },
    ],
  },
  sms_job: {
    key:         'sms_job',
    label:       'Just an SMS Job',
    Icon:        Smartphone,
    color:       'amber',
    description: 'Skip to creating an SMS job and processing it.',
    steps: [
      { title: 'Create SMS Job',  desc: 'Pick a recipient list and template, then schedule your campaign.',                   route: '/sms-jobs',    Icon: MessageSquare },
      { title: 'Process & Send',  desc: 'Review all pending jobs and launch your campaign.',                                  route: '/process-job', Icon: Rocket        },
    ],
  },
};

const COLOR = {
  blue:   { bar: 'bg-blue-500'   },
  green:  { bar: 'bg-green-500'  },
  purple: { bar: 'bg-purple-500' },
  amber:  { bar: 'bg-amber-500'  },
};

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers (wizard progress)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'nadia_wizard_progress';
const STORAGE_CAMPAIGN   = 'nadia_wizard_campaign';

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { /* ignore quota errors */ }
}

function loadCampaignKey() {
  try { return localStorage.getItem(STORAGE_CAMPAIGN) || null; }
  catch { return null; }
}

function saveCampaignKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_CAMPAIGN, key);
    else     localStorage.removeItem(STORAGE_CAMPAIGN);
  } catch { /* ignore quota errors */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-b border-white/10 shrink-0">
      {[
        { key: 'wizard',    label: '🧭 Wizard'          },
        { key: 'generator', label: '✨ Generate Email'   },
      ].map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 py-2.5 text-xs font-bold transition-all ${
            active === t.key
              ? 'text-white border-b-2 border-purple-400 bg-white/5'
              : 'text-white/35 hover:text-white/60'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard tab
// ─────────────────────────────────────────────────────────────────────────────

function WizardStepArrow() {
  return (
    <div className="flex items-center justify-center py-0.5">
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-3 bg-white/20" />
        <ChevronRight size={13} className="text-purple-400 rotate-90" />
      </div>
    </div>
  );
}

function WizardStepCard({ step, index, total, isActive, isDone, onGo, onSkip }) {
  const { title, desc, Icon } = step;
  return (
    <div className={`relative rounded-xl border p-3.5 transition-all ${
      isDone    ? 'border-green-200 bg-green-50/60'
      : isActive ? 'border-purple-300 bg-white shadow-sm shadow-purple-100'
                 : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
          isDone ? 'bg-green-500 text-white' : isActive ? 'bg-purple-600 text-white' : 'bg-white/15 text-white/60'
        }`}>
          {isDone ? <CheckCircle2 size={14} /> : index + 1}
        </div>
        <Icon size={15} className={isDone ? 'text-green-600' : isActive ? 'text-purple-600' : 'text-white/40'} />
        <span className={`text-xs font-bold leading-snug ${
          isDone ? 'text-green-800' : isActive ? 'text-[#1a0533]' : 'text-white/70'
        }`}>{title}</span>
        {isDone && (
          <span className="ml-auto text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Done</span>
        )}
      </div>
      <p className={`text-[11px] leading-relaxed mb-3 pl-9 ${
        isDone ? 'text-green-700' : isActive ? 'text-gray-600' : 'text-white/40'
      }`}>{desc}</p>
      <div className="flex items-center gap-2 pl-9">
        <button
          onClick={onGo}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isDone    ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : isActive ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                       : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
          }`}
        >
          {isDone ? 'Revisit' : 'Go'} <ArrowRight size={11} />
        </button>
        {!isDone && index < total - 1 && (
          <button onClick={onSkip} className="text-[10px] text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function WizardProgressBar({ done, total, color }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] text-white/30 font-semibold">
        <span>{done} of {total} steps completed</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${COLOR[color]?.bar || 'bg-purple-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WizardView({ navigate }) {
  const location = useLocation();

  const [campaignKey, setCampaignKey] = useState(() => loadCampaignKey());
  const [doneSteps,   setDoneSteps]   = useState({});

  useEffect(() => {
    const raw = loadProgress();
    const restored = Object.fromEntries(Object.entries(raw).map(([k, arr]) => [k, new Set(arr)]));
    setDoneSteps(restored);
  }, []);

  useEffect(() => {
    const serialisable = Object.fromEntries(Object.entries(doneSteps).map(([k, s]) => [k, [...s]]));
    saveProgress(serialisable);
  }, [doneSteps]);

  // Persist campaignKey whenever it changes
  useEffect(() => {
    saveCampaignKey(campaignKey);
  }, [campaignKey]);

  // ── Auto-mark step as done when user visits its page ──
  // Only fires when a campaign is actively selected (user is following the wizard).
  useEffect(() => {
    if (!campaignKey) return;
    const wizard = WIZARDS[campaignKey];
    if (!wizard) return;
    const matchIndex = wizard.steps.findIndex(s => s.route === location.pathname);
    if (matchIndex === -1) return;
    setDoneSteps(prev => {
      const existing = new Set(prev[campaignKey] || []);
      if (existing.has(matchIndex)) return prev; // already done — skip re-render
      const updated = new Set(existing);
      updated.add(matchIndex);
      return { ...prev, [campaignKey]: updated };
    });
  }, [location.pathname, campaignKey]);

  const wizard      = campaignKey ? WIZARDS[campaignKey] : null;
  const done        = wizard ? (doneSteps[campaignKey] || new Set()) : new Set();
  const doneCount   = done.size;
  const activeIndex = wizard ? wizard.steps.findIndex((_, i) => !done.has(i)) : -1;
  const isComplete  = wizard && doneCount >= wizard.steps.length;

  const handleGo = (index) => {
    const route = wizard.steps[index].route;
    setDoneSteps(prev => {
      const s = new Set(prev[campaignKey] || []);
      s.add(index);
      return { ...prev, [campaignKey]: s };
    });
    navigate(route);
  };

  const handleSkip = (index) => {
    setDoneSteps(prev => {
      const s = new Set(prev[campaignKey] || []);
      s.add(index);
      return { ...prev, [campaignKey]: s };
    });
  };

  const handleReset = () => {
    if (campaignKey) setDoneSteps(prev => ({ ...prev, [campaignKey]: new Set() }));
  };

  if (!wizard) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-white/60 leading-relaxed">
          I can walk you through setting up a campaign step-by-step. What would you like to create today?
        </p>
        <div className="space-y-2">
          {Object.values(WIZARDS).map(w => (
            <button
              key={w.key}
              onClick={() => setCampaignKey(w.key)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5
                hover:bg-white/10 hover:border-white/25 transition-all text-left group"
            >
              <w.Icon size={18} className="shrink-0 text-white/70" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-snug">{w.label}</p>
                <p className="text-[10px] text-white/40 mt-0.5 truncate">{w.description}</p>
              </div>
              <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 shrink-0 ml-auto transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <wizard.Icon size={16} className="text-white/70" />
            <span className="text-sm font-bold text-white">{wizard.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {doneCount > 0 && (
              <button onClick={handleReset}
                className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
                title="Reset progress">
                <RotateCcw size={10} /> Reset
              </button>
            )}
            <button onClick={() => setCampaignKey(null)}
              className="text-[10px] text-white/30 hover:text-white/70 px-2 py-1 rounded-lg border border-white/10 hover:border-white/25 transition-colors">
              ← Back
            </button>
          </div>
        </div>
        <WizardProgressBar done={doneCount} total={wizard.steps.length} color={wizard.color} />
      </div>

      {isComplete && (
        <div className="flex items-center gap-2 p-3 bg-green-500/15 border border-green-400/25 rounded-xl">
          <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          <p className="text-xs text-green-300 font-semibold">All steps complete! Your campaign should be live.</p>
        </div>
      )}

      {wizard.steps.map((step, i) => (
        <div key={i}>
          <WizardStepCard
            step={step} index={i} total={wizard.steps.length}
            isActive={i === activeIndex} isDone={done.has(i)}
            onGo={() => handleGo(i)} onSkip={() => handleSkip(i)}
          />
          {i < wizard.steps.length - 1 && <WizardStepArrow />}
        </div>
      ))}

      <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
        <Info size={12} className="text-white/30 shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/30 leading-relaxed">
          Progress is saved automatically. Come back any time to continue.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Generator tab
// ─────────────────────────────────────────────────────────────────────────────

function VariableChips({ variables }) {
  if (!variables?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Variables AI will use</p>
      <div className="flex flex-wrap gap-1">
        {variables.map(v => (
          <span key={v} className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-mono rounded-md border border-white/10">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function VariationCard({ variation, index, onUse }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${variation.subject}\n\n${variation.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="border border-white/20 rounded-xl overflow-hidden bg-white/5">
      <div className="flex items-center justify-between px-3 py-2 bg-white/10 border-b border-white/10">
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Variation {index + 1}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/90 transition-colors">
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">Subject</p>
          <p className="text-xs font-semibold text-white leading-snug">{variation.subject}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-0.5">Body Preview</p>
          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3 whitespace-pre-wrap">{variation.body}</p>
        </div>
        <button onClick={() => onUse(variation)}
          className="w-full mt-1 py-2 bg-white text-[#1a0533] text-xs font-bold rounded-lg hover:bg-white/90 transition-all shadow-md">
          Use This Template
        </button>
      </div>
    </div>
  );
}

function NotesPopup({ onClose, usage }) {
  const pct = usage?.generations_limit > 0
    ? Math.min(100, Math.round((usage.generations_used / usage.generations_limit) * 100)) : 0;
  const barColor  = pct >= 90 ? 'bg-red-400'    : pct >= 70 ? 'bg-amber-400'    : 'bg-purple-400';
  const textColor = pct >= 90 ? 'text-red-300'  : pct >= 70 ? 'text-amber-300'  : 'text-purple-300';
  return (
    <div className="absolute top-9 right-0 w-64 bg-[#1a0533] border border-white/20 rounded-2xl shadow-2xl p-4 z-10">
      {usage && (
        <div className="mb-3 pb-3 border-b border-white/10 space-y-2">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">AI Usage — This Month</p>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/60">Generations</span>
              <span className={`font-bold tabular-nums ${textColor}`}>{usage.generations_used} / {usage.generations_limit}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-white/30 text-right">{Math.max(0, usage.generations_limit - usage.generations_used)} remaining</p>
          </div>
        </div>
      )}
      <div className="flex items-start gap-2">
        <Info size={13} className="text-purple-300 shrink-0 mt-0.5" />
        <p className="text-white/50 leading-relaxed text-[11px]">
          Generated templates are a starting point — edit freely in the body editor after inserting.
        </p>
      </div>
      <button onClick={onClose}
        className="mt-3 w-full text-center text-[11px] font-bold text-purple-300 hover:text-white border border-white/20 rounded-lg py-1.5 transition-colors">
        Got it
      </button>
    </div>
  );
}

function GeneratorView({ navigate, setOpen }) {
  const { emailContext } = useNadia();
  const location = useLocation();

  const [context,    setContext]    = useState('');
  const [format,     setFormat]     = useState('Plain Text');
  const [loading,    setLoading]    = useState(false);
  const [variations, setVariations] = useState([]);
  const [usage,      setUsage]      = useState(null);
  const [error,      setError]      = useState('');
  const [noConfig,   setNoConfig]   = useState(false);
  const [showNotes,  setShowNotes]  = useState(false);

  const isOnEmailTemplates = location.pathname === '/email-templates';
  const isReady            = isOnEmailTemplates && !!emailContext?.onUseTemplate;

  useEffect(() => {
    aiApi.getUsage().then(setUsage).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setError(''); setVariations([]); setLoading(true); setNoConfig(false);
    try {
      const res = await aiApi.generateEmail({
        context,
        available_variables: emailContext?.variables || [],
        format,
      });
      setVariations(res.variations || []);
      if (res.usage) setUsage(u => ({ ...u, ...res.usage }));
    } catch (err) {
      if (err.message?.includes('No AI key configured') || err.message?.includes('402')) {
        setNoConfig(true);
      } else {
        setError(err.message || 'Generation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUse = (variation) => {
    emailContext?.onUseTemplate?.(variation);
    setOpen(false);
    setVariations([]);
    setContext('');
  };

  // Not on email templates page at all
  if (!isOnEmailTemplates) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
            <FileText size={24} className="text-purple-300" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-white">Email Template Generator</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-[240px]">
              Head to the Email Templates page and open a template form to use AI generation.
            </p>
          </div>
          <button
            onClick={() => { navigate('/email-templates'); setOpen(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            <Navigation size={13} /> Go to Email Templates
          </button>
        </div>
      </div>
    );
  }

  // On email templates but form not open
  if (!isReady) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
            <FileText size={24} className="text-purple-300" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-white">Almost there!</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-[240px]">
              Click <strong className="text-white/70">+ Add Template</strong> or edit an existing template to activate AI generation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full generator UI
  const statusText = loading ? 'Crafting your email…'
    : variations.length > 0  ? 'Your templates are ready!'
    : context.trim()         ? 'Ready to generate'
                             : 'Describe your email below';

  return (
    <>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">

        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50 leading-relaxed">{statusText}</p>
          <div className="relative">
            <button onClick={() => setShowNotes(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
              <Info size={13} />
            </button>
            {showNotes && <NotesPopup onClose={() => setShowNotes(false)} usage={usage} />}
          </div>
        </div>

        {noConfig && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-400/20 rounded-xl text-xs text-amber-300">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>No AI key configured. <strong className="text-amber-200">Go to Configuration → Nadia AI</strong> to add your API key first.</span>
          </div>
        )}

        <VariableChips variables={emailContext?.variables || []} />

        {/* Format toggle */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Output format</p>
          <div className="flex rounded-lg overflow-hidden border border-white/10 w-fit">
            {['Plain Text', 'HTML'].map(f => (
              <button key={f} type="button" onClick={() => setFormat(f)}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${
                  format === f ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt textarea */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Describe the email you want</label>
          <textarea
            value={context} onChange={e => setContext(e.target.value)} rows={4}
            placeholder="e.g. A reminder to voters about upcoming election day, mentioning polling hours and what ID to bring."
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20
              outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30 resize-none transition-all"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-400/20 rounded-xl text-xs text-red-300">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />{error}
          </div>
        )}

        {variations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-400" />
              <span className="text-xs font-bold text-green-400">{variations.length} variation{variations.length > 1 ? 's' : ''} ready</span>
            </div>
            {variations.map((v, i) => <VariationCard key={i} variation={v} index={i} onUse={handleUse} />)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 bg-[#0f0220]/80 border-t border-white/10">
        <button onClick={handleGenerate} disabled={loading || !context.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5
            bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500
            disabled:from-white/10 disabled:to-white/10
            text-white text-sm font-bold rounded-xl transition-all
            shadow-lg shadow-purple-900/40 disabled:cursor-not-allowed disabled:text-white/30">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate Templates</>}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main NadiaAI component
// ─────────────────────────────────────────────────────────────────────────────

const NadiaAI = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { emailContext } = useNadia();

  const [visible,     setVisible]     = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [open,        setOpen]        = useState(false);
  const [activeTab,   setActiveTab]   = useState('wizard');
  const panelRef = useRef(null);

  // Slide in after 2s, tooltip fades after 6s
  useEffect(() => {
    const t1 = setTimeout(() => { setVisible(true); setShowTooltip(true); }, 2000);
    const t2 = setTimeout(() => setShowTooltip(false), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Auto-switch to generator tab when email template form becomes active
  useEffect(() => {
    if (emailContext?.onUseTemplate) setActiveTab('generator');
  }, [emailContext]);

  // Reset to wizard tab when navigating away from email templates
  useEffect(() => {
    if (location.pathname !== '/email-templates') setActiveTab('wizard');
  }, [location.pathname]);

  const tooltipText = activeTab === 'generator' && emailContext?.onUseTemplate
    ? 'Generate email with AI ✨'
    : 'Start a campaign or get AI help ✨';

  const headerStatus = open
    ? activeTab === 'wizard' ? 'Campaign Setup Wizard' : 'AI Email Generator'
    : 'Your AI assistant';

  return (
    <>
      {/* ── Floating avatar button ── */}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 transition-all duration-700 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-32 opacity-0'}`}>

        {!open && (
          <div className={`bg-[#1a0533] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg
            border border-purple-500/30 whitespace-nowrap transition-all duration-700
            ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
            {tooltipText}
          </div>
        )}

        <button
          onClick={() => setOpen(v => !v)}
          className="relative w-16 h-16 rounded-full shadow-2xl shadow-purple-500/40
            ring-2 ring-purple-500/60 hover:ring-purple-400 hover:scale-105
            transition-all duration-300 overflow-hidden bg-gradient-to-b from-[#2d1060] to-[#1a0533]
            focus:outline-none focus:ring-4 focus:ring-purple-400/60"
          title="Nadia AI"
        >
          <img src={nadiaAvatar} alt="Nadia AI" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#1a0533]/60 to-transparent" />
          {!open && <span className="absolute inset-0 rounded-full ring-4 ring-purple-400/40 animate-ping pointer-events-none" />}
        </button>
      </div>

      {/* ── Panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-40 w-[370px] max-h-[82vh] flex flex-col rounded-2xl overflow-hidden
            shadow-2xl shadow-purple-900/50 border border-white/10
            bg-gradient-to-b from-[#1a0533] to-[#0f0220]
            animate-slide-up"
        >
          {/* Header */}
          <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-[#2d1060] to-[#1a0533] border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-400/50 shrink-0 bg-[#2d1060]">
                  <img src={nadiaAvatar} alt="Nadia" className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Nadia AI</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-white/50">{headerStatus}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <TabBar active={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === 'wizard' ? (
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              <WizardView navigate={(route) => { navigate(route); setOpen(false); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <GeneratorView navigate={navigate} setOpen={setOpen} />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default NadiaAI;
