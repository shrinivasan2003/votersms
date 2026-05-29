/**
 * RepeatScheduler — controlled component for recurring job scheduling.
 *
 * Props:
 *   value    : repeat state object (see DEFAULT_REPEAT below)
 *   onChange : (newValue) => void  — called whenever any field changes
 *   tzShort  : string e.g. "IST" — shown next to time labels
 */
import { useEffect } from 'react';

export const DEFAULT_REPEAT = {
  enabled:   false,
  type:      'weekly',   // 'alternateday'|'daily'|'weekly'|'monthly'|'quarterly'|'yearly'
  every:     1,
  day:       'Friday',   // weekday name for weekly
  time:      '09:00',
  dom:       1,          // day-of-month (1–28) for monthly/quarterly/yearly
  monthNum:  1,          // month 1-12 for yearly
  untilType: 'never',
  untilDate: '',
  scheduledAt: '',
};

const DAYS   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const REPEAT_TYPES = [
  { key: 'alternateday', label: 'Alt. Day'  },
  { key: 'daily',        label: 'Daily'     },
  { key: 'weekly',       label: 'Weekly'    },
  { key: 'monthly',      label: 'Monthly'   },
  { key: 'quarterly',    label: 'Quarterly' },
  { key: 'yearly',       label: 'Yearly'    },
];

const pad = n => String(n).padStart(2, '0');
const toLocalISO = d =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function computeFirst(type, every, day, time, dom, monthNum) {
  const [h, m] = (time || '09:00').split(':').map(Number);
  const now = new Date();
  let result;

  if (type === 'alternateday') {
    result = new Date(now);
    result.setDate(now.getDate() + 2);
    result.setHours(h, m, 0, 0);

  } else if (type === 'daily') {
    result = new Date(now);
    result.setDate(now.getDate() + (every || 1));
    result.setHours(h, m, 0, 0);

  } else if (type === 'weekly') {
    const idx = DAYS.findIndex(d => d.toLowerCase() === (day || '').toLowerCase());
    if (idx === -1) return '';
    const jsTarget = (idx + 1) % 7;   // Mon=1 … Sun=0 in JS
    let diff = (jsTarget - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;          // always future, not today
    result = new Date(now);
    result.setDate(now.getDate() + diff);
    result.setHours(h, m, 0, 0);

  } else if (type === 'monthly') {
    const d = Math.min(dom || 1, 28);
    result = new Date(now.getFullYear(), now.getMonth(), d, h, m, 0);
    if (result <= now) result.setMonth(result.getMonth() + (every || 1));

  } else if (type === 'quarterly') {
    const d = Math.min(dom || 1, 28);
    result = new Date(now.getFullYear(), now.getMonth(), d, h, m, 0);
    if (result <= now) result.setMonth(result.getMonth() + 3);

  } else if (type === 'yearly') {
    const mo = (monthNum || 1) - 1;
    const d  = Math.min(dom || 1, 28);
    result = new Date(now.getFullYear(), mo, d, h, m, 0);
    if (result <= now) result.setFullYear(result.getFullYear() + 1);
  }

  return result ? toLocalISO(result) : '';
}

function repeatPreviewText({ type, every, day, time, dom, monthNum }) {
  switch (type) {
    case 'alternateday': return `Every alternate day at ${time}`;
    case 'daily':        return `Every ${every > 1 ? every + ' days' : 'day'} at ${time}`;
    case 'weekly':       return `Every ${every > 1 ? every + ' weeks' : 'week'} on ${day} at ${time}`;
    case 'monthly':      return `Every ${every > 1 ? every + ' months' : 'month'} on day ${dom} at ${time}`;
    case 'quarterly':    return `Every quarter on day ${dom} at ${time}`;
    case 'yearly':       return `Every year on ${MONTHS[(monthNum||1)-1]} ${dom} at ${time}`;
    default:             return '';
  }
}

const RepeatScheduler = ({ value, onChange, tzShort }) => {
  const { enabled, type, every, day, time, dom, monthNum,
          untilType, untilDate, scheduledAt } = value;

  const upd = patch => onChange({ ...value, ...patch });

  // Auto-compute first run whenever config changes
  useEffect(() => {
    if (!enabled) return;
    const next = computeFirst(type, every, day, time, dom, monthNum);
    if (next) onChange({ ...value, scheduledAt: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, type, every, day, time, dom, monthNum]);

  const preview = enabled ? repeatPreviewText(value) : '';

  // Helpers for classes
  const typeBtn = (k) =>
    `py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
      type === k
        ? 'bg-violet-600 text-white border-violet-600'
        : 'bg-white text-brand-textPrimary border-brand-border hover:border-violet-300'
    }`;

  const dayBtn = (d) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
      day === d
        ? 'bg-violet-600 text-white border-violet-600'
        : 'bg-white border-brand-border hover:border-violet-300'
    }`;

  const timeLabel = `At time${tzShort ? ` (${tzShort})` : ''}`;
  const inputCls  = 'w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400';
  const minDT     = toLocalISO(new Date(Date.now() + 60000));

  // Types that need an "Every N" control
  const hasEvery   = type === 'daily' || type === 'weekly' || type === 'monthly';
  // Types that need a day-of-month picker
  const hasDom     = type === 'monthly' || type === 'quarterly' || type === 'yearly';
  // Types that just need a time (no every-N, no weekday, no DOM)
  const timeOnly   = type === 'alternateday';

  return (
    <div className="border border-brand-border rounded-xl overflow-hidden">
      {/* ── Toggle header ─────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${enabled ? 'bg-violet-50' : 'bg-gray-50'}`}
        onClick={() => upd({ enabled: !enabled })}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">↺</span>
          <div>
            <p className="text-sm font-bold text-brand-textPrimary">Repeat this job</p>
            {enabled && preview
              ? <p className="text-xs text-violet-600 font-medium mt-0.5">{preview}</p>
              : <p className="text-xs text-brand-textMuted">Send once or repeat automatically</p>
            }
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-violet-600' : 'bg-gray-300'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
        </div>
      </div>

      {enabled && (
        <div className="p-5 space-y-5 border-t border-brand-border">

          {/* ── Type selector (2 × 3 grid) ─────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            {REPEAT_TYPES.map(rt => (
              <button key={rt.key} type="button" className={typeBtn(rt.key)}
                onClick={() => upd({ type: rt.key })}>
                {rt.label}
              </button>
            ))}
          </div>

          {/* ── Type-specific options ──────────────────────────────────── */}
          <div className="space-y-4">

            {/* Every N interval (daily / weekly / monthly) */}
            {hasEvery && (
              <div className="flex gap-4 flex-wrap">
                <div className="space-y-1 flex-1 min-w-[110px]">
                  <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Every</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={99} value={every}
                      onChange={e => upd({ every: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-16 rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400"
                    />
                    <span className="text-sm text-brand-textSecondary">
                      {type === 'daily'   ? (every === 1 ? 'day'   : 'days')   :
                       type === 'weekly'  ? (every === 1 ? 'week'  : 'weeks')  :
                                            (every === 1 ? 'month' : 'months')}
                    </span>
                  </div>
                </div>
                {/* Time picker alongside Every N */}
                {!hasDom && (
                  <div className="space-y-1 flex-1 min-w-[110px]">
                    <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">{timeLabel}</label>
                    <input type="time" value={time} onChange={e => upd({ time: e.target.value })} className={inputCls} />
                  </div>
                )}
              </div>
            )}

            {/* Alternate day — just time */}
            {timeOnly && (
              <div className="space-y-1 max-w-xs">
                <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">{timeLabel}</label>
                <input type="time" value={time} onChange={e => upd({ time: e.target.value })} className={inputCls} />
              </div>
            )}

            {/* Weekday picker (weekly) */}
            {type === 'weekly' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Run on</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" className={dayBtn(d)} onClick={() => upd({ day: d })}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day-of-month + optional month + time (monthly / quarterly / yearly) */}
            {hasDom && (
              <div className="flex gap-4 flex-wrap items-start">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Day of month</label>
                  <input type="number" min={1} max={28} value={dom}
                    onChange={e => upd({ dom: Math.max(1, Math.min(28, parseInt(e.target.value) || 1)) })}
                    className="w-20 rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <p className="text-[10px] text-gray-400">1–28 (safe for all months)</p>
                </div>

                {type === 'yearly' && (
                  <div className="space-y-1 min-w-[140px]">
                    <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Month</label>
                    <select value={monthNum} onChange={e => upd({ monthNum: parseInt(e.target.value) })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400 bg-white appearance-none">
                      {MONTHS.map((mo, i) => <option key={i} value={i+1}>{mo}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1 flex-1 min-w-[110px]">
                  <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">{timeLabel}</label>
                  <input type="time" value={time} onChange={e => upd({ time: e.target.value })} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* ── Ends ──────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Ends</label>
            <div className="flex gap-4 items-center flex-wrap">
              {['never','date'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={untilType === opt}
                    onChange={() => upd({ untilType: opt })}
                    className="accent-violet-600"
                  />
                  <span className="text-sm font-medium text-brand-textPrimary capitalize">
                    {opt === 'never' ? 'Never' : 'On date'}
                  </span>
                </label>
              ))}
              {untilType === 'date' && (
                <input type="date" value={untilDate}
                  onChange={e => upd({ untilDate: e.target.value })}
                  min={new Date().toISOString().slice(0, 10)}
                  className="rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
              )}
            </div>
          </div>

          {/* ── First run preview ──────────────────────────────────────── */}
          <div className="bg-violet-50 border border-violet-100 rounded-lg px-4 py-3">
            <p className="text-xs text-violet-500 font-medium mb-1">
              First run {tzShort && <span className="font-bold">({tzShort})</span>}
            </p>
            <input type="datetime-local"
              value={scheduledAt}
              onChange={e => upd({ scheduledAt: e.target.value })}
              min={minDT}
              className="text-sm font-bold text-violet-800 bg-transparent border-none outline-none w-full"
            />
            <p className="text-[10px] text-violet-400 mt-1">Auto-computed from your settings. You can adjust manually.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepeatScheduler;
