/**
 * SmsAnalyticsModal
 * Per-recipient delivery detail for a single SMS job.
 *
 * Props:
 *   job     – object with { id, precinct_name, template_name }
 *   onClose – function to close the modal
 */
import { useState, useEffect, useCallback } from 'react';
import { BarChart2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { smsAnalyticsApi } from '../../api/sms';

const fmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_STYLE = {
  delivered:   { label: 'Delivered',   cls: 'bg-green-100 text-green-700',  Icon: CheckCircle2 },
  sent:        { label: 'Sent',        cls: 'bg-blue-100 text-blue-700',    Icon: Clock },
  sending:     { label: 'Sending',     cls: 'bg-blue-100 text-blue-700',    Icon: Clock },
  queued:      { label: 'Queued',      cls: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  failed:      { label: 'Failed',      cls: 'bg-red-100 text-red-700',      Icon: XCircle },
  undelivered: { label: 'Undelivered', cls: 'bg-red-100 text-red-700',      Icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-500', Icon: Clock };
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.cls}`}>
      <Icon size={12} /> {s.label}
    </span>
  );
};

const SmsAnalyticsModal = ({ job, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    smsAnalyticsApi.get(job.id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [job.id]);

  useEffect(() => { load(); }, [load]);

  const subtitle = [job.precinct_name, job.template_name].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a56db] text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-base sm:text-lg">SMS Analytics — Job #{job.id}</h2>
            {subtitle && <p className="text-blue-200 text-xs sm:text-sm mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={load}
              disabled={loading}
              title="Refresh"
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
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Sent',          value: data.summary.total_sent ?? 0, color: 'bg-[#1a56db]' },
                  { label: 'Delivered',     value: data.summary.delivered,       color: 'bg-[#10b981]' },
                  { label: 'Failed',        value: data.summary.failed ?? 0,     color: 'bg-[#e74c3c]' },
                  { label: 'Delivery Rate', value: data.summary.delivery_rate != null ? `${data.summary.delivery_rate}%` : null, color: 'bg-[#9b59b6]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-lg p-3 sm:p-4 text-white relative overflow-hidden shadow-sm`}>
                    <p className="text-[9px] sm:text-[10px] font-medium opacity-90 mb-1 uppercase tracking-wider">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold">{value != null ? value : '—'}</p>
                    <BarChart2 size={24} className="absolute top-2 right-2 opacity-20" />
                  </div>
                ))}
              </div>

              {!data.summary.has_message_data && (
                <p className="text-xs text-gray-400">
                  This job was sent before per-recipient delivery tracking was added — only aggregate sent/failed counts are available, not individual statuses below.
                </p>
              )}

              {/* Recipient list */}
              <div>
                <h3 className="font-bold text-sm text-brand-textPrimary mb-3">
                  Recipients
                  <span className="ml-2 text-brand-textMuted font-normal">({data.recipients?.length ?? 0})</span>
                </h3>
                {!data.recipients?.length ? (
                  <p className="text-sm text-brand-textMuted py-6 text-center bg-gray-50 rounded-xl border border-brand-border">
                    No per-recipient delivery data recorded for this job.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-brand-border">
                    <table className="min-w-full text-sm divide-y divide-brand-border">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Recipient', 'Phone', 'Status', 'Error', 'Sent', 'Last Updated'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-brand-border">
                        {data.recipients.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-brand-textPrimary whitespace-nowrap">{r.recipient_name}</td>
                            <td className="px-4 py-3 text-brand-textSecondary text-xs whitespace-nowrap">{r.recipient_phone}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                            <td className="px-4 py-3 text-xs text-red-500 max-w-[180px] truncate">{r.error_message || '—'}</td>
                            <td className="px-4 py-3 text-xs text-brand-textMuted whitespace-nowrap">{fmt(r.sent_at)}</td>
                            <td className="px-4 py-3 text-xs text-brand-textMuted whitespace-nowrap">{fmt(r.updated_at)}</td>
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

export default SmsAnalyticsModal;
