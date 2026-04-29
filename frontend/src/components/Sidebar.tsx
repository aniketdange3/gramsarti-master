import React from 'react';
import { hasAccess } from '../utils/permissions';
import { Settings, LogOut, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ user, activeView, onNavClick, totalRecords, navItems, onLogout, onEditProfile, onToggle, isCollapsed, onToggleCollapse }: SidebarProps) {
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
    <aside className={`h-full flex flex-col bg-[#1f1c4f] bg-gradient-to-b from-[#1f1c4f] to-[#12102e] no-print border-r border-white/5 font-sans transition-all duration-300 relative z-[100] ${isCollapsed ? 'w-20' : 'w-full'}`}>
      <div className={`p-6 relative transition-all duration-300 ${isCollapsed ? 'px-4' : 'px-6'}`}>
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-10 h-10 roun ">
            <img src="/images/logo.jpeg" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="font-black text-white text-lg tracking-tighter leading-none uppercase">GramSarthi</h1>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1 leading-none">मालमत्ता कर</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3.5 top-8 w-7 h-7 bg-[#1f1c4f] text-indigo-300 rounded-full flex items-center justify-center shadow-lg border border-white/10 hover:bg-indigo-500 hover:text-white transition-all z-50 md:flex hidden"
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 space-y-0.5 overflow-y-auto hide-scrollbar pb-6 text-Marathi transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        <div className={`px-2 mb-2 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <p className="text-[8px] font-black text-indigo-400/50 uppercase tracking-[0.2em]">मुख्य मेनू</p>
        </div>

        {navItems.filter(item => hasAccess(user, item.id, item.allowedRoles)).map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${isActive
                ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-white/20'
                : 'text-indigo-200/50 hover:text-white'
                }`}
            >
              {!isActive && !isCollapsed && (
                <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out -z-10" />
              )}

              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${isActive
                ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                : 'bg-white/5 text-indigo-400 group-hover:bg-white/10 group-hover:text-white'
                }`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 16, strokeWidth: 2.5 })}
              </div>

              {!isCollapsed && (
                <div className="text-left flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <p className={`text-[13px] tracking-tight truncate transition-colors ${isActive ? 'font-black' : 'font-bold'}`}>
                    {item.label}
                  </p>
                  <p className={`text-[9px] font-black uppercase tracking-[0.15em] truncate ${isActive ? 'text-indigo-300' : 'text-indigo-400/40'}`}>
                    {item.sublabel}
                  </p>
                </div>
              )}

              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-400 rounded-l-full shadow-[0_0_12px_rgba(129,140,248,0.8)] animate-in slide-in-from-right duration-300" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info */}
      <div className={`p-3 bg-black/20 border-t border-white/5 relative transition-all duration-300`} ref={profileRef}>
        {/* Profile Menu Dropdown */}
        {profileOpen && !isCollapsed && (
          <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 bg-[#1a1842] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 text-Marathi">
            <div className="p-3 border-b border-white/5 bg-white/5">
              <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">सत्र सक्रिय</p>
              <p className="text-xs font-bold text-white truncate">{user?.name || user?.username}</p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => { onEditProfile(); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-indigo-200/70 hover:bg-white/5 hover:text-white transition-all text-[11px] font-bold"
              >
                <Settings size={12} />
                सेटिंग्ज
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all text-[11px] font-bold mt-0.5"
              >
                <LogOut size={12} />
                बाहेर पडा
              </button>
            </div>
          </div>
        )}

        <div
          onClick={() => !isCollapsed && setProfileOpen(!profileOpen)}
          className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all duration-200 cursor-pointer border ${isCollapsed ? 'justify-center border-transparent' : profileOpen ? 'bg-white/10 border-white/10 shadow-sm' : 'hover:bg-white/5 border-transparent'
            }`}
        >
          <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-[11px] font-bold border border-white/10">
            {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-[11px] font-bold text-white truncate leading-tight">{user?.name || user?.username}</p>
              <p className="text-[8px] font-black text-indigo-400/60 uppercase tracking-widest mt-0.5">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          )}
          {!isCollapsed && <ChevronDown className={`w-3 h-3 text-indigo-400 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />}
        </div>
      </div>
    </aside>
  );
}
