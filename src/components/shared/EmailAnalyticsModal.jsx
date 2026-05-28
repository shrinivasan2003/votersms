/**
 * EmailAnalyticsModal
 * Shared detail-analytics modal for a single email job.
 * Used by both EmailJobs (inline) and EmailDeliveryReport.
 *
 * Props:
 *   job     – object with { job_id, template_name?, precinct_name?, list_name? }
 *   onClose – function to close the modal
 */
import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Monitor, Smartphone, Tablet, RefreshCw } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const PlatformIcon = ({ platform }) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('mobile') || p.includes('phone')) return <Smartphone size={13} className="text-gray-400" />;
  if (p.includes('tablet'))                         return <Tablet     size={13} className="text-gray-400" />;
  return                                                   <Monitor    size={13} className="text-gray-400" />;
};

const EventTypeBadge = ({ type }) => {
  const map = {
    open:        'bg-blue-100 text-blue-700',
    click:       'bg-purple-100 text-purple-700',
    bounce:      'bg-red-100 text-red-700',
    spam:        'bg-orange-100 text-orange-700',
    delivery:    'bg-green-100 text-green-700',
    unsubscribe: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[type] || 'bg-gray-100 text-gray-500'}`}>
      {type}
    </span>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────

const EmailAnalyticsModal = ({ job, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/email-analytics/${job.job_id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [job.job_id]);

  useEffect(() => { load(); }, [load]);

  // Build subtitle from available job metadata
  const parts = [job.precinct_name || job.list_name, job.template_name].filter(Boolean);
  const subtitle = parts.join(' · ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a56db] text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-base sm:text-lg">Email Analytics — Job #{job.job_id}</h2>
            {subtitle && (
              <p className="text-blue-200 text-xs sm:text-sm mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={load}
              disabled={loading}
              title="Refresh analytics"
              className="text-blue-200 hover:text-white disabled:opacity-50 transition-colors p-1.5 rounded-lg hover:bg-white/10"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="text-blue-200 hover:text-white text-2xl font-bold leading-none w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-brand-textMuted animate-pulse">
              Loading analytics…
            </div>
          ) : !data ? (
            <p className="text-center text-brand-textMuted py-10">No data available.</p>
          ) : (
            <>
              {/* ── Top stat cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Sent',           value: data.summary.total_sent      ?? 0, color: 'bg-[#1a56db]' },
                  { label: 'Delivered',      value: data.summary.deliveries      ?? 0, color: 'bg-[#2ecc71]' },
                  { label: 'Unique Opens',   value: data.summary.unique_opens    ?? 0, color: 'bg-[#10b981]' },
                  { label: 'Unique Clicks',  value: data.summary.unique_clicks   ?? 0, color: 'bg-[#9b59b6]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-lg p-3 sm:p-4 text-white relative overflow-hidden shadow-sm`}>
                    <p className="text-[9px] sm:text-[10px] font-medium opacity-90 mb-1 uppercase tracking-wider">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold">{value}</p>
                    <BarChart2 size={24} className="absolute top-2 right-2 opacity-20" />
                  </div>
                ))}
              </div>

              {/* Bounces + Spam row */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: 'Bounces',         value: data.summary.bounces          ?? 0, bg: 'bg-red-50',    text: 'text-red-600'    },
                  { label: 'Spam Complaints', value: data.summary.spam_complaints  ?? 0, bg: 'bg-orange-50', text: 'text-orange-600' },
                ].map(({ label, value, bg, text }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 sm:p-4 border border-brand-border`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
                    <p className={`text-xl sm:text-2xl font-bold ${text}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* ── Rate bars ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: 'Open Rate',  value: data.summary.open_rate,  bar: 'bg-[#2ecc71]' },
                  { label: 'Click Rate', value: data.summary.click_rate, bar: 'bg-[#9b59b6]' },
                ].map(({ label, value, bar }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-4 border border-brand-border">
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-brand-textPrimary">{label}</span>
                      <span className="text-brand-textSecondary">{value ?? 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bar}`}
                        style={{ width: `${Math.min(value ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Platform & Client breakdown ── */}
              {(data.platforms?.length > 0 || data.clients?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {data.platforms?.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-brand-border">
                      <h3 className="font-bold text-sm text-brand-textPrimary mb-3">Opens by Platform</h3>
                      <ul className="space-y-2">
                        {data.platforms.map((p) => (
                          <li key={p.platform} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-brand-textSecondary">
                              <PlatformIcon platform={p.platform} /> {p.platform}
                            </span>
                            <span className="font-bold text-brand-textPrimary">{p.opens}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.clients?.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-brand-border">
                      <h3 className="font-bold text-sm text-brand-textPrimary mb-3">Opens by Email Client</h3>
                      <ul className="space-y-2">
                        {data.clients.map((c) => (
                          <li key={c.client} className="flex items-center justify-between text-sm">
                            <span className="text-brand-textSecondary">{c.client}</span>
                            <span className="font-bold text-brand-textPrimary">{c.opens}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ── Recent event feed ── */}
              <div>
                <h3 className="font-bold text-sm text-brand-textPrimary mb-3">
                  Recent Events
                  <span className="ml-2 text-brand-textMuted font-normal">
                    ({data.recent_events?.length ?? 0} shown)
                  </span>
                </h3>
                {!data.recent_events?.length ? (
                  <p className="text-sm text-brand-textMuted py-6 text-center bg-gray-50 rounded-xl border border-brand-border">
                    No events recorded yet — they appear once Postmark sends webhooks.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-brand-border">
                    <table className="min-w-full text-sm divide-y divide-brand-border">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Event', 'Recipient', 'Platform', 'Client', 'OS', 'When'].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-brand-border">
                        {data.recent_events.map((ev, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <EventTypeBadge type={ev.event_type} />
                            </td>
                            <td className="px-4 py-3 text-brand-textPrimary font-medium max-w-[180px] truncate">
                              {ev.recipient_email}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 text-brand-textSecondary">
                                <PlatformIcon platform={ev.platform} />
                                {ev.platform || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-brand-textSecondary whitespace-nowrap">{ev.client_name || '—'}</td>
                            <td className="px-4 py-3 text-brand-textSecondary whitespace-nowrap">{ev.os_name || '—'}</td>
                            <td className="px-4 py-3 text-brand-textMuted whitespace-nowrap text-xs">{fmtDateTime(ev.occurred_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailAnalyticsModal;
