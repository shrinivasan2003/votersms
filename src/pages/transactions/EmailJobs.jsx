import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import RecipientPicker from '../../components/shared/RecipientPicker';
import { useJobPolling } from '../../hooks/useJobPolling';

const RecipientCell = ({ row }) => {
  if (row.voter_name && row.voter_id)
    return <span className="font-medium text-brand-textPrimary">{row.voter_name}</span>;
  if (row.list_name)
    return <span className="text-brand-textPrimary">📋 {row.list_name}</span>;
  return <span className="italic text-brand-textMuted">All Recipients</span>;
};

const EmailJobs = () => {
  const [view, setView]           = useState('list');
  const [jobs, setJobs]           = useState([]);
  const [lists, setLists]         = useState([]);
  const [templates, setTemplates] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [recipient, setRecipient] = useState({ type: 'list', precinct_id: null, list_id: null, voter_id: null });

  const API_URL = '/api/email-jobs';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, listsRes, templatesRes, providersRes] = await Promise.all([
        fetch(API_URL),
        fetch('/api/contact-lists'),
        fetch('/api/email-templates'),
        fetch('/api/email-providers'),
      ]);
      const [jobsData, listsData, templatesData, providersData] = await Promise.all([
        jobsRes.json(), listsRes.json(), templatesRes.json(), providersRes.json(),
      ]);
      setJobs(Array.isArray(jobsData)           ? jobsData       : []);
      setLists(Array.isArray(listsData)         ? listsData      : []);
      setTemplates(Array.isArray(templatesData) ? templatesData  : []);
      setProviders(Array.isArray(providersData) ? providersData  : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh — only re-fetches the jobs list (no loading spinner)
  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
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
    { header: 'CREATED', accessor: 'created_at' },
  ];

  const handleBack = () => setView('list');

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

    if (!fd.get('template_id')) {
      alert('Please select an Email Template.');
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
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) { fetchData(); handleBack(); }
      else alert((await res.json()).detail || 'Failed to create job');
    } catch (err) { console.error(err); }
  };

  /* ── Create form ── */
  if (view === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">Create Email Job</h1>
            <p className="text-brand-textMuted mt-1">Create a new email messaging job</p>
          </div>
          <button onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors">
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border p-8 max-w-7xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Recipient source — defaults to List tab for email */}
            <RecipientPicker
              lists={lists}
              channel="email"
              value={recipient}
              onChange={setRecipient}
            />

            {/* Template */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Email Template *</label>
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
              <label className="block text-sm font-bold text-brand-textPrimary">Email Provider (Optional)</label>
              <div className="relative">
                <select name="provider_id"
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white appearance-none transition-all">
                  <option value="">Use Default Provider</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Scheduled At (Optional)</label>
              <input type="datetime-local" name="scheduled_at"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all" />
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Email Jobs</h1>
          <p className="text-brand-textMuted mt-1">Manage email messaging jobs</p>
        </div>
        <Button onClick={() => { setRecipient({ type: 'list', precinct_id: null, list_id: null, voter_id: null }); setView('add'); }}
          className="rounded-lg px-6 py-2.5 font-semibold">
          + Create Job
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={jobs}
        onEdit={() => {}}
        onDelete={handleDelete}
        emptyMessage={loading ? 'Loading jobs…' : 'No email jobs found'}
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

export default EmailJobs;
