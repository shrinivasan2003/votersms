import { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Users, FileText, BarChart2, UserCheck, 
  Upload, Circle, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/shared/StatCard';
import Button from '../components/shared/Button';

const Dashboard = () => {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    counties: 0,
    precincts: 0,
    voters: 0,
    smsTemplates: 0,
    smsJobs: 0,
    activeUsers: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    jobType: 'All Jobs',
    status: 'All Status',
    startDate: '',
    endDate: '',
    search: ''
  });

  useEffect(() => {
  const fetchData = async () => {
    try {
      const statsRes = await fetch('/api/dashboard-stats');
      const recentRes = await fetch('/api/recent-jobs');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentJobs(recentData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };
  fetchData();
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);

  const filteredJobs = recentJobs.filter(job => {
    if (filters.jobType !== 'All Jobs') {
      const typeMap = { 'SMS Jobs': 'SMS', 'Email Jobs': 'Email' };
      if (job.type !== typeMap[filters.jobType]) return false;
    }
    if (filters.status !== 'All Status' && job.status !== filters.status) return false;
    if (filters.search && !job.precinct?.toLowerCase().includes(filters.search.toLowerCase()) && !job.template?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.startDate && new Date(job.created_at) < new Date(filters.startDate)) return false;
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(job.created_at) > endDate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
          <p className="text-brand-textMuted">Welcome back, {user?.name || 'Administrator'}</p>
        </div>
        <div className="space-x-3">
          <Button variant="outlined" onClick={() => navigate('/sms-delivery-report')}>View Reports</Button>
          <Button onClick={() => navigate('/sms-delivery-report')}>Export Data</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Counties" value={stats.counties?.toString() || '0'} icon={MapPin} colorClass="#3B82F6" />
        <StatCard title="Precincts" value={stats.precincts?.toString() || '0'} icon={Building2} colorClass="#10B981" />
        <StatCard title="Voters" value={stats.voters?.toString() || '0'} icon={Users} colorClass="#8B5CF6" />
        
        <StatCard title="SMS Templates" value={stats.smsTemplates?.toString() || '0'} icon={FileText} colorClass="#F59E0B" />
        <StatCard title="SMS Jobs" value={stats.smsJobs?.toString() || '0'} icon={BarChart2} colorClass="#6366F1" />
        <StatCard title="Active Users" value={stats.activeUsers?.toString() || '0'} icon={UserCheck} colorClass="#EC4899" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-brand-border p-6">
          <h3 className="text-lg font-semibold text-brand-textPrimary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/counties')}
              className="flex items-start p-4 border border-brand-border rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <Building2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-brand-textPrimary">Add County</h4>
                <p className="text-sm text-brand-textMuted">Create new county</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/voters')}
              className="flex items-start p-4 border border-brand-border rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-brand-textPrimary">Import Voters</h4>
                <p className="text-sm text-brand-textMuted">Upload CSV file</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/sms-templates')}
              className="flex items-start p-4 border border-brand-border rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <FileText size={24} />
              </div>
              <div>
                <h4 className="font-bold text-brand-textPrimary">Create Template</h4>
                <p className="text-sm text-brand-textMuted">Create message template</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/sms-delivery-report')}
              className="flex items-start p-4 border border-brand-border rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <BarChart2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-brand-textPrimary">View Reports</h4>
                <p className="text-sm text-brand-textMuted">View delivery reports</p>
              </div>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-brand-border p-6">
          <h3 className="text-lg font-semibold text-brand-textPrimary mb-4">Recent Activity</h3>
          <div className="space-y-6">
            <div className="flex items-start relative pb-6 border-l-2 border-gray-200 ml-3 pl-4">
              <div className="absolute -left-[9px] top-1 bg-white">
                <Circle size={16} className="text-brand-blue fill-brand-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-textPrimary">New SMS job created</p>
                <p className="text-xs text-brand-textMuted mt-1">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start relative pb-6 border-l-2 border-gray-200 ml-3 pl-4">
              <div className="absolute -left-[9px] top-1 bg-white">
                <Circle size={16} className="text-green-500 fill-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-textPrimary">Voter data imported</p>
                <p className="text-xs text-brand-textMuted mt-1">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start relative ml-3 pl-4">
              <div className="absolute -left-[9px] top-1 bg-white">
                <Circle size={16} className="text-brand-blue fill-brand-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-textPrimary">Template updated</p>
                <p className="text-xs text-brand-textMuted mt-1">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-brand-border p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-brand-textPrimary">Job Statistics</h3>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-brand-border rounded-lg text-sm text-brand-textSecondary hover:bg-gray-100 transition-colors"
          >
            <Filter size={16} className="text-gray-400" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50/50 rounded-lg border border-brand-border">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Job Type</label>
              <select 
                value={filters.jobType}
                onChange={(e) => setFilters({...filters, jobType: e.target.value})}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue"
              >
                <option>All Jobs</option>
                <option>SMS Jobs</option>
                <option>Email Jobs</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>Processing</option>
                <option>Completed</option>
                <option>Failed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Start Date</label>
              <input 
                type="date" 
                placeholder="dd-mm-yyyy"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">End Date</label>
              <input 
                type="date" 
                placeholder="dd-mm-yyyy"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Search</label>
              <input 
                type="text" 
                placeholder="Precinct, template..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <button 
                onClick={() => setFilters({ jobType: 'All Jobs', status: 'All Status', startDate: '', endDate: '', search: '' })}
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {['JOB ID', 'TYPE', 'STATUS', 'PRECINCT', 'TEMPLATE', 'RECIPIENTS', 'SUCCESS/FAILED', 'CREATED AT'].map((head) => (
                  <th key={head} className="px-6 py-4 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-brand-textMuted font-medium italic">
                    No jobs found
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={`${job.type}-${job.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-gray-100 text-brand-textPrimary px-2 py-1 rounded text-[10px] font-bold">#{job.id}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-brand-textPrimary">{job.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${job.status === 'Completed' ? 'bg-[#e6f7ef] text-[#27ae60]' : 'bg-gray-100 text-gray-500'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-brand-textSecondary">{job.precinct || '-'}</td>
                    <td className="px-6 py-4 text-xs text-brand-textSecondary">{job.template || '-'}</td>
                    <td className="px-6 py-4 text-xs text-brand-textSecondary">{job.recipients}</td>
                    <td className="px-6 py-4 text-xs text-brand-textSecondary">{job.success_failed}</td>
                    <td className="px-6 py-4 text-xs text-brand-textSecondary whitespace-nowrap">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
