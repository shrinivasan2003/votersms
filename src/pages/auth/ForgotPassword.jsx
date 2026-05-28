import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, User, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import { authApi } from '../../api/auth';

const ForgotPassword = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(username, email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            <div className="bg-[#001F3F] p-6 text-white">
              <h2 className="text-2xl font-bold">Forgot Password</h2>
              <p className="text-gray-400 text-sm mt-1">
                {submitted ? 'Check your inbox' : 'Enter your username and email to receive a reset link'}
              </p>
            </div>

            <div className="p-6 lg:p-8">
              {submitted ? (
                <div className="flex flex-col items-center text-center gap-4 py-4">
                  <CheckCircle2 size={48} className="text-green-500" />
                  <p className="text-gray-700 font-medium">
                    If the account exists, a password reset link has been sent to <strong>{email}</strong>.
                  </p>
                  <p className="text-gray-400 text-sm">Check your spam folder if you don't see it within a few minutes.</p>
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
                      <label className="text-sm font-bold text-gray-600 ml-1">Username</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="your_username"
                          className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 ml-1">Email address</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-blue-300 text-white rounded-xl font-bold shadow-xl shadow-[#001F3F]/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#001F3F] font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
