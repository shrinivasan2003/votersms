import { Link } from 'react-router-dom';
import bdaLogo from '../../assets/bda-logo.webp';

const PublicNavbar = ({ rightContent, subtitle }) => (
  <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 lg:px-14 h-16 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-3">
      <Link to="/">
        <img src={bdaLogo} alt="BallotDA" className="h-9 w-auto object-contain" />
      </Link>
      {subtitle && (
        <>
          <div className="w-px h-5 bg-gray-200" />
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
            {subtitle}
          </span>
        </>
      )}
    </div>
    {rightContent && <div>{rightContent}</div>}
  </nav>
);

export default PublicNavbar;
