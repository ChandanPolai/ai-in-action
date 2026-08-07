import React, { useState } from 'react';
import Sidebar, { userNavItems } from './Sidebar';
import Header from './Header';
import LogoutConfirmModal from '../modals/LogoutConfirmModal';

export const Layout = ({ children, activeTab, setActiveTab, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const currentItem = userNavItems.find((item) => item.id === activeTab);
  const activeTitle = currentItem ? currentItem.label : 'Home';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onLogout={() => setShowLogoutModal(true)}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeTitle={activeTitle}
          onLogout={() => setShowLogoutModal(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
      />
    </div>
  );
};

export default Layout;
