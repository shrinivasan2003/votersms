import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useGlobalJobNotifications } from '../../hooks/useGlobalJobNotifications';
import NadiaAI from '../shared/NadiaAI';

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

        {/* On mobile: no margin (sidebar is off-screen when collapsed, overlay when open)
            On sm+:    60px margin for icon bar, 220px when expanded */}
        <main className={`flex-1 flex flex-col min-h-full min-w-0 transition-all duration-300 ${
          isCollapsed ? 'ml-0 sm:ml-[60px]' : 'ml-0 sm:ml-[220px]'
        }`}>
          <div className="p-3 sm:p-5 flex-1 min-w-0">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>

      {/* Nadia AI — global floating assistant (wizard + email generator) */}
      <NadiaAI />
    </div>
  );
};

export default AppLayout;
