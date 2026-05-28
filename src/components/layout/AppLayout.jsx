import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useGlobalJobNotifications } from '../../hooks/useGlobalJobNotifications';

const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  useGlobalJobNotifications();

  useEffect(() => {
    // Keep it simple - start collapsed for best table visibility
  }, []);

  const toggleCollapsed = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <Header onToggleSidebar={toggleCollapsed} />
      
      <div className="flex flex-1 pt-16">
        <Sidebar 
          isCollapsed={isCollapsed} 
          onItemClick={() => setIsCollapsed(true)} 
          onExpand={() => setIsCollapsed(false)}
        />
        
        <main className={`flex-1 flex flex-col min-h-full min-w-0 transition-all duration-300 overflow-x-auto ${isCollapsed ? 'ml-0 sm:ml-[60px]' : 'sm:ml-[60px] lg:ml-[220px]'}`}>
          <div className="p-3 sm:p-5 flex-1 overflow-x-hidden">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
