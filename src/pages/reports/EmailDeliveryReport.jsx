import { useState, useEffect } from 'react';
import { BarChart2, Printer, RefreshCw, Search, X, ChevronDown, Eye, Monitor, Smartphone, Tablet } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB') : '—';

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
  if (p.includes('tablet')) return <Tablet size={13} className="text-gray-400" />;
  return <Monitor size={13} className="text-gray-400" />;
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

// ── Detail Modal ──────────────────────────────────────────────────────────────

const DetailModal = ({ job, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/email-analytics/${job.job_id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [job.job_id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-[#1a56db] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-lg">Email Job Detail — #{job.job_id}</h2>
            <p className="text-blue-200 text-sm mt-0.5">
              {job.precinct_name} &nbsp;·&nbsp; {job.template_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white text-2xl font-bold leading-none w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-brand-textMuted animate-pulse">
              Loading detail…
            </div>
          ) : !data ? (
            <p className="text-center text-brand-textMuted py-10">No data available.</p>
          ) : (
            <>
              {/* Summary stat row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Sent',          value: data.summary.total_sent      ?? 0, color: 'bg-[#1a56db]' },
                  { label: 'Unique Opens',  value: data.summary.unique_opens    ?? 0, color: 'bg-[#2ecc71]' },
                  { label: 'Unique Clicks', value: data.summary.unique_clicks   ?? 0, color: 'bg-[#9b59b6]' },
                  { label: 'Bounces',       value: data.summary.bounces         ?? 0, color: 'bg-[#e74c3c]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-lg p-4 text-white relative overflow-hidden shadow-sm`}>
                    <p className="text-[10px] font-medium opacity-90 mb-1 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                    <BarChart2 size={28} className="absolute top-2 right-2 opacity-20" />
                  </div>
                ))}
              </div>

              {/* Rate bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Platform & Client breakdown */}
              {(data.platforms?.length > 0 || data.clients?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Event feed */}
              <div>
                <h3 className="font-bold text-sm text-brand-textPrimary mb-3">
                  Recent Events
                  <span className="ml-2 text-brand-textMuted font-normal">
                    ({data.recent_events?.length ?? 0} shown)
                  </span>
                </h3>
                {!data.recent_events?.length ? (
                  <p className="text-sm text-brand-textMuted py-6 text-center bg-gray-50 rounded-xl border border-brand-border">
                    No events yet — they appear here once Postmark sends webhooks.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-brand-border">
                    <table className="min-w-full text-sm divide-y divide-brand-border">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Event', 'Recipient', 'Platform', 'Client', 'OS', 'When'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">
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
                            <td className="px-4 py-3 text-brand-textPrimary font-medium">{ev.recipient_email}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 text-brand-textSecondary">
                                <PlatformIcon platform={ev.platform} /> {ev.platform || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-brand-textSecondary whitespace-nowrap">{ev.client_name || '—'}</td>
                            <td className="px-4 py-3 text-brand-textSecondary whitespace-nowrap">{ev.os_name || '—'}</td>
                            <td className="px-4 py-3 text-brand-textMuted whitespace-nowrap">{fmtDateTime(ev.occurred_at)}</td>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const EmailDeliveryReport = () => {
  const [filters, setFilters] = useState({
    jobId: '',
    status: 'All Statuses',
    precinct: 'All Precincts',
    dateFrom: '',
    dateTo: '',
  });

  const [reportData, setReportData]   = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [precincts, setPrecincts]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, precinctsRes] = await Promise.all([
        fetch('/api/email-analytics'),
        fetch('/api/precincts'),
      ]);
      const analyticsData = await analyticsRes.json();
      const precinctsData = await precinctsRes.json();

      const data = Array.isArray(analyticsData) ? analyticsData : [];
      setReportData(data);
      setFilteredData(data);
      setPrecincts(Array.isArray(precinctsData) ? precinctsData : []);
    } catch (err) {
      console.error('Failed to fetch email report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Aggregate top-line stats ──
  const totals = reportData.reduce(
    (acc, j) => ({
      jobs:         acc.jobs         + 1,
      sent:         acc.sent         + (j.total_sent      || 0),
      uniqueOpens:  acc.uniqueOpens  + (j.unique_opens    || 0),
      uniqueClicks: acc.uniqueClicks + (j.unique_clicks   || 0),
      bounces:      acc.bounces      + (j.bounces         || 0),
      spam:         acc.spam         + (j.spam_complaints || 0),
    }),
    { jobs: 0, sent: 0, uniqueOpens: 0, uniqueClicks: 0, bounces: 0, spam: 0 },
  );

  const avgOpenRate  = totals.sent > 0 ? (totals.uniqueOpens  / totals.sent * 100).toFixed(1) : '0.0';
  const avgClickRate = totals.sent > 0 ? (totals.uniqueClicks / totals.sent * 100).toFixed(1) : '0.0';

  const statsList = [
    { label: 'Total Jobs',     value: totals.jobs,                    color: 'bg-[#1a56db]' },
    { label: 'Total Sent',     value: totals.sent.toLocaleString(),   color: 'bg-[#2563eb]' },
    { label: 'Unique Opens',   value: totals.uniqueOpens,             color: 'bg-[#2ecc71]' },
    { label: 'Avg Open Rate',  value: `${avgOpenRate}%`,              color: 'bg-[#10b981]' },
    { label: 'Unique Clicks',  value: totals.uniqueClicks,            color: 'bg-[#9b59b6]' },
    { label: 'Avg Click Rate', value: `${avgClickRate}%`,             color: 'bg-[#8b5cf6]' },
    { label: 'Bounces',        value: totals.bounces,                 color: 'bg-[#e74c3c]' },
  ];

  // ── Client-side filtering ──
  const handleFilter = () => {
    let data = [...reportData];

    if (filters.jobId) {
      data = data.filter((item) => String(item.job_id).includes(filters.jobId));
    }
    if (filters.status !== 'All Statuses') {
      data = data.filter((item) => item.status === filters.status);
    }
    if (filters.precinct !== 'All Precincts') {
      data = data.filter((item) => item.precinct_name === filters.precinct);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      data = data.filter((item) => new Date(item.created_at) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      data = data.filter((item) => new Date(item.created_at) <= to);
    }

    setFilteredData(data);
  };

  const handleClear = () => {
    setFilters({ jobId: '', status: 'All Statuses', precinct: 'All Precincts', dateFrom: '', dateTo: '' });
    setFilteredData(reportData);
  };

  const handlePrint = () => window.print();

  const columns = [
    'JOB ID', 'PRECINCT', 'TEMPLATE', 'PROVIDER',
    'STATUS', 'SENT', 'UNIQUE OPENS', 'OPEN RATE',
    'UNIQUE CLICKS', 'CLICK RATE', 'BOUNCES', 'CREATED', 'ACTIONS',
  ];

  return (
    <div className="space-y-6">

      {/* ── Print CSS (identical pattern to SMS report) ── */}
      <style>{`
        @media print {
          header, aside, .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .bg-brand-bg { background-color: white !important; }
          .print-header {
            display: flex !important;
            justify-content: center;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
            margin-bottom: 20px;
          }
          .shadow-sm { box-shadow: none !important; border: 1px solid #eee !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .grid { display: grid !important; }
          .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)) !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="print-header hidden">
        <h1 className="text-xl font-bold text-brand-navy">BallotDA - Civic Engagement Portal</h1>
      </div>

      {/* ── Page header ── */}
      <div className="flex justify-between items-start no-print">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Email Delivery Report</h1>
          <p className="text-brand-textMuted mt-1">
            View email job delivery statistics, open rates and click analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer size={18} />
            Print Report
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Email Delivery Report</h1>
        <p className="text-sm text-brand-textMuted">View email job delivery statistics, open rates and click analytics</p>
      </div>

      {/* ── Stats grid (7 cards — identical layout to SMS report) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statsList.map((stat, idx) => (
          <div
            key={idx}
            className={`${stat.color} rounded-lg p-5 text-white relative overflow-hidden shadow-sm`}
          >
            <p className="text-[10px] font-medium opacity-90 mb-1 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold">{stat.value}</p>
            <BarChart2 size={32} className="absolute top-2 right-2 opacity-20" />
          </div>
        ))}
      </div>

      {/* ── Filters card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden no-print">
        <div className="bg-[#1a56db] px-6 py-4 flex items-center gap-2">
          <Search size={20} className="text-white" />
          <h3 className="font-bold text-white">Filters</h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Job ID */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Job ID</label>
              <input
                type="text"
                placeholder="Job ID"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                value={filters.jobId}
                onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
              />
            </div>
            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Status</label>
              <div className="relative">
                <select
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option>All Statuses</option>
                  <option>Pending</option>
                  <option>Processing</option>
                  <option>Completed</option>
                  <option>Failed</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {/* Precinct */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Precinct</label>
              <div className="relative">
                <select
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                  value={filters.precinct}
                  onChange={(e) => setFilters({ ...filters, precinct: e.target.value })}
                >
                  <option>All Precincts</option>
                  {precincts.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Date From */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />
            </div>
            {/* Date To */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />
            </div>
            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleFilter}
                className="flex-1 py-3 bg-[#1a56db] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Search size={18} />
                Filter
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-3 bg-white border border-gray-300 text-brand-textPrimary rounded-lg font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <X size={18} />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Job-wise statistics table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="bg-[#1a56db] px-6 py-4">
          <h3 className="font-bold text-white text-lg">Job-Wise Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((head) => (
                  <th
                    key={head}
                    className="px-6 py-4 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-10 text-center text-brand-textSecondary animate-pulse font-medium">
                    Loading report data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-10 text-center text-brand-textSecondary font-medium">
                    No records found
                  </td>
                </tr>
              ) : filteredData.map((row) => (
                <tr key={row.job_id} className="hover:bg-gray-50 transition-colors">

                  {/* JOB ID */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-gray-100 text-brand-textPrimary px-2 py-1 rounded text-xs font-bold">
                      #{row.job_id}
                    </span>
                  </td>

                  {/* PRECINCT */}
                  <td className="px-6 py-4 text-sm text-brand-textPrimary font-medium max-w-xs truncate">
                    {row.precinct_name || '—'}
                  </td>

                  {/* TEMPLATE */}
                  <td className="px-6 py-4 text-sm text-brand-textSecondary font-medium whitespace-nowrap">
                    {row.template_name || '—'}
                  </td>

                  {/* PROVIDER */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="bg-[#e0e7ff] text-[#4338ca] px-3 py-0.5 rounded-full text-[10px] font-bold w-fit mb-1">
                        Postmark
                      </span>
                      <span className="text-[10px] text-gray-400 lowercase">
                        {row.provider_name || 'postmark'}
                      </span>
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold
                      ${row.status === 'Completed' ? 'bg-[#e6f7ef] text-[#27ae60]' :
                        row.status === 'Failed'    ? 'bg-red-50 text-red-600' :
                        row.status === 'Processing'? 'bg-blue-50 text-blue-600' :
                        'bg-yellow-50 text-yellow-600'}`}>
                      {row.status}
                    </span>
                  </td>

                  {/* SENT */}
                  <td className="px-6 py-4 text-center text-sm font-bold text-brand-textPrimary whitespace-nowrap">
                    {(row.total_sent || 0).toLocaleString()}
                  </td>

                  {/* UNIQUE OPENS */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                      <span className="text-xs font-bold text-[#2ecc71]">{row.unique_opens || 0}</span>
                    </div>
                  </td>

                  {/* OPEN RATE */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold
                      ${(row.open_rate || 0) >= 25 ? 'bg-green-100 text-green-700' :
                        (row.open_rate || 0) >= 10 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>
                      {row.open_rate ?? 0}%
                    </span>
                  </td>

                  {/* UNIQUE CLICKS */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center mx-auto">
                      <span className="text-xs font-bold text-[#9b59b6]">{row.unique_clicks || 0}</span>
                    </div>
                  </td>

                  {/* CLICK RATE */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold
                      ${(row.click_rate || 0) >= 5 ? 'bg-purple-100 text-purple-700' :
                        (row.click_rate || 0) >= 2 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'}`}>
                      {row.click_rate ?? 0}%
                    </span>
                  </td>

                  {/* BOUNCES */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {row.bounces > 0 ? (
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                        <span className="text-xs font-bold text-[#e74c3c]">{row.bounces}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>

                  {/* CREATED */}
                  <td className="px-6 py-4 text-sm text-brand-textSecondary font-medium whitespace-nowrap">
                    {fmtDate(row.created_at)}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedJob(row)}
                      className="text-brand-blue hover:text-blue-700 transition-colors"
                      title="View detail"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail modal ── */}
      {selectedJob && (
        <DetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
};

export default EmailDeliveryReport;
