import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import RecipientPicker from '../../components/shared/RecipientPicker';
import { useJobPolling } from '../../hooks/useJobPolling';
import { whatsappJobsApi, whatsappTemplatesApi, whatsappProvidersApi } from '../../api/whatsapp';
import { listsApi } from '../../api/lists';
import { customersApi } from '../../api/customers';

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
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

// Format a Date as "YYYY-MM-DDTHH:mm" in browser local time (for datetime-local min)
const toLocalISO = (d) => {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const RecipientCell = ({ row }) => {
  if (row.voter_name && row.voter_id)
    return <span className="font-medium text-brand-textPrimary">{row.voter_name}</span>;
  if (row.list_name)
    return <span className="text-brand-textPrimary">📋 {row.list_name}</span>;
  return <span className="italic text-brand-textMuted">All Recipients</span>;
};

const WhatsappJobs = () => {
  const [view, setView]           = useState('list');
  const [jobs, setJobs]           = useState([]);
  const [lists, setLists]         = useState([]);
  const [templates, setTemplates] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [recipient, setRecipient] = useState({ type: 'list', precinct_id: null, list_id: null, voter_id: null });
  const [customerTz, setCustomerTz] = useState('UTC');
  const [tzShort, setTzShort]       = useState('UTC');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsData, listsData, templatesData, providersData, settingsData] = await Promise.all([
        whatsappJobsApi.list(),
        listsApi.list(),
        whatsappTemplatesApi.list(),
        whatsappProvidersApi.list(),
        customersApi.getMySettings(),
      ]);
      setJobs(Array.isArray(jobsData)           ? jobsData      : []);
      setLists(Array.isArray(listsData)         ? listsData     : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setProviders(Array.isArray(providersData) ? providersData : []);
      if (settingsData?.timezone) {
        setCustomerTz(settingsData.timezone);
        setTzShort(settingsData.timezone_short?.[settingsData.timezone] || settingsData.timezone);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const refreshJobs = useCallback(async () => {
    try {
      const data = await whatsappJobsApi.list();
      if (Array.isArray(data)) setJobs(data);
    } catch { /* silent */ }
  }, []);

  useJobPolling(refreshJobs);

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'ID',         render: (row) => `#${row.id}` },
    { header: 'RECIPIENTS', render: (row) => <RecipientCell row={row} /> },
    { header: 'TEMPLATE',   accessor: 'template_name' },
    { header: 'PROVIDER',   accessor: 'provider_name' },
    { header: 'COUNT',      render: (row) => row.recipients || 0 },
    { header: 'STATUS',     render: (row) => (
        <Badge variant={row.status === 'Completed' ? 'success' : row.status === 'Failed' ? 'danger' : 'warning'}>
          {row.status}
        </Badge>
    )},
    { header: 'SCHEDULED', render: (row) => {
        if (!row.scheduled_at) return <span className="text-xs text-gray-400 italic">Immediate</span>;
        const isPast = parseUTC(row.scheduled_at) <= new Date();
        return (
          <span className={`text-xs font-medium ${isPast ? 'text-brand-textSecondary' : 'text-amber-600'}`}>
            {toLocalDisplay(row.scheduled_at, customerTz)}
            {tzShort && <span className="ml-1 text-[10px] text-gray-400">({tzShort})</span>}
          </span>
        );
    }},
    { header: 'CREATED', accessor: 'created_at' },
  ];

  const handleBack = () => setView('list');

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete WhatsApp job #${row.id}?`)) return;
    try {
      await whatsappJobsApi.remove(row.id);
      fetchData();
    } catch (_err) { }
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

    const data = {
      precinct_id:  recipient.type === 'precinct'   ? (recipient.precinct_id || null) : null,
      list_id:      recipient.type === 'list'        ? (recipient.list_id     || null) : null,
      voter_id:     recipient.type === 'individual'  ? (recipient.voter_id    || null) : null,
      template_id:  fd.get('template_id'),
      provider_id:  fd.get('provider_id') || null,
      scheduled_at: fd.get('scheduled_at') || null,
    };

    try {
      await whatsappJobsApi.create(data);
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
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Create WhatsApp Job</h1>
            <p className="text-sm text-brand-textMuted mt-1">Create a new WhatsApp messaging job</p>
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
              channel="whatsapp"
              value={recipient}
              onChange={setRecipient}
            />

            {/* Template */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">WhatsApp Template *</label>
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
              <label className="block text-sm font-bold text-brand-textPrimary">WhatsApp Provider *</label>
              <div className="relative">
                <select name="provider_id" required
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all">
                  <option value="">Select Provider</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">
                Scheduled At (Optional)
                {tzShort && <span className="ml-2 text-xs font-normal text-brand-textMuted">— times in {tzShort}</span>}
              </label>
              <input type="datetime-local" name="scheduled_at"
                min={toLocalISO(new Date(Date.now() + 60000))}
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all" />
              <p className="text-xs text-brand-textMuted">Leave empty to send immediately.</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 py-3.5">Create Job</Button>
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
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">WhatsApp Jobs</h1>
          <p className="text-sm text-brand-textMuted mt-1">Manage WhatsApp messaging jobs</p>
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
        onEdit={() => {}}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading jobs…' : 'No WhatsApp jobs found'}
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

export default WhatsappJobs;
