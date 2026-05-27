import { Link } from 'react-router-dom';
import { MessageSquare, Mail, MessageCircle, BarChart2, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import bdaLogo from '../assets/bda-logo.webp';

const features = [
  { icon: MessageSquare, color: '#6366F1', label: 'SMS Campaigns',      desc: 'Reach voters instantly with targeted SMS messaging campaigns.' },
  { icon: Mail,          color: '#3B82F6', label: 'Email Outreach',     desc: 'Send personalized email campaigns at scale to your audience.' },
  { icon: MessageCircle, color: '#10B981', label: 'WhatsApp Messaging', desc: 'Engage communities through WhatsApp broadcast messages.' },
  { icon: BarChart2,     color: '#F59E0B', label: 'Delivery Analytics', desc: 'Track open rates, delivery status, and engagement in real time.' },
  { icon: Users,         color: '#EC4899', label: 'Voter Management',   desc: 'Manage recipients, lists, and segmentation in one place.' },
  { icon: ShieldCheck,   color: '#001F3F', label: 'Secure & Isolated',  desc: 'Each organization\'s data is fully isolated and secure.' },
];

const stats = [
  { value: '500K+', label: 'Messages Sent' },
  { value: '1,200+', label: 'Campaigns Run' },
  { value: '99.9%', label: 'Uptime' },
  { value: '50+', label: 'Organizations' },
];

const LandingPage = () => (
  <div className="min-h-screen bg-white flex flex-col">
    {/* Nav */}
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-[#001F3F] p-2 rounded-xl">
          <img src={bdaLogo} alt="BallotDA" className="h-7 w-auto object-contain" />
        </div>
        <span className="font-extrabold text-[#001F3F] text-lg tracking-tight">BallotDA</span>
      </div>
      <Link
        to="/login"
        className="flex items-center gap-1.5 px-5 py-2.5 bg-[#001F3F] text-white text-sm font-bold rounded-xl hover:bg-[#002d5c] transition-all active:scale-[0.97]"
      >
        Login <ChevronRight size={15} />
      </Link>
    </nav>

    {/* Hero */}
    <section className="pt-28 pb-20 px-6 bg-gradient-to-br from-[#001F3F] via-[#003366] to-[#004080] text-white text-center">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-200 mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Trusted by 50+ civic organizations
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
          Civic Engagement,<br />
          <span className="text-blue-300">Simplified.</span>
        </h1>
        <p className="text-blue-200 text-lg sm:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
          BallotDA is the all-in-one platform for voter outreach — SMS, email, and WhatsApp campaigns,
          delivery analytics, and organization-level data isolation. All in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-[#001F3F] text-base font-extrabold rounded-2xl shadow-xl hover:bg-blue-50 transition-all active:scale-[0.97]"
          >
            Get Started <ChevronRight size={18} />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 border border-white/30 text-white text-base font-bold rounded-2xl hover:bg-white/10 transition-all"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>

    {/* Stats bar */}
    <section className="bg-[#001F3F] border-t border-white/10 py-8">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6 text-center">
        {stats.map(({ value, label }) => (
          <div key={label}>
            <p className="text-3xl font-extrabold text-white">{value}</p>
            <p className="text-blue-300 text-sm font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Features */}
    <section id="features" className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Platform Features</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#001F3F] mb-4">Everything you need to reach voters</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            One unified platform covering every communication channel your organization uses.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, color, label, desc }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: color + '18' }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold text-[#001F3F] mb-1.5">{label}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-6 bg-gradient-to-r from-[#001F3F] to-[#003d7a] text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Ready to engage your community?</h2>
        <p className="text-blue-200 mb-8">Log in to your organization's portal and start your next campaign today.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-12 py-4 bg-white text-[#001F3F] text-base font-extrabold rounded-2xl shadow-2xl hover:bg-blue-50 transition-all active:scale-[0.97]"
        >
          Go to Login <ChevronRight size={18} />
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-[#001F3F] py-6 text-center">
      <p className="text-blue-400 text-xs font-medium">
        © 2026 BallotDA Enterprise · All rights reserved ·{' '}
        <Link to="/admin" className="hover:text-blue-200 transition-colors">Admin</Link>
      </p>
    </footer>
  </div>
);

export default LandingPage;
