import { API_BASE_URL } from '@/utils/config';
import React, { useState, useEffect, useMemo } from 'react';
import { useUI } from '../components/UIProvider';
import { Search, IndianRupee, CreditCard, Banknote, Smartphone, Building2, Receipt, Eye, Calendar, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
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

// Marathi Numeral Helper
const MN = (n: any) => {
    if (n === null || n === undefined) return '०';
    const s = String(n);
    const map: any = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
    return s.replace(/[0-9]/g, w => map[w]);
};

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
    const { addToast } = useUI();

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const canAdd = hasModulePermission(currentUser, 'payments', 'add');

    const BASE = `${API_BASE_URL}`;
    const token = localStorage.getItem('gp_token') || '';

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
        if (!search.trim()) return [];
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
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
            <style>{`
                .payment-scroll::-webkit-scrollbar { width: 4px; }
                .payment-scroll::-webkit-scrollbar-track { background: transparent; }
                .payment-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
            
            <header className="no-print shrink-0">
                <div className="gp-action-bar">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <IndianRupee className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="gp-section-title">भरणा नोंदवा</h2>
                            <p className="gp-section-subtitle">नवीन कर भरणा व पावती जनरेट करा</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-4 lg:p-6 payment-scroll">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                    {/* Left: Payment Form */}
                    {canAdd ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <Receipt className="w-4 h-4 text-indigo-600" />
                                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">नवा भरणा</h3>
                            </div>

                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">मालमत्ता शोधा (नाव किंवा अ.क्र.)</label>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 z-10" />
                                    <TransliterationInput
                                        placeholder="नाव किंवा अ.क्र. टाका..."
                                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={search}
                                        onChangeText={setSearch}
                                    />
                                </div>
                                {search && !selectedProp && filtered.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-[40vh] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xl z-50 py-1">
                                        {filtered.slice(0, 10).map(r => (
                                            <button key={r.id} onClick={() => { setSelectedProp(r); setSearch(r.ownerName + ' (' + r.srNo + ')'); }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm border-b border-slate-50 last:border-0 transition-colors">
                                                <div className="font-extrabold text-slate-800">{r.ownerName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">अ.क्र. {r.srNo} | {r.wastiName}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedProp && billDetails && (
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-100/50">
                                        <p className="font-black text-indigo-900 text-sm">{selectedProp.ownerName}</p>
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full tracking-wider uppercase">अ.क्र. {selectedProp.srNo}</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase">मूळ मागणी</span>
                                            <p className="text-sm font-black text-slate-700">₹{((Number(selectedProp.totalTaxAmount) || 0) + (Number(selectedProp.arrearsAmount) || 0)).toLocaleString()}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase">दंड (+५%)</span>
                                            <p className="text-sm font-black text-rose-600">₹{penaltyToApply.toLocaleString()}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase">सूट (-५%)</span>
                                            <p className="text-sm font-black text-emerald-600">₹{discountToApply.toLocaleString()}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase">एकूण देय</span>
                                            <p className="text-sm font-black text-indigo-700 underline decoration-indigo-200 underline-offset-2">₹{balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">भरली जाणारी रक्कम (₹)</label>
                                    {selectedProp && balance > 0 && (
                                        <button onClick={() => setAmount(String(balance))} className="text-[10px] text-indigo-600 font-extrabold hover:text-indigo-700 transition-colors">
                                            पूर्ण बाकी भरा (₹{balance.toLocaleString()})
                                        </button>
                                    )}
                                </div>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                    placeholder={balance > 0 ? `बाकी: ₹${balance.toLocaleString()}` : '0'}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">भरणा पद्धत</label>
                                <div className="flex flex-wrap gap-2">
                                    {MODES.map(m => (
                                        <button key={m} onClick={() => setMode(m)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${mode === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400/50'}`}>
                                            {MODE_ICONS[m]} {m === 'NetBanking' ? 'नेट बँकिंग' : m === 'Cash' ? 'कॅश' : m === 'Cheque' ? 'चेक' : m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mode === 'Cheque' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">चेक नं.</label>
                                            <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">बँकेचे नाव</label>
                                            <TransliterationInput 
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none"
                                                value={chequeBank} onChangeText={setChequeBank} />
                                        </div>
                                    </>
                                )}
                                {mode === 'UPI' && (
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">UPI Reference / ट्रांझॅक्शन आयडी</label>
                                        <input type="text" value={upiRef} onChange={e => setUpiRef(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none" />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">पु.क्र. (Book No)</label>
                                    <TransliterationInput 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none"
                                        value={receiptBook} onChangeText={setReceiptBook} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">शेरा (ऐच्छिक)</label>
                                    <TransliterationInput 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none"
                                        value={remarks} onChangeText={setRemarks} />
                                </div>
                            </div>

                            <button onClick={handlePay} disabled={saving || !selectedProp || !amount}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] transition-all mt-4 leading-none">
                                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {saving ? 'जतन होत आहे...' : 'भरणा नोंदवा व पावती प्रिंट करा'}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center space-y-3 opacity-60">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                            <p className="text-slate-500 font-black text-center text-sm">तुम्हाला भरणा नोंदवण्याची परवानगी नाही</p>
                        </div>
                    )}

                    {/* Right: Recent Payments */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-wider">अलीकडील भरणे</h3>
                            </div>
                            <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black border border-indigo-100 uppercase tracking-tighter">
                                {payments.length} एकूण
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto payment-scroll">
                            {payments.length === 0 ? (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                                        <IndianRupee className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm tracking-tight">अद्याप कोणताही भरणा नाही</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {payments.slice(0, 50).map((p: any) => (
                                        <div key={p.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-all cursor-default">
                                            <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 border border-slate-100 group-hover:border-indigo-100 transition-all">
                                                {MODE_ICONS[p.payment_mode] || <IndianRupee className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[12px] font-black text-slate-800 truncate uppercase tracking-tight">{p.ownerName || '—'}</p>
                                                    <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-1 py-0.25 rounded uppercase">{p.receipt_no}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[9px] text-slate-400 font-bold">{p.payment_date?.slice(0, 10).split('-').reverse().join('/')}</span>
                                                    <span className="text-[9px] text-slate-400 font-black opacity-30">•</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{p.payment_mode === 'NetBanking' ? 'Net Bank' : p.payment_mode}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[13px] font-black text-indigo-700">₹{Number(p.amount).toLocaleString()}</p>
                                                <p className="text-[9px] text-emerald-500 font-extrabold uppercase tracking-widest flex items-center justify-end gap-1">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> पावती
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
