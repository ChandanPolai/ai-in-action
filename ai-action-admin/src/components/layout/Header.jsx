import React from 'react';
import { Menu, Settings, LogOut } from 'lucide-react';
import { useSelector } from 'react-redux';
import { imageUrl } from '../../services/apiClient';

export const Header = ({ onToggleSidebar, activeTitle, onOpenSettings, onLogout }) => {
  const { admin } = useSelector((state) => state.auth);

  return (
    <header className="sticky top-0 z-30 h-16 sm:h-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-slate-800 truncate">{activeTitle}</h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">Manage your AI in Action course</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button onClick={onOpenSettings} className="p-2 rounded-xl text-slate-500 hover:bg-brand-50 hover:text-brand-600 hidden sm:inline-flex">
          <Settings className="w-5 h-5" />
        </button>
        <button onClick={onLogout} className="p-2 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 sm:hidden">
          <LogOut className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center overflow-hidden">
            {admin?.profilePhoto ? (
              <img src={imageUrl(admin.profilePhoto)} alt="" className="w-full h-full object-cover" />
            ) : (
              (admin?.name || 'A').charAt(0).toUpperCase()
            )}
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{admin?.name || 'Admin'}</p>
            <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{admin?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
