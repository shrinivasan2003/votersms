import { useState, useEffect } from 'react';
import { Play, RefreshCw, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
      timeZone: ianaT, month: 'short', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

const ProcessJobs = () => {
  const { getAuthHeaders } = useAuth();
  const [jobId, setJobId] = useState('');
  const [batchSize, setBatchSize] = useState(100);
  const [jobType, setJobType] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingJobs, setPendingJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [customerTz, setCustomerTz] = useState('UTC');
  const [tzShort, setTzShort] = useState('UTC');

  // Fetch customer timezone once on mount
  useEffect(() => {
    fetch('/api/customers/my-settings')
      .then(r => r.json())
      .then(d => {
        if (d?.timezone) {
          setCustomerTz(d.timezone);
          setTzShort(d.timezone_short?.[d.timezone] || d.timezone);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPendingJobs = async (type = jobType) => {
    setJobsLoading(true);
    try {
      const endpoint = type === 'email' ? '/api/email-jobs' : '/api/sms-jobs';
      const res = await fetch(endpoint);
      const data = await res.json();
      const pending = Array.isArray(data) ? data.filter(j => j.status === 'Pending') : [];
      setPendingJobs(pending);
    } catch (err) {
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingJobs(jobType);
  }, [jobType]);

  const handleProcess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/process-jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          job_id: jobId ? parseInt(jobId) : null,
          batch_size: parseInt(batchSize),
          job_type: jobType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.detail || 'Processing started');
        fetchPendingJobs(jobType);
      } else {
        setMessage(`Error: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setMessage(`Failed to trigger job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Play size={24} className="text-brand-navy shrink-0" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">Process Jobs</h1>
            <p className="text-sm text-brand-textMuted mt-0.5">Scheduled jobs run automatically · Use this to manually trigger a job</p>
          </div>
        </div>
        <button
          onClick={() => fetchPendingJobs(jobType)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={jobsLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="bg-[#0047AB] px-6 py-4 flex items-center gap-3">
            <Play size={20} className="text-white" fill="white" />
            <h3 className="font-bold text-white">Process Jobs</h3>
          </div>
          <div className="p-4 sm:p-8">
            {message && (
              <div className="mb-6 p-4 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                {message}
              </div>
            )}
            <form 
              className="space-y-6" 
              onSubmit={handleProcess}
            >
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Job Type</label>
                <div className="relative">
                  <select 
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none"
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Job (optional)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    placeholder="Enter Job ID"
                    className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-brand-blue">Leave empty to test bulk (Not yet fully implemented)</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Batch Size</label>
                <input 
                  type="number" 
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-xs text-brand-textMuted">Number of SMS messages to process per batch (1-1000)</p>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#0047AB] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:bg-blue-300"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                {loading ? 'Processing...' : 'Process Jobs'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b border-brand-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className={`text-brand-textPrimary ${jobsLoading ? 'animate-spin' : ''}`} />
              <h3 className="font-bold text-brand-textPrimary">
                Pending {jobType === 'email' ? 'Email' : 'SMS'} Jobs
              </h3>
            </div>
            {pendingJobs.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {pendingJobs.length} pending
              </span>
            )}
          </div>
          <div className="flex-1 flex flex-col min-h-[350px]">
            {jobsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <RefreshCw size={48} className="text-gray-200 animate-spin mb-4" />
                <p className="text-gray-400 font-medium">Loading pending jobs...</p>
              </div>
            ) : pendingJobs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <RefreshCw size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">No pending {jobType} jobs</p>
                <p className="text-gray-300 text-xs mt-1">Create a job first, then process it here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-brand-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">PRECINCT</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">TEMPLATE</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">SCHEDULED AT</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {pendingJobs.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-gray-100 text-brand-textPrimary px-2 py-1 rounded text-xs font-bold">
                            #{job.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-brand-textPrimary font-medium">
                          {job.precinct_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-brand-textSecondary">
                          {job.template_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {job.scheduled_at ? (
                            <span className="text-amber-600 font-medium">
                              {toLocalDisplay(job.scheduled_at, customerTz)}
                              {tzShort && (
                                <span className="ml-1 text-[10px] text-gray-400 font-normal">({tzShort})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Immediate</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#f0f7ff] rounded-xl border border-[#d1e9ff] p-5 flex gap-4">
        <Info size={18} className="text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-sm">
          <p className="font-bold text-brand-blue">How job processing works</p>
          <p className="text-brand-textSecondary">
            <strong className="text-brand-textPrimary">Immediate jobs</strong> — created without a scheduled time — are picked up and processed automatically within seconds.
          </p>
          <p className="text-brand-textSecondary">
            <strong className="text-brand-textPrimary">Scheduled jobs</strong> — created with a future date/time — are held until that time arrives, then processed automatically.
          </p>
          <p className="text-brand-textSecondary">
            <strong className="text-brand-textPrimary">This page</strong> — use it to manually force-trigger a specific pending job by entering its Job ID above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessJobs;
