import { Fragment, useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  HeartPulse, HardDrive, ShieldCheck,
} from 'lucide-react';
import { healthReportsApi } from '../../api/health';

const fmt = (ts) => {
  if (!ts) return '—';
  const s = typeof ts === 'string' && !(ts.includes('Z') || /[+-]\d\d:\d\d$/.test(ts)) ? ts + 'Z' : ts;
  return new Date(s).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const CheckIcon = ({ ok }) =>
  ok
    ? <CheckCircle2 size={16} className="text-green-500" />
    : <XCircle size={16} className="text-red-500" />;

const OverallBadge = ({ ok }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
    ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }`}>
    {ok ? 'All OK' : 'Attention Needed'}
  </span>
);

const Health = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    healthReportsApi.list()
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg text-brand-textPrimary flex items-center gap-2">
            <HeartPulse size={20} className="text-brand-primary" />
            Platform Health
          </h2>
          <p className="text-sm text-brand-textMuted mt-0.5">
            Daily automated check of the frontend, backend, database, and server — also emailed each morning.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primaryDark disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-brand-textMuted animate-pulse">
          Loading…
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-brand-textMuted py-10 text-center bg-gray-50 rounded-xl border border-brand-border">
          No health check reports yet — they appear automatically after each daily run (08:00 UTC).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="min-w-full text-sm divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {['', 'Checked At', 'Status', 'Frontend', 'Backend', 'Services', 'SSL', 'Disk'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {reports.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-brand-textMuted">
                      {expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-textPrimary font-medium">{fmt(r.checked_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><OverallBadge ok={!!r.overall_ok} /></td>
                    <td className="px-4 py-3"><CheckIcon ok={!!r.frontend_ok} /></td>
                    <td className="px-4 py-3"><CheckIcon ok={!!r.backend_ok} /></td>
                    <td className="px-4 py-3"><CheckIcon ok={!!r.services_ok} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-textSecondary">
                      <span className="flex items-center gap-1">
                        <ShieldCheck size={13} />
                        {r.ssl_days_left != null ? `${r.ssl_days_left}d` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-textSecondary">
                      <span className="flex items-center gap-1">
                        <HardDrive size={13} />
                        {r.disk_pct != null ? `${r.disk_pct}%` : '—'}
                      </span>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr>
                      <td colSpan={8} className="px-4 py-3 bg-gray-50">
                        <pre className="text-xs text-brand-textSecondary whitespace-pre-wrap font-mono">{r.report_text}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Health;
