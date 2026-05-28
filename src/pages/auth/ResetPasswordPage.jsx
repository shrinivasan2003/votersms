import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import { authApi } from '../../api/auth';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-6">
        {!token ? (
          <div className="text-center space-y-4">
            <p className="text-red-600 font-medium">Invalid or missing reset token.</p>
            <Link to="/login" className="text-sm text-[#001F3F] underline">Back to login</Link>
          </div>
        ) : (
          <div className="w-full max-w-[440px]">
            <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
              <div className="bg-[#001F3F] p-6 text-white">
                <h2 className="text-2xl font-bold">Set New Password</h2>
                <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account</p>
              </div>

              <div className="p-6 lg:p-8">
                {done ? (
                  <div className="flex flex-col items-center text-center gap-4 py-4">
                    <CheckCircle2 size={48} className="text-green-500" />
                    <p className="text-gray-700 font-medium">Password updated! Redirecting to login…</p>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center">
                        <span className="mr-3 text-lg">⚠️</span>
                        {error}
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 ml-1">New password</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPw ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-gray-900 placeholder:text-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(!showPw)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F] transition-colors"
                          >
                            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600 ml-1">Confirm password</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPw ? 'text' : 'password'}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-blue-300 text-white rounded-xl font-bold shadow-xl shadow-[#001F3F]/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResetPasswordPage;
