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
    <aside className="w-72 h-full flex flex-col bg-gradient-to-b from-indigo-800 to-indigo-950 relative z-10 no-print border-r border-white/5 overflow-hidden">
      <div className="p-4 mb-1 relative group-sidebar">
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-10 h-10 bg-indigo-700/50 border border-white/10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-indigo-600 transition-all group/btn"
            title="साइडबार बंद करा"
          >
            <PanelLeftClose className="w-3.5 h-3.5 group-hover/btn:-translate-x-0.5 transition-transform" />
          </button>
        )}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="shrink-0 w-12 h-12 bg-white p-2 rounded-2xl border border-white/20">
            <img src="/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-white text-lg leading-tight tracking-tight">GramSarthi</h1>
            <div className="mt-1 space-y-0.5">
              <p className="text-indigo-400 text-[10px] font-black tracking-widest uppercase leading-none">गट ग्रामपंचायत</p>
              <p className="text-white/60 text-[10px] font-bold tracking-wide leading-none truncate">वेळा हरिश्चंद्र</p>
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all duration-300 group relative ${isActive
                ? 'bg-indigo-600 text-white border border-white/10'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm ${isActive
                ? 'bg-white/20 text-white'
                : `bg-slate-800 text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-400`
                }`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 18 })}
              </div>

              <div className="text-left flex-1 min-w-0">
                <p className="text-sm tracking-tight truncate font-Marathi">{item.label}</p>
                <p className={`text-[10px] font-medium truncate transition-colors ${isActive ? 'text-indigo-100/70' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  {item.sublabel}
                </p>
              </div>

              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info */}
      <div className="p-4 border-t border-white/5 bg-black/20 relative" ref={profileRef}>
        {/* Profile Menu Dropdown (Top-up direction) */}
        {profileOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1E293B] rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4 border-b border-white/5 bg-white/5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">लॉग इन केलेले</p>
              <p className="text-sm font-bold text-white truncate">{user?.name || user?.username}</p>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => { onEditProfile(); setProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all text-sm font-bold group"
              >
                <Settings className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                प्रोफाइल सेटिंग
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-bold group"
              >
                <LogOut className="w-4 h-4 text-rose-500 group-hover:rotate-12 transition-transform" />
                लॉगआउट करा
              </button>
            </div>
          </div>
        )}

        <div
          onClick={() => setProfileOpen(!profileOpen)}
          className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer group border ${profileOpen ? 'bg-white/10 border-white/20' : 'hover:bg-white/5 border-transparent'}`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black group-hover:scale-105 transition-transform border border-white/10">
            {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-white truncate">{user?.name || user?.username}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <div className={`text-slate-500 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>
    </aside>
  );
}
