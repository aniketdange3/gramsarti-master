/**
 * GRAMSARTHI - मुख्य व्यवस्थापन प्रणाली (Main Application Entry)
 *
 * URL Routes:
 *  /              → redirect to /dashboard
 *  /login         → Login page
 *  /dashboard     → Dashboard (x)
 *  /namuna8       → नमुना ८ (Assessment Register)
 *  /namuna9       → नमुना ९ (Tax Notice / Demand Register)
 *  /reports       → अहवाल (Reports)
 *  /ferfar        → फेरफार नोंदवही (Mutation Register)
 *  /taxmaster     → प्रणाली संचलन केंद्र (Tax Master / System Config)
 *  /role-access   → रोल अ‍ॅक्सेस (User Management)
 */

import React, { useState, useEffect } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation
} from 'react-router-dom';
import { X, Save, LayoutDashboard, FileText, Receipt, Settings, BarChart3, Shield, Printer } from 'lucide-react';
import { PropertyRecord, DEFAULT_SECTION } from './types';
import { API_BASE_URL as BASE } from './utils/config';

import Sidebar from './components/Sidebar';
import { UIProvider } from './components/UIProvider';
import { saveRecordsToDB, loadRecordsFromDB, clearRecordsDB } from './utils/db';
import GlobalLoader from './components/GlobalLoader';

// --- Lazy loaded pages with Preloading support ---
const lazyWithPreload = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  const LazyComponent = React.lazy(importFn);
  const PreloadComponent = LazyComponent as typeof LazyComponent & {
    preload: () => Promise<{ default: T }>;
  };
  PreloadComponent.preload = importFn;
  return PreloadComponent;
};

const Dashboard = lazyWithPreload(() => import('./pages/Dashboard'));
const Namuna8 = lazyWithPreload(() => import('./pages/Namuna8'));
const Namuna9 = lazyWithPreload(() => import('./pages/Namuna9'));
const Reports = lazyWithPreload(() => import('./pages/Reports'));
const TaxMaster = lazyWithPreload(() => import('./pages/TaxMaster'));
const Ferfar = lazyWithPreload(() => import('./pages/Ferfar'));
const MaganiBill = lazyWithPreload(() => import('./pages/MaganiBill'));
const Login = lazyWithPreload(() => import('./pages/Login'));



// ── Route map ──────────────────────────────────────────────────────────────
export type ViewType = 'dashboard' | 'namuna8' | 'namuna9' | 'maganiBill' | 'taxMaster' | 'reports' | 'roleAccess' | 'ferfar';

export const VIEW_TO_PATH: Record<ViewType, string> = {
  dashboard: '/dashboard',
  namuna8: '/namuna8',
  namuna9: '/namuna9',
  taxMaster: '/taxmaster',
  reports: '/reports',
  ferfar: '/ferfar',
  maganiBill: '/maganibill',
  roleAccess: '/role-access',
};

export const PATH_TO_VIEW: Record<string, ViewType> = {
  '/dashboard': 'dashboard',
  '/namuna8': 'namuna8',
  '/namuna9': 'namuna9',
  '/taxmaster': 'taxMaster',
  '/reports': 'reports',
  '/ferfar': 'ferfar',
  '/maganibill': 'maganiBill',
  '/role-access': 'roleAccess',
};

// ── Token Verification Helpers ──────────────────────────────────────────────
const isTokenExpired = (t: string | null): boolean => {
  if (!t || t === 'undefined' || t === 'null' || t.trim() === '') return true;
  try {
    const parts = t.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
};

// ── Inner app (needs router context) ───────────────────────────────────────
function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const [records, setRecords] = useState<PropertyRecord[]>([]);
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

  const isLoggingOutRef = React.useRef(false);

  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('gp_token');
    if (isTokenExpired(t)) {
      localStorage.removeItem('gp_token');
      localStorage.removeItem('gp_user');
      return null;
    }
    return t;
  });

  const [user, setUser] = useState<any>(() => {
    const t = localStorage.getItem('gp_token');
    if (isTokenExpired(t)) {
      localStorage.removeItem('gp_token');
      localStorage.removeItem('gp_user');
      return null;
    }
    try { return JSON.parse(localStorage.getItem('gp_user') || 'null'); } catch { return null; }
  });

  const isLoggedIn = !!token && !!user;

  // Derive activeView from URL
  const activeView: ViewType = PATH_TO_VIEW[location.pathname] ?? 'dashboard';

  const API_URL = `${BASE}/api/properties`;
  const TAX_API_URL = `${BASE}/api/tax-rates`;

  useEffect(() => {
    const initApp = async () => {
      if (isLoggedIn) {
        if (isLoggingOutRef.current || isTokenExpired(token)) {
          handleLogout();
          return;
        }

        // 1. Try loading from IndexedDB first for instant UI
        const cached = await loadRecordsFromDB();
        if (cached && cached.length > 0) {
          setRecords(cached);
          setIsLoading(false);
        }

        // 2. Fetch fresh data from server
        fetchRecords(true);
        fetchTaxRates();
        fetchAttendanceStatus();
      }
    };
    initApp();
  }, [isLoggedIn]);

  // Preload other routes when the browser is idle to make page transitions instantaneous
  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      const timer = setTimeout(() => {
        const pages = [Namuna8, Namuna9, MaganiBill, Reports, Ferfar, TaxMaster];
        pages.forEach(page => {
          try {
            page.preload();
          } catch (e) {
            console.warn('Deferred preloading failed for a page component:', e);
          }
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, isLoading]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchAttendanceStatus = async () => {
    if (isLoggingOutRef.current || isTokenExpired(token)) {
      handleLogout();
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/attendance/status`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      setCheckedIn(data.checkedIn);
      setCheckInTime(data.checkInTime);
    } catch (err) { console.error('Attendance fetch error:', err); }
  };

  const handleAttendanceToggle = async () => {
    if (isLoggingOutRef.current || isTokenExpired(token)) {
      handleLogout();
      return;
    }
    setAttendanceLoading(true);
    try {
      const endpoint = checkedIn ? '/api/attendance/check-out' : '/api/attendance/check-in';
      const res = await fetch(`${BASE}${endpoint}`, { method: 'POST', headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) fetchAttendanceStatus();
    } catch (err) { console.error('Attendance error:', err); }
    finally { setAttendanceLoading(false); }
  };

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newToken ? newUser : null);
    if (newToken) {
      localStorage.setItem('gp_token', newToken);
      localStorage.setItem('gp_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('gp_token');
      localStorage.removeItem('gp_user');
    }
    navigate('/dashboard', { replace: true });
  };

  const handleLogout = () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setToken(null);
    setUser(null);
    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    clearRecordsDB();
    setRecords([]);
    navigate('/login', { replace: true });
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 1000);
  };

  const handleProfileSave = async () => {
    if (!editProfile) return;
    if (isLoggingOutRef.current || isTokenExpired(token)) {
      handleLogout();
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch(`${BASE}/api/auth/users/${user.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: editProfile.name, email: editProfile.email,
          mobile: editProfile.mobile, age: editProfile.age, address: editProfile.address,
        }),
      });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) {
        const updatedUser = { ...user, ...editProfile };
        setUser(updatedUser);
        localStorage.setItem('gp_user', JSON.stringify(updatedUser));
        setEditProfileOpen(false);
      }
    } catch (err) { console.error('Profile update error:', err); }
    finally { setProfileSaving(false); }
  };

  // Navigate to namuna page; pass selected record id as query param
  const handleViewRecord = (id: string, view: 'namuna8' | 'namuna9') => {
    navigate(`/${view}?id=${id}`);
    setSidebarOpen(false);
  };

  const fetchTaxRates = async () => {
    if (isLoggingOutRef.current || isTokenExpired(token)) {
      handleLogout();
      return;
    }
    try {
      const res = await fetch(TAX_API_URL, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      setTaxRates(await res.json());
    } catch (err) { console.error('Tax rates error:', err); }
  };

  const fetchRecords = async (isInitialLoad = false) => {
    if (isLoggingOutRef.current || isTokenExpired(token)) {
      handleLogout();
      return;
    }
    const hasData = records.length > 0;
    if (isInitialLoad && !hasData) setIsLoading(true);

    try {
      const res = await fetch(API_URL, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      if (res.status === 304) { setIsLoading(false); return; } // Not modified

      const data = await res.json();
      if (!Array.isArray(data)) { setRecords([]); return; }

      const processed = data.map((r: any) => ({
        ...r,
        wastiName: r.wastiName || '',
        arrearsAmount: Number(r.arrearsAmount) || 0,
        paidAmount: Number(r.paidAmount) || 0,
        sections: (r.sections || []).map((s: any) => ({ ...DEFAULT_SECTION, ...s })),
      }));

      setRecords(processed);
      saveRecordsToDB(processed);
    } catch (err) { console.error('Fetch records error:', err); }
    finally { setIsLoading(false); }
  };

  const handleUpdateLocalRecord = (updated: any) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === updated.id);
      if (idx !== -1) { const next = [...prev]; next[idx] = { ...updated }; return next; }
      return [updated, ...prev];
    });
  };

  const handleRemoveLocalRecord = (id: string) =>
    setRecords(prev => prev.filter(r => r.id !== id));

  const handleNavClick = (viewId: ViewType) => {
    navigate(VIEW_TO_PATH[viewId] ?? '/dashboard');
    setSidebarOpen(false);
  };

  const navItems = [
    { id: 'dashboard' as ViewType, label: 'डैशबोर्ड', sublabel: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, color: 'from-violet-500 to-indigo-600', preload: Dashboard.preload },
    { id: 'namuna8' as ViewType, label: 'नमुना ८', sublabel: 'Assessment Register', icon: <FileText className="w-5 h-5" />, color: 'from-sky-500 to-blue-600', preload: Namuna8.preload },
    { id: 'namuna9' as ViewType, label: 'नमुना ९', sublabel: 'Tax Notice', icon: <Receipt className="w-5 h-5" />, color: 'from-emerald-500 to-green-600', preload: Namuna9.preload },
    { id: 'maganiBill' as ViewType, label: 'मागणी बिल', sublabel: 'Demand Bill', icon: <Printer className="w-5 h-5" />, color: 'from-indigo-500 to-violet-600', preload: MaganiBill.preload },

    { id: 'reports' as ViewType, label: 'अहवाल', sublabel: 'Reports', icon: <BarChart3 className="w-5 h-5" />, color: 'from-purple-500 to-fuchsia-600', allowedRoles: ['super_admin', 'gram_sevak', 'gram_sachiv'], preload: Reports.preload },
    { id: 'ferfar' as ViewType, label: 'फेरफार नोंदवही', sublabel: 'Mutation Register', icon: <FileText className="w-5 h-5" />, color: 'from-fuchsia-500 to-purple-600', allowedRoles: ['super_admin', 'gram_sevak', 'operator'], preload: Ferfar.preload },
    { id: 'roleAccess' as ViewType, label: 'रोल अ‍ॅक्सेस', sublabel: 'Role Access', icon: <Shield className="w-5 h-5" />, color: 'from-rose-600 to-rose-400', allowedRoles: ['super_admin', 'gram_sevak', 'gram_sachiv'], preload: Dashboard.preload },
    { id: 'taxMaster' as ViewType, label: 'प्रणाली संचलन केंद्र', sublabel: 'Tax Master', icon: <Settings className="w-5 h-5" />, color: 'from-amber-500 to-orange-500', allowedRoles: ['super_admin', 'gram_sevak', 'gram_sachiv'], preload: TaxMaster.preload },
  ];

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (location.pathname !== '/login') return <Navigate to="/login" replace />;
    return (
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Login onLogin={handleLogin} />
      </React.Suspense>
    );
  }


  // Redirect root & /login → /dashboard when authenticated
  if (location.pathname === '/login' || location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  // Read ?id= query param for namuna pages
  const selectedId = new URLSearchParams(location.search).get('id');

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex shrink-0 no-print h-screen sticky top-0 transition-all duration-300 ease-in-out relative z-50 ${desktopSidebarOpen ? 'w-80' : 'w-20'}`}>
        <Sidebar
          user={user} activeView={activeView} onNavClick={handleNavClick}
          totalRecords={records.length} navItems={navItems as any}
          onLogout={handleLogout}
          onEditProfile={() => { setEditProfile({ ...user }); setEditProfileOpen(true); }}
          isCollapsed={!desktopSidebarOpen}
          onToggleCollapse={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
        />
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative h-full w-72">
          <Sidebar
            user={user} activeView={activeView} onNavClick={handleNavClick}
            totalRecords={records.length} navItems={navItems as any}
            onLogout={handleLogout}
            onEditProfile={() => { setEditProfile({ ...user }); setEditProfileOpen(true); }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Loading Overlay */}
        {isLoading && <GlobalLoader />}

        <div className="flex-1 overflow-auto">
          <React.Suspense fallback={<GlobalLoader />}>
            <Routes>

              <Route path="/dashboard" element={
                <Dashboard
                  records={records} fetchRecords={fetchRecords}
                  onUpdateLocalRecord={handleUpdateLocalRecord}
                  onRemoveLocalRecord={handleRemoveLocalRecord}
                  taxRates={taxRates} onViewRecord={handleViewRecord}
                  onAuthError={handleLogout}
                />
              } />
              <Route path="/role-access" element={
                <Dashboard
                  key="role-access"
                  records={records} fetchRecords={fetchRecords}
                  onUpdateLocalRecord={handleUpdateLocalRecord}
                  onRemoveLocalRecord={handleRemoveLocalRecord}
                  taxRates={taxRates} onViewRecord={handleViewRecord}
                  onAuthError={handleLogout} initialTab="user_requests"
                />
              } />
              <Route path="/namuna8" element={
                <Namuna8
                  records={records} selectedId={selectedId}
                  onClearSelected={() => navigate('/namuna8', { replace: true })}
                  fetchRecords={fetchRecords}
                  onUpdateLocalRecord={handleUpdateLocalRecord}
                  onRemoveLocalRecord={handleRemoveLocalRecord}
                  taxRates={taxRates} onAuthError={handleLogout}
                />
              } />
              <Route path="/namuna9" element={
                <Namuna9
                  records={records}
                  selectedId={selectedId}
                  fetchRecords={fetchRecords}
                  onUpdateLocalRecord={handleUpdateLocalRecord}
                  onRemoveLocalRecord={handleRemoveLocalRecord}
                  taxRates={taxRates} onAuthError={handleLogout}
                />
              } />
              <Route path="/maganibill" element={<MaganiBill records={records} onAuthError={handleLogout} />} />
              <Route path="/reports" element={<Reports records={records} onAuthError={handleLogout} />} />
              <Route path="/ferfar" element={<Ferfar records={records} fetchRecords={fetchRecords} onAuthError={handleLogout} />} />
              <Route path="/taxmaster" element={<TaxMaster onAuthError={handleLogout} onNavigate={handleNavClick} />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </React.Suspense>
        </div>


        {/* Edit Profile Modal */}
        {editProfileOpen && editProfile && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
              <div className="p-6 pb-0 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter">प्रोफाइल संपादित करा</h3>
                  <p className="text-slate-400 text-[10px] font-bold mt-1">तुमची माहिती अद्यतनित करा</p>
                </div>
                <button onClick={() => setEditProfileOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">पूर्ण नाव</label>
                  <input type="text" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300"
                    placeholder="तुमचे नाव प्रविष्ट करा" value={editProfile.name || ''}
                    onChange={e => setEditProfile({ ...editProfile, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">ईमेल</label>
                    <input type="email" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      value={editProfile.email || ''} onChange={e => setEditProfile({ ...editProfile, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">संपर्क</label>
                    <input type="tel" maxLength={10} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      value={editProfile.mobile || ''} onChange={e => setEditProfile({ ...editProfile, mobile: e.target.value.replace(/\D/g, '') })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">वय</label>
                    <input type="number" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      value={editProfile.age || ''} onChange={e => setEditProfile({ ...editProfile, age: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">आयडी (ID)</label>
                    <input type="text" disabled className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed"
                      value={editProfile.employee_id || ''} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">पत्ता</label>
                  <textarea rows={2} className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all resize-none"
                    value={editProfile.address || ''} onChange={e => setEditProfile({ ...editProfile, address: e.target.value })} />
                </div>
                <div className="pt-4 flex gap-4">
                  <button onClick={handleProfileSave} disabled={profileSaving}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {profileSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> जतन करा</>}
                  </button>
                  <button onClick={() => setEditProfileOpen(false)}
                    className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 active:scale-[0.98] transition-all">
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

// ── Root wrapper provides BrowserRouter + UIProvider ───────────────────────
export default function App() {
  return (
    <UIProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </UIProvider>
  );
}
