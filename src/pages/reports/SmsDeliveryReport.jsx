import { useState, useEffect } from 'react';
import { BarChart2, Printer, Search, X, Calendar, ChevronDown, Eye } from 'lucide-react';
import Pagination from '../../components/shared/Pagination';

const SmsDeliveryReport = () => {
  const [filters, setFilters] = useState({
    jobId: '',
    status: 'All Statuses',
    precinct: 'All Precincts',
    dateFrom: '',
    dateTo: ''
  });

  const [stats, setStats] = useState({
    total_jobs: 0,
    sent: 0,
    failed: 0,
    pending: 0
  });

  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [precincts, setPrecincts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [smsPage, setSmsPage]         = useState(1);
  const [smsPageSize, setSmsPageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, precinctsRes] = await Promise.all([
        fetch('/api/sms-delivery-stats'),
        fetch('/api/sms-jobs'),
        fetch('/api/precincts')
      ]);
      const statsData = await statsRes.json();
      const jobsData = await jobsRes.json();
      const precinctsData = await precinctsRes.json();
      
      setStats(statsData);
      const data = Array.isArray(jobsData) ? jobsData : [];
      setReportData(data);
      setFilteredData(data);
      setPrecincts(Array.isArray(precinctsData) ? precinctsData : []);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = () => {
    let data = [...reportData];

    if (filters.jobId) {
      data = data.filter(item => item.id.toString().includes(filters.jobId));
    }

    if (filters.status !== 'All Statuses') {
      data = data.filter(item => item.status === filters.status);
    }

    if (filters.precinct !== 'All Precincts') {
      data = data.filter(item => item.precinct_name === filters.precinct);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      data = data.filter(item => new Date(item.created_at) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      data = data.filter(item => new Date(item.created_at) <= toDate);
    }

    setFilteredData(data);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    setFilters({
      jobId: '',
      status: 'All Statuses',
      precinct: 'All Precincts',
      dateFrom: '',
      dateTo: ''
    });
    setFilteredData(reportData);
  };

  const statsList = [
    { label: 'Total Jobs', value: stats.total_jobs || 0, color: 'bg-[#1a56db]' },
    { label: 'Total Recipients', value: stats.total_jobs || 0, color: 'bg-[#2563eb]' },
    { label: 'Sent', value: stats.sent || 0, color: 'bg-[#2ecc71]' },
    { label: 'Delivered', value: '0', color: 'bg-[#10b981]' },
    { label: 'Failed', value: stats.failed || 0, color: 'bg-[#e74c3c]' },
    { label: 'Pending', value: stats.pending || 0, color: 'bg-[#f1c40f]' },
    { label: 'Provider Name', value: 'Twilio', color: 'bg-[#9b59b6]' },
  ];

  const columns = ['JOB ID', 'PRECINCT', 'TEMPLATE', 'PROVIDER', 'STATUS', 'TOTAL', 'SENT', 'DELIVERED', 'FAILED', 'PENDING', 'DELIVERY RATE', 'CREATED', 'ACTIONS'];

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          header, aside, .no-print {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          .bg-brand-bg {
            background-color: white !important;
          }
          .print-header {
            display: flex !important;
            justify-content: center;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
            margin-bottom: 20px;
          }
          .shadow-sm {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .grid {
            display: grid !important;
          }
          .grid-cols-7 {
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          }
        }
        .print-header {
          display: none;
        }
      `}</style>

      <div className="print-header hidden">
        <h1 className="text-xl font-bold text-brand-navy">BallotDA - Civic Engagement Portal</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">SMS Analytics</h1>
          <p className="text-sm text-brand-textMuted mt-1">View SMS job delivery statistics and recipient details</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Printer size={18} />
          Print Report
        </button>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">SMS Analytics</h1>
        <p className="text-sm text-brand-textMuted">View SMS job delivery statistics and recipient details</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statsList.map((stat, idx) => (
          <div key={idx} className={`${stat.color} rounded-lg p-5 text-white relative overflow-hidden shadow-sm`}>
            <p className="text-[10px] font-medium opacity-90 mb-1 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.label === 'Provider Name' ? 'text-base' : ''}`}>{stat.value}</p>
            <BarChart2 size={32} className="absolute top-2 right-2 opacity-20" />
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden no-print">
        <div className="bg-[#1a56db] px-6 py-4 flex items-center gap-2">
          <Search size={20} className="text-white" />
          <h3 className="font-bold text-white">Filters</h3>
        </div>
        <div className="p-4 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Job ID</label>
              <input 
                type="text" 
                placeholder="Job ID"
                className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                value={filters.jobId}
                onChange={(e) => setFilters({...filters, jobId: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Status</label>
              <div className="relative">
                <select 
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
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
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Precinct</label>
              <div className="relative">
                <select 
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                  value={filters.precinct}
                  onChange={(e) => setFilters({...filters, precinct: e.target.value})}
                >
                  <option>All Precincts</option>
                  {precincts.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Date From</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-textPrimary">Date To</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
              </div>
            </div>
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

      {/* Statistics Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="bg-[#1a56db] px-6 py-4">
          <h3 className="font-bold text-white text-lg">Job-Wise Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((head) => (
                  <th key={head} className="px-6 py-4 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-10 text-center text-brand-textSecondary animate-pulse font-medium">Loading report data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-10 text-center text-brand-textSecondary font-medium">No records found</td>
                </tr>
              ) : filteredData.slice((smsPage-1)*smsPageSize, smsPage*smsPageSize).map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-gray-100 text-brand-textPrimary px-2 py-1 rounded text-xs font-bold">#{row.id}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-textPrimary font-medium max-w-xs truncate">{row.precinct_name}</td>
                  <td className="px-6 py-4 text-sm text-brand-textSecondary font-medium">{row.template_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="bg-[#e0e7ff] text-[#4338ca] px-3 py-0.5 rounded-full text-[10px] font-bold w-fit mb-1">Twilio</span>
                      <span className="text-[10px] text-gray-400 lowercase">{row.provider_name || 'twilio'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.status === 'Completed' ? 'bg-[#e6f7ef] text-[#27ae60]' : 'bg-yellow-50 text-yellow-600'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-brand-textPrimary">{row.recipients || 0}</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                      <span className="text-xs font-bold text-brand-blue">{row.sent_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                      <span className="text-xs font-bold text-[#e74c3c]">{row.failed_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 text-sm text-brand-textSecondary font-medium whitespace-nowrap">{new Date(row.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-brand-blue hover:text-blue-700 transition-colors">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length > 0 && (
          <div className="px-6 border-t border-brand-border bg-white">
            <Pagination
              page={smsPage}
              pageSize={smsPageSize}
              total={filteredData.length}
              onPageChange={setSmsPage}
              onSizeChange={(s) => { setSmsPageSize(s); setSmsPage(1); }}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default SmsDeliveryReport;
