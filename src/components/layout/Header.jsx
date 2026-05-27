import { LogOut, Menu, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import bdaLogo from '../../assets/bda-logo.webp';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const displayName = user?.first_name || user?.name?.split(' ')[0] || user?.username || 'User';
  const orgName = user?.organization_name || user?.org_name || null;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-brand-border z-30 flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-brand-textSecondary hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center">
          <img src={bdaLogo} alt="BallotDA" className="h-8 w-auto object-contain" />
        </div>
        {orgName && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full">
            <Building2 size={13} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700">{orgName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-brand-textPrimary">Welcome, {displayName}</p>
          {orgName
            ? <p className="text-xs text-brand-textMuted font-medium">{orgName}</p>
            : <p className="text-xs text-brand-textMuted uppercase font-bold tracking-tighter">{user?.role || 'User'}</p>
          }
        </div>
        <div className="w-9 h-9 rounded-full bg-[#001F3F] flex items-center justify-center text-white font-bold text-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-2 p-2 text-brand-textSecondary hover:text-brand-textPrimary transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
