import { API_BASE_URL } from '@/config';
import React, { useState, useCallback, useEffect } from 'react';
import { Users, RotateCcw, CheckCircle2, X, Shield, Edit2, Trash2 } from 'lucide-react';
import { ROLES } from '../pages/Login';

interface UserManagementProps {
    onAuthError?: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

export default function UserManagement({ onAuthError, addToast }: UserManagementProps) {
    const [userRequests, setUserRequests] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [fetchingRequests, setFetchingRequests] = useState(false);
    const [userMasterTab, setUserMasterTab] = useState<'pending' | 'list'>('list');
    const [editingManagedUser, setEditingManagedUser] = useState<any | null>(null);
    const [modalTab, setModalTab] = useState<'profile' | 'permissions'>('profile');

    const currentUser = JSON.parse(localStorage.getItem('gp_user') || '{}');
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv' || currentUser.role === 'gram_sevak';

    const fetchUserRequests = useCallback(async () => {
        if (!isAdmin) return;
        setFetchingRequests(true);
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setUserRequests(data);
            }
        } catch (err) {
            console.error('Error fetching user requests:', err);
        } finally {
            setFetchingRequests(false);
        }
    }, [isAdmin, onAuthError]);

    const fetchAllUsers = useCallback(async () => {
        if (!isAdmin) return;
        setFetchingRequests(true);
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setAllUsers(data);
            }
        } catch (err) {
            console.error('Error fetching all users:', err);
        } finally {
            setFetchingRequests(false);
        }
    }, [isAdmin, onAuthError]);

    useEffect(() => {
        if (userMasterTab === 'pending') fetchUserRequests();
        else fetchAllUsers();
    }, [userMasterTab, fetchUserRequests, fetchAllUsers]);

    const handleUserAction = async (userId: number, action: 'approve' | 'reject') => {
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/action`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast(`वापरकर्ता ${action === 'approve' ? 'मंजूर' : 'अस्वीकार'} केला!`, 'success');
                if (userMasterTab === 'pending') fetchUserRequests();
                else fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('तुम्हाला खात्री आहे की तुम्ही हा वापरकर्ता हटवू इच्छिता?')) return;
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                addToast('वापरकर्ता यशस्वीरित्या हटविला गेला.', 'success');
                fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${editingManagedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingManagedUser)
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast('वापरकर्ता यशस्वीरित्या अद्यतनित केला गेला!', 'success');
                setEditingManagedUser(null);
                fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    const handleTogglePermission = async (userId: number, field: 'can_view' | 'can_edit' | 'can_delete', newValue: boolean) => {
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: newValue })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: newValue } : u));
                const labels: Record<string, string> = { can_view: 'पहा', can_edit: 'संपादन', can_delete: 'हटवा' };
                addToast(`${labels[field]} परवानगी ${newValue ? 'सक्रिय' : 'निष्क्रिय'} केली!`, 'success');
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">मास्टर / वापरकर्ता व्यवस्थापन</h3>
                        <p className="text-xs font-bold text-slate-500 mt-1">येथे तुम्ही वापरकर्ता नोंदणी विनंत्या आणि सर्व वापरकर्त्यांचे व्यवस्थापन करू शकता.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setUserMasterTab('list')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            मास्टर
                        </button>
                        <button
                            onClick={() => setUserMasterTab('pending')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            विनंती
                        </button>
                    </div>
                </div>
                <button onClick={userMasterTab === 'pending' ? fetchUserRequests : fetchAllUsers} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                    <RotateCcw className={`w-5 h-5 text-slate-400 ${fetchingRequests ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {userMasterTab === 'pending' ? (
                    userRequests.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">कोणतीही प्रलंबित विनंती नाही</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {userRequests.map((req) => (
                                <div key={req.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100 transition-colors" />
                                    <div className="flex items-start gap-4 mb-6 relative z-10">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                            {req.name?.charAt(0) || req.username?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-800 text-base truncate">{req.name}</h4>
                                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">@{req.username}</p>
                                            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                                {ROLES.find(r => r.value === req.role)?.label || req.role}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 mb-8 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">कर्मचारी आयडी</span>
                                            <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded italic">{req.employee_id}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">संपर्क क्रमांक</span>
                                            <span className="text-xs font-bold text-slate-700">{MN(req.mobile)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">वय</span>
                                            <span className="text-xs font-bold text-slate-700">{MN(req.age)} वर्षांचा</span>
                                        </div>
                                        <div className="pt-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">पत्ता</span>
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2">{req.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 relative z-10">
                                        <button onClick={() => handleUserAction(req.id, 'approve')} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> मंजूर करा
                                        </button>
                                        <button onClick={() => handleUserAction(req.id, 'reject')} className="flex-1 py-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl font-black text-xs hover:bg-rose-500 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <X className="w-4 h-4" /> नाकारा
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1100px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">नाव</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">वापरकर्तानाव</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">ईमेल / संपर्क</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">भूमिका</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">कर्मचारी आयडी</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">स्थिती</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">कृती</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {allUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                                            {user.address && <div className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-[160px] truncate" title={user.address}>{user.address}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-indigo-500 font-bold text-xs">@{user.username}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-slate-700">{user.email || '-'}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{user.mobile || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                                                {ROLES.find(r => r.value === user.role)?.label || user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-500 italic">{user.employee_id}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${user.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    user.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                {user.status === 'APPROVED' ? 'मंजूर' : user.status === 'PENDING' ? 'प्रलंबित' : 'नाकारलेले'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => setEditingManagedUser(user)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" 
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Editing user modal */}
            {editingManagedUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form 
                        onSubmit={handleUpdateUser}
                        className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20"
                    >
                        <div className="px-8 xl:px-10 py-6 bg-gradient-to-r from-indigo-600 to-indigo-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4 text-white">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">वापरकर्ता अधिकार व माहिती अद्यतनित करा</h3>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Update User Profile & Module Access</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setEditingManagedUser(null)} className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all active:scale-90">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="px-8 xl:px-10 bg-white border-b flex gap-8 shrink-0">
                            {[
                                { id: 'profile', label: '👤 प्रोफाइल माहिती', sub: 'Profile Info' },
                                { id: 'permissions', label: '🔐 मॉड्यूल परवानग्या', sub: 'Module Access' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setModalTab(tab.id as any)}
                                    className={`py-4 border-b-4 transition-all flex flex-col items-start gap-0.5 ${
                                        modalTab === tab.id 
                                            ? 'border-indigo-600 text-indigo-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <span className="text-sm font-black uppercase tracking-tight">{tab.label}</span>
                                    <span className="text-[10px] font-bold opacity-60 uppercase">{tab.sub}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 xl:p-10 bg-slate-50/50">
                            {modalTab === 'profile' ? (
                                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                        <table className="w-full text-sm border-collapse">
                                            <tbody className="divide-y divide-slate-100">
                                                {[
                                                    { label: 'पूर्ण नाव (Full Name)', value: <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-bold" value={editingManagedUser.name} onChange={e => setEditingManagedUser({...editingManagedUser, name: e.target.value})} required /> },
                                                    { label: 'वापरकर्तानाव (Username)', value: <input type="text" disabled className="w-full px-4 py-2.5 bg-slate-100 border rounded-xl font-bold text-slate-400 cursor-not-allowed" value={editingManagedUser.username} /> },
                                                    { label: 'ईमेल (Email ID)', value: <input type="email" className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-bold" value={editingManagedUser.email || ''} onChange={e => setEditingManagedUser({...editingManagedUser, email: e.target.value})} /> },
                                                    { label: 'संपर्क (Mobile)', value: <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-bold" value={editingManagedUser.mobile || ''} onChange={e => setEditingManagedUser({...editingManagedUser, mobile: e.target.value})} /> },
                                                    { label: 'भूमिका (Role)', value: (
                                                        <select className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-bold" value={editingManagedUser.role} onChange={e => setEditingManagedUser({...editingManagedUser, role: e.target.value})}>
                                                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                        </select>
                                                    )},
                                                    { label: 'स्थिती (Status)', value: (
                                                        <select className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-bold" value={editingManagedUser.status} onChange={e => setEditingManagedUser({...editingManagedUser, status: e.target.value})}>
                                                            <option value="APPROVED">मंजूर</option>
                                                            <option value="PENDING">प्रलंबित</option>
                                                            <option value="REJECTED">नाकारलेले</option>
                                                        </select>
                                                    )},
                                                    { label: 'वय (Age)', value: <input type="number" className="w-24 px-4 py-2.5 bg-slate-50 border rounded-xl font-bold" value={editingManagedUser.age || ''} onChange={e => setEditingManagedUser({...editingManagedUser, age: e.target.value})} /> },
                                                    { label: 'पत्ता (Address)', value: <textarea rows={2} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-bold resize-none" value={editingManagedUser.address || ''} onChange={e => setEditingManagedUser({...editingManagedUser, address: e.target.value})} /> },
                                                ].map((row, idx) => (
                                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="w-1/3 px-8 py-4 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">
                                                            {row.label}
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            {row.value}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">मॉड्यूल (Module)</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">View</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Add</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Edit</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Delete</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right text-indigo-600">गाळणी (Filter)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {([
                                                    ['dashboard', 'डैशबोर्ड (Dashboard)', 'from-violet-500 to-indigo-600'],
                                                    ['namuna8', 'नमुना ८ (Namuna 8)', 'from-sky-500 to-blue-600'],
                                                    ['namuna9', 'नमुना ९ (Namuna 9)', 'from-emerald-500 to-green-600'],
                                                    ['payments', 'कर वसुली (Payments)', 'from-teal-500 to-cyan-600'],
                                                    ['magani', 'मागणी बिल (Magani)', 'from-rose-500 to-red-600'],
                                                    ['reports', 'अहवाल (Reports)', 'from-purple-500 to-fuchsia-600'],
                                                    ['taxMaster', 'सेटिंग्ज (Settings)', 'from-amber-500 to-orange-500'],
                                                ] as [string, string, string][]).map(([moduleId, label, gradient]) => {
                                                    let permsObj: Record<string, any> = {};
                                                    try {
                                                        if (editingManagedUser.allowed_modules?.startsWith('{')) {
                                                            permsObj = JSON.parse(editingManagedUser.allowed_modules);
                                                        } else {
                                                            const legacyMods = (editingManagedUser.allowed_modules || '').split(',');
                                                            legacyMods.forEach((m: string) => {
                                                                permsObj[m] = { view: true, add: false, edit: !!editingManagedUser.can_edit, delete: !!editingManagedUser.can_delete };
                                                            });
                                                        }
                                                    } catch (e) { permsObj = {}; }

                                                    const modPerms = permsObj[moduleId] || { view: false, add: false, edit: false, delete: false, filter: false };

                                                    const updateModulePerm = (action: 'view'|'add'|'edit'|'delete'|'filter', value: boolean) => {
                                                        const newPerms = { ...permsObj };
                                                        if (!newPerms[moduleId]) newPerms[moduleId] = { view: false, add: false, edit: false, delete: false, filter: false };
                                                        newPerms[moduleId][action] = value;
                                                        if (value && (action === 'add' || action === 'edit' || action === 'delete' || action === 'filter')) newPerms[moduleId].view = true;
                                                        setEditingManagedUser({ ...editingManagedUser, allowed_modules: JSON.stringify(newPerms) });
                                                    };

                                                    return (
                                                        <tr key={moduleId} className="group hover:bg-slate-50 transition-colors">
                                                            <td className="px-8 py-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-sm group-hover:scale-110 transition-transform`}>
                                                                        <span className="text-white text-xs font-black">{label.charAt(0)}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-black text-slate-800 block">{label}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{moduleId} access</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <input type="checkbox" checked={modPerms.view} onChange={e => updateModulePerm('view', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <input type="checkbox" checked={modPerms.add} onChange={e => updateModulePerm('add', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <input type="checkbox" checked={modPerms.edit} onChange={e => updateModulePerm('edit', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <input type="checkbox" checked={modPerms.delete} onChange={e => updateModulePerm('delete', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">गाळणी</span>
                                                                    <input type="checkbox" checked={modPerms.filter} onChange={e => updateModulePerm('filter', e.target.checked)} className="w-5 h-5 rounded-lg border-indigo-200 text-indigo-600 focus:ring-indigo-500/20" />
                                                                </label>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-8 xl:px-10 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
                            <button type="button" onClick={() => setEditingManagedUser(null)} className="px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">
                                रद्द करा
                            </button>
                            <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl transition-all">
                                बदल जतन करा
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
