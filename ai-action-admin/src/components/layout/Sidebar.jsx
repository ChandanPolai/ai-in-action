import React, { useState } from 'react';
import Logo from '../ui/Logo';
import {
  LayoutDashboard,
  Users,
  Video,
  CalendarCheck,
  Clapperboard,
  Inbox,
  BookOpen,
  MessageSquareWarning,
  Star,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  LogOut,
  Globe,
  Image,
  Quote,
  CalendarDays,
  Layers
} from 'lucide-react';

export const websiteNavChildren = [
  { id: 'website-hero', label: 'Hero Section', icon: Image },
  { id: 'website-workshops', label: 'Workshops', icon: Layers },
  { id: 'website-sessions', label: 'Sessions', icon: CalendarDays },
  { id: 'website-testimonials', label: 'Testimonials', icon: Quote },
  { id: 'website-gallery', label: 'Gallery', icon: Image }
];

export const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'recordings', label: 'Recordings', icon: Clapperboard },
  { id: 'play-requests', label: 'Play Requests', icon: Inbox },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  {
    id: 'website',
    label: 'Website',
    icon: Globe,
    children: websiteNavChildren
  },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareWarning },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export const findNavLabel = (activeTab) => {
  for (const item of adminNavItems) {
    if (item.id === activeTab) return item.label;
    if (item.children) {
      const child = item.children.find((c) => c.id === activeTab);
      if (child) return child.label;
    }
  }
  return 'Dashboard';
};

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen, isCollapsed, onToggleCollapse, onLogout }) => {
  const websiteActive = websiteNavChildren.some((c) => c.id === activeTab);
  const [websiteOpen, setWebsiteOpen] = useState(websiteActive);

  return (
    <>
      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} w-72`}
      >
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3.5 top-7 z-50 w-7 h-7 bg-white border border-slate-200 rounded-full shadow-md items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`h-20 flex items-center justify-between border-b border-slate-100 ${isCollapsed ? 'lg:px-3 px-6' : 'px-6'}`}>
          <Logo size="md" showText={!isCollapsed} />
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const open = websiteOpen || websiteActive;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) {
                        setActiveTab(item.children[0].id);
                        setIsOpen(false);
                      } else {
                        setWebsiteOpen((v) => !v);
                      }
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      websiteActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                    } ${isCollapsed ? 'lg:justify-center' : ''}`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className={`${isCollapsed ? 'lg:hidden' : ''} truncate flex-1 text-left`}>{item.label}</span>
                    {!isCollapsed && (
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {open && !isCollapsed && (
                    <div className="mt-1 ml-3 pl-3 border-l border-slate-200 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = activeTab === child.id;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(child.id);
                              setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all ${
                              active
                                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                            }`}
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                } ${isCollapsed ? 'lg:justify-center' : ''}`}
                title={item.label}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={`${isCollapsed ? 'lg:hidden' : ''} truncate`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 ${isCollapsed ? 'lg:justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={isCollapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
