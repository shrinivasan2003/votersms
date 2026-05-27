import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Loader2, Shield, BarChart3, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import bdaLogo from '../../assets/bda-logo.webp';

const Login = () => {
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
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Left Side: Branding & Features */}
      <div className="md:w-1/2 bg-[#001F3F] relative overflow-hidden flex flex-col p-8 lg:p-12 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="flex items-center space-x-3 bg-white w-fit p-3 rounded-2xl shadow-sm mb-8">
            <img src={bdaLogo} alt="BallotDA" className="h-10 w-auto object-contain" />
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight">
            Civic Engagement <br /> 
            <span className="text-blue-400">Portal</span>
          </h1>
          
          <div className="space-y-6 mt-8 max-w-md">
            <div className="flex items-start space-x-5 group">
              <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                <Shield className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Enterprise Security</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">Bank-level encryption and security protocols for sensitive voter data.</p>
              </div>
            </div>

            <div className="flex items-start space-x-5 group">
              <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                <BarChart3 className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Real-time Analytics</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">Monitor campaigns and track performance metrics as they happen.</p>
              </div>
            </div>

            <div className="flex items-start space-x-5 group">
              <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                <Database className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Scalable Infrastructure</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">Built to handle enterprise-level workloads and millions of messages.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto relative z-10 pt-8">
          <div className="w-full h-px bg-white/10 mb-4"></div>
          <p className="text-sm text-gray-400 font-medium">Trusted by election administrators nationwide</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-[500px]">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            <div className="bg-[#001F3F] p-6 lg:p-8 text-white">
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="text-gray-400 text-sm mt-1">Sign in to access your dashboard</p>
            </div>

            <div className="p-6 lg:p-8">
              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="mr-3 text-lg">⚠️</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                      className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-brand-textPrimary placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-bold text-gray-600">Password</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#001F3F] transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#001F3F]/30 focus:ring-4 focus:ring-[#001F3F]/5 transition-all text-brand-textPrimary placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-1 px-1">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-[#001F3F] focus:ring-[#001F3F] cursor-pointer" />
                      <label htmlFor="remember" className="text-xs text-gray-500 cursor-pointer select-none font-medium">Remember me</label>
                    </div>
                    <button type="button" className="text-xs font-bold text-[#001F3F] hover:underline">Forgot password?</button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#001F3F] hover:bg-[#002d5c] disabled:bg-blue-300 text-white rounded-xl font-bold shadow-xl shadow-[#001F3F]/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Sign in to Dashboard"
                  )}
                </button>

                <div className="text-center pt-4">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">Secure login</span>
                </div>

                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start space-x-3">
                  <Shield className="text-blue-600 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">Secure Connection</h4>
                    <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">Your login credentials are encrypted and secure. This session uses SSL/TLS encryption.</p>
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              By signing in, you agree to our <button className="text-blue-600 font-bold">Terms of Service</button> and <button className="text-blue-600 font-bold">Privacy Policy</button>
            </p>
            <p className="text-[10px] text-gray-400 mt-2">© 2026 BallotDA Enterprise. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
