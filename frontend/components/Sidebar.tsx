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
    <aside className="w-72 h-full flex flex-col bg-[#0f172a] relative z-10 no-print border-r border-white/5 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
      
      <div className="p-6 mb-2 relative z-10">
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-10 h-10 bg-indigo-700/50 border border-white/10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-indigo-600 transition-all group/btn"
            title="साइडबार बंद करा"
          >
            <PanelLeftClose className="w-3.5 h-3.5 group-hover/btn:-translate-x-0.5 transition-transform" />
          </button>
        )}
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="shrink-0 w-12 h-12 bg-white shadow-xl shadow-blue-500/10 p-2 rounded-2xl border border-white/20 transform group-sidebar-hover:scale-105 transition-transform duration-500">
            <img src="/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-white text-xl tracking-tighter leading-none">GramSarthi</h1>
            <div className="mt-1.5 flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none">ग्रामपंचायत</span>
              <span className="text-white/40 text-[10px] font-bold truncate leading-none">वेळा हरिश्चंद्र</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto hide-scrollbar pb-6 text-Marathi">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">मुख्य मेनू</p>
        </div>

        {navItems.filter(item => hasAccess(user, item.id, item.allowedRoles)).map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-300 group relative border-2 ${isActive
                ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-lg shadow-blue-500/5'
                : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300 active:scale-[0.98]'
                }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${isActive
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                : `bg-slate-800/50 text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-400 group-hover:scale-110`
                }`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 18, strokeWidth: 2.5 })}
              </div>

              <div className="text-left flex-1 min-w-0">
                <p className={`text-sm tracking-tight truncate transition-colors duration-300 ${isActive ? 'font-black' : 'font-bold'}`}>
                  {item.label}
                </p>
                <p className={`text-[10px] font-black uppercase tracking-widest truncate transition-colors duration-300 ${isActive ? 'text-blue-400/80' : 'text-slate-600 group-hover:text-slate-500'}`}>
                  {item.sublabel}
                </p>
              </div>

              {isActive && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info */}
      <div className="p-4 border-t border-white/10 bg-[#0f172a]/80 backdrop-blur-md relative" ref={profileRef}>
        {/* Profile Menu Dropdown */}
        {profileOpen && (
          <div className="absolute bottom-[calc(100%+12px)] left-4 right-4 bg-[#1e293b] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 border-b border-white/5 bg-white/5">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1.5">सत्र सक्रिय आहे</p>
              <p className="text-sm font-black text-white truncate">{user?.name || user?.username}</p>
            </div>
            <div className="p-3 space-y-1.5">
              <button
                onClick={() => { onEditProfile(); setProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-xs font-black uppercase tracking-wider group"
              >
                <Settings className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:rotate-45 transition-transform" />
                प्रोफाइल सेटिंग
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all text-xs font-black uppercase tracking-wider group"
              >
                <LogOut className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition-transform" />
                बाहेर पडा
              </button>
            </div>
          </div>
        )}

        <div
          onClick={() => setProfileOpen(!profileOpen)}
          className={`group flex items-center gap-4 p-3 rounded-[2rem] transition-all duration-300 cursor-pointer border-2 ${
            profileOpen ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-white/5 border-transparent'
          }`}
        >
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform border border-white/20">
              {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white truncate leading-tight">{user?.name || user?.username}</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <div className={`text-slate-600 transition-transform duration-500 ${profileOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-slate-400'}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>
    </aside>
  );
}
