import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Trash2, RefreshCw } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import RecipientPicker from '../../components/shared/RecipientPicker';
import EmailAnalyticsModal from '../../components/shared/EmailAnalyticsModal';
import { useJobPolling } from '../../hooks/useJobPolling';

const RecipientCell = ({ row }) => {
  if (row.voter_name && row.voter_id)
    return <span className="font-medium text-brand-textPrimary">{row.voter_name}</span>;
  if (row.list_name)
    return <span className="text-brand-textPrimary">📋 {row.list_name}</span>;
  return <span className="italic text-brand-textMuted">All Recipients</span>;
};

const OpenRateBadge = ({ rate }) => {
  if (rate === undefined || rate === null)
    return <span className="text-gray-300 text-xs">—</span>;
  const cls =
    rate >= 25 ? 'bg-green-100 text-green-700' :
    rate >= 10 ? 'bg-yellow-100 text-yellow-700' :
                 'bg-gray-100 text-gray-500';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{rate}%</span>;
};

const BounceBadge = ({ count }) => {
  if (!count) return <span className="text-gray-300 text-xs">—</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">{count}</span>;
};

const RepeatBadge = ({ row }) => {
  if (!row.repeat_type) return null;
  const label = row.repeat_type === 'daily'
    ? `Every ${row.repeat_every > 1 ? row.repeat_every + 'd' : 'day'}`
    : `Every ${row.repeat_every > 1 ? row.repeat_every + 'w' : 'week'}`;
  return (
    <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full whitespace-nowrap">
      ↺ {label}
    </span>
  );
};

// ── Weekday picker helpers ────────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const getNextOccurrence = (dayName, timeStr) => {
  const idx = DAYS.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  if (idx === -1) return '';
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const now = new Date();
  // JS: 0=Sun,1=Mon...6=Sat → our DAYS: 0=Mon...6=Sun
  const jsTarget = (idx + 1) % 7; // Mon=1, Tue=2, ... Sun=0
  let diff = (jsTarget - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7; // always next week, not today
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  result.setHours(h, m, 0, 0);
  return result.toISOString().slice(0, 16);
};

const getNextDaily = (everyDays, timeStr) => {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const result = new Date();
  result.setDate(result.getDate() + (everyDays || 1));
  result.setHours(h, m, 0, 0);
  return result.toISOString().slice(0, 16);
};

// ── Main component ────────────────────────────────────────────────────────────
const EmailJobs = () => {
  const [view, setView]             = useState('list');
  const [jobs, setJobs]             = useState([]);
  const [lists, setLists]           = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [providers, setProviders]   = useState([]);
  const [analyticsMap, setAnalyticsMap] = useState({});
  const [loading, setLoading]       = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [recipient, setRecipient]   = useState({
    type: 'list', precinct_id: null, list_id: null, voter_id: null,
  });

  // Repeat state
  const [repeatEnabled, setRepeatEnabled]   = useState(false);
  const [repeatType, setRepeatType]         = useState('weekly');  // 'daily' | 'weekly'
  const [repeatEvery, setRepeatEvery]       = useState(1);
  const [repeatDay, setRepeatDay]           = useState('Friday');
  const [repeatTime, setRepeatTime]         = useState('09:00');
  const [repeatUntilType, setRepeatUntilType] = useState('never'); // 'never' | 'date'
  const [repeatUntilDate, setRepeatUntilDate] = useState('');
  const [scheduledAt, setScheduledAt]       = useState('');

  const API_URL = '/api/email-jobs';

  // Auto-compute first run when repeat settings change
  useEffect(() => {
    if (!repeatEnabled) return;
    if (repeatType === 'weekly') {
      setScheduledAt(getNextOccurrence(repeatDay, repeatTime));
    } else {
      setScheduledAt(getNextDaily(repeatEvery, repeatTime));
    }
  }, [repeatEnabled, repeatType, repeatEvery, repeatDay, repeatTime]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, listsRes, templatesRes, providersRes, analyticsRes] = await Promise.all([
        fetch(API_URL),
        fetch('/api/contact-lists'),
        fetch('/api/email-templates'),
        fetch('/api/email-providers'),
        fetch('/api/email-analytics'),
      ]);
      const [jobsData, listsData, templatesData, providersData, analyticsData] = await Promise.all([
        jobsRes.json(), listsRes.json(), templatesRes.json(), providersRes.json(), analyticsRes.json(),
      ]);
      setJobs(Array.isArray(jobsData)           ? jobsData      : []);
      setLists(Array.isArray(listsData)         ? listsData     : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setProviders(Array.isArray(providersData) ? providersData : []);
      if (Array.isArray(analyticsData)) {
        const map = {};
        analyticsData.forEach(a => { map[a.job_id] = a; });
        setAnalyticsMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch email jobs data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshJobs = useCallback(async () => {
    try {
      const res  = await fetch(API_URL);
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);
    } catch { /* silent */ }
  }, []);

  useJobPolling(refreshJobs);
  useEffect(() => { fetchData(); }, []);

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    { header: 'ID',         render: (row) => (
        <span className="font-mono text-xs">
          #{row.id}
          {row.parent_job_id && (
            <span className="ml-1 text-[10px] text-violet-500" title={`Recurring — parent #${row.parent_job_id}`}>↺</span>
          )}
        </span>
      )
    },
    { header: 'NAME / RECIPIENTS', render: (row) => (
        <div>
          {row.name && <p className="text-xs font-bold text-brand-textPrimary truncate max-w-[180px]">{row.name}</p>}
          <RecipientCell row={row} />
        </div>
      )
    },
    { header: 'TEMPLATE',   accessor: 'template_name' },
    { header: 'PROVIDER',   accessor: 'provider_name' },
    { header: 'COUNT',      render: (row) => row.recipients || 0 },
    {
      header: 'STATUS',
      render: (row) => (
        <Badge variant={row.status === 'Completed' ? 'success' : row.status === 'Failed' ? 'danger' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
    { header: 'OPEN RATE',  render: (row) => <OpenRateBadge rate={analyticsMap[row.id]?.open_rate} /> },
    { header: 'BOUNCES',    render: (row) => <BounceBadge count={analyticsMap[row.id]?.bounces} /> },
    {
      header: 'SCHEDULE',
      render: (row) => (
        <div className="text-xs">
          {row.scheduled_at ? (
            <span className={new Date(row.scheduled_at) > new Date() ? 'text-amber-600 font-medium' : 'text-brand-textSecondary'}>
              {new Date(row.scheduled_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </span>
          ) : (
            <span className="text-gray-400 italic">Immediate</span>
          )}
          <RepeatBadge row={row} />
        </div>
      ),
    },
    { header: 'CREATED',    accessor: 'created_at' },
    {
      header: 'ANALYTICS',
      render: (row) => {
        const a = analyticsMap[row.id];
        const hasSent = a && (a.total_sent > 0 || a.unique_opens > 0);
        return (
          <button
            onClick={() => setSelectedJob({ job_id: row.id, template_name: row.template_name, precinct_name: row.precinct_name, list_name: row.list_name })}
            className={`p-1 rounded transition-colors ${hasSent ? 'text-[#1a56db] hover:bg-blue-50' : 'text-gray-300 hover:text-gray-400'}`}
          >
            <BarChart2 size={16} />
          </button>
        );
      },
    },
  ];

  const handleBack = () => {
    setView('list');
    setRepeatEnabled(false);
    setRepeatType('weekly');
    setRepeatEvery(1);
    setRepeatDay('Friday');
    setRepeatTime('09:00');
    setRepeatUntilType('never');
    setRepeatUntilDate('');
    setScheduledAt('');
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete job #${row.id}?`)) return;
    try {
      const res = await fetch(`${API_URL}/${row.id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    if (!fd.get('template_id')) { alert('Please select an Email Template.'); return; }
    if (recipient.type === 'individual' && !recipient.voter_id) {
      alert('Please search and select an individual recipient.'); return;
    }
    if (repeatEnabled && !scheduledAt) {
      alert('Please set a first run date/time for the recurring job.'); return;
    }

    const data = {
      name:         fd.get('job_name') || null,
      precinct_id:  recipient.type === 'precinct'  ? (recipient.precinct_id || null) : null,
      list_id:      recipient.type === 'list'       ? (recipient.list_id     || null) : null,
      voter_id:     recipient.type === 'individual' ? (recipient.voter_id    || null) : null,
      template_id:  fd.get('template_id'),
      provider_id:  fd.get('provider_id') || null,
      scheduled_at: repeatEnabled ? scheduledAt : (fd.get('scheduled_at') || null),
      // repeat fields
      repeat_type:  repeatEnabled ? repeatType  : null,
      repeat_every: repeatEnabled ? repeatEvery : null,
      repeat_days:  repeatEnabled && repeatType === 'weekly' ? JSON.stringify([repeatDay.toLowerCase()]) : null,
      repeat_time:  repeatEnabled ? repeatTime  : null,
      repeat_until: repeatEnabled && repeatUntilType === 'date' ? repeatUntilDate : null,
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) { fetchData(); handleBack(); }
      else alert((await res.json()).detail || 'Failed to create job');
    } catch (err) { console.error(err); }
  };

  // ── Repeat preview label ───────────────────────────────────────────────────
  const repeatPreview = repeatEnabled
    ? repeatType === 'weekly'
      ? `Every ${repeatEvery > 1 ? repeatEvery + ' weeks' : 'week'} on ${repeatDay} at ${repeatTime}`
      : `Every ${repeatEvery > 1 ? repeatEvery + ' days' : 'day'} at ${repeatTime}`
    : '';

  // ── Create form ───────────────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Create Email Job</h1>
            <p className="text-sm text-brand-textMuted mt-1">Send once or set a repeating schedule</p>
          </div>
          <button onClick={handleBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors">
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Job name */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Job Name (Optional)</label>
              <input
                type="text"
                name="job_name"
                placeholder="e.g. Team Friday Report Reminder"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
              />
            </div>

            <RecipientPicker lists={lists} channel="email" value={recipient} onChange={setRecipient} />

            {/* Template */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Email Template *</label>
              <div className="relative">
                <select name="template_id" required className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all">
                  <option value="">Select Template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Email Provider (Optional)</label>
              <div className="relative">
                <select name="provider_id" className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all">
                  <option value="">Use Default Provider</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* ── Repeat section ───────────────────────────────────────────── */}
            <div className="border border-brand-border rounded-xl overflow-hidden">
              {/* Toggle header */}
              <div
                className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${repeatEnabled ? 'bg-violet-50' : 'bg-gray-50'}`}
                onClick={() => setRepeatEnabled(v => !v)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">↺</span>
                  <div>
                    <p className="text-sm font-bold text-brand-textPrimary">Repeat this job</p>
                    {repeatEnabled && repeatPreview && (
                      <p className="text-xs text-violet-600 font-medium mt-0.5">{repeatPreview}</p>
                    )}
                    {!repeatEnabled && <p className="text-xs text-brand-textMuted">Send once at a scheduled time or repeat automatically</p>}
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${repeatEnabled ? 'bg-violet-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${repeatEnabled ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              {repeatEnabled && (
                <div className="p-5 space-y-5 border-t border-brand-border">
                  {/* Type: Daily / Weekly */}
                  <div className="flex gap-3">
                    {['daily','weekly'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRepeatType(t)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all capitalize ${
                          repeatType === t
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-brand-textPrimary border-brand-border hover:border-violet-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Every N + Time */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-[120px]">
                      <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">
                        Every
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={repeatEvery}
                          onChange={e => setRepeatEvery(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                        />
                        <span className="text-sm text-brand-textSecondary">
                          {repeatType === 'daily' ? (repeatEvery === 1 ? 'day' : 'days') : (repeatEvery === 1 ? 'week' : 'weeks')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 flex-1 min-w-[120px]">
                      <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">
                        At time
                      </label>
                      <input
                        type="time"
                        value={repeatTime}
                        onChange={e => setRepeatTime(e.target.value)}
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                      />
                    </div>
                  </div>

                  {/* Weekly day picker */}
                  {repeatType === 'weekly' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Run on</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setRepeatDay(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              repeatDay === d
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-brand-textPrimary border-brand-border hover:border-violet-300'
                            }`}
                          >
                            {d.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ends */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wide">Ends</label>
                    <div className="flex gap-4 items-center flex-wrap">
                      {['never','date'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={repeatUntilType === opt}
                            onChange={() => setRepeatUntilType(opt)}
                            className="accent-violet-600"
                          />
                          <span className="text-sm font-medium text-brand-textPrimary capitalize">
                            {opt === 'never' ? 'Never' : 'On date'}
                          </span>
                        </label>
                      ))}
                      {repeatUntilType === 'date' && (
                        <input
                          type="date"
                          value={repeatUntilDate}
                          onChange={e => setRepeatUntilDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 10)}
                          className="rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                        />
                      )}
                    </div>
                  </div>

                  {/* First run preview */}
                  <div className="bg-violet-50 border border-violet-100 rounded-lg px-4 py-3">
                    <p className="text-xs text-violet-500 font-medium mb-1">First run</p>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="text-sm font-bold text-violet-800 bg-transparent border-none outline-none w-full"
                    />
                    <p className="text-[10px] text-violet-400 mt-1">Auto-computed from your settings. You can adjust manually.</p>
                  </div>
                </div>
              )}
            </div>

            {/* One-time schedule (shown only when repeat is OFF) */}
            {!repeatEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Scheduled At (Optional)</label>
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-xs text-brand-textMuted">Leave empty to send immediately.</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3.5">
                {repeatEnabled ? '↺ Create Recurring Job' : 'Create Job'}
              </Button>
              <Button type="button" variant="outlined" onClick={handleBack} className="flex-1 py-3.5 bg-gray-200">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Email Jobs</h1>
          <p className="text-sm text-brand-textMuted mt-1">Manage email messaging jobs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => {
              setRecipient({ type: 'list', precinct_id: null, list_id: null, voter_id: null });
              setView('add');
            }}
            className="rounded-lg px-6 py-2.5 font-semibold"
          >
            + Create Job
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={jobs}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading jobs…' : 'No email jobs found'}
      />

      {selectedJob && (
        <EmailAnalyticsModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
};

const ChevronIcon = () => (
  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
    </svg>
  </div>
);

export default EmailJobs;
