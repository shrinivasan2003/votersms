import { Link } from 'react-router-dom';
import {
  MessageSquare, Mail, MessageCircle, BarChart2, Users, ShieldCheck,
  ArrowRight, Zap, CheckCircle2, Bell, Send, TrendingUp, Lock,
  ChevronDown,
} from 'lucide-react';
import PublicNavbar from '../components/layout/PublicNavbar';
import PublicFooter from '../components/layout/PublicFooter';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const channels = [
  { icon: MessageSquare, label: 'SMS',      color: '#6366F1', bg: 'bg-indigo-50' },
  { icon: Mail,          label: 'Email',    color: '#3B82F6', bg: 'bg-blue-50'   },
  { icon: MessageCircle, label: 'WhatsApp', color: '#10B981', bg: 'bg-emerald-50'},
];

const features = [
  { icon: Send,       color: '#6366F1', bg: 'bg-indigo-50', label: 'Multi-Channel Campaigns',  desc: 'Send targeted messages via SMS, Email, and WhatsApp from one unified dashboard — no switching tools.' },
  { icon: Users,      color: '#3B82F6', bg: 'bg-blue-50',   label: 'Smart Voter Management',   desc: 'Organize recipients into lists, segments, and precincts. Reach the right people every time.' },
  { icon: BarChart2,  color: '#F59E0B', bg: 'bg-amber-50',  label: 'Real-Time Analytics',      desc: 'Track delivery, open rates, and engagement live. Make data-driven decisions instantly.' },
  { icon: Bell,       color: '#EC4899', bg: 'bg-pink-50',   label: 'Instant Notifications',    desc: 'Get notified the moment a campaign completes. Never miss a delivery update again.' },
  { icon: Lock,       color: '#001F3F', bg: 'bg-slate-50',  label: 'Organization Isolation',   desc: "Each organization's data is fully encrypted and isolated. No cross-tenant access — ever." },
  { icon: TrendingUp, color: '#10B981', bg: 'bg-emerald-50', label: 'Scalable at Any Size',    desc: 'From hundreds to hundreds of thousands of recipients — scales with your campaign seamlessly.' },
];

const steps = [
  { num: '01', title: 'Set Up Your Organization', desc: 'Create your account, configure your SMS, Email, and WhatsApp providers in minutes.' },
  { num: '02', title: 'Upload Your Voter Lists',   desc: 'Import recipients, create segments by precinct or list, and manage contacts centrally.' },
  { num: '03', title: 'Launch Your Campaign',      desc: 'Choose a channel, pick a template, select recipients, and send — or schedule for later.' },
];

const stats = [
  { value: '500K+',  label: 'Messages Delivered', icon: Send,         color: 'text-indigo-500'  },
  { value: '1,200+', label: 'Campaigns Run',       icon: TrendingUp,   color: 'text-blue-500'    },
  { value: '99.9%',  label: 'Platform Uptime',     icon: CheckCircle2, color: 'text-emerald-500' },
  { value: '50+',    label: 'Organizations',        icon: Users,        color: 'text-purple-500'  },
];

const trustCards = [
  {
    icon: ShieldCheck,
    color: '#001F3F',
    iconBg: 'bg-[#001F3F]',
    hoverBorder: 'hover:border-[#001F3F]/30',
    hoverShadow: 'hover:shadow-[#001F3F]/10',
    badge: 'Security',
    badgeColor: 'bg-slate-100 text-slate-600',
    title: 'Enterprise Security',
    desc: 'SOC-2 aligned. Data encrypted at rest and in transit. Every organization fully isolated — your data stays yours.',
    points: ['End-to-end encryption', 'Per-org data isolation', 'Audit trail on all actions'],
  },
  {
    icon: Zap,
    color: '#F59E0B',
    iconBg: 'bg-amber-500',
    hoverBorder: 'hover:border-amber-200',
    hoverShadow: 'hover:shadow-amber-500/10',
    badge: 'Performance',
    badgeColor: 'bg-amber-50 text-amber-600',
    title: 'Instant Delivery',
    desc: 'Messages dispatched in seconds with real-time status tracking, automatic retries, and provider failover.',
    points: ['Sub-second dispatch', 'Auto retry on failure', 'Multi-provider support'],
  },
  {
    icon: BarChart2,
    color: '#3B82F6',
    iconBg: 'bg-blue-500',
    hoverBorder: 'hover:border-blue-200',
    hoverShadow: 'hover:shadow-blue-500/10',
    badge: 'Insights',
    badgeColor: 'bg-blue-50 text-blue-600',
    title: 'Actionable Insights',
    desc: 'Detailed reports on every campaign — open rates, click-throughs, delivery stats, and voter engagement trends.',
    points: ['Live delivery tracking', 'Open & click-through rates', 'Exportable reports'],
  },
];

/* ── Mock dashboard ──────────────────────────────────────────────────────── */
const DashboardMock = () => (
  <div className="relative w-full max-w-[360px] mx-auto">
    <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-3xl scale-110" />
    <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">Campaign Overview</span>
        <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      {[
        { label: 'SMS Delivered',  val: '12,480', pct: 94, color: 'bg-indigo-400' },
        { label: 'Emails Opened',  val: '8,312',  pct: 72, color: 'bg-blue-400'   },
        { label: 'WhatsApp Read',  val: '5,940',  pct: 88, color: 'bg-emerald-400'},
      ].map(({ label, val, pct, color }) => (
        <div key={label} className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/60">{label}</span>
            <span className="text-white font-bold">{val}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 mt-4">
        {channels.map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5">
            <Icon size={11} style={{ color }} />
            <span className="text-white/70 text-[10px] font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Page ─────────────────────────────────────────────────────────────────── */
const LandingPage = () => (
  <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden">

    {/* ── Navbar ───────────────────────────────────────────────────────────── */}
    <PublicNavbar
      rightContent={
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#001F3F] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#002d5c] transition-all active:scale-[0.97] shadow-lg shadow-[#001F3F]/20"
        >
          Login <ArrowRight size={13} />
        </Link>
      }
    />

    {/* ── Hero ─────────────────────────────────────────────────────────────── */}
    <section className="relative bg-[#001F3F] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/4 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] bg-blue-600/10 rounded-full blur-[120px] sm:blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-500/10 rounded-full blur-[100px] sm:blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-3.5 py-1.5 text-xs font-semibold text-blue-200 mb-5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              Trusted by 50+ Organizations Nationwide
            </div>

            <h1 className="text-[32px] sm:text-[44px] lg:text-[52px] xl:text-[58px] font-extrabold leading-[1.05] mb-4 sm:mb-5 tracking-tight">
              Reach More People with
              <span className="block bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent mt-1">
                Smarter Outreach
              </span>
            </h1>

            <p className="text-blue-200/80 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0">
              The all-in-one platform for businesses, institutions, nonprofits, and organizations to send SMS, Email, and WhatsApp campaigns with real-time analytics, audience management, and secure data protection.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-7 sm:mb-9">
              {channels.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-full px-3 py-1.5">
                  <Icon size={12} style={{ color }} />
                  <span className="text-white/75 text-xs font-semibold">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-full px-3 py-1.5">
                <BarChart2 size={12} className="text-amber-300" />
                <span className="text-white/75 text-xs font-semibold">Analytics</span>
              </div>
            </div>

            <div className="flex flex-col xs:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-[#001F3F] text-sm font-extrabold rounded-xl shadow-2xl shadow-black/30 hover:bg-blue-50 transition-all active:scale-[0.97]"
              >
                Get Started Free <ArrowRight size={15} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 border border-white/20 text-white/80 text-sm font-semibold rounded-xl hover:bg-white/8 hover:border-white/35 transition-all"
              >
                See How It Works <ChevronDown size={14} />
              </a>
            </div>
          </div>

          {/* Right — visible md+ */}
          <div className="hidden md:block">
            <DashboardMock />
          </div>
        </div>
      </div>

      {/* wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10 sm:h-14">
          <path d="M0 56L1440 56L1440 18C1200 50 960 2 720 20C480 38 240 0 0 24L0 56Z" fill="white"/>
        </svg>
      </div>
    </section>

    {/* ── Stats ────────────────────────────────────────────────────────────── */}
    <section className="py-10 sm:py-14 px-4 sm:px-6 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map(({ value, label, icon: Icon, color }) => (
            <div key={label} className="text-center group">
              <div className="flex justify-center mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Icon size={16} className={color} />
                </div>
              </div>
              <p className={`text-2xl sm:text-3xl font-extrabold ${color} tabular-nums`}>{value}</p>
              <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── How It Works ─────────────────────────────────────────────────────── */}
    <section id="how-it-works" className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-3">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#001F3F] mb-2 sm:mb-3">
            Launch a campaign in 3 steps
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            From setup to send in minutes — no technical expertise required.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 relative">
          <div className="hidden sm:block absolute top-[22px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="relative bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-blue-100 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-[#001F3F] text-white flex items-center justify-center text-xs font-extrabold mb-4 shadow-lg shadow-[#001F3F]/20 shrink-0">
                {num}
              </div>
              <h3 className="font-bold text-[#001F3F] text-sm sm:text-base mb-1.5">{title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Features ─────────────────────────────────────────────────────────── */}
    <section id="features" className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
            Platform Features
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#001F3F] mb-2 sm:mb-3">
            Everything your campaign needs
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            One unified platform covering every communication channel — built specifically for civic outreach.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map(({ icon: Icon, color, bg, label, desc }) => (
            <div
              key={label}
              className="group relative bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 hover:shadow-xl hover:border-gray-200 hover:-translate-y-1.5 transition-all duration-300 cursor-default overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, ${color}, ${color}44)` }}
              />
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${bg} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="font-bold text-[#001F3F] text-sm sm:text-base mb-1.5 sm:mb-2">{label}</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Why BallotDA ─────────────────────────────────────────────────────── */}
    <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-50 border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#001F3F] bg-[#001F3F]/8 border border-[#001F3F]/15 px-3 py-1 rounded-full mb-3">
            Why BallotDA
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#001F3F] mb-2 sm:mb-3">
            Why organizations choose BallotDA
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Built from the ground up for civic outreach — not adapted from generic tools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {trustCards.map(({ icon: Icon, color, iconBg, hoverBorder, hoverShadow, badge, badgeColor, title, desc, points }) => (
            <div
              key={title}
              className={`group relative bg-white rounded-2xl border border-gray-100 ${hoverBorder} p-5 sm:p-6 shadow-sm hover:shadow-xl ${hoverShadow} hover:-translate-y-2 transition-all duration-300 cursor-default overflow-hidden`}
            >
              {/* animated gradient bg on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-2xl"
                style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)` }} />

              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={20} className="text-white" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeColor}`}>
                  {badge}
                </span>
              </div>

              <h3 className="font-bold text-[#001F3F] text-sm sm:text-base mb-2">{title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-4">{desc}</p>

              <ul className="space-y-1.5">
                {points.map(p => (
                  <li key={p} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 size={13} style={{ color }} className="shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── CTA ──────────────────────────────────────────────────────────────── */}
    <section className="relative py-12 sm:py-16 px-4 sm:px-6 bg-[#001F3F] text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-60 sm:h-80 bg-blue-500/10 rounded-full blur-[100px] sm:blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-indigo-500/8 rounded-full blur-[80px] sm:blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-xs font-semibold text-amber-300 mb-5">
          <Zap size={12} fill="currentColor" />
          Ready to reach more recipients?
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-[42px] font-extrabold text-white mb-3 sm:mb-4 leading-tight">
          Start your outreach campaign today
        </h2>
        <p className="text-blue-200/70 mb-6 sm:mb-7 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
          Log in to your organization's portal and launch your first campaign in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-[#001F3F] text-sm font-extrabold rounded-xl shadow-2xl hover:bg-blue-50 transition-all active:scale-[0.97]"
          >
            Go to Login <ArrowRight size={16} />
          </Link>
          <a
            href="https://ballotda.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 border border-white/20 text-white/80 text-sm font-semibold rounded-xl hover:bg-white/8 hover:border-white/35 transition-all"
          >
            Learn More about BallotDA
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-7">
          {['Secure & Encrypted', 'No Setup Fees', '99.9% Uptime', 'Real-time Support'].map(item => (
            <div key={item} className="flex items-center gap-1.5 text-blue-200/50 text-xs font-medium">
              <CheckCircle2 size={12} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Footer ───────────────────────────────────────────────────────────── */}
    <PublicFooter />
  </div>
);

export default LandingPage;
