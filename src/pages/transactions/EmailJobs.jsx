import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart2, Paperclip, Trash2, Upload } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import RecipientPicker from '../../components/shared/RecipientPicker';
import EmailAnalyticsModal from '../../components/shared/EmailAnalyticsModal';
import RepeatScheduler, { DEFAULT_REPEAT } from '../../components/shared/RepeatScheduler';
import { useJobPolling } from '../../hooks/useJobPolling';
import { emailJobsApi, emailTemplatesApi, emailProvidersApi, emailAnalyticsApi, emailAttachmentsApi } from '../../api/email';
import { listsApi } from '../../api/lists';
import { customersApi } from '../../api/customers';

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
  const every = row.repeat_every || 1;
  const labels = {
    alternateday: 'Alt. day',
    daily:        `Every ${every > 1 ? every + 'd' : 'day'}`,
    weekly:       `Every ${every > 1 ? every + 'w' : 'week'}`,
    monthly:      `Every ${every > 1 ? every + 'mo' : 'month'}`,
    quarterly:    'Quarterly',
    yearly:       'Yearly',
  };
  return (
    <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full whitespace-nowrap">
      ↺ {labels[row.repeat_type] || row.repeat_type}
    </span>
  );
};

// ── Timezone / date helpers ───────────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0');
const toLocalISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const parseUTC = (str) => {
  if (!str) return null;
  const s = str.includes('Z') || str.includes('+') ? str : str + 'Z';
  return new Date(s);
};

const toLocalDisplay = (utcStr, ianaT) => {
  const d = parseUTC(utcStr);
  if (!d) return null;
  try {
    return d.toLocaleString('en-US', {
      timeZone: ianaT, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

// ── Main component ────────────────────────────────────────────────────────────
// ── Attachment manager view ───────────────────────────────────────────────────
const AttachmentManager = ({ job, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const data = await emailAttachmentsApi.list(job.id);
      setAttachments(Array.isArray(data) ? data : []);
    } catch { setAttachments([]); }
  };

  useEffect(() => { load(); }, [job.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      for (const file of files) {
        await emailAttachmentsApi.upload(job.id, file);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (attachId, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    try {
      await emailAttachmentsApi.remove(job.id, attachId);
      await load();
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const fileIcon = (ct) => {
    if (ct?.includes('pdf'))   return '📄';
    if (ct?.includes('image')) return '🖼️';
    if (ct?.includes('word') || ct?.includes('msword')) return '📝';
    if (ct?.includes('excel') || ct?.includes('spreadsheet')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Attachments</h1>
          <p className="text-sm text-brand-textMuted mt-1">
            Job #{job.id}{job.name ? ` — ${job.name}` : ''}
            &nbsp;·&nbsp;These files are sent to every recipient.
          </p>
        </div>
        <button onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors">
          ← Back to Jobs
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border p-6 max-w-2xl">
        {/* Upload area */}
        <div
          className="border-2 border-dashed border-brand-border rounded-lg p-8 text-center cursor-pointer hover:border-brand-blue transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm font-medium text-brand-textPrimary">Click to upload files</p>
          <p className="text-xs text-brand-textMuted mt-1">PDF, Images, Word, Excel, Text · Max 10 MB each</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleUpload}
          />
        </div>

        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-brand-blue">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full" />
            Uploading…
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {/* File list */}
        {attachments.length > 0 && (
          <ul className="mt-6 space-y-2">
            {attachments.map(att => (
              <li key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{fileIcon(att.content_type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-textPrimary truncate max-w-xs">{att.filename}</p>
                    <p className="text-xs text-brand-textMuted">{fmtSize(att.file_size)} · {att.content_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(att.id, att.filename)}
                  className="ml-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove attachment"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {attachments.length === 0 && !uploading && (
          <p className="mt-6 text-sm text-brand-textMuted text-center">No attachments yet.</p>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const EmailJobs = () => {
  const [view, setView]             = useState('list');
  const [attachJob, setAttachJob]   = useState(null);
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

  // Customer timezone (IANA name + short label)
  const [customerTz, setCustomerTz] = useState('UTC');
  const [tzShort, setTzShort]       = useState('UTC');

  // Repeat state (all fields managed by RepeatScheduler)
  const [repeat, setRepeat] = useState({ ...DEFAULT_REPEAT });

  // Tab filter for list view
  const [tab, setTab] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsData, listsData, templatesData, providersData, settingsData] = await Promise.all([
        emailJobsApi.list(),
        listsApi.list(),
        emailTemplatesApi.list(),
        emailProvidersApi.list(),
        customersApi.getMySettings(),
      ]);
      if (settingsData?.timezone) {
        setCustomerTz(settingsData.timezone);
        setTzShort(settingsData.timezone_short?.[settingsData.timezone] || settingsData.timezone);
      }
      setJobs(Array.isArray(jobsData)           ? jobsData      : []);
      setLists(Array.isArray(listsData)         ? listsData     : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setProviders(Array.isArray(providersData) ? providersData : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
    // Load analytics separately — it's a heavy query and shouldn't block the initial render
    emailAnalyticsApi.list().then(analyticsData => {
      if (Array.isArray(analyticsData)) {
        const map = {};
        analyticsData.forEach(a => { map[a.job_id] = a; });
        setAnalyticsMap(map);
      }
    }).catch(() => {});
  };

  const refreshJobs = useCallback(async () => {
    try {
      const data = await emailJobsApi.list();
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
            <div>
              <span className={parseUTC(row.scheduled_at) > new Date() ? 'text-amber-600 font-medium' : 'text-brand-textSecondary'}>
                {toLocalDisplay(row.scheduled_at, customerTz)}
              </span>
              {tzShort && <span className="ml-1 text-[10px] text-gray-400">({tzShort})</span>}
            </div>
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedJob({ job_id: row.id, template_name: row.template_name, precinct_name: row.precinct_name, list_name: row.list_name })}
              className={`p-1 rounded transition-colors ${hasSent ? 'text-[#1a56db] hover:bg-blue-50' : 'text-gray-300 hover:text-gray-400'}`}
              title="View analytics"
            >
              <BarChart2 size={16} />
            </button>
            <button
              onClick={() => setAttachJob(row)}
              className="p-1 rounded transition-colors text-gray-400 hover:text-amber-600 hover:bg-amber-50"
              title="Manage attachments"
            >
              <Paperclip size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  const handleBack = () => {
    setView('list');
    setRepeat({ ...DEFAULT_REPEAT });
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete job #${row.id}?`)) return;
    try {
      await emailJobsApi.remove(row.id);
      fetchData();
    } catch (_err) { }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    if (!fd.get('template_id')) { alert('Please select an Email Template.'); return; }
    if (recipient.type === 'individual' && !recipient.voter_id) {
      alert('Please search and select an individual recipient.'); return;
    }
    if (repeat.enabled && !repeat.scheduledAt) {
      alert('Please set a first run date/time for the recurring job.'); return;
    }

    const isRepeat   = repeat.enabled;
    const repeatType = repeat.type;

    const data = {
      name:         fd.get('job_name') || null,
      precinct_id:  recipient.type === 'precinct'  ? (recipient.precinct_id || null) : null,
      list_id:      recipient.type === 'list'       ? (recipient.list_id     || null) : null,
      voter_id:     recipient.type === 'individual' ? (recipient.voter_id    || null) : null,
      template_id:  fd.get('template_id'),
      provider_id:  fd.get('provider_id') || null,
      scheduled_at: isRepeat ? repeat.scheduledAt : (fd.get('scheduled_at') || null),
      // repeat fields
      repeat_type:  isRepeat ? repeatType : null,
      repeat_every: isRepeat ? (repeatType === 'quarterly' ? 3 : repeat.every) : null,
      repeat_days:  isRepeat && repeatType === 'weekly' ? JSON.stringify([repeat.day.toLowerCase()]) : null,
      repeat_time:  isRepeat ? repeat.time   : null,
      repeat_until: isRepeat && repeat.untilType === 'date' ? repeat.untilDate : null,
      repeat_dom:   isRepeat && ['monthly','quarterly','yearly'].includes(repeatType) ? repeat.dom : null,
      repeat_month: isRepeat && repeatType === 'yearly' ? repeat.monthNum : null,
    };

    try {
      await emailJobsApi.create(data);
      fetchData();
      handleBack();
    } catch (err) { alert(err.message || 'Failed to create job'); }
  };

  // ── Attachment manager ────────────────────────────────────────────────────
  if (attachJob) {
    return <AttachmentManager job={attachJob} onBack={() => setAttachJob(null)} />;
  }

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

            {/* ── Repeat scheduler ─────────────────────────────────────────── */}
            <RepeatScheduler value={repeat} onChange={setRepeat} tzShort={tzShort} />

            {/* One-time schedule (shown only when repeat is OFF) */}
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
                <p className="text-xs text-brand-textMuted">Leave empty to send immediately.</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3.5">
                {repeat.enabled ? '↺ Create Recurring Job' : 'Create Job'}
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

  // ── Tab filtering ─────────────────────────────────────────────────────────
  const completedJobs = jobs.filter(j => j.status === 'Completed');
  const pendingJobs   = jobs.filter(j => j.status !== 'Completed');
  const visibleJobs   = tab === 'completed' ? completedJobs : tab === 'pending' ? pendingJobs : jobs;

  const tabs = [
    { key: 'all',       label: 'All Jobs',       count: jobs.length },
    { key: 'pending',   label: 'Pending Jobs',   count: pendingJobs.length },
    { key: 'completed', label: 'Completed Jobs',  count: completedJobs.length },
  ];

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
            onClick={() => { setRecipient({ type: 'list', precinct_id: null, list_id: null, voter_id: null }); setRepeat({ ...DEFAULT_REPEAT }); setView('add'); }}
            className="rounded-lg px-6 py-2.5 font-semibold"
          >
            + Create Job
          </Button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-brand-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-brand-textMuted hover:text-brand-textPrimary'
            }`}
          >
            {t.label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-blue-100 text-brand-blue' : 'bg-gray-100 text-gray-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={visibleJobs}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading jobs…' : `No ${tab === 'all' ? 'email' : tab} jobs found`}
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
