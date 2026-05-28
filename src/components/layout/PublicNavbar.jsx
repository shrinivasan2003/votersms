import { Link } from 'react-router-dom';
import bdaLogo from '../../assets/bda-logo.webp';

const PublicNavbar = ({ rightContent, subtitle, navLinks }) => (
  <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 lg:px-14 h-14 sm:h-16 flex items-center justify-between shadow-sm">
    {/* Left — logo */}
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
      <Link to="/" className="shrink-0">
        <img src={bdaLogo} alt="BallotDA" className="h-7 sm:h-9 w-auto object-contain" />
      </Link>
      {subtitle && (
        <>
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />
          <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block truncate">
            {subtitle}
          </span>
        </>
      )}
    </div>

    {/* Center — nav links (hidden on small screens) */}
    {navLinks && (
      <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        {navLinks}
      </div>
    )}

    {/* Right — action slot */}
    {rightContent && <div className="shrink-0">{rightContent}</div>}
  </nav>
);

export default PublicNavbar;
