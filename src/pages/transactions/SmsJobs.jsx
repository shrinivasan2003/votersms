import { useState, useEffect, useCallback } from 'react';
import RepeatScheduler, { DEFAULT_REPEAT } from '../../components/shared/RepeatScheduler';

// Parse a UTC datetime string from DB (may lack 'Z') as a proper UTC Date
const parseUTC = (str) => {
  if (!str) return null;
  const s = str.includes('Z') || str.includes('+') ? str : str + 'Z';
  return new Date(s);
};

// Display a UTC datetime string in the given IANA timezone
const toLocalDisplay = (utcStr, ianaT) => {
  const d = parseUTC(utcStr);
  if (!d) return null;
  try {
    return d.toLocaleString('en-US', {
      timeZone: ianaT,
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

// Format a Date as "YYYY-MM-DDTHH:mm" in browser local time (for datetime-local min)
const toLocalISO = (d) => {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import RecipientPicker from '../../components/shared/RecipientPicker';
import { useJobPolling } from '../../hooks/useJobPolling';
import { smsJobsApi, smsTemplatesApi, smsProvidersApi } from '../../api/sms';
import { listsApi } from '../../api/lists';
import { customersApi } from '../../api/customers';

/* ── helper: display the recipient source in the table ── */
const RecipientCell = ({ row }) => {
  if (row.voter_name && row.voter_id)
    return <span className="font-medium text-brand-textPrimary">{row.voter_name}</span>;
  if (row.list_name)
    return <span className="text-brand-textPrimary">📋 {row.list_name}</span>;
  return <span className="italic text-brand-textMuted">All Recipients</span>;
};

const SmsJobs = () => {
  const [view, setView]             = useState('list');
  const [jobs, setJobs]             = useState([]);
  const [lists, setLists]           = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [providers, setProviders]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [recipient, setRecipient]   = useState({ type: 'list', precinct_id: null, list_id: null, voter_id: null });
  const [customerTz, setCustomerTz] = useState('UTC');
  const [tzShort, setTzShort]       = useState('UTC');
  const [repeat, setRepeat]         = useState({ ...DEFAULT_REPEAT });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsData, listsData, templatesData, providersData, settingsData] = await Promise.all([
        smsJobsApi.list(),
        listsApi.list(),
        smsTemplatesApi.list(),
        smsProvidersApi.list(),
        customersApi.getMySettings(),
      ]);
      setJobs(Array.isArray(jobsData)           ? jobsData       : []);
      setLists(Array.isArray(listsData)         ? listsData      : []);
      setTemplates(Array.isArray(templatesData) ? templatesData  : []);
      setProviders(Array.isArray(providersData) ? providersData  : []);
      if (settingsData?.timezone) {
        setCustomerTz(settingsData.timezone);
        setTzShort(settingsData.timezone_short?.[settingsData.timezone] || settingsData.timezone);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh — only re-fetches the jobs list (no loading spinner)
  const refreshJobs = useCallback(async () => {
    try {
      const data = await smsJobsApi.list();
      if (Array.isArray(data)) setJobs(data);
    } catch { /* silent */ }
  }, []);

  useJobPolling(refreshJobs);

  useEffect(() => { fetchData(); }, []);

  const fmtDt = (d) => toLocalDisplay(d, customerTz);

  const columns = [
    { header: 'ID',         render: (row) => `#${row.id}` },
    { header: 'RECIPIENTS', render: (row) => <RecipientCell row={row} /> },
    { header: 'TEMPLATE',   accessor: 'template_name' },
    { header: 'PROVIDER',   accessor: 'provider_name' },
    { header: 'COUNT',      render: (row) => `${row.recipients || 0}` },
    { header: 'STATUS',     render: (row) => {
        const v = row.status === 'Completed' ? 'success' : row.status === 'Failed' ? 'danger' : 'warning';
        return <Badge variant={v}>{row.status}</Badge>;
    }},
    { header: 'SCHEDULED', render: (row) => {
        const every = row.repeat_every || 1;
        const repeatLabels = {
          alternateday: 'Alt. day', daily: `Every ${every > 1 ? every+'d' : 'day'}`,
          weekly: `Every ${every > 1 ? every+'w' : 'week'}`, monthly: `Every ${every > 1 ? every+'mo' : 'month'}`,
          quarterly: 'Quarterly', yearly: 'Yearly',
        };
        const dt = fmtDt(row.scheduled_at);
        return (
          <div className="text-xs">
            {dt ? (
              <span className={`font-medium ${parseUTC(row.scheduled_at) > new Date() ? 'text-amber-600' : 'text-brand-textSecondary'}`}>
                {dt}{tzShort && <span className="ml-1 text-[10px] text-gray-400">({tzShort})</span>}
              </span>
            ) : (
              <span className="text-gray-400 italic">Immediate</span>
            )}
            {row.repeat_type && (
              <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full whitespace-nowrap">
                ↺ {repeatLabels[row.repeat_type] || row.repeat_type}
              </span>
            )}
          </div>
        );
    }},
    { header: 'CREATED', accessor: 'created_at' },
  ];

  const handleBack = () => { setView('list'); setSelectedJob(null); setRepeat({ ...DEFAULT_REPEAT }); };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await smsJobsApi.remove(id);
      fetchData();
    } catch (err) { alert(err.message || 'Delete failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    if (!fd.get('template_id') || !fd.get('provider_id')) {
      alert('Please select a Template and Provider.');
      return;
    }
    if (recipient.type === 'individual' && !recipient.voter_id) {
      alert('Please search and select an individual recipient.');
      return;
    }

    const isRepeat   = repeat.enabled;
    const repeatType = repeat.type;

    const data = {
      precinct_id:  recipient.type === 'precinct'   ? (recipient.precinct_id || null) : null,
      list_id:      recipient.type === 'list'        ? (recipient.list_id     || null) : null,
      voter_id:     recipient.type === 'individual'  ? (recipient.voter_id    || null) : null,
      template_id:  fd.get('template_id'),
      provider_id:  fd.get('provider_id') || null,
      scheduled_at: isRepeat ? repeat.scheduledAt : (fd.get('scheduled_at') || null),
      repeat_type:  isRepeat ? repeatType : null,
      repeat_every: isRepeat ? (repeatType === 'quarterly' ? 3 : repeat.every) : null,
      repeat_days:  isRepeat && repeatType === 'weekly' ? JSON.stringify([repeat.day.toLowerCase()]) : null,
      repeat_time:  isRepeat ? repeat.time   : null,
      repeat_until: isRepeat && repeat.untilType === 'date' ? repeat.untilDate : null,
      repeat_dom:   isRepeat && ['monthly','quarterly','yearly'].includes(repeatType) ? repeat.dom : null,
      repeat_month: isRepeat && repeatType === 'yearly' ? repeat.monthNum : null,
    };

    try {
      await smsJobsApi.create(data);
      fetchData();
      handleBack();
    } catch (err) { alert(err.message || 'Failed to create job'); }
  };

  /* ── Create form ── */
  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Create SMS Job</h1>
            <p className="text-sm text-brand-textMuted mt-1">Create a new SMS messaging job</p>
          </div>
          <button onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors">
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4 sm:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Recipient source */}
            <RecipientPicker
              lists={lists}
              channel="sms"
              value={recipient}
              onChange={setRecipient}
            />

            {/* Template */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">SMS Template *</label>
              <div className="relative">
                <select name="template_id" required
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all">
                  <option value="">Select Template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">SMS Provider *</label>
              <div className="relative">
                <select name="provider_id" required
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all">
                  <option value="">Select Provider</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Schedule / Repeat */}
            <RepeatScheduler value={repeat} onChange={setRepeat} tzShort={tzShort} />

            {!repeat.enabled && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">
                  Scheduled At (Optional)
                  {tzShort && <span className="ml-2 text-xs font-normal text-brand-textMuted">— times in {tzShort}</span>}
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  min={toLocalISO(new Date(Date.now() + 60000))}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-xs text-brand-textMuted">Leave empty to send immediately. Must be a future time if set.</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3.5">
                {repeat.enabled ? '↺ Create Recurring Job' : 'Create Job'}
              </Button>
              <Button type="button" variant="outlined" onClick={handleBack} className="flex-1 py-3.5 bg-gray-200">Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">SMS Jobs</h1>
          <p className="text-sm text-brand-textMuted mt-1">Manage SMS messaging jobs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setRecipient({ type: 'precinct', precinct_id: null, list_id: null, voter_id: null }); setView('add'); }}
            className="rounded-lg px-6 py-2.5 font-semibold">
            + Create Job
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={jobs}
        onEdit={selectedJob => { setSelectedJob(selectedJob); setView('edit'); }}
        onDelete={user?.role?.toLowerCase() === 'admin' ? (row) => handleDelete(row.id) : null}
        emptyMessage={loading ? 'Loading jobs…' : 'No SMS jobs found'}
      />
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

export default SmsJobs;
