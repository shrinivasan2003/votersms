import { Link } from 'react-router-dom';
import {
  MessageSquare, Mail, MessageCircle, BarChart2, Users, ShieldCheck,
  ChevronRight, ArrowRight, Zap, Globe,
} from 'lucide-react';
import PublicNavbar from '../components/layout/PublicNavbar';
import PublicFooter from '../components/layout/PublicFooter';

const features = [
  { icon: MessageSquare, color: '#6366F1', from: '#EEF2FF', to: '#F5F3FF', label: 'SMS Campaigns',      desc: 'Reach voters instantly with targeted SMS messaging campaigns at scale.' },
  { icon: Mail,          color: '#3B82F6', from: '#EFF6FF', to: '#EFF6FF', label: 'Email Outreach',     desc: 'Send personalized email campaigns to thousands of constituents at once.' },
  { icon: MessageCircle, color: '#10B981', from: '#ECFDF5', to: '#F0FDFA', label: 'WhatsApp Messaging', desc: 'Engage communities through WhatsApp broadcast messages.' },
  { icon: BarChart2,     color: '#F59E0B', from: '#FFFBEB', to: '#FFF7ED', label: 'Delivery Analytics', desc: 'Track open rates, delivery status, and engagement in real time.' },
  { icon: Users,         color: '#EC4899', from: '#FDF2F8', to: '#FFF1F2', label: 'Voter Management',   desc: 'Manage recipients, lists, and segmentation all in one place.' },
  { icon: ShieldCheck,   color: '#001F3F', from: '#F8FAFC', to: '#EFF6FF', label: 'Secure & Isolated',  desc: "Each organization's data is fully isolated, encrypted, and secure." },
];

const stats = [
  { value: '500K+', label: 'Messages Sent',  accent: 'text-blue-400'   },
  { value: '1,200+', label: 'Campaigns Run', accent: 'text-indigo-400' },
  { value: '99.9%',  label: 'Uptime',        accent: 'text-emerald-400'},
  { value: '50+',    label: 'Organizations', accent: 'text-purple-400' },
];

const LandingPage = () => (
  <div className="min-h-screen bg-white flex flex-col font-sans">

    {/* ── Navbar ─────────────────────────────────────────────────────────────── */}
    <PublicNavbar
      rightContent={
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#001F3F] text-white text-sm font-bold rounded-xl hover:bg-[#002d5c] transition-all active:scale-[0.97] shadow-lg shadow-[#001F3F]/20"
        >
          Login <ArrowRight size={14} />
        </Link>
      }
    />

    {/* ── Hero ───────────────────────────────────────────────────────────────── */}
    <section className="relative min-h-[66vh] flex items-center bg-[#001F3F] text-white overflow-hidden">
      {/* decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/3 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-sky-400/10 rounded-full blur-[80px]" />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10 py-[62px]">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-3.5 py-1 text-xs font-semibold text-blue-200 mb-[22px] backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          Outreach Platform · Trusted by 50+ Organizations
        </div>

        <h1 className="text-[32px] sm:text-[40px] lg:text-[47px] font-extrabold leading-[1.06] mb-4 tracking-tight">
          Voter Outreach,
          <br />
          <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            Simplified.
          </span>
        </h1>

        <p className="text-blue-200/85 text-base sm:text-lg mb-7 leading-relaxed max-w-2xl mx-auto">
          Outreach Platform is the all-in-one platform for SMS, email, and WhatsApp campaigns
          with real-time analytics and secure, organization-level data isolation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-white text-[#001F3F] text-sm font-extrabold rounded-xl shadow-2xl shadow-black/25 hover:bg-blue-50 transition-all active:scale-[0.97]"
          >
            Get Started <ChevronRight size={15} />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 border border-white/20 text-white/85 text-sm font-semibold rounded-xl hover:bg-white/8 hover:border-white/35 transition-all"
          >
            <Globe size={14} />
            Explore Features
          </a>
        </div>
      </div>

      {/* wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12">
          <path d="M0 60L1440 60L1440 20C1200 55 960 5 720 25C480 45 240 0 0 30L0 60Z" fill="#001020"/>
        </svg>
      </div>
    </section>

    {/* ── Stats ──────────────────────────────────────────────────────────────── */}
    <section className="bg-[#001020]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map(({ value, label, accent }, i) => (
            <div
              key={label}
              className={`py-10 text-center ${i < stats.length - 1 ? 'border-r border-white/8' : ''}`}
            >
              <p className={`text-4xl font-extrabold ${accent} tabular-nums`}>{value}</p>
              <p className="text-gray-400 text-sm font-medium mt-2">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Features ───────────────────────────────────────────────────────────── */}
    <section id="features" className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#001F3F] mb-4">
            Everything you need to reach voters
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            One unified outreach platform covering every communication channel your organization uses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, color, from, to, label, desc }) => (
            <div
              key={label}
              className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-default overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, ${color}55, ${color}22)` }}
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold text-[#001F3F] text-base mb-2">{label}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── CTA ────────────────────────────────────────────────────────────────── */}
    <section className="relative py-24 px-6 bg-[#001F3F] text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-blue-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />
      </div>
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-xs font-semibold text-amber-300 mb-6">
          <Zap size={12} fill="currentColor" />
          Launch your next campaign in minutes
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          Ready to engage your community?
        </h2>
        <p className="text-blue-200/75 mb-10 text-base leading-relaxed">
          Log in to your organization's portal and start your outreach campaign today.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2.5 px-12 py-4 bg-white text-[#001F3F] text-base font-extrabold rounded-2xl shadow-2xl hover:bg-blue-50 transition-all active:scale-[0.97]"
        >
          Go to Login <ArrowRight size={18} />
        </Link>
      </div>
    </section>

    {/* ── Footer ─────────────────────────────────────────────────────────────── */}
    <PublicFooter />
  </div>
);

export default LandingPage;
