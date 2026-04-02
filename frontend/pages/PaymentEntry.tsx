import { API_BASE_URL } from '@/config';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, IndianRupee, CreditCard, Banknote, Smartphone, Building2, Receipt, Eye, Calendar, Filter, CheckCircle2 } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES } from '../types';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import { calculateBill } from '../utils/billCalculations';
import { hasModulePermission } from '../utils/permissions';

interface PaymentEntryProps {
    records: PropertyRecord[];
    fetchRecords: () => void;
    onUpdateLocalRecord: (record: any) => void;
    onAuthError?: () => void;
}

const MODES = ['Cash', 'UPI', 'Cheque', 'Card', 'NetBanking'] as const;
const MODE_ICONS: Record<string, React.ReactNode> = {
    Cash: <Banknote className="w-4 h-4" />,
    UPI: <Smartphone className="w-4 h-4" />,
    Cheque: <Building2 className="w-4 h-4" />,
    Card: <CreditCard className="w-4 h-4" />,
    NetBanking: <Building2 className="w-4 h-4" />,
};

interface Toast { id: number; message: string; type: 'success' | 'error' }

export default function PaymentEntry({ records, fetchRecords, onUpdateLocalRecord, onAuthError }: PaymentEntryProps) {
    const [search, setSearch] = useState('');
    const [selectedProp, setSelectedProp] = useState<PropertyRecord | null>(null);
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<string>('Cash');
    const [chequeNo, setChequeNo] = useState('');
    const [chequeBank, setChequeBank] = useState('');
    const [upiRef, setUpiRef] = useState('');
    const [receiptBook, setReceiptBook] = useState('');
    const [remarks, setRemarks] = useState('');
    const [saving, setSaving] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [viewReceipt, setViewReceipt] = useState<any>(null);

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const canAdd = hasModulePermission(currentUser, 'payments', 'add');
    const canEdit = hasModulePermission(currentUser, 'payments', 'edit');

    const BASE = `${API_BASE_URL}`;
    const token = localStorage.getItem('gp_token') || '';

    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const fetchPayments = async () => {
        try {
            const res = await fetch(`${BASE}/api/payments`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 401 && onAuthError) onAuthError();
            const data = await res.json();
            setPayments(Array.isArray(data) ? data : []);
        } catch { }
    };

    useEffect(() => { fetchPayments(); }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return records;
        return records.filter(r => matchesSearch(r, search));
    }, [records, search]);

    const handlePay = async () => {
        if (!selectedProp || !amount || Number(amount) <= 0) {
            addToast('मालमत्ता निवडा आणि रक्कम टाका', 'error');
            return;
        }
        setSaving(true);
        try {
            const billDetails = calculateBill(selectedProp.arrearsAmount || 0, selectedProp.totalTaxAmount || 0);

            const res = await fetch(`${BASE}/api/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    property_id: selectedProp.id,
                    amount: Number(amount),
                    payment_mode: mode,
                    payment_date: new Date().toISOString().slice(0, 10),
                    cheque_no: chequeNo || undefined,
                    cheque_bank: chequeBank || undefined,
                    upi_ref: upiRef || undefined,
                    receipt_book: receiptBook || undefined,
                    remarks: remarks || undefined,
                    discount_applied: billDetails.discountAmount,
                    penalty_applied: billDetails.penaltyAmount
                }),
            });
            const data = await res.json();
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (!res.ok) throw new Error(data.error);
            addToast(`✅ पावती ${data.receipt_no} — ₹${Number(amount).toLocaleString()}`, 'success');
            
            // Optimistically update the record's paid amount in the local state
            const updatedProp = {
                ...selectedProp,
                paidAmount: (Number(selectedProp.paidAmount) || 0) + Number(amount)
            };
            onUpdateLocalRecord(updatedProp);

            setAmount(''); setChequeNo(''); setChequeBank(''); setUpiRef(''); setReceiptBook(''); setRemarks('');
            setSelectedProp(null); setSearch('');
            fetchPayments();
        } catch (err: any) {
            addToast(err.message || 'Payment failed', 'error');
        } finally { setSaving(false); }
    };

    const billDetails = selectedProp ? calculateBill(selectedProp.arrearsAmount || 0, selectedProp.totalTaxAmount || 0) : null;
    const penaltyToApply = billDetails ? billDetails.penaltyAmount : 0;
    const discountToApply = billDetails ? billDetails.discountAmount : 0;

    const balance = selectedProp
        ? (Number(selectedProp.totalTaxAmount) || 0) + (Number(selectedProp.arrearsAmount) || 0) + penaltyToApply - discountToApply - (Number(selectedProp.paidAmount) || 0) - (Number((selectedProp as any).discountAmount) || 0)
        : 0;

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
            <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm no-print flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-800">💰 कर वसुली — Payment Entry</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">नवीन भरणा नोंदवणे व पावती</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Payment Form */}
                    {canAdd ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><IndianRupee className="w-5 h-5 text-primary" /> नवीन भरणा</h3>

                        {/* Property search */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">मालमत्ता निवडा</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                                <TransliterationInput placeholder="नाव, प्लॉट, अ.क्र. शोधा... (English मध्ये टाइप करा)"
                                    value={search} onChangeText={(v) => { setSearch(v); setSelectedProp(null); }}
                                    className="w-full pl-9 pr-12 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                            </div>
                            {search && !selectedProp && (
                                <div className="mt-1 max-h-[50vh] overflow-y-auto border border-gray-100 rounded-xl bg-white shadow-md">
                                    {filtered.map(r => (
                                        <button key={r.id} onClick={() => { setSelectedProp(r); setSearch(r.ownerName + ' (' + r.srNo + ')'); }}
                                            className="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm border-b border-gray-50">
                                            <span className="font-bold">{r.ownerName}</span>
                                            <span className="text-gray-400 ml-2">अ.क्र. {r.srNo} | {r.wastiName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected property summary */}
                        {selectedProp && billDetails && (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                <p className="font-bold text-emerald-800">{selectedProp.ownerName} — अ.क्र. {selectedProp.srNo}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                                    <div className="flex flex-col"><span className="text-gray-500">मूळ मागणी:</span> <strong className="text-[13px]">₹{((Number(selectedProp.totalTaxAmount) || 0) + (Number(selectedProp.arrearsAmount) || 0)).toLocaleString()}</strong></div>
                                    <div className="flex flex-col"><span className="text-gray-500">दंड (५%):</span> <strong className="text-rose-600">+{penaltyToApply}</strong></div>
                                    <div className="flex flex-col"><span className="text-gray-500">सूट (५%):</span> <strong className="text-emerald-600">-{discountToApply}</strong></div>
                                    <div className="flex flex-col"><span className="text-gray-500">एकूण भरावयाची:</span> <strong className="text-rose-700 text-[14px]">₹{balance.toLocaleString()}</strong></div>
                                </div>
                                {(Number(selectedProp.paidAmount) > 0 || Number((selectedProp as any).discountAmount) > 0) && (
                                    <div className="mt-3 pt-2 border-t border-primary/10 text-xs flex justify-between">
                                        <span className="text-gray-500">आधी भरलेली रक्कम: <strong className="text-emerald-700">₹{(Number(selectedProp.paidAmount) || 0).toLocaleString()}</strong></span>
                                        <span className="text-gray-500">आधी दिलेली सूट: <strong className="text-emerald-700">₹{(Number((selectedProp as any).discountAmount) || 0).toLocaleString()}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Amount */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">रक्कम (₹)</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder={balance > 0 ? `बाकी: ₹${balance.toLocaleString()}` : '0'}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none" />
                            {selectedProp && balance > 0 && (
                                <button onClick={() => setAmount(String(balance))} className="text-xs text-primary font-bold mt-1 hover:underline">
                                    संपूर्ण बाकी भरा (₹{balance.toLocaleString()})
                                </button>
                            )}
                        </div>

                        {/* Payment mode */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">भरणा पद्धत</label>
                            <div className="flex flex-wrap gap-2">
                                {MODES.map(m => (
                                    <button key={m} onClick={() => setMode(m)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${mode === m ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/30'}`}>
                                        {MODE_ICONS[m]} {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Conditional fields */}
                        {mode === 'Cheque' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">चेक नं.</label>
                                    <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">बँकेचे नाव</label>
                                    <TransliterationInput 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={chequeBank} onChangeText={setChequeBank} />
                                </div>
                            </div>
                        )}
                        {mode === 'UPI' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">UPI Reference</label>
                                <input type="text" value={upiRef} onChange={e => setUpiRef(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        )}

                        {/* Remarks */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">पु.क्र. (Book No)</label>
                                <TransliterationInput 
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                    value={receiptBook} onChangeText={setReceiptBook} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">शेरा (ऐच्छिक)</label>
                                <TransliterationInput 
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                    value={remarks} onChangeText={setRemarks} />
                            </div>
                        </div>

                        {/* Submit */}
                        <button onClick={handlePay} disabled={saving || !selectedProp || !amount}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-dark disabled:opacity-50 transition-all">
                            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Receipt className="w-5 h-5" />}
                            {saving ? 'जतन होत आहे...' : 'भरणा नोंदवा व पावती तयार करा'}
                        </button>
                    </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
                            <p className="text-gray-400 font-bold text-center">तुम्हाला भरणा नोंदवण्याची परवानगी नाही</p>
                        </div>
                    )}

                    {/* Right: Recent Payments */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> अलीकडील भरणे</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{payments.length} नोंदी</p>
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {payments.length === 0 ? (
                                <p className="p-8 text-center text-gray-400 font-medium">अद्याप कोणताही भरणा नाही</p>
                            ) : payments.slice(0, 20).map((p: any) => (
                                <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-slate-50 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                        {MODE_ICONS[p.payment_mode] || <IndianRupee className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{p.ownerName || '—'}</p>
                                        <p className="text-[10px] text-gray-400">{p.receipt_no} • {p.payment_mode} • {p.payment_date?.slice(0, 10)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-success">₹{Number(p.amount).toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-400">{p.collector_name || ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
