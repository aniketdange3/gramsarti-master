/**
 * GRAMSARTHI - मुख्य व्यवस्थापन प्रणाली (Main Application Entry)
 * 
 * या फाईलमध्ये संपूर्ण प्रणालीचे राउटिंग (Routing), ऑथेंटिकेशन (Authentication), 
 * आणि युजर अटेंडन्स (Attendance) मॅनेजमेंट हाताळले जाते.
 * 
 * STEP-BY-STEP PROCESS:
 * 1. ऑथेंटिकेशन चेक (Session Auth): रिलोड झाल्यावर युजर लॉग-इन आहे का ते तपासले जाते (gp_token).
 * 2. लेआउट रेंडरिंग (Sidebar & Main): युजर रोलनुसार साइडबार आणि मुख्य दृश्य (Dashboard/Namuna) दाखवले जाते.
 * 3. अटेंडन्स ट्रॅकिंग (Duty Session): 'Check-In' आणि 'Check-Out' द्वारे कर्मचार्‍यांच्या कामाच्या वेळा सर्व्हरवर नोंदवल्या जातात.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, FileText, Receipt, Settings, Menu, X, Home, Activity, ChevronRight, LogOut, User, Shield, IndianRupee, FileWarning, BarChart3, List, ChevronDown, Edit2, Save, Phone, Mail, BadgeCheck, MapPin, PanelLeftClose } from 'lucide-react';
import { PropertyRecord, DEFAULT_SECTION } from './types';
import { API_BASE_URL as BASE } from './config';

import Dashboard from './pages/Dashboard';
import Namuna8 from './pages/Namuna8';
import Namuna9 from './pages/Namuna9';
import Login from './pages/Login';
import PaymentEntry from './pages/PaymentEntry';
import MaganiBill from './pages/MaganiBill';
import Reports from './pages/Reports';
import { TaxMaster as TaxMaster_Modernized } from './components/TaxMaster';
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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [profileSaving, setProfileSaving] = useState(false);

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
  };


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
          <Sidebar
            user={user}
            activeView={activeView}
            onNavClick={handleNavClick}
            totalRecords={records.length}
            navItems={navItems as any}
            onLogout={handleLogout}
            onEditProfile={() => { setEditProfile({ ...user }); setEditProfileOpen(true); }}
          />
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
          <Sidebar
            user={user}
            activeView={activeView}
            onNavClick={handleNavClick}
            totalRecords={records.length}
            navItems={navItems as any}
            onLogout={handleLogout}
            onEditProfile={() => { setEditProfile({ ...user }); setEditProfileOpen(true); }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        {/* Unified Topbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 no-print sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-2xl transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            <button
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              className="hidden md:flex p-2 hover:bg-slate-50 rounded-xl transition-all active:scale-95 border border-slate-200 bg-white shadow-sm group"
              title={desktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              {desktopSidebarOpen 
                ? <PanelLeftClose className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" /> 
                : <Menu className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              }
            </button>

            <div className="hidden md:flex flex-col">
              <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                {activeView === 'taxMaster' ? 'प्रणाली संचलन केंद्र' : activeView.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">
                  GramSarthi Portal
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Attendance Toggle */}
            <div className="flex items-center gap-3 pr-2 border-r border-slate-200/50">
              {checkedIn && checkInTime && (
                <div className="flex flex-col items-end hidden lg:flex">
                  <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest leading-none mb-1">सक्रीय</span>
                  <span className="text-xs font-black text-slate-700 leading-none tabular-nums">
                    {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <button
                onClick={handleAttendanceToggle}
                disabled={attendanceLoading}
                className={`group relative overflow-hidden flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${checkedIn
                  ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 shadow-sm'
                  : 'bg-[#0f172a] text-white shadow-xl shadow-blue-900/20 hover:shadow-blue-900/30 hover:-translate-y-0.5'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                {attendanceLoading ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : checkedIn ? (
                  <>
                    <X className="w-3 h-3 group-hover:rotate-90 transition-transform" /> <span>चेक-आऊट</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> <span>चेक-इन</span>
                  </>
                )}
              </button>
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
          <TaxMaster_Modernized onClose={() => setActiveView('dashboard')} />
        )}
        {activeView === 'ferfar' && (
          <Ferfar records={records} fetchRecords={fetchRecords} />
        )}

        {/* Edit Profile Modal */}
        {editProfileOpen && editProfile && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
              {/* Simple Header */}
              <div className="p-8 pb-0 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">प्रोफाइल संपादित करा</h3>
                  <p className="text-slate-400 text-xs font-bold mt-1">तुमची माहिती अद्यतनित करा</p>
                </div>
                <button onClick={() => setEditProfileOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">पूर्ण नाव</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300"
                    placeholder="तुमचे नाव प्रविष्ट करा"
                    value={editProfile.name || ''}
                    onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">ईमेल</label>
                    <input
                      type="email"
                      className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      value={editProfile.email || ''}
                      onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">संपर्क</label>
                    <input
                      type="tel"
                      maxLength={10}
                      className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      value={editProfile.mobile || ''}
                      onChange={e => setEditProfile({ ...editProfile, mobile: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">वय</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      value={editProfile.age || ''}
                      onChange={e => setEditProfile({ ...editProfile, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">आयडी (ID)</label>
                    <input
                      type="text"
                      disabled
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed"
                      value={editProfile.employee_id || ''}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">पत्ता</label>
                  <textarea
                    rows={2}
                    className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all resize-none"
                    value={editProfile.address || ''}
                    onChange={e => setEditProfile({ ...editProfile, address: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="flex-1 py-4.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {profileSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin p-2" /> : <><Save className="w-4 h-4" /> जतन करा</>}
                  </button>
                  <button onClick={() => setEditProfileOpen(false)} className="flex-1 py-4.5 p-2 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 active:scale-[0.98] transition-all">
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
