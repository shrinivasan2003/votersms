import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import bdaLogo from '../../assets/bda-logo.webp';

const Header = () => {
  const { user, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || user?.username || 'User';
  const fullName    = user?.name || user?.first_name
    ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    : displayName;
  const orgName     = user?.organization_name || user?.org_name || null;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-brand-border z-30 flex items-center justify-between px-4">

      {/* ── Left — Logo only ── */}
      <div className="flex items-center">
        <img src={bdaLogo} alt="BallotDA" className="h-8 w-auto object-contain" />
      </div>

      {/* ── Right — Welcome text + avatar dropdown ── */}
      <div className="flex items-center gap-4 ml-auto">

        {/* Welcome text */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-brand-textPrimary leading-tight">
            Welcome, {displayName}
          </p>
          {orgName
            ? <p className="text-xs text-brand-textMuted font-medium">{orgName}</p>
            : <p className="text-xs text-brand-textMuted uppercase font-bold tracking-tighter">{user?.role || 'User'}</p>
          }
        </div>

        {/* Avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className={`flex items-center gap-1.5 rounded-full transition-all focus:outline-none
              ${dropdownOpen ? 'ring-2 ring-brand-blue ring-offset-2' : 'hover:ring-2 hover:ring-gray-200 hover:ring-offset-1'}`}
            title="Account"
          >
            <div className="w-9 h-9 rounded-full bg-[#001F3F] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown
              size={13}
              className={`text-gray-400 transition-transform duration-200 hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-brand-border shadow-xl shadow-black/10 overflow-hidden z-50 animate-fade-in">

              {/* User info */}
              <div className="px-4 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#001F3F] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-textPrimary truncate">{fullName}</p>
                    {orgName && (
                      <p className="text-xs text-brand-textMuted truncate">{orgName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
