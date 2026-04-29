import { API_BASE_URL } from '@/utils/config';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileWarning, Send, ChevronRight, CheckCircle2, ArrowRightCircle, Filter, Eye, Printer, FileDown, X, ArrowLeft } from 'lucide-react';
import MaganiBillDocument from '../components/MaganiBillDocument';
import { generateMaganiBillPDF } from '../utils/pdfGenerator';
import { PropertyRecord } from '../types';
import { hasModulePermission } from '../utils/permissions';

interface Toast { id: number; message: string; type: 'success' | 'error' }

interface MaganiBillProps {
    onAuthError?: () => void;
}

export default function MaganiBill({ onAuthError }: MaganiBillProps) {
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [bills, setBills] = useState<any[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [tab, setTab] = useState<'defaulters' | 'bills'>('defaulters');
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // View State
    const [viewingBill, setViewingBill] = useState<any | null>(null);

    const currentUser = React.useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const canAdd = hasModulePermission(currentUser, 'magani', 'add');
    const canEdit = hasModulePermission(currentUser, 'magani', 'edit');

    const BASE = `${API_BASE_URL}`;
    const token = localStorage.getItem('gp_token') || '';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const fetchDefaulters = async () => {
        try {
            const res = await fetch(`${BASE}/api/magani/defaulters`, { headers });
            if (res.status === 401 && onAuthError) onAuthError();
            const data = await res.json();
            setDefaulters(Array.isArray(data) ? data : []);
        } catch { }
    };

    const fetchBills = async () => {
        try {
            const res = await fetch(`${BASE}/api/magani/bills`, { headers });
            if (res.status === 401 && onAuthError) onAuthError();
            const data = await res.json();
            setBills(Array.isArray(data) ? data : []);
        } catch { }
    };

    useEffect(() => { fetchDefaulters(); fetchBills(); }, []);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === defaulters.length) setSelected(new Set());
        else setSelected(new Set(defaulters.map(d => d.id)));
    };

    const generateBills = async () => {
        if (selected.size === 0) { addToast('मालमत्ता निवडा', 'error'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${BASE}/api/magani/generate`, {
                method: 'POST', headers,
                body: JSON.stringify({ property_ids: Array.from(selected) }),
            });
            const data = await res.json();
            if (res.status === 401 && onAuthError) onAuthError();
            if (!res.ok) throw new Error(data.error);
            addToast(`✅ ${data.generated} मागणी बिले तयार झाली`, 'success');
            setSelected(new Set());
            fetchDefaulters(); fetchBills();
            setTab('bills');
        } catch (err: any) {
            addToast(err.message || 'Failed', 'error');
        } finally { setLoading(false); }
    };

    const advanceNotice = async (billId: number) => {
        try {
            const res = await fetch(`${BASE}/api/magani/${billId}/advance-notice`, { method: 'PUT', headers });
            if (res.status === 401 && onAuthError) onAuthError();
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            addToast(`नोटीस स्तर: ${data.newStage}`, 'success');
            fetchBills();
        } catch (err: any) { addToast(err.message || 'Failed', 'error'); }
    };

    const stageColor: Record<string, string> = {
        First: 'bg-amber-100 text-amber-700', Second: 'bg-orange-100 text-orange-700',
        Final: 'bg-rose-100 text-rose-700', Legal: 'bg-red-200 text-red-800',
    };

    // ─── Render High Fidelity Bill View ───
    if (viewingBill) {
        return (
            <div className="flex flex-col h-full bg-white overflow-hidden">
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body, html { background: white !important; margin: 0 !important; padding: 0 !important; }
                    }
                `}</style>
                {/* Toolbar */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 no-print shadow-sm z-50">
                    <button onClick={() => setViewingBill(null)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={async () => await generateMaganiBillPDF(viewingBill as PropertyRecord)}
                        className="flex items-center gap-2 text-sm font-black text-white bg-slate-800 px-6 py-2.5 rounded-xl hover:bg-black transition-all shadow-md">
                        <FileDown className="w-3 h-3" /> PDF डाउनलोड
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-black text-white bg-primary px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
                        <Printer className="w-3 h-3" /> प्रिंट
                    </button>
                </div>

                {/* Bill Content */}
                <div className="flex-1 overflow-auto p-8 pt-4">
                    <div className="bg-white  rounded-none print:shadow-none print:m-0 border border-gray-100 print:border-0 overflow-visible" style={{ width: '210mm' }}>
                        <MaganiBillDocument record={viewingBill as PropertyRecord} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Toast */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 ${t.type === 'success' ? 'bg-success text-white' : 'bg-rose-600 text-white'}`}>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm no-print">
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><FileWarning className="w-5 h-5 text-rose-600" /> मागणी बिल — Recovery System</h2>
                <p className="text-xs text-gray-400 mt-0.5">थकबाकीदार ओळख, बिल निर्मिती, नोटीस ट्रॅकिंग</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b border-gray-100 px-6 gap-1 no-print">
                {[{ id: 'defaulters' as const, label: 'थकबाकीदार', count: defaulters.length },
                { id: 'bills' as const, label: 'मागणी बिले', count: bills.length }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${tab === t.id ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                        {t.label} <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{t.count}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {tab === 'defaulters' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-gray-800">थकबाकीदार यादी</h3>
                                <p className="text-xs text-gray-400">{defaulters.length} मालमत्ता बाकी</p>
                            </div>
                            <div className="flex gap-2">
                                {canAdd && (
                                    <>
                                        <button onClick={selectAll}
                                            className="px-3 py-2 bg-primary/5 text-primary rounded-xl text-xs font-bold hover:bg-primary/10 transition-colors">
                                            {selected.size === defaulters.length ? 'सर्व काढा' : 'सर्व निवडा'}
                                        </button>
                                        <button onClick={generateBills} disabled={loading || selected.size === 0}
                                            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 hover:from-rose-700 hover:to-red-700 transition-all">
                                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                            मागणी बिल तयार करा ({selected.size})
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-20 bg-slate-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        {canAdd && <th className="py-3 px-4"><input type="checkbox" checked={selected.size === defaulters.length && defaulters.length > 0} onChange={selectAll} /></th>}
                                        <th className="py-3 px-4 text-left">अ.क्र.</th>
                                        <th className="py-3 px-4 text-left">मालक</th>
                                        <th className="py-3 px-4 text-left">वस्ती</th>
                                        <th className="py-3 px-4 text-right">मागणी</th>
                                        <th className="py-3 px-4 text-right">भरलेले</th>
                                        <th className="py-3 px-4 text-right">बाकी</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {defaulters.map(d => (
                                        <tr key={d.id} className="border-t border-gray-50 hover:bg-slate-50 cursor-pointer" onClick={() => canAdd && toggleSelect(d.id)}>
                                            {canAdd && <td className="py-3 px-4"><input type="checkbox" checked={selected.has(d.id)} readOnly /></td>}
                                            <td className="py-3 px-4 font-bold text-gray-700">{d.srNo}</td>
                                            <td className="py-3 px-4 font-bold text-gray-800">{d.ownerName}</td>
                                            <td className="py-3 px-4 text-gray-500">{d.wastiName}</td>
                                            <td className="py-3 px-4 text-right font-bold text-blue-700">₹{((Number(d.totalTaxAmount) || 0) + (Number(d.arrearsAmount) || 0)).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right font-bold text-success">₹{(Number(d.paidAmount) || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right font-black text-rose-700">₹{Number(d.balance).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {defaulters.length === 0 && (
                                        <tr><td colSpan={canAdd ? 7 : 6} className="py-10 text-center text-gray-400 font-medium">सर्व मालमत्ता कर भरला आहे 🎉</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'bills' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100">
                            <h3 className="font-black text-gray-800">मागणी बिले</h3>
                            <p className="text-xs text-gray-400">{bills.length} बिले</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-20 bg-slate-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="py-3 px-4 text-left">अ.क्र.</th>
                                        <th className="py-3 px-4 text-left">मालक</th>
                                        <th className="py-3 px-4 text-right">बाकी</th>
                                        <th className="py-3 px-4 text-right">व्याज</th>
                                        <th className="py-3 px-4 text-right">दंड</th>
                                        <th className="py-3 px-4 text-right">एकूण</th>
                                        <th className="py-3 px-4 text-center">नोटीस</th>
                                        <th className="py-3 px-4 text-center">स्थिती</th>
                                        <th className="py-3 px-4 text-center w-32">कारवाई</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bills.map(b => (
                                        <tr key={b.id} className="border-t border-gray-50 hover:bg-slate-50">
                                            <td className="py-3 px-4 font-bold text-gray-700">{b.srNo}</td>
                                            <td className="py-3 px-4 font-bold text-gray-800">{b.ownerName}</td>
                                            <td className="py-3 px-4 text-right">₹{Number(b.overdue_amount).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right text-amber-600">₹{Number(b.interest_amount).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right text-rose-600">₹{Number(b.penalty_amount).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right font-black text-rose-700">₹{Number(b.total_due).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${stageColor[b.notice_stage] || 'bg-gray-100 text-gray-600'}`}>{b.notice_stage}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${b.status === 'Paid' ? 'bg-success/10 text-success' : b.status === 'Legal' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => setViewingBill(b)}
                                                        className="p-1.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-lg transition-colors" title="बिल पहा">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {canEdit && b.status !== 'Paid' && b.notice_stage !== 'Legal' && (
                                                        <button onClick={() => advanceNotice(b.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" title="पुढील नोटीस">
                                                            <ArrowRightCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {bills.length === 0 && (
                                        <tr><td colSpan={9} className="py-10 text-center text-gray-400 font-medium">अद्याप कोणतेही बिल नाही</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
