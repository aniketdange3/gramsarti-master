import React from 'react';
import { hasAccess } from '../utils/permissions';
import { Settings, LogOut, ChevronDown, PanelLeftClose } from 'lucide-react';

interface SidebarProps {
  user: any;
  activeView: string;
  onNavClick: (viewId: string) => void;
  totalRecords: number;
  navItems: {
    id: string;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
    allowedRoles?: string[];
  }[];
  onLogout: () => void;
  onEditProfile: () => void;
  onToggle?: () => void;
}

export default function Sidebar({ user, activeView, onNavClick, totalRecords, navItems, onLogout, onEditProfile, onToggle }: SidebarProps) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="w-full h-full flex flex-col bg-indigo-950 relative z-10 no-print border-r border-white/5 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
      
      <div className="p-4 mb-2 relative z-10">
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-50 w-8 h-8 bg-indigo-800/80 border border-white/10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-indigo-700 transition-all group/btn shadow-xl"
            title="साइडबार बंद करा"
          >
            <PanelLeftClose className="w-3 h-3 group-hover/btn:-translate-x-0.5 transition-transform" />
          </button>
        )}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="shrink-0 w-10 h-10 bg-white shadow-xl shadow-indigo-500/20 p-1.5 rounded-xl border border-white/20 transform hover:scale-105 transition-transform duration-300">
            <img src="/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-white text-lg tracking-tight leading-none">GramSarthi</h1>
            <div className="mt-1 flex flex-col">
              <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none">ग्रामपंचायत</span>
              <span className="text-white/40 text-[9px] font-bold truncate leading-none mt-0.5">वेळा हरिश्चंद्र</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar pb-6 text-Marathi">
        <div className="px-3 mb-3">
          <p className="text-[9px] font-black text-indigo-400/40 uppercase tracking-[0.2em]">मुख्य मेनू</p>
        </div>

        {navItems.filter(item => hasAccess(user, item.id, item.allowedRoles)).map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-200 group relative ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-indigo-200/60 hover:bg-white/5 hover:text-indigo-100'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive
                ? 'bg-white/20 text-white'
                : `bg-indigo-900/50 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300`
                }`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 16, strokeWidth: 2.5 })}
              </div>

              <div className="text-left flex-1 min-w-0">
                <p className={`text-[13px] tracking-tight truncate transition-colors duration-200 ${isActive ? 'font-black' : 'font-bold'}`}>
                  {item.label}
                </p>
                <p className={`text-[8px] font-black uppercase tracking-widest truncate transition-colors duration-200 ${isActive ? 'text-white/60' : 'text-indigo-500/60'}`}>
                  {item.sublabel}
                </p>
              </div>

              {isActive && (
                <div className="absolute right-2 w-1 h-3 bg-white/40 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info */}
      <div className="p-3 border-t border-white/5 bg-indigo-950 relative" ref={profileRef}>
        {/* Profile Menu Dropdown */}
        {profileOpen && (
          <div className="absolute bottom-[calc(100%+12px)] left-3 right-3 bg-indigo-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4 border-b border-white/5 bg-white/5">
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">सत्र सक्रिय आहे</p>
              <p className="text-sm font-black text-white truncate">{user?.name || user?.username}</p>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => { onEditProfile(); setProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-300 hover:bg-white/5 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider group"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-300 group-hover:rotate-45 transition-transform" />
                प्रोफाइल सेटिंग
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all text-[10px] font-black uppercase tracking-wider group"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-1 transition-transform" />
                बाहेर पडा
              </button>
            </div>
          </div>
        )}

        <div
          onClick={() => setProfileOpen(!profileOpen)}
          className={`group flex items-center gap-3 p-2 rounded-2xl transition-all duration-200 cursor-pointer border ${
            profileOpen ? 'bg-indigo-900/50 border-indigo-500/30' : 'hover:bg-white/5 border-transparent'
          }`}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-base font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform border border-white/20">
              {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-indigo-950 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-white truncate leading-tight">{user?.name || user?.username}</p>
            <p className="text-[8px] font-black text-indigo-400/60 uppercase tracking-widest mt-0.5">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <div className={`text-indigo-600 transition-transform duration-300 ${profileOpen ? 'rotate-180 text-indigo-400' : 'group-hover:text-indigo-400'}`}>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </aside>
  );
}
