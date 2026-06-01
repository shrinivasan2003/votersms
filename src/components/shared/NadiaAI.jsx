/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import {
  X, Send, Info, Loader2,
  CheckCircle, AlertCircle, Copy, Check, Sparkles,
} from 'lucide-react';
import nadiaAvatar from '../../assets/nadia-avatar.jpg';
import { aiApi } from '../../api/ai';

// ── Usage badge ───────────────────────────────────────────────────────────────

function UsageBadge({ usage }) {
  if (!usage) return null;
  const pct = usage.generations_limit > 0
    ? Math.min(100, Math.round((usage.generations_used / usage.generations_limit) * 100))
    : 0;
  const color = pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : 'text-indigo-400';
  return (
    <div className={`flex items-center gap-1 text-[10px] font-semibold ${color}`}>
      <Sparkles size={9} />
      {usage.generations_used}/{usage.generations_limit} this month
    </div>
  );
}

// ── Single variation card ─────────────────────────────────────────────────────

function VariationCard({ variation, index, onUse }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${variation.subject}\n\n${variation.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-white/20 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-white/10 border-b border-white/10">
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
          Variation {index + 1}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/90 transition-colors"
          title="Copy"
        >
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
          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {variation.body}
          </p>
        </div>
        <button
          onClick={() => onUse(variation)}
          className="w-full mt-1 py-2 bg-white text-[#1a0533] text-xs font-bold rounded-lg hover:bg-white/90 transition-all shadow-md"
        >
          Use This Template
        </button>
      </div>
    </div>
  );
}

// ── Notes tooltip ─────────────────────────────────────────────────────────────

function NotesPopup({ onClose, usage }) {
  const pct = usage?.generations_limit > 0
    ? Math.min(100, Math.round((usage.generations_used / usage.generations_limit) * 100))
    : 0;
  const barColor = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-purple-400';
  const textColor = pct >= 90 ? 'text-red-300' : pct >= 70 ? 'text-amber-300' : 'text-purple-300';

  return (
    <div className="absolute top-9 right-0 w-64 bg-[#1a0533] border border-white/20 rounded-2xl shadow-2xl p-4 z-10">
      {/* Usage stats */}
      {usage && (
        <div className="mb-3 pb-3 border-b border-white/10 space-y-2">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">AI Usage — This Month</p>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/60">Generations</span>
              <span className={`font-bold tabular-nums ${textColor}`}>
                {usage.generations_used} / {usage.generations_limit}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-white/30 text-right">{Math.max(0, usage.generations_limit - usage.generations_used)} remaining</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="flex items-start gap-2">
        <Info size={13} className="text-purple-300 shrink-0 mt-0.5" />
        <p className="text-white/50 leading-relaxed text-[11px]">
          Generated templates are a starting point edit freely in the body editor after inserting.
        </p>
      </div>

      <button
        onClick={onClose}
        className="mt-3 w-full text-center text-[11px] font-bold text-purple-300 hover:text-white border border-white/20 rounded-lg py-1.5 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}

// ── Variable chips ────────────────────────────────────────────────────────────

function VariableChips({ variables }) {
  if (!variables?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">
        Variables AI will use
      </p>
      <div className="flex flex-wrap gap-1">
        {variables.map(v => (
          <span
            key={v}
            className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-mono rounded-md border border-white/10"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main NadiaAI component ────────────────────────────────────────────────────

const NadiaAI = ({ availableVariables = [], onUseTemplate }) => {
  const [visible, setVisible]       = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [open, setOpen]             = useState(false);
  const [context, setContext]       = useState('');
  const [format, setFormat]         = useState('Plain Text');
  const [loading, setLoading]       = useState(false);
  const [variations, setVariations] = useState([]);
  const [usage, setUsage]           = useState(null);
  const [error, setError]           = useState('');
  const [showNotes, setShowNotes]   = useState(false);
  const [noConfig, setNoConfig]     = useState(false);
  const panelRef                    = useRef(null);

  // Slide in after 2s, show tooltip, then hide tooltip after 6s
  useEffect(() => {
    const t1 = setTimeout(() => {
      setVisible(true);
      setShowTooltip(true);
    }, 2000);
    const t2 = setTimeout(() => setShowTooltip(false), 8000); // 2s + 6s
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Fetch usage when panel opens
  useEffect(() => {
    if (!open) return;
    aiApi.getUsage().then(setUsage).catch(() => {});
  }, [open]);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setError('');
    setVariations([]);
    setLoading(true);
    setNoConfig(false);
    try {
      const res = await aiApi.generateEmail({
        context,
        available_variables: availableVariables,
        format,
      });
      setVariations(res.variations || []);
      if (res.usage) setUsage(u => ({ ...u, ...res.usage }));
    } catch (err) {
      if (err.message.includes('No AI key configured') || err.message.includes('402')) {
        setNoConfig(true);
      } else {
        setError(err.message || 'Generation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUse = (variation) => {
    onUseTemplate?.(variation);
    setOpen(false);
    setVariations([]);
    setContext('');
  };

  return (
    <>
      {/* ── Floating circular avatar button ── */}
      <div
        className={`fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 transition-all duration-700 ease-out
          ${visible ? 'translate-x-0 opacity-100' : 'translate-x-32 opacity-0'}`}
      >
        {/* Label tooltip — appears with Nadia, fades out after 6s */}
        {!open && (
          <div className={`bg-[#1a0533] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg
            border border-purple-500/30 whitespace-nowrap transition-all duration-700
            ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
            Need help writing an email?
          </div>
        )}

        {/* Circular avatar button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="relative w-16 h-16 rounded-full shadow-2xl shadow-purple-500/40
            ring-2 ring-purple-500/60 hover:ring-purple-400 hover:scale-105
            transition-all duration-300 overflow-hidden bg-gradient-to-b from-[#2d1060] to-[#1a0533]
            focus:outline-none focus:ring-4 focus:ring-purple-400/60"
          title="Nadia AI — Email Assistant"
        >
          {/* Avatar image — cropped to show head & shoulders */}
          <img
            src={nadiaAvatar}
            alt="Nadia AI"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          {/* Gradient overlay at bottom for polish */}
          <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#1a0533]/60 to-transparent" />

          {/* Pulse ring when closed */}
          {!open && (
            <span className="absolute inset-0 rounded-full ring-4 ring-purple-400/40 animate-ping pointer-events-none" />
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-40 w-[370px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden
            shadow-2xl shadow-purple-900/50 border border-white/10
            bg-gradient-to-b from-[#1a0533] to-[#0f0220]
            animate-slide-up"
        >
          {/* ── Header ── */}
          <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-[#2d1060] to-[#1a0533] border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Mini avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-400/50 shrink-0 bg-[#2d1060]">
                  <img
                    src={nadiaAvatar}
                    alt="Nadia"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Nadia AI</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-white/50">
                      {loading
                        ? 'Crafting your email…'
                        : variations.length > 0
                          ? 'Your templates are ready!'
                          : context.trim()
                            ? 'Ready to generate your email'
                            : 'Here to write your next email'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 relative">
                <button
                  onClick={() => setShowNotes(v => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                  title="Notes"
                >
                  <Info size={13} />
                </button>
                {showNotes && <NotesPopup onClose={() => setShowNotes(false)} usage={usage} />}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">

            {/* Greeting */}
            <p className="text-xs text-white/60 leading-relaxed">
              Hi! I'm Nadia, your email writing assistant. Describe what you need and I'll generate two professional variations for you.
            </p>

            {/* No config warning */}
            {noConfig && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-400/20 rounded-xl text-xs text-amber-300">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  No AI key configured.{' '}
                  <strong className="text-amber-200">Go to Configuration → Nadia AI</strong> to add your API key first.
                </span>
              </div>
            )}

            {/* Variables */}
            <VariableChips variables={availableVariables} />

            {/* Format toggle */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Output format</p>
              <div className="flex rounded-lg overflow-hidden border border-white/10 w-fit">
                {['Plain Text', 'HTML'].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1.5 text-xs font-bold transition-all ${
                      format === f
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Context textarea */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">
                Describe the email you want
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={4}
                placeholder="e.g. A reminder to voters about upcoming election day, mentioning polling hours and what ID to bring."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20
                  outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30 resize-none transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-400/20 rounded-xl text-xs text-red-300">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Variations */}
            {variations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-green-400" />
                  <span className="text-xs font-bold text-green-400">
                    {variations.length} variation{variations.length > 1 ? 's' : ''} ready
                  </span>
                </div>
                {variations.map((v, i) => (
                  <VariationCard key={i} variation={v} index={i} onUse={handleUse} />
                ))}
              </div>
            )}
          </div>

          {/* ── Footer / Generate ── */}
          <div className="shrink-0 px-4 py-3 bg-[#0f0220]/80 border-t border-white/10">
            <button
              onClick={handleGenerate}
              disabled={loading || !context.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5
                bg-gradient-to-r from-purple-600 to-indigo-600
                hover:from-purple-500 hover:to-indigo-500
                disabled:from-white/10 disabled:to-white/10
                text-white text-sm font-bold rounded-xl transition-all
                shadow-lg shadow-purple-900/40 disabled:cursor-not-allowed disabled:text-white/30"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : <><Sparkles size={14} /> Generate Templates</>
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NadiaAI;
