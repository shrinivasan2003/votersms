/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, MapPin, Building2, Users, MessageSquare, Mail,
  MessageCircle, Radio, AtSign, Phone, Send, MailOpen,
  Play, FileText, Shield, Key, KeyRound,
  ChevronDown, ChevronRight, Package, RefreshCw, ListChecks
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, isCollapsed, onItemClick }) => (
  <NavLink
    to={to}
    onClick={onItemClick}
    className={({ isActive }) =>
      `flex items-center px-10 py-2.5 transition-all border-l-[3px] overflow-hidden whitespace-nowrap ${
        isActive 
          ? 'bg-blue-50 border-blue-600 text-blue-600 font-bold' 
          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`
    }
    title={isCollapsed ? label : ""}
  >
    <div className="flex items-center min-w-[18px]">
      <Icon size={18} className="shrink-0" />
    </div>
    <span className={`ml-4 text-sm transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
      {label}
    </span>
  </NavLink>
);

const NavGroup = ({ label, icon: Icon, children, isCollapsed, isOpen, onToggle, onExpand }) => {
  const location = useLocation();
  const childrenArray = React.Children.toArray(children);
  const hasActiveChild = childrenArray.some(child => 
    child.props && child.props.to === location.pathname
  );

  const handleClick = () => {
    if (isCollapsed) {
      onExpand();
    }
    onToggle();
  };

  return (
    <div className="mb-1">
      <button 
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-5 py-3 text-gray-700 hover:text-brand-textPrimary transition-colors overflow-hidden ${hasActiveChild && isCollapsed ? 'text-blue-600 font-bold' : ''}`}
        title={isCollapsed ? label : ""}
      >
        <div className="flex items-center min-w-[20px]">
          <Icon size={20} className={`shrink-0 ${hasActiveChild && isCollapsed ? 'text-blue-600' : ''}`} />
          <span className={`ml-4 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            {label}
          </span>
        </div>
        {!isCollapsed && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </button>
      {!isCollapsed && isOpen && (
        <div className="bg-gray-50/30 py-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isCollapsed, onItemClick, onExpand }) => {
  const [openGroup, setOpenGroup] = useState('Masters');
  const location = useLocation();
  const { user } = useAuth();

  // Auto-expand group if child is active
  useEffect(() => {
    if (['/counties', '/precincts', '/recipients', '/voters', '/lists', '/sms-templates', '/email-templates', '/whatsapp-templates', '/sms-providers', '/email-providers', '/whatsapp-providers'].includes(location.pathname)) {
      setOpenGroup('Masters');
    } else if (['/sms-jobs', '/email-jobs', '/whatsapp-jobs', '/process-job'].includes(location.pathname)) {
      setOpenGroup('Transactions');
    } else if (['/sms-delivery-report', '/email-delivery-report'].includes(location.pathname)) {
      setOpenGroup('Reports');
    }
  }, [location.pathname]);

  const handleToggle = (group) => {
    setOpenGroup(openGroup === group ? null : group);
  };

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div className="fixed inset-0 bg-black/20 z-10 lg:hidden" onClick={onItemClick} />
      )}
      
      <aside 
        className={`fixed top-16 left-0 bottom-0 bg-white border-r border-brand-border z-20 flex flex-col overflow-y-auto overflow-x-hidden shadow-sm transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[60px]' : 'w-[220px]'
        }`}
      >
        <nav className="flex-1 py-4">
          <div className="mb-2">
            <NavLink
              to="/dashboard"
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center px-5 py-3 transition-all border-l-[3px] overflow-hidden whitespace-nowrap ${
                  isActive 
                    ? 'bg-blue-50 border-blue-600 text-blue-600 font-bold' 
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`
              }
              title={isCollapsed ? "Dashboard" : ""}
            >
              <div className="flex items-center min-w-[20px]">
                <Home size={20} className="shrink-0" />
              </div>
              <span className={`ml-4 text-sm font-bold transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                Dashboard
              </span>
            </NavLink>
          </div>

          <NavGroup 
            label="Masters" 
            icon={Package} 
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Masters'}
            onToggle={() => handleToggle('Masters')}
            onExpand={onExpand}
          >
            <NavItem to="/counties" icon={MapPin} label="Counties" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/precincts" icon={Building2} label="Precincts" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/recipients" icon={Users} label="Recipients" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/lists" icon={ListChecks} label="Lists" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/sms-templates" icon={MessageSquare} label="SMS Templates" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/email-templates" icon={Mail} label="Email Templates" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/whatsapp-templates" icon={MessageCircle} label="WhatsApp Templates" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/sms-providers" icon={Radio} label="SMS Providers" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/email-providers" icon={AtSign} label="Email Providers" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/whatsapp-providers" icon={Phone} label="WhatsApp Providers" isCollapsed={isCollapsed} onItemClick={onItemClick} />
          </NavGroup>

          <NavGroup 
            label="Transactions" 
            icon={RefreshCw} 
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Transactions'}
            onToggle={() => handleToggle('Transactions')}
            onExpand={onExpand}
          >
            <NavItem to="/sms-jobs" icon={Send} label="SMS Jobs" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/email-jobs" icon={MailOpen} label="Email Jobs" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/whatsapp-jobs" icon={MessageCircle} label="WhatsApp Jobs" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/process-job" icon={Play} label="Process Jobs" isCollapsed={isCollapsed} onItemClick={onItemClick} />
          </NavGroup>

          <NavGroup 
            label="Reports" 
            icon={FileText} 
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Reports'}
            onToggle={() => handleToggle('Reports')}
            onExpand={onExpand}
          >
            <NavItem to="/sms-delivery-report"   icon={FileText} label="SMS Delivery Report"   isCollapsed={isCollapsed} onItemClick={onItemClick} />
            <NavItem to="/email-delivery-report" icon={Mail}     label="Email Analytics"        isCollapsed={isCollapsed} onItemClick={onItemClick} />
          </NavGroup>

          {user?.role?.toLowerCase() === 'admin' && (
            <NavGroup 
              label="Admin" 
              icon={Shield} 
              isCollapsed={isCollapsed}
              isOpen={openGroup === 'Admin'}
              onToggle={() => handleToggle('Admin')}
              onExpand={onExpand}
            >
              <NavItem to="/users" icon={Users} label="Users" isCollapsed={isCollapsed} onItemClick={onItemClick} />
              <NavItem to="/roles" icon={Shield} label="Roles" isCollapsed={isCollapsed} onItemClick={onItemClick} />
              <NavItem to="/permissions" icon={Key} label="Permissions" isCollapsed={isCollapsed} onItemClick={onItemClick} />
              <NavItem to="/reset-password" icon={KeyRound} label="Reset Password" isCollapsed={isCollapsed} onItemClick={onItemClick} />
            </NavGroup>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
