
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, FileText, Receipt, Settings, Menu, X, Home, Activity, ChevronRight, LogOut, User, Shield, IndianRupee, FileWarning, BarChart3, List, ChevronDown, Edit2, Save, Phone, Mail, BadgeCheck, MapPin } from 'lucide-react';
import { PropertyRecord, DEFAULT_SECTION } from './types';
import { API_BASE_URL as BASE } from './config';

import Dashboard from './pages/Dashboard';
import Namuna8 from './pages/Namuna8';
import Namuna9 from './pages/Namuna9';
import Login from './pages/Login';
import PaymentEntry from './pages/PaymentEntry';
import MaganiBill from './pages/MaganiBill';
import Reports from './pages/Reports';
import TaxMaster from './pages/TaxMaster';
import Ferfar from './pages/Ferfar';
import Sidebar from './components/Sidebar';

type ViewType = 'dashboard' | 'namuna8' | 'namuna9' | 'taxMaster' | 'payments' | 'magani' | 'reports' | 'roleAccess' | 'ferfar';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'सुपर अ‍ॅडमिन',
  gram_sevak: 'ग्रामसेवक',
  operator: 'ऑपरेटर',
  collection_officer: 'वसुली अधिकारी',
  sarpanch: 'सरपंच',
  auditor: 'लेखापरीक्षक',
  gram_sachiv: 'ग्राम सचिव',
  clerk: 'लिपीक',
  bill_operator: 'बिल ऑपरेटर',
};

export default function App() {
  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Auth state ──────────────────────────────────────
  const [token, setToken] = useState<string | null>(localStorage.getItem('gp_token'));
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('gp_user') || 'null'); } catch { return null; }
  });

  const isLoggedIn = !!token && !!user;

  const API_URL = `${BASE}/api/properties`;
  const TAX_API_URL = `${BASE}/api/tax-rates`;

  // Fetch data on login
  useEffect(() => {
    if (isLoggedIn) {
      fetchRecords();
      fetchTaxRates();
      fetchAttendanceStatus();
    }
  }, [isLoggedIn]);

  const fetchAttendanceStatus = async () => {
    try {
      const res = await fetch(`${BASE}/api/attendance/status`, { headers: authHeaders() });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setCheckedIn(data.checkedIn);
      setCheckInTime(data.checkInTime);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleAttendanceToggle = async () => {
    setAttendanceLoading(true);
    try {
      const endpoint = checkedIn ? '/api/attendance/check-out' : '/api/attendance/check-in';
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        fetchAttendanceStatus();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Attendance error:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('gp_token', newToken);
    localStorage.setItem('gp_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    setRecords([]);
    setActiveView('dashboard');
    setProfileOpen(false);
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileSave = async () => {
    if (!editProfile) return;
    setProfileSaving(true);
    try {
      const res = await fetch(`${BASE}/api/auth/users/${user.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: editProfile.name,
          email: editProfile.email,
          mobile: editProfile.mobile,
          age: editProfile.age,
          address: editProfile.address
        })
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const updatedUser = { ...user, ...editProfile };
        setUser(updatedUser);
        localStorage.setItem('gp_user', JSON.stringify(updatedUser));
        setEditProfileOpen(false);
      }
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleViewRecord = (id: string, view: 'namuna8' | 'namuna9') => {
    setSelectedRecordId(id);
    setActiveView(view);
    setSidebarOpen(false);
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchTaxRates = async () => {
    try {
      const res = await fetch(TAX_API_URL, { headers: authHeaders() });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setTaxRates(data);
    } catch (err) {
      console.error('Error fetching tax rates:', err);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, { headers: authHeaders() });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error('Invalid records data format:', data);
        setRecords([]);
        return;
      }

      const normalizedData = data.map((r: any) => ({
        ...r,
        wastiName: r.wastiName || '',
        arrearsAmount: Number(r.arrearsAmount) || 0,
        paidAmount: Number(r.paidAmount) || 0,
        sections: (r.sections || []).map((s: any) => ({
          ...DEFAULT_SECTION,
          ...s
        }))
      }));
      setRecords(normalizedData);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLocalRecord = (updatedRecord: any) => {
    setRecords(prev => {
      const index = prev.findIndex(r => r.id === updatedRecord.id);
      if (index !== -1) {
        const newRecords = [...prev];
        newRecords[index] = { ...updatedRecord };
        return newRecords;
      }
      return [updatedRecord, ...prev];
    });
  };

  const handleRemoveLocalRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  // ── If not logged in, show Login page ──
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems: { id: ViewType; label: string; sublabel: string; icon: React.ReactNode; color: string; allowedRoles?: string[] }[] = [
    { id: 'dashboard', label: 'डैशबोर्ड', sublabel: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, color: 'from-violet-500 to-indigo-600' },
    { id: 'namuna8', label: 'नमुना ८', sublabel: 'Assessment Register', icon: <FileText className="w-5 h-5" />, color: 'from-sky-500 to-blue-600' },
    { id: 'namuna9', label: 'नमुना ९', sublabel: 'Tax Notice', icon: <Receipt className="w-5 h-5" />, color: 'from-emerald-500 to-green-600' },
    // { id: 'payments', label: 'कर वसुली', sublabel: 'Payment Entry', icon: <IndianRupee className="w-5 h-5" />, color: 'from-teal-500 to-cyan-600', allowedRoles: ['super_admin', 'gram_sevak', 'operator', 'gram_sachiv', 'bill_operator'] },
    // { id: 'magani', label: 'मागणी बिल', sublabel: 'Recovery System', icon: <FileWarning className="w-5 h-5" />, color: 'from-rose-500 to-red-600', allowedRoles: ['super_admin', 'gram_sevak', 'operator', 'gram_sachiv'] },
    // { id: 'reports', label: 'अहवाल', sublabel: 'Reports', icon: <BarChart3 className="w-5 h-5" />, color: 'from-purple-500 to-fuchsia-600', allowedRoles: ['super_admin', 'gram_sevak', 'gram_sachiv'] },
    { id: 'ferfar', label: 'फेरफार नोंदवही', sublabel: 'Mutation Register', icon: <FileText className="w-5 h-5" />, color: 'from-fuchsia-500 to-purple-600', allowedRoles: ['super_admin', 'gram_sevak', 'operator'] },
    { id: 'roleAccess', label: 'रोल अ‍ॅक्सेस', sublabel: 'Role Access', icon: <Shield className="w-5 h-5" />, color: 'from-rose-600 to-rose-400', allowedRoles: ['super_admin', 'gram_sevak', 'gram_sachiv'] },
    { id: 'taxMaster', label: 'प्रणाली संचलन केंद्र', sublabel: 'Tax Master', icon: <Settings className="w-5 h-5" />, color: 'from-amber-500 to-orange-500', allowedRoles: ['super_admin', 'gram_sevak', 'gram_sachiv'] },
  ];

  const handleNavClick = (viewId: ViewType) => {
    setActiveView(viewId);
    setSelectedRecordId(null);
    setSidebarOpen(false);
  };


  return (
    <div className="min-h-screen bg-background flex" style={{ fontFamily: '"Noto Sans Devanagari", sans-serif' }}>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex shrink-0 no-print h-screen sticky top-0 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'w-72' : 'w-0 opacity-0 overflow-hidden'
        }`}>
        <div className="w-72">
          <Sidebar user={user} activeView={activeView} onNavClick={handleNavClick} totalRecords={records.length} navItems={navItems as any} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="relative h-full">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-[-48px] z-50 p-2 bg-white rounded-full shadow-lg"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <Sidebar user={user} activeView={activeView} onNavClick={handleNavClick} totalRecords={records.length} navItems={navItems as any} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        {/* Unified Topbar */}
        <div className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 no-print sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-700" />
            </button>

            <button
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              className="hidden md:flex p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-90 border border-slate-200 shadow-sm bg-white"
              title={desktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              {desktopSidebarOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-indigo-600" />}
            </button>

            <div className="hidden md:flex flex-col">
              <h2 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                {activeView.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                प्रणाली संचलन केंद्र
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Attendance Toggle */}
            <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
              {checkedIn && checkInTime && (
                <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl hidden lg:block animate-in fade-in slide-in-from-right-2">
                  <p className="text-[9px] text-emerald-600 font-black uppercase leading-none mb-0.5 text-right">सक्रीय सत्र</p>
                  <p className="text-[11px] text-slate-700 font-bold leading-none">
                    {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              <button
                onClick={handleAttendanceToggle}
                disabled={attendanceLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover-lift active:scale-95 ${checkedIn
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-sm'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  }`}
              >
                {attendanceLoading ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : checkedIn ? (
                  <>
                    <X className="w-3 h-3" /> चेक-आऊट
                  </>
                ) : (
                  <>
                    <Activity className="w-3 h-3" /> चेक-इन
                  </>
                )}
              </button>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-3 border rounded-2xl p-1.5 pr-4 hover:shadow-md transition-all group shrink-0 ${profileOpen ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-200'}`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 group-hover:scale-105 transition-transform duration-300">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black text-slate-900 leading-tight">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{ROLE_LABELS[user?.role] || user?.role}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="p-5 bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <User className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg leading-tight">{user?.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-black uppercase tracking-wider mt-1 inline-block">
                          {ROLE_LABELS[user?.role] || user?.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-2.5 border-b border-slate-100">
                    {user?.employee_id && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><BadgeCheck className="w-4 h-4 text-indigo-500" /></div>
                        <div><div className="text-[9px] font-black text-slate-400 uppercase">कर्मचारी आयडी</div><div className="font-bold text-slate-700 text-xs">{user.employee_id}</div></div>
                      </div>
                    )}
                    {user?.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-500" /></div>
                        <div><div className="text-[9px] font-black text-slate-400 uppercase">ईमेल</div><div className="font-bold text-slate-700 text-xs">{user.email}</div></div>
                      </div>
                    )}
                    {user?.mobile && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Phone className="w-4 h-4 text-emerald-500" /></div>
                        <div><div className="text-[9px] font-black text-slate-400 uppercase">संपर्क</div><div className="font-bold text-slate-700 text-xs">{user.mobile}</div></div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-3 space-y-1.5">
                    <button
                      onClick={() => { setEditProfile({ ...user }); setEditProfileOpen(true); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 transition-all group/btn"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover/btn:bg-indigo-100 transition-colors"><Edit2 className="w-4 h-4 text-slate-500 group-hover/btn:text-indigo-600" /></div>
                      <div className="text-left"><div className="text-xs font-black text-slate-700">प्रोफाइल संपादित करा</div><div className="text-[10px] font-bold text-slate-400">नाव, ईमेल, संपर्क अद्यतनित करा</div></div>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 transition-all group/btn"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover/btn:bg-rose-100 transition-colors"><LogOut className="w-4 h-4 text-slate-500 group-hover/btn:text-rose-600" /></div>
                      <div className="text-left"><div className="text-xs font-black text-slate-700">लॉगआउट</div><div className="text-[10px] font-bold text-slate-400">सत्र संपवा</div></div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-indigo-700 font-bold">डेटा लोड होत आहे...</p>
            </div>
          </div>
        )}

        {(activeView === 'dashboard' || activeView === 'roleAccess') && (
          <Dashboard
            records={records}
            fetchRecords={fetchRecords}
            onUpdateLocalRecord={handleUpdateLocalRecord}
            onRemoveLocalRecord={handleRemoveLocalRecord}
            taxRates={taxRates}
            onViewRecord={handleViewRecord}
            onAuthError={handleLogout}
            initialTab={activeView === 'roleAccess' ? 'user_requests' : 'dashboard'}
            key={activeView === 'roleAccess' ? 'roleAccess' : 'dashboard'}
          />
        )}
        {activeView === 'namuna8' && (
          <Namuna8
            records={records}
            selectedId={selectedRecordId}
            onClearSelected={() => setSelectedRecordId(null)}
            fetchRecords={fetchRecords}
            onUpdateLocalRecord={handleUpdateLocalRecord}
            onRemoveLocalRecord={handleRemoveLocalRecord}
            taxRates={taxRates}
            onAuthError={handleLogout}
          />
        )}
        {activeView === 'namuna9' && (
          <Namuna9
            records={records}
            selectedId={selectedRecordId}
            fetchRecords={fetchRecords}
            onUpdateLocalRecord={handleUpdateLocalRecord}
            onRemoveLocalRecord={handleRemoveLocalRecord}
            taxRates={taxRates}
            onAuthError={handleLogout}
          />
        )}
        {activeView === 'payments' && (
          <PaymentEntry
            records={records}
            fetchRecords={fetchRecords}
            onUpdateLocalRecord={handleUpdateLocalRecord}
            onAuthError={handleLogout}
          />
        )}
        {activeView === 'magani' && (
          <MaganiBill onAuthError={handleLogout} />
        )}
        {activeView === 'reports' && (
          <Reports records={records} onAuthError={handleLogout} />
        )}
        {activeView === 'taxMaster' && (
          <TaxMaster onAuthError={handleLogout} />
        )}
        {activeView === 'ferfar' && (
          <Ferfar records={records} fetchRecords={fetchRecords} />
        )}

        {/* Edit Profile Modal */}
        {editProfileOpen && editProfile && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">प्रोफाइल संपादित करा</h3>
                    <p className="text-white/60 text-xs font-bold mt-1">तुमची माहिती अद्यतनित करा</p>
                  </div>
                  <button onClick={() => setEditProfileOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">पूर्ण नाव</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    value={editProfile.name || ''}
                    onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ईमेल</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                      value={editProfile.email || ''}
                      onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">संपर्क क्रमांक</label>
                    <input
                      type="tel"
                      maxLength={10}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                      value={editProfile.mobile || ''}
                      onChange={e => setEditProfile({ ...editProfile, mobile: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">वय</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                      value={editProfile.age || ''}
                      onChange={e => setEditProfile({ ...editProfile, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">कर्मचारी आयडी</label>
                    <input
                      type="text"
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 italic cursor-not-allowed"
                      value={editProfile.employee_id || ''}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">पत्ता</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                    value={editProfile.address || ''}
                    onChange={e => setEditProfile({ ...editProfile, address: e.target.value })}
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {profileSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> जतन करा</>}
                  </button>
                  <button onClick={() => setEditProfileOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 active:scale-95 transition-all">
                    रद्द करा
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
