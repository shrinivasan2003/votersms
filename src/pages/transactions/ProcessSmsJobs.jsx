import { useState, useEffect } from 'react';
import { Play, RefreshCw, Loader2, Info } from 'lucide-react';
import Button from '../../components/shared/Button';
import { smsJobsApi } from '../../api/sms';
import { processJobsApi } from '../../api/jobs';

const ProcessJobs = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [processError, setProcessError] = useState('');
  const [batchSize, setBatchSize] = useState(100);

  const fetchPendingJobs = async () => {
    setLoading(true);
    try {
      const data = await smsJobsApi.list();
      const pending = Array.isArray(data) ? data.filter(j => j.status === 'Pending') : [];
      setPendingJobs(pending);
    } catch (err) {
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const handleProcess = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setProcessError('');

    try {
      await processJobsApi.process({ job_type: 'sms', batch_size: batchSize });
      setShowSuccess(true);
      fetchPendingJobs();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setProcessError(err.message || 'Processing failed. Check server logs.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Play size={28} className="text-brand-navy" fill="currentColor" />
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">Process SMS Jobs</h1>
            <p className="text-brand-textMuted mt-1">Manually trigger SMS job processing</p>
          </div>
        </div>
        <button 
          onClick={fetchPendingJobs}
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-brand-textPrimary hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <span className="font-bold">✓</span>
          <span>SMS jobs queued for processing successfully!</span>
        </div>
      )}
      {processError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <span className="font-bold">✗</span>
          <span>{processError}</span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card - Process Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="bg-[#1a56db] px-6 py-4 flex items-center">
            <Play size={18} className="text-white mr-2" fill="white" />
            <h3 className="font-semibold text-white">Process Jobs</h3>
          </div>
          <div className="p-8">
            <form onSubmit={handleProcess} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Job (optional)</label>
                <select className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white transition-all appearance-none">
                  <option value="all">Process All Pending Jobs</option>
                </select>
                <p className="text-xs text-brand-textMuted">Leave empty to process all pending jobs</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-textPrimary">Batch Size</label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="block w-full rounded-lg border border-brand-border px-4 py-3 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <p className="text-xs text-brand-textMuted">Number of SMS messages to process per batch (1-1000)</p>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full py-4 bg-[#1a56db] text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="white" />
                    Process Jobs
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel - Pending Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 flex items-center border-b border-brand-border bg-white">
            <RefreshCw size={18} className="text-brand-textSecondary mr-2" />
            <h3 className="font-semibold text-brand-textPrimary text-lg">Pending Jobs</h3>
          </div>
          
          <div className="flex-1 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-brand-textMuted">
                <RefreshCw size={48} className="animate-spin mb-4 text-gray-300" />
                <p className="text-lg">Loading pending jobs...</p>
              </div>
            ) : pendingJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-brand-textMuted">
                <RefreshCw size={48} className="text-gray-300 mb-4" />
                <p className="text-lg">No pending jobs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">PRECINCT</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">TEMPLATE</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">RECIPIENTS</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-textSecondary uppercase tracking-wider">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-border">
                    {pendingJobs.map(job => (
                      <tr key={job.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-textPrimary font-medium">#{job.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-textPrimary">{job.precinct_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-textPrimary">{job.template_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-textPrimary">{job.recipients || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
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

      {/* Automatic Processing Setup Section */}
      <div className="bg-[#f8fafc] rounded-xl shadow-sm border border-brand-border p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full border-2 border-brand-blue flex items-center justify-center text-brand-blue font-bold">ⓘ</div>
          <h3 className="text-2xl font-bold text-brand-navy">Automatic Processing Setup</h3>
        </div>

        <div className="space-y-10">
          {/* Option 1 */}
          <div>
            <h4 className="text-xl font-bold text-brand-textPrimary mb-3">Option 1: Cron Job (Recommended)</h4>
            <p className="text-brand-textMuted mb-4">Set up a cron job to run automatically every minute:</p>
            <div className="bg-[#f1f5f9] rounded-lg p-6 border border-brand-border font-mono text-sm text-brand-textPrimary leading-relaxed">
              # Add to crontab (crontab -e)<br />
              * * * * * cd /path/to/project && php cron/process_sms_jobs.php &gt;&gt; logs/sms_processor.log 2&gt;&amp;1
            </div>
          </div>

          {/* Option 2 */}
          <div>
            <h4 className="text-xl font-bold text-brand-textPrimary mb-3">Option 2: Docker Cron</h4>
            <p className="text-brand-textMuted mb-4">For Docker containers, add cron support:</p>
            <div className="bg-[#f1f5f9] rounded-lg p-6 border border-brand-border font-mono text-sm text-brand-textPrimary leading-relaxed space-y-4">
              <div>
                # In Dockerfile<br />
                RUN apt-get update && apt-get install -y cron && apt-get clean<br />
                RUN service cron start
              </div>
              <div>
                # Add cron job<br />
                RUN echo "* * * * * cd /var/www/html && php cron/process_sms_jobs.php &gt;&gt; /var/log/sms_processor.log 2&gt;&amp;1" | crontab -
              </div>
            </div>
          </div>

          {/* Option 3 */}
          <div>
            <h4 className="text-xl font-bold text-brand-textPrimary mb-3">Option 3: Systemd Timer (Linux)</h4>
            <p className="text-brand-textMuted">Create a systemd service and timer for more control.</p>
          </div>

          {/* Manual Processing */}
          <div>
            <h4 className="text-xl font-bold text-brand-textPrimary mb-3">Manual Processing</h4>
            <p className="text-brand-textMuted mb-4">Use this page or run manually:</p>
            <div className="bg-[#f1f5f9] rounded-lg p-6 border border-brand-border font-mono text-sm text-brand-textPrimary leading-relaxed">
              php cron/process_sms_jobs.php<br />
              php cron/process_sms_jobs.php --job-id=123<br />
              php cron/process_sms_jobs.php --batch-size=50<br />
              php cron/process_sms_jobs.php --dry-run
            </div>
          </div>

          {/* API Endpoint */}
          <div>
            <h4 className="text-xl font-bold text-brand-textPrimary mb-3">API Endpoint</h4>
            <p className="text-brand-textMuted mb-4">You can also trigger processing via API:</p>
            <div className="bg-[#f1f5f9] rounded-lg p-6 border border-brand-border font-mono text-sm text-brand-textPrimary leading-relaxed">
              POST /api/process-jobs/process<br />
              {"{"}<br />
              &nbsp;&nbsp;"job_id": 123, &nbsp;&nbsp;// Optional: specific job ID<br />
              &nbsp;&nbsp;"batch_size": 100 &nbsp;// Optional: batch size (default: 100)<br />
              {"}"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessJobs;
