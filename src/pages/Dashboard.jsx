import { useState, useEffect } from 'react';
import {
  Users, FileText, BarChart2, UserCheck,
  Upload, Circle, Filter, MessageSquare, Mail, MessageCircle,
  CheckCircle2, XCircle, Loader2, Clock, UserPlus
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
    voters: 0,
    smsTemplates: 0,
    smsJobs: 0,
    emailJobs: 0,
    activeUsers: 0,
    whatsappJobs: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
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
        const [statsRes, recentRes, activityRes] = await Promise.all([
          fetch('/api/dashboard-stats'),
          fetch('/api/recent-jobs'),
          fetch('/api/recent-activity'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (recentRes.ok) setRecentJobs(await recentRes.json());
        if (activityRes.ok) setRecentActivity(await activityRes.json());
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (seconds < 5)   return 'just now';
    if (seconds < 60)  return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60)     return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const activityIcon = (item) => {
    switch (item.event_type) {
      case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'failed':    return <XCircle      size={16} className="text-red-500" />;
      case 'processing':return <Loader2      size={16} className="text-amber-500 animate-spin" />;
      case 'scheduled': return <Clock        size={16} className="text-amber-500" />;
      case 'import':    return <UserPlus     size={16} className="text-purple-500" />;
      default:          return <Circle       size={16} className={
        item.job_type === 'EMAIL'    ? 'text-purple-500 fill-purple-100' :
        item.job_type === 'WHATSAPP' ? 'text-green-500 fill-green-100'   :
                                       'text-brand-blue fill-blue-100'
      } />;
    }
  };

  const filteredJobs = recentJobs.filter((job) => {
    if (filters.jobType !== 'All Jobs') {
      const typeMap = { 'SMS Jobs': 'SMS', 'Email Jobs': 'Email', 'WhatsApp Jobs': 'WhatsApp' };
      if (job.type !== typeMap[filters.jobType]) return false;
    }
    if (filters.status !== 'All Status' && job.status !== filters.status) return false;
    if (filters.search && !job.template?.toLowerCase().includes(filters.search.toLowerCase())) return false;
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Dashboard</h1>
          <p className="text-sm text-brand-textMuted">
            Welcome, <span className="font-semibold text-brand-textPrimary">
              {user?.first_name || user?.name?.split(' ')[0] || user?.username || 'User'}
            </span>
            {user?.organization_name && (
              <> · <span className="text-brand-textPrimary font-semibold">{user.organization_name}</span></>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outlined" onClick={() => navigate('/sms-delivery-report')}>View Reports</Button>
          <Button onClick={() => navigate('/sms-jobs')}>New Campaign</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard title="Recipients" value={stats.voters?.toString() || '0'} icon={Users} colorClass="#8B5CF6" />
        <StatCard title="SMS Templates" value={stats.smsTemplates?.toString() || '0'} icon={FileText} colorClass="#F59E0B" />
        <StatCard title="SMS Jobs" value={stats.smsJobs?.toString() || '0'} icon={BarChart2} colorClass="#6366F1" />
        <StatCard title="Email Jobs" value={stats.emailJobs?.toString() || '0'} icon={Mail} colorClass="#3B82F6" />
        <StatCard title="WhatsApp Jobs" value={stats.whatsappJobs?.toString() || '0'} icon={MessageCircle} colorClass="#10B981" />
        <StatCard title="Active Users" value={stats.activeUsers?.toString() || '0'} icon={UserCheck} colorClass="#EC4899" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-brand-border p-6">
          <h3 className="text-lg font-semibold text-brand-textPrimary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/recipients')}
              className="flex items-start p-4 border border-brand-border rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-brand-textPrimary">Import Recipients</h4>
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
              onClick={() => navigate('/sms-jobs')}
              className="flex items-start p-4 border border-brand-border rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <MessageSquare size={24} />
              </div>
              <div>
                <h4 className="font-bold text-brand-textPrimary">New SMS Job</h4>
                <p className="text-sm text-brand-textMuted">Send SMS campaign</p>
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

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-brand-border p-6">
          <h3 className="text-lg font-semibold text-brand-textPrimary mb-4">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Circle size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-brand-textMuted">No activity yet.</p>
              <p className="text-xs text-gray-400 mt-1">Create a job to see activity here.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start relative pl-4 ml-3 ${
                    i < recentActivity.length - 1 ? 'pb-5 border-l-2 border-gray-100' : 'pb-1'
                  }`}
                >
                  <div className="absolute -left-[9px] top-0.5 bg-white p-0.5 rounded-full">
                    {activityIcon(item)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-textPrimary leading-snug">{item.label}</p>
                    <p className="text-xs text-brand-textMuted mt-0.5">{timeAgo(item.occurred_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Statistics table */}
      <div className="bg-white rounded-xl shadow-sm border border-brand-border p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h3 className="text-lg font-semibold text-brand-textPrimary">Job Statistics</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-brand-border rounded-lg text-sm text-brand-textSecondary hover:bg-gray-100 transition-colors"
          >
            <Filter size={16} className="text-gray-400" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50/50 rounded-lg border border-brand-border">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Job Type</label>
              <select value={filters.jobType} onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue">
                <option>All Jobs</option>
                <option>SMS Jobs</option>
                <option>Email Jobs</option>
                <option>WhatsApp Jobs</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue">
                <option>All Status</option>
                <option>Pending</option>
                <option>Processing</option>
                <option>Completed</option>
                <option>Failed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Start Date</label>
              <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">End Date</label>
              <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-brand-textSecondary uppercase">Search</label>
              <input type="text" placeholder="Template name..." value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full bg-white border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-blue" />
            </div>
            <div className="sm:col-span-2 md:col-span-5 flex justify-end">
              <button onClick={() => setFilters({ jobType: 'All Jobs', status: 'All Status', startDate: '', endDate: '', search: '' })}
                className="text-xs font-bold text-brand-blue hover:underline">
                Clear Filters
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[640px] divide-y divide-brand-border">
            <thead className="bg-gray-50">
              <tr>
                {['JOB ID', 'TYPE', 'STATUS', 'TEMPLATE', 'RECIPIENTS', 'SUCCESS/FAILED', 'CREATED AT'].map((head) => (
                  <th key={head} className="px-6 py-4 text-left text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-border">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-brand-textMuted font-medium italic">
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
