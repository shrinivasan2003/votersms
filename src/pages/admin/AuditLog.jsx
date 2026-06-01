/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Building2, RefreshCw, Search,
  Send, Mail, MessageCircle, MessageSquare, Users,
  ClipboardList, ChevronDown, ChevronRight, Loader2,
  XCircle, Clock, Trash2, Edit3, Plus, BarChart3,
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import { auditApi } from '../../api/audit';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { dateStyle: 'medium' });
};

const STATUS_CHIP = {
  Active:     'bg-green-50  text-green-700  border-green-200',
  Inactive:   'bg-gray-50   text-gray-500   border-gray-200',
  Pending:    'bg-amber-50  text-amber-700  border-amber-200',
  Processing: 'bg-blue-50   text-blue-700   border-blue-200',
  Completed:  'bg-green-50  text-green-700  border-green-200',
  Failed:     'bg-red-50    text-red-600    border-red-200',
  Paused:     'bg-orange-50 text-orange-700 border-orange-200',
};

const StatusChip = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
    {status || '—'}
  </span>
);

const ACTION_COLORS = {
  CREATE:        'bg-green-100  text-green-800',
  UPDATE:        'bg-blue-100   text-blue-800',
  DELETE:        'bg-red-100    text-red-700',
  STATUS_CHANGE: 'bg-purple-100 text-purple-800',
};

const ActionChip = ({ action }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ACTION_COLORS[action] || 'bg-gray-100 text-gray-700'}`}>
    {action === 'CREATE' && <Plus size={10} />}
    {action === 'UPDATE' && <Edit3 size={10} />}
    {action === 'DELETE' && <Trash2 size={10} />}
    {action}
  </span>
);

const ENTITY_LABELS = {
  sms_template:      'SMS Template',
  email_template:    'Email Template',
  whatsapp_template: 'WhatsApp Template',
  sms_job:           'SMS Job',
  email_job:         'Email Job',
  whatsapp_job:      'WhatsApp Job',
  contact_list:      'Contact List',
  voter:             'Voter',
};

const SummaryCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{value ?? 0}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  </div>
);

// ── Entity table (generic) ────────────────────────────────────────────────────

const EntityTable = ({ columns, rows, emptyMsg }) => {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(15);

  if (!rows?.length) {
    return <p className="py-10 text-center text-sm text-gray-400">{emptyMsg || 'No records found.'}</p>;
  }

  const sliced = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sliced.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 whitespace-nowrap">
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 border-t border-gray-50">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onSizeChange={(s) => { setPageSize(s); setPage(1); }}
          pageSizes={[15, 25, 50]}
        />
      </div>
    </div>
  );
};

// ── Audit event log row (expandable) ─────────────────────────────────────────

const AuditEventRow = ({ item }) => {
  const [open, setOpen] = useState(false);
  const hasDetails = item.old_values || item.new_values;

  const parse = (v) => {
    if (!v) return null;
    try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; }
  };

  return (
    <>
      <tr
        className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setOpen((o) => !o)}
      >
        <td className="px-3 py-2.5 whitespace-nowrap"><ActionChip action={item.action} /></td>
        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
          {ENTITY_LABELS[item.entity_type] || item.entity_type}
        </td>
        <td className="px-3 py-2.5 text-sm font-medium text-gray-800 max-w-[200px] truncate">
          {item.entity_name || `#${item.entity_id}`}
        </td>
        <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
          {item.performed_by_name || '—'}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmt(item.created_at)}</td>
        <td className="px-3 py-2.5 text-gray-300">
          {hasDetails && (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </td>
      </tr>
      {open && hasDetails && (
        <tr className="bg-gray-50/80">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parse(item.old_values) && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Before</p>
                  <pre className="bg-red-50 border border-red-100 rounded-lg p-2 overflow-x-auto text-red-800 text-[11px] font-mono">
                    {JSON.stringify(parse(item.old_values), null, 2)}
                  </pre>
                </div>
              )}
              {parse(item.new_values) && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1">After</p>
                  <pre className="bg-green-50 border border-green-100 rounded-lg p-2 overflow-x-auto text-green-800 text-[11px] font-mono">
                    {JSON.stringify(parse(item.new_values), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Audit event log panel ─────────────────────────────────────────────────────

const AuditEventLog = ({ customerId, entityTypeFilter }) => {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    entity_type: entityTypeFilter || '',
    action: '',
    from_date: '',
    to_date: '',
    search: '',
    page: 1,
    page_size: 15,
  });

  const load = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.orgLogs(customerId, f);
      setLogs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    setFilters((f) => ({ ...f, entity_type: entityTypeFilter || '', page: 1 }));
  }, [entityTypeFilter]);

  useEffect(() => { load(filters); }, [filters, load]);

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="mt-2">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search by name or user…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#001F3F]/40 w-52"
          />
        </div>
        {!entityTypeFilter && (
          <select value={filters.entity_type} onChange={(e) => set('entity_type', e.target.value)}
            className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#001F3F]/40">
            <option value="">All Modules</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <select value={filters.action} onChange={(e) => set('action', e.target.value)}
          className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#001F3F]/40">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="STATUS_CHANGE">Status Change</option>
        </select>
        <input type="date" value={filters.from_date} onChange={(e) => set('from_date', e.target.value)}
          className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#001F3F]/40" />
        <input type="date" value={filters.to_date} onChange={(e) => set('to_date', e.target.value)}
          className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#001F3F]/40" />
        {(filters.search || filters.action || filters.from_date || filters.to_date) && (
          <button
            onClick={() => setFilters({ entity_type: entityTypeFilter || '', action: '', from_date: '', to_date: '', search: '', page: 1 })}
            className="h-8 px-3 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={18} /> Loading events…
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-500">{error}</p>
      ) : !logs?.items?.length ? (
        <p className="py-10 text-center text-sm text-gray-400">No audit events recorded yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Entity</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Performed By</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-3 py-2.5 w-6" />
                </tr>
              </thead>
              <tbody>
                {logs.items.map((item) => <AuditEventRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
          <Pagination
            page={filters.page}
            pageSize={15}
            total={logs.total}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            className="mt-3"
          />
        </>
      )}
    </div>
  );
};

// ── Organization detail page ──────────────────────────────────────────────────

const createdByCell = (row) => (
  <span className="text-sm text-gray-700">
    {(row.created_by_full?.trim() && row.created_by_full.trim() !== ' ')
      ? row.created_by_full
      : row.created_by_name || '—'}
  </span>
);

const SECTION_TABS = [
  { key: 'overview',            label: 'Overview',         icon: BarChart3      },
  { key: 'sms_jobs',            label: 'SMS Jobs',         icon: Send           },
  { key: 'email_jobs',          label: 'Email Jobs',       icon: Mail           },
  { key: 'whatsapp_jobs',       label: 'WhatsApp Jobs',    icon: MessageCircle  },
  { key: 'sms_templates',       label: 'SMS Templates',    icon: MessageSquare  },
  { key: 'email_templates',     label: 'Email Templates',  icon: Mail           },
  { key: 'whatsapp_templates',  label: 'WA Templates',     icon: MessageCircle  },
  { key: 'voters',              label: 'Voters',           icon: Users          },
  { key: 'contact_lists',       label: 'Contact Lists',    icon: Users          },
];

const ENTITY_TYPE_MAP = {
  sms_jobs:           'sms_job',
  email_jobs:         'email_job',
  whatsapp_jobs:      'whatsapp_job',
  sms_templates:      'sms_template',
  email_templates:    'email_template',
  whatsapp_templates: 'whatsapp_template',
  voters:             'voter',
  contact_lists:      'contact_list',
};

const JOB_COLS = [
  { key: 'id',            label: '#',         render: (r) => <span className="text-xs text-gray-400">#{r.id}</span> },
  { key: 'name',          label: 'Job Name',  render: (r) => <span className="font-medium text-gray-800">{r.name || r.template_name || '—'}</span> },
  { key: 'template_name', label: 'Template',  render: (r) => <span className="text-gray-600">{r.template_name || '—'}</span> },
  { key: 'status',        label: 'Status',    render: (r) => <StatusChip status={r.status} /> },
  { key: 'created_by',    label: 'Created By',render: createdByCell },
  { key: 'created_at',    label: 'Created',   render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span> },
  { key: 'scheduled_at',  label: 'Scheduled', render: (r) => <span className="text-xs text-gray-400">{r.scheduled_at ? fmt(r.scheduled_at) : 'Immediate'}</span> },
];

const TEMPLATE_COLS = [
  { key: 'id',     label: '#',        render: (r) => <span className="text-xs text-gray-400">#{r.id}</span> },
  { key: 'name',   label: 'Name',     render: (r) => <span className="font-medium text-gray-800">{r.name}</span> },
  { key: 'code',   label: 'Code',     render: (r) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.code}</code> },
  { key: 'status', label: 'Status',   render: (r) => <StatusChip status={r.status} /> },
  { key: 'created_by', label: 'Created By', render: createdByCell },
  { key: 'created_at', label: 'Created',   render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span> },
];

const EMAIL_TEMPLATE_COLS = [
  { key: 'id',      label: '#',       render: (r) => <span className="text-xs text-gray-400">#{r.id}</span> },
  { key: 'name',    label: 'Name',    render: (r) => <span className="font-medium text-gray-800">{r.name}</span> },
  { key: 'subject', label: 'Subject', render: (r) => <span className="text-gray-600 max-w-[160px] truncate block">{r.subject || '—'}</span> },
  { key: 'status',  label: 'Status',  render: (r) => <StatusChip status={r.status} /> },
  { key: 'created_by', label: 'Created By', render: createdByCell },
  { key: 'created_at', label: 'Created',   render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span> },
];

const VOTER_COLS = [
  { key: 'id',     label: '#',         render: (r) => <span className="text-xs text-gray-400">#{r.id}</span> },
  { key: 'name',   label: 'Full Name', render: (r) => <span className="font-medium text-gray-800">{r.name || '—'}</span> },
  { key: 'email',  label: 'Email',     render: (r) => <span className="text-gray-600">{r.email || '—'}</span> },
  { key: 'phone',  label: 'Phone',     render: (r) => <span className="text-gray-600">{r.phone || '—'}</span> },
  { key: 'status', label: 'Status',    render: (r) => <StatusChip status={r.status} /> },
  { key: 'created_at', label: 'Added', render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span> },
];

const LIST_COLS = [
  { key: 'id',           label: '#',         render: (r) => <span className="text-xs text-gray-400">#{r.id}</span> },
  { key: 'name',         label: 'List Name', render: (r) => <span className="font-medium text-gray-800">{r.name}</span> },
  { key: 'member_count', label: 'Members',   render: (r) => <span className="text-gray-700 font-semibold">{(r.member_count || 0).toLocaleString()}</span> },
  { key: 'status',       label: 'Status',    render: (r) => <StatusChip status={r.status} /> },
  { key: 'created_by',   label: 'Created By',render: createdByCell },
  { key: 'created_at',   label: 'Created',   render: (r) => <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span> },
];

function OrgDetailPage({ org, onBack }) {
  const [summary, setSummary] = useState(null);
  const [entities, setEntities] = useState(null);
  const [loadingSum, setLoadingSum] = useState(true);
  const [loadingEnt, setLoadingEnt] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    auditApi.orgSummary(org.customer_id)
      .then(setSummary)
      .finally(() => setLoadingSum(false));
    auditApi.orgEntities(org.customer_id)
      .then(setEntities)
      .finally(() => setLoadingEnt(false));
  }, [org.customer_id]);

  const totalJobs = (summary?.total_sms_jobs || 0) + (summary?.total_email_jobs || 0) + (summary?.total_whatsapp_jobs || 0);

  const renderSection = () => {
    if (activeTab === 'overview') {
      return <AuditEventLog customerId={org.customer_id} />;
    }
    const entityTypeFilter = ENTITY_TYPE_MAP[activeTab];
    const rows = entities?.[activeTab] || [];
    let cols;
    if (activeTab.endsWith('_jobs'))       cols = JOB_COLS;
    else if (activeTab === 'email_templates') cols = EMAIL_TEMPLATE_COLS;
    else if (activeTab === 'contact_lists')   cols = LIST_COLS;
    else if (activeTab === 'voters')          cols = VOTER_COLS;
    else cols = TEMPLATE_COLS;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700">
              {SECTION_TABS.find((t) => t.key === activeTab)?.label} — Current Records
            </h3>
          </div>
          <div className="p-1">
            {loadingEnt ? (
              <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-sm">
                <Loader2 className="animate-spin" size={16} /> Loading…
              </div>
            ) : (
              <EntityTable columns={cols} rows={rows} emptyMsg="No records found." />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <ClipboardList size={14} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-700">Audit Trail</h3>
          </div>
          <div className="p-4">
            <AuditEventLog customerId={org.customer_id} entityTypeFilter={entityTypeFilter} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#001F3F] border border-gray-200 hover:border-[#001F3F]/30 px-3 py-2 rounded-xl transition-all">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#001F3F]/8 rounded-xl flex items-center justify-center">
            <Building2 size={17} className="text-[#001F3F]" />
          </div>
          <div>
            <h2 className="font-bold text-[#001F3F] text-base leading-tight">{org.organization_name}</h2>
            <p className="text-xs text-gray-400">ID #{org.customer_id} · Created {fmtDate(org.created_at)}</p>
          </div>
          <StatusChip status={org.status} />
        </div>
      </div>

      {/* Summary cards */}
      {loadingSum ? (
        <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-sm">
          <Loader2 className="animate-spin" size={18} /> Loading summary…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={Send}          label="Total Jobs"         value={totalJobs}                         color="bg-blue-50   text-blue-600"   />
          <SummaryCard icon={Users}         label="Total Recipients"       value={summary?.total_voters}             color="bg-green-50  text-green-600"  />
          <SummaryCard icon={Users}         label="Contact Lists"      value={summary?.total_contact_lists}      color="bg-emerald-50 text-emerald-600"/>
          <SummaryCard icon={MessageSquare} label="SMS Templates"      value={summary?.total_sms_templates}      color="bg-indigo-50 text-indigo-600" />
          <SummaryCard icon={Mail}          label="Email Templates"    value={summary?.total_email_templates}    color="bg-violet-50 text-violet-600" />
          <SummaryCard icon={MessageCircle} label="WA Templates"       value={summary?.total_whatsapp_templates} color="bg-teal-50   text-teal-600"   />
          <SummaryCard icon={Send}          label="SMS Jobs"           value={summary?.total_sms_jobs}           color="bg-sky-50    text-sky-600"    />
          <SummaryCard icon={ClipboardList} label="Audit Events"       value={summary?.total_audit_events}       color="bg-amber-50  text-amber-600"  />
        </div>
      )}

      {summary?.last_activity && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 w-fit">
          <Clock size={13} />
          Last activity: <strong className="text-gray-700">{fmt(summary.last_activity)}</strong>
        </div>
      )}

      {/* Section tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex min-w-max">
            {SECTION_TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap
                  ${activeTab === key
                    ? 'border-[#001F3F] text-[#001F3F] bg-[#001F3F]/3'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}`}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

// ── Organization list page ────────────────────────────────────────────────────

function OrgListPage({ onSelectOrg }) {
  const [orgs, setOrgs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [orgPage, setOrgPage]         = useState(1);
  const [orgPageSize, setOrgPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.organizations();
      setOrgs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orgs?.filter((o) =>
    !search || o.organization_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#001F3F]/8 rounded-xl flex items-center justify-center">
            <ClipboardList size={17} className="text-[#001F3F]" />
          </div>
          <div>
            <h2 className="font-bold text-[#001F3F] text-base">Organization Audit Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click any organization to view its full audit detail</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full pl-9 pr-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-[#001F3F]/40 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading organizations…
        </div>
      ) : error ? (
        <div className="py-10 text-center">
          <XCircle size={32} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={load} className="mt-3 text-xs text-[#001F3F] underline">Retry</button>
        </div>
      ) : !filtered.length ? (
        <p className="py-16 text-center text-sm text-gray-400">
          {search ? `No organizations match "${search}"` : 'No organizations registered yet.'}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Organization</th>

                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Last Activity</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">SMS Jobs</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Jobs</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">WA Jobs</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">SMS Tmpl</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Tmpl</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">WA Tmpl</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">Voters</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lists</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((orgPage-1)*orgPageSize, orgPage*orgPageSize).map((org) => {
                  const totalJobs = (org.total_sms_jobs || 0) + (org.total_email_jobs || 0) + (org.total_whatsapp_jobs || 0);
                  return (
                    <tr key={org.customer_id}
                      className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                      onClick={() => onSelectOrg(org)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#001F3F]/8 rounded-lg flex items-center justify-center shrink-0">
                            <Building2 size={15} className="text-[#001F3F]" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-[#001F3F] transition-colors">
                              {org.organization_name}
                            </p>
                            <p className="text-xs text-gray-400">ID #{org.customer_id} · {totalJobs} total jobs</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusChip status={org.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(org.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(org.last_activity)}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_sms_jobs || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_email_jobs || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_whatsapp_jobs || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_sms_templates || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_email_templates || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_whatsapp_templates || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_voters || 0}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums text-gray-700">{org.total_contact_lists || 0}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-[#001F3F] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 whitespace-nowrap">
                          View Audit <ChevronRight size={12} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 border-t border-gray-100">
            <Pagination
              page={orgPage}
              pageSize={orgPageSize}
              total={filtered.length}
              onPageChange={setOrgPage}
              onSizeChange={(s) => { setOrgPageSize(s); setOrgPage(1); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [selectedOrg, setSelectedOrg] = useState(null);
  return selectedOrg
    ? <OrgDetailPage org={selectedOrg} onBack={() => setSelectedOrg(null)} />
    : <OrgListPage onSelectOrg={setSelectedOrg} />;
}
