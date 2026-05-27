import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import bdaLogo from '../../assets/bda-logo.webp';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

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
        <span className="text-sm text-brand-textMuted hidden sm:block">Civic Engagement Portal</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-brand-textPrimary">{user?.name || 'Administrator'}</p>
          <p className="text-xs text-brand-textMuted uppercase font-bold tracking-tighter">{user?.role || 'Admin'}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue font-bold text-lg">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <button 
          onClick={logout}
          className="flex items-center space-x-2 p-2 text-brand-textSecondary hover:text-brand-textPrimary transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
