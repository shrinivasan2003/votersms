import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import bdaLogo from '../../assets/bda-logo.webp';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(username, password);
      if (userData?.customer_id) {
        setError('This account is a customer account. Please use Customer Login.');
        return;
      }
      if (userData?.role?.toLowerCase() !== 'admin') {
        setError('You do not have administrator privileges.');
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top bar */}
      <nav className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <img src={bdaLogo} alt="BallotDA" className="h-7 w-auto object-contain" />
          </div>
          <span className="font-bold text-[#001F3F]">BallotDA</span>
        </Link>
        <Link to="/login" className="text-sm text-gray-500 hover:text-[#001F3F] font-medium">
          Customer Login →
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
            <div className="bg-[#001F3F] p-6 text-white flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-blue-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Platform Admin</h2>
                <p className="text-gray-400 text-xs mt-0.5">Restricted access — administrators only</p>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center">
                  <span className="mr-2 text-base">⚠</span>
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
                      placeholder="admin"
                      className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-gray-300 text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign in as Admin'}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center mt-6 text-xs text-gray-400">
            © 2026 BallotDA Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
