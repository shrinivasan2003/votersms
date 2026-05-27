/**
 * RecipientPicker — reusable recipient-source selector used in SMS, Email, and WhatsApp job forms.
 *
 * Three modes (tab-switched):
 *   • Precinct   — dropdown of precincts
 *   • List       — dropdown of contact lists (includes "Master List / All" option)
 *   • Individual — live search → select a single recipient
 *
 * Props:
 *   precincts  — array from /api/precincts
 *   lists      — array from /api/contact-lists
 *   channel    — 'sms' | 'email' | 'whatsapp'  (controls search-result sub-label)
 *   value      — { type, precinct_id, list_id, voter_id, label }
 *   onChange   — (value) => void
 */
import { useState, useEffect } from 'react';
import { Building2, ListChecks, User, Search, RefreshCw, X, Star } from 'lucide-react';

const MODES = [
  { key: 'precinct',   label: 'Precinct',   Icon: Building2   },
  { key: 'list',       label: 'List',       Icon: ListChecks  },
  { key: 'individual', label: 'Individual', Icon: User        },
];

const EMPTY = { type: 'precinct', precinct_id: null, list_id: null, voter_id: null, label: '' };

export default function RecipientPicker({ precincts = [], lists = [], channel = 'sms', value, onChange }) {
  const [mode, setMode]               = useState(value?.type || 'precinct');
  const [voterSearch, setVoterSearch] = useState('');
  const [results, setResults]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [selectedVoter, setSelectedVoter] = useState(
    value?.type === 'individual' && value?.voter ? value.voter : null
  );

  /* ── switch mode ────────────────────────────────────────────────────── */
  const switchMode = (m) => {
    setMode(m);
    setSelectedVoter(null);
    setVoterSearch('');
    setResults([]);
    onChange({ ...EMPTY, type: m });
  };

  /* ── live voter search ──────────────────────────────────────────────── */
  useEffect(() => {
    if (mode !== 'individual' || !voterSearch.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/voters?search=${encodeURIComponent(voterSearch)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch { setResults([]); }
      finally  { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [voterSearch, mode]);

  /* ── helpers ────────────────────────────────────────────────────────── */
  const subLabel = (v) => {
    if (channel === 'sms' || channel === 'whatsapp') return v.phone || 'no phone';
    return v.email || 'no email';
  };

  const selectVoter = (v) => {
    setSelectedVoter(v);
    setVoterSearch('');
    setResults([]);
    onChange({ type: 'individual', precinct_id: null, list_id: null, voter_id: v.id,
               label: `${v.first_name} ${v.last_name}`, voter: v });
  };

  const clearVoter = () => {
    setSelectedVoter(null);
    setVoterSearch('');
    onChange({ ...EMPTY, type: 'individual' });
  };

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-brand-textPrimary">
        Recipient Source <span className="text-red-500">*</span>
      </label>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-brand-border overflow-hidden">
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchMode(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold
              transition-colors border-r border-brand-border last:border-0
              ${mode === key
                ? 'bg-[#0047AB] text-white'
                : 'bg-white text-brand-textSecondary hover:bg-gray-50'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Precinct dropdown ── */}
      {mode === 'precinct' && (
        <div className="relative">
          <select
            className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none
              focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all"
            defaultValue=""
            onChange={e => {
              const opt = e.target.options[e.target.selectedIndex];
              onChange({ type: 'precinct', precinct_id: e.target.value || null,
                         list_id: null, voter_id: null, label: opt.text });
            }}
          >
            <option value="">Select Precinct</option>
            {precincts.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>
      )}

      {/* ── List dropdown ── */}
      {mode === 'list' && (
        <div className="relative">
          <select
            className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none
              focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all"
            defaultValue=""
            onChange={e => {
              const opt = e.target.options[e.target.selectedIndex];
              onChange({ type: 'list', precinct_id: null,
                         list_id: e.target.value || null, voter_id: null, label: opt.text });
            }}
          >
            <option value="">⭐  Master List — All Active Recipients</option>
            {lists.filter(l => l.status === 'Active').map(l => (
              <option key={l.id} value={l.id}>
                {l.name}  ({l.member_count ?? 0} members)
              </option>
            ))}
          </select>
          <ChevronIcon />
          <p className="mt-1.5 text-xs text-brand-textMuted">
            Leave as "Master List" to reach every active recipient, or pick a specific list.
          </p>
        </div>
      )}

      {/* ── Individual search ── */}
      {mode === 'individual' && (
        <div>
          {selectedVoter ? (
            /* Selected chip */
            <div className="flex items-center gap-3 px-4 py-3 border border-green-300 bg-green-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-textPrimary truncate">
                  {selectedVoter.first_name} {selectedVoter.last_name}
                </p>
                <p className="text-xs text-brand-textSecondary truncate">{subLabel(selectedVoter)}</p>
              </div>
              <button type="button" onClick={clearVoter}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Search box + dropdown */
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {searching
                  ? <RefreshCw size={16} className="text-gray-400 animate-spin" />
                  : <Search    size={16} className="text-gray-400" />}
              </div>
              <input
                type="text"
                value={voterSearch}
                onChange={e => setVoterSearch(e.target.value)}
                placeholder="Search by name, email or phone…"
                className="block w-full pl-9 pr-4 py-3 border border-brand-border rounded-lg
                  outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />

              {results.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 border border-brand-border
                  rounded-lg bg-white shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {results.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVoter(v)}
                      className="w-full flex items-center gap-3 px-4 py-3
                        hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0047AB]/10 flex items-center justify-center shrink-0">
                        <User size={14} className="text-[#0047AB]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-textPrimary truncate">
                          {v.first_name} {v.last_name}
                        </p>
                        <p className="text-xs text-brand-textSecondary truncate">{subLabel(v)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {voterSearch.trim() && !searching && results.length === 0 && (
                <p className="mt-1.5 text-xs text-brand-textMuted">No recipients found for "{voterSearch}"</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* tiny shared chevron */
function ChevronIcon() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
      </svg>
    </div>
  );
}
