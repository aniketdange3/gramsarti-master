import React from 'react';
import { hasAccess } from '../utils/permissions';

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
}

export default function Sidebar({ user, activeView, onNavClick, totalRecords, navItems }: SidebarProps) {
  return (
    <aside className="w-45 h-full flex flex-col shadow-premium-blue relative z-10 no-print" style={{
      background: 'linear-gradient(180deg, #3730a3 0%, #433cd3ff 100%)',
    }}>
      {/* Logo Area */}
      <div className="p-7 border-b border-white/10 glass-dark m-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl shadow-lg shadow-indigo-900/50">
            <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="font-black text-white text-xl leading-tight tracking-tight">GramSarthi</h1>
            <p className="text-white/40 text-[9px] font-black tracking-widest uppercase">Property Tax</p>
          </div>
        </div>

      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 py-2 space-y-1.5 overflow-y-auto hide-scrollbar">
        {navItems.filter(item => hasAccess(user, item.id, item.allowedRoles)).map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 group relative border ${isActive
                ? 'bg-white text-indigo-700 border-white shadow-xl shadow-indigo-900/20'
                : 'text-indigo-100/60 border-transparent hover:bg-white/5 hover:text-white'
                }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${isActive ? `bg-gradient-to-br ${item.color} text-white` : 'bg-white/10 text-indigo-200/50 group-hover:bg-white/20'
                }`}>
                {item.icon}
              </div>
              <div className="text-left flex-1">
                <div className="text-sm leading-tight">{item.label}</div>
                <div className={`text-[10px] font-medium transition-opacity ${isActive ? 'text-indigo-700/60' : 'text-indigo-100/30 group-hover:opacity-100'}`}>{item.sublabel}</div>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 ring-4 ring-indigo-600/20"></div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
