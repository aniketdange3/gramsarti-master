import { API_BASE_URL } from '@/utils/config';
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
    const [userMasterTab, setUserMasterTab] = useState<'profile' | 'permissions' | 'pending'>('profile');
    const [editingManagedUser, setEditingManagedUser] = useState<any | null>(null);
    const [modalTab, setModalTab] = useState<'profile' | 'permissions'>('profile');

    const currentUser = JSON.parse(localStorage.getItem('gp_user') || '{}');
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv' || currentUser.role === 'gram_sevak';

    const fetchUserRequests = useCallback(async () => {
        if (!isAdmin) return;
        setFetchingRequests(true);
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users?status=PENDING`, {
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
            const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
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

    const handleTablePermissionToggle = async (user: any, moduleId: string, action: 'view' | 'add' | 'edit' | 'delete', newValue: boolean) => {
        let permsObj: Record<string, any> = {};
        try {
            if (user.allowed_modules?.startsWith('{')) {
                permsObj = JSON.parse(user.allowed_modules);
            } else {
                const legacyMods = (user.allowed_modules || '').split(',');
                legacyMods.forEach((m: string) => {
                    const trimmed = String(m || '').trim();
                    if (trimmed && trimmed !== 'payments') {
                        permsObj[trimmed] = { view: true, add: false, edit: !!user.can_edit, delete: !!user.can_delete };
                    }
                });
            }
        } catch (e) { permsObj = {}; }

        // Strip empty or invalid keys
        delete permsObj[""];
        delete permsObj["undefined"];

        if (!permsObj[moduleId]) permsObj[moduleId] = { view: false, add: false, edit: false, delete: false };
        permsObj[moduleId][action] = newValue;
        if (newValue && (action === 'add' || action === 'edit' || action === 'delete')) {
            permsObj[moduleId].view = true;
        }

        // Calculate aggregate legacy permissions
        let anyView = false;
        let anyEdit = false;
        let anyDelete = false;
        Object.values(permsObj).forEach((p: any) => {
            if (p.view) anyView = true;
            if (p.edit) anyEdit = true;
            if (p.delete) anyDelete = true;
        });

        const updatedUser = {
            ...user,
            allowed_modules: JSON.stringify(permsObj),
            can_view: anyView ? 1 : 0,
            can_edit: anyEdit ? 1 : 0,
            can_delete: anyDelete ? 1 : 0
        };

        // Optimistically update state
        setAllUsers(prev => prev.map(usr => usr.id === user.id ? updatedUser : usr));

        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    allowed_modules: updatedUser.allowed_modules,
                    can_view: updatedUser.can_view,
                    can_edit: updatedUser.can_edit,
                    can_delete: updatedUser.can_delete
                })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast('परवानगी यशस्वीरित्या अद्यतनित केली!', 'success');
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
                fetchAllUsers();
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
            fetchAllUsers();
        }
    };

    const handleSelectAllPermissions = async (user: any) => {
        const modules = ['dashboard', 'namuna8', 'namuna9', 'magani', 'reports', 'ferfar', 'taxMaster'];
        const permsObj: Record<string, any> = {};
        modules.forEach(modId => {
            permsObj[modId] = { view: true, add: true, edit: true, delete: true };
        });

        const updatedUser = {
            ...user,
            allowed_modules: JSON.stringify(permsObj),
            can_view: 1,
            can_edit: 1,
            can_delete: 1
        };

        // Optimistically update state
        setAllUsers(prev => prev.map(usr => usr.id === user.id ? updatedUser : usr));

        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    allowed_modules: updatedUser.allowed_modules,
                    can_view: updatedUser.can_view,
                    can_edit: updatedUser.can_edit,
                    can_delete: updatedUser.can_delete
                })
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                addToast('सर्व मॉड्यूल परवानग्या यशस्वीरित्या मंजूर केल्या!', 'success');
                fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
                fetchAllUsers();
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
            fetchAllUsers();
        }
    };

    const handleTableRoleChange = async (user: any, newRole: string) => {
        const updatedUser = { ...user, role: newRole };
        setAllUsers(prev => prev.map(usr => usr.id === user.id ? updatedUser : usr));

        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast('भूमिका यशस्वीरित्या अद्यतनित केली!', 'success');
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
                fetchAllUsers();
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
            fetchAllUsers();
        }
    };

    const handleTableStatusChange = async (user: any, newStatus: string) => {
        const updatedUser = { ...user, status: newStatus };
        setAllUsers(prev => prev.map(usr => usr.id === user.id ? updatedUser : usr));

        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast('स्थिती यशस्वीरित्या अद्यतनित केली!', 'success');
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
                fetchAllUsers();
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
            fetchAllUsers();
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
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                            type="button"
                            onClick={() => setUserMasterTab('profile')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            👤 प्रोफाइल माहिती (Profile Info)
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserMasterTab('permissions')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'permissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            🔐 मॉड्यूल परवानग्या (Module Permissions)
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserMasterTab('pending')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            📨 नोंदणी विनंत्या (Requests)
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
                        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[1100px]">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 shadow-sm">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">नाव व पत्ता</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">वापरकर्तानाव</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">ईमेल / संपर्क</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">भूमिका</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">वय</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">स्थिती</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">कृती</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {userRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{req.name}</div>
                                                {req.address && <div className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-[240px] truncate" title={req.address}>{req.address}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-indigo-500 font-bold text-xs">@{req.username}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-slate-700">{req.mobile ? MN(req.mobile) : '-'}</div>
                                                {req.email && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{req.email}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                                                    {ROLES.find(r => r.value === req.role)?.label || req.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{req.age ? `${MN(req.age)} वर्षे` : '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase border bg-amber-50 text-amber-600 border-amber-100">
                                                    प्रलंबित
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleUserAction(req.id, 'approve')} 
                                                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl font-black text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> मंजूर करा
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUserAction(req.id, 'reject')} 
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl font-black text-xs hover:bg-rose-500 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> नाकारा
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )
                ) : userMasterTab === 'profile' ? (
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px] border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest">
                                    <th className="px-6 py-4 text-left">नाव व संपर्क (Name & Contact)</th>
                                    <th className="px-6 py-4 text-left">वापरकर्तानाव (Username)</th>
                                    <th className="px-6 py-4 text-left">भूमिका (Role)</th>
                                    <th className="px-6 py-4 text-center">खाते स्थिती (Account Status)</th>
                                    <th className="px-6 py-4 text-center">कृती (Actions)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {allUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                                            {user.mobile && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{MN(user.mobile)}</div>}
                                            {user.email && <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-indigo-500 font-bold text-xs">@{user.username}</td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={user.role} 
                                                onChange={e => handleTableRoleChange(user, e.target.value)}
                                                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:bg-white outline-none cursor-pointer"
                                            >
                                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <select 
                                                value={user.status} 
                                                onChange={e => handleTableStatusChange(user, e.target.value)}
                                                className={`px-2 py-1.5 border rounded-xl font-bold text-xs outline-none cursor-pointer ${
                                                    user.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    user.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}
                                            >
                                                <option value="APPROVED">मंजूर</option>
                                                <option value="PENDING">प्रलंबित</option>
                                                <option value="REJECTED">नाकारलेले</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={() => { setEditingManagedUser(user); setModalTab('profile'); }}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                    title="प्रोफाइल तपशीलवार संपादित करा"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" 
                                                    title="वापरकर्ता हटवा"
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
                ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1300px] border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest">
                                    <th className="px-6 py-4 min-w-[200px] text-left">वापरकर्ता (User)</th>
                                    <th className="px-3 py-4 text-center">डॅशबोर्ड</th>
                                    <th className="px-3 py-4 text-center">नमुना ८</th>
                                    <th className="px-3 py-4 text-center">नमुना ९</th>
                                    <th className="px-3 py-4 text-center">मागणी बिल</th>
                                    <th className="px-3 py-4 text-center">अहवाल</th>
                                    <th className="px-3 py-4 text-center">फेरफार</th>
                                    <th className="px-3 py-4 text-center">सेटिंग्ज</th>
                                    <th className="px-6 py-4 text-center">तपशील (Details)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {allUsers.map((user) => {
                                    const modules = [
                                        { id: 'dashboard', label: 'डॅशबोर्ड' },
                                        { id: 'namuna8', label: 'नमुना ८' },
                                        { id: 'namuna9', label: 'नमुना ९' },
                                        { id: 'magani', label: 'मागणी बिल' },
                                        { id: 'reports', label: 'अहवाल' },
                                        { id: 'ferfar', label: 'फेरफार' },
                                        { id: 'taxMaster', label: 'सेटिंग्ज' },
                                    ];

                                    let permsObj: Record<string, any> = {};
                                    try {
                                        if (user.allowed_modules?.startsWith('{')) {
                                            permsObj = JSON.parse(user.allowed_modules);
                                        } else {
                                            const legacyMods = (user.allowed_modules || '').split(',');
                                            legacyMods.forEach((m: string) => {
                                                permsObj[m] = { view: true, add: false, edit: !!user.can_edit, delete: !!user.can_delete };
                                            });
                                        }
                                    } catch (e) { permsObj = {}; }

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                                                <div className="text-indigo-500 font-bold text-xs mt-0.5">@{user.username}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                    {ROLES.find(r => r.value === user.role)?.label || user.role}
                                                </div>
                                            </td>
                                            {modules.map(mod => {
                                                const modPerms = permsObj[mod.id] || { view: false, add: false, edit: false, delete: false };
                                                return (
                                                    <td key={mod.id} className="px-3 py-4 text-center border-l border-slate-100">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={!!modPerms.view} 
                                                                    onChange={e => handleTablePermissionToggle(user, mod.id, 'view', e.target.checked)} 
                                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-500">पहा</span>
                                                            </label>
                                                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={!!modPerms.edit} 
                                                                    onChange={e => handleTablePermissionToggle(user, mod.id, 'edit', e.target.checked)} 
                                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-500">बदल</span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4 text-center border-l border-slate-100">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleSelectAllPermissions(user)}
                                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg text-[9px] font-black transition-all active:scale-95 flex items-center gap-1 shrink-0"
                                                        title="सर्व मॉड्यूल परवानग्या एकाच वेळी मंजूर करा (Full Access)"
                                                    >
                                                        <Shield className="w-3 h-3 text-indigo-600" />
                                                        सर्व निवडा
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => { setEditingManagedUser(user); setModalTab('permissions'); }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all" 
                                                        title="तपशीलवार परवानग्या संपादित करा"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
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
                                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                                        <div className="flex justify-between items-center px-8 py-4 bg-slate-50 border-b border-slate-200">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">मॉड्यूल परवानग्या (Module Permissions)</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const modules = ['dashboard', 'namuna8', 'namuna9', 'magani', 'reports', 'ferfar', 'taxMaster'];
                                                    const newPerms: Record<string, any> = {};
                                                    modules.forEach(modId => {
                                                        newPerms[modId] = { view: true, add: true, edit: true, delete: true };
                                                    });
                                                    setEditingManagedUser({
                                                        ...editingManagedUser,
                                                        allowed_modules: JSON.stringify(newPerms),
                                                        can_view: 1,
                                                        can_edit: 1,
                                                        can_delete: 1
                                                    });
                                                }}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
                                            >
                                                <Shield className="w-3.5 h-3.5 text-white" /> सर्व निवडा (Select All)
                                            </button>
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-20">
                                                <tr className="bg-slate-50 border-b border-slate-200 shadow-sm">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">मॉड्यूल (Module)</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">View</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Add</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Edit</th>
                                                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">Delete</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {([
                                                    ['dashboard', 'डैशबोर्ड (Dashboard)', 'from-violet-500 to-indigo-600'],
                                                    ['namuna8', 'नमुना ८ (Namuna 8)', 'from-sky-500 to-blue-600'],
                                                    ['namuna9', 'नमुना ९ (Namuna 9)', 'from-emerald-500 to-green-600'],
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

                                                    const modPerms = permsObj[moduleId] || { view: false, add: false, edit: false, delete: false };

                                                    const updateModulePerm = (action: 'view'|'add'|'edit'|'delete', value: boolean) => {
                                                        const newPerms = { ...permsObj };
                                                        if (!newPerms[moduleId]) newPerms[moduleId] = { view: false, add: false, edit: false, delete: false };
                                                        newPerms[moduleId][action] = value;
                                                        if (value && (action === 'add' || action === 'edit' || action === 'delete')) newPerms[moduleId].view = true;
                                                        
                                                        // Calculate aggregate legacy permissions
                                                        let anyView = false;
                                                        let anyEdit = false;
                                                        let anyDelete = false;
                                                        Object.values(newPerms).forEach((p: any) => {
                                                            if (p.view) anyView = true;
                                                            if (p.edit) anyEdit = true;
                                                            if (p.delete) anyDelete = true;
                                                        });

                                                        setEditingManagedUser({
                                                            ...editingManagedUser,
                                                            allowed_modules: JSON.stringify(newPerms),
                                                            can_view: anyView ? 1 : 0,
                                                            can_edit: anyEdit ? 1 : 0,
                                                            can_delete: anyDelete ? 1 : 0
                                                        });
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
