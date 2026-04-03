import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/config';
import { Search, History, BookOpen, UserCheck, AlertTriangle, FileSignature, CheckCircle2, XCircle, ChevronRight, X, Loader2 } from 'lucide-react';
import { PropertyRecord, FerfarRequest } from '../types';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import OwnerNameDisplay from '../components/OwnerNameDisplay';

interface Props {
    records: PropertyRecord[];
    fetchRecords: () => void;
}

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white font-bold`}>
        {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="ml-4 hover:opacity-60"><X className="w-4 h-4" /></button>
    </div>
);

export default function Ferfar({ records, fetchRecords }: Props) {
    const [search, setSearch] = useState('');
    const [selectedProp, setSelectedProp] = useState<PropertyRecord | null>(null);
    const [newOwnerName, setNewOwnerName] = useState('');
    const [applicantName, setApplicantName] = useState('');
    const [applicantMobile, setApplicantMobile] = useState('');
    const [ferfarType, setFerfarType] = useState('खरेदीखत');
    const [remarkDate, setRemarkDate] = useState('');
    const [remarkSubject, setRemarkSubject] = useState('');
    const [remarkFerfarNo, setRemarkFerfarNo] = useState('');
    const [remarkPageNo, setRemarkPageNo] = useState('');
    const [remarkSerialNo, setRemarkSerialNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<FerfarRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

    // Toast/Modal State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [rejectionModal, setRejectionModal] = useState<{ id: number, open: boolean }>({ id: 0, open: false });
    const [rejectionReason, setRejectionReason] = useState('');

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    // ONLY Sachiv and Super Admin can approve
    const canApprove = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv';

    const BASE = `${API_BASE_URL}`;
    const token = localStorage.getItem('gp_token') || '';

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${BASE}/api/ferfar`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setRequests(data);
        } catch (e) {
            console.error('Failed to fetch ferfar requests', e);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return records;
        return records.filter(r => matchesSearch(r, search));
    }, [records, search]);

    const displayRequests = requests.filter(r => statusFilter === 'ALL' || r.status === statusFilter);

    const pendingDues = selectedProp
        ? (Number(selectedProp.totalTaxAmount) || 0) + (Number(selectedProp.arrearsAmount) || 0) - (Number(selectedProp.paidAmount) || 0)
        : 0;

    const handleApply = async () => {
        if (!selectedProp || !newOwnerName) {
            showToast('कृपया मालमत्ता निवडा आणि नवीन मालकाचे नाव टाका.', 'error');
            return;
        }

        if (pendingDues > 0) {
            showToast('संपूर्ण कर भरल्याशिवाय फेरफार नोंद करता येणार नाही.', 'error');
            return;
        }

        if (remarkFerfarNo && (remarkFerfarNo.length < 1 || remarkFerfarNo.length > 4)) {
            showToast('फेरफार बुक क्र. १ ते ४ अंकी असणे आवश्यक आहे.', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${BASE}/api/ferfar/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    property_id: selectedProp.id,
                    new_owner_name: newOwnerName,
                    applicant_name: applicantName,
                    applicant_mobile: applicantMobile,
                    ferfar_type: ferfarType,
                    remarks: `मासिक सभा\nदिनांक: ${remarkDate}\nविषय: ${remarkSubject}\nप्रकार: ${ferfarType}\nफेरफार बुक क्र: ${remarkFerfarNo}\nपान क्र: ${remarkPageNo}\nअनु क्र: ${remarkSerialNo}`
                })
            });

            if (!res.ok) throw new Error('Failed to apply');

            showToast('फेरफार अर्ज यशस्वीरित्या जतन झाला.');
            setSearch('');
            setSelectedProp(null);
            setNewOwnerName('');
            setApplicantName('');
            setApplicantMobile('');
            setRemarkDate('');
            setRemarkSubject('');
            setRemarkFerfarNo('');
            setRemarkPageNo('');
            setRemarkSerialNo('');
            fetchRequests();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('तुम्हाला खात्री आहे का? मालमत्तेचे नाव बदलले जाईल.')) return;
        try {
            const res = await fetch(`${BASE}/api/ferfar/approve/${id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('मंजुरी अयशस्वी.');
            showToast('फेरफार मंजूर झाला आणि जुना रेकॉर्ड अपडेट झाला.');
            fetchRequests();
            fetchRecords();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleReject = async () => {
        if (!rejectionReason) {
            showToast('कृपया नामंजूर करण्याचे कारण द्या.', 'error');
            return;
        }
        try {
            const res = await fetch(`${BASE}/api/ferfar/reject/${rejectionModal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ remarks: rejectionReason })
            });
            if (!res.ok) throw new Error('Reject failed');
            showToast('अर्ज नामंजूर करण्यात आला.', 'success');
            setRejectionModal({ id: 0, open: false });
            setRejectionReason('');
            fetchRequests();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" /> फेरफार नोंदवही (Mutation Register)
                    </h2>
                    <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">हस्तांतरण आणि वारस नोंद व्यवस्थापन</p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

                    {/* Left Panel: Apply Form */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-50 shrink-0 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <FileSignature className="w-5 h-5 text-indigo-600" /> नवीन अर्ज नोंदणी
                            </h3>
                            {loading && <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />}
                        </div>

                        <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                            {/* Property Search */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">मालमत्ता शोधा</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                                    <input
                                        type="text"
                                        placeholder="नाव, प्लॉट किंवा अ.क्र. टाका..."
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setSelectedProp(null); }}
                                        className="w-full pl-11 pr-6 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 transition-all bg-slate-50/50"
                                    />
                                </div>
                                {search && !selectedProp && (
                                    <div className="mt-2 max-h-[40vh] overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-2xl relative z-20 animate-in fade-in duration-200">
                                        {filtered.map(r => (
                                            <button key={r.id} onClick={() => { setSelectedProp(r); setSearch(r.ownerName + ' - ' + r.srNo); }}
                                                className="w-full text-left px-5 py-3.5 hover:bg-indigo-50/50 border-b border-slate-50 flex flex-col group transition-colors">
                                                <span className="font-black text-gray-800"><OwnerNameDisplay name={r.ownerName || ''} /></span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">A.No: {r.srNo} | P.No: {r.plotNo} | {r.wastiName}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedProp && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-4">
                                    <div className="bg-indigo-50/80 border-2 border-indigo-100/50 rounded-2xl p-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-600"><UserCheck className="w-5 h-5" /></div>
                                            <div>
                                                <p className="text-[9px] uppercase font-black text-indigo-400 leading-none mb-1">निवडलेले खाते</p>
                                                <div className="text-sm font-black text-indigo-900 group-hover:text-indigo-600 transition-colors"><OwnerNameDisplay name={selectedProp.ownerName || ''} /></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] uppercase font-black text-indigo-400 leading-none mb-1">थकबाकी</p>
                                            <p className={`text-sm font-black ${pendingDues > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{pendingDues}</p>
                                        </div>
                                    </div>

                                    {pendingDues > 0 ? (
                                        <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-2xl flex items-center gap-4">
                                            <div className="bg-rose-600 text-white p-3 rounded-xl shadow-lg"><AlertTriangle className="w-6 h-6" /></div>
                                            <p className="text-xs font-bold text-rose-800 leading-relaxed">या मालमत्तेवर ₹{pendingDues} कर थकीत आहे. नियमानुसार फेरफार नोंदवता येणार नाही.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                <div className="md:col-span-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">फेरफार प्रकार *</label>
                                                    <select
                                                        value={ferfarType}
                                                        onChange={e => setFerfarType(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-all"
                                                    >
                                                        <option value="खरेदीखत">खरेदीखत</option>
                                                        <option value="वारस नोंद">वारस नोंद</option>
                                                        <option value="हक्कसोड पत्र">हक्कसोड पत्र</option>
                                                        <option value="बक्षीस पत्र">बक्षीस पत्र</option>
                                                        <option value="इतर">इतर</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-8">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">नवीन मालकाचे नाव *</label>
                                                    <TransliterationInput
                                                        value={newOwnerName}
                                                        onChangeText={setNewOwnerName}
                                                        placeholder="पूर्ण नाव टाका..."
                                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">अर्जदाराचे नाव</label>
                                                    <TransliterationInput value={applicantName} onChangeText={setApplicantName} placeholder="नाव..." className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-white" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">मोबाईल</label>
                                                    <input type="text" maxLength={10} value={applicantMobile} onChange={e => setApplicantMobile(e.target.value.replace(/\D/g, ''))} placeholder="9999999999" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-white" />
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/80 p-6 rounded-3xl border-2 border-slate-100 space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">मासिक सभा (REMARKS)</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="text-[9px] font-black text-slate-500 mb-1 block">ठराव दिनांक</label>
                                                        <input type="date" value={remarkDate} onChange={e => setRemarkDate(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black" />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-[9px] font-black text-slate-500 mb-1 block">ठराव विषय</label>
                                                        <TransliterationInput value={remarkSubject} onChangeText={setRemarkSubject} placeholder="उदा. खरेदीखत..." className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                                                    </div>
                                                    <div><label className="text-[9px] font-black text-slate-500 mb-1 block">फेरफार बुक क्र. (1-4)</label>
                                                        <input type="text" maxLength={4} value={remarkFerfarNo} onChange={e => setRemarkFerfarNo(e.target.value.replace(/\D/g, ''))} placeholder="0001" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-center" />
                                                    </div>
                                                    <div><label className="text-[9px] font-black text-slate-500 mb-1 block">पान क्र. (1-4)</label>
                                                        <input type="text" maxLength={4} value={remarkPageNo} onChange={e => setRemarkPageNo(e.target.value.replace(/\D/g, ''))} placeholder="0001" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-center" />
                                                    </div>
                                                    <div><label className="text-[9px] font-black text-slate-500 mb-1 block">अनु क्र. (1-4)</label>
                                                        <input type="text" maxLength={4} value={remarkSerialNo} onChange={e => setRemarkSerialNo(e.target.value.replace(/\D/g, ''))} placeholder="0001" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-center" />
                                                    </div>
                                                </div>
                                            </div>

                                            <button onClick={handleApply} disabled={loading} className="w-full  h-12 py-4.5 bg-[#A80D40] text-white font-black rounded-2xl hover:bg-[#952B32] transition-all uppercase text-sm tracking-widest shadow-[0_15px_30px_-5px_rgba(168,13,64,0.3)] flex items-center justify-center gap-3">
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> नोंद पूर्ण करा (SUBMIT ENTRY)</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Status Table Monitor */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex flex-col gap-4 shrink-0 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <History className="w-5 h-5 text-emerald-600" /> अर्ज स्थिती मॉनिटर (Tabular)
                                </h3>
                                <div className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 uppercase tracking-tighter italic">Role Restricted: Sachiv</div>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex-shrink-0 border-2 ${statusFilter === s ? 'bg-[#A80D40] text-white border-[#A80D40] shadow-md shadow-rose-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-indigo-50/50'}`}>
                                        {s === 'PENDING' ? 'प्रलंबित' : s === 'APPROVED' ? 'मंजूर' : s === 'REJECTED' ? 'नामंजूर' : 'सर्व'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto no-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">मालमत्ता / मालक</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">नवीन मालक</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">स्थिती</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">कृती</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {displayRequests.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center font-black text-slate-200 italic uppercase">नोंद आढळली नाही</td></tr>
                                    ) : displayRequests.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic leading-none">A.No: {r.srNo}</span>
                                                    <span className="text-xs font-bold text-slate-500 italic"><OwnerNameDisplay name={r.old_owner_name} /></span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase leading-none mt-1">{r.ferfar_type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-indigo-900 text-sm leading-tight group-hover:text-[#A80D40] transition-colors">{r.new_owner_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-300 mt-1 italic leading-none">{new Date(r.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider
                                                    ${r.status === 'PENDING' ? 'bg-amber-100/60 text-amber-700' :
                                                        r.status === 'APPROVED' ? 'bg-emerald-100/60 text-emerald-700' :
                                                            'bg-rose-100/60 text-rose-700'}`}>
                                                    {r.status === 'PENDING' ? 'प्रलंबित' : r.status === 'APPROVED' ? 'मंजूर' : 'नामंजूर'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {r.status === 'PENDING' ? (
                                                    canApprove ? (
                                                        <div className="flex justify-end gap-2 translate-x-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0">
                                                            <button onClick={() => handleApprove(r.id)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100" title="मंजूर करा">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setRejectionModal({ id: r.id, open: true })} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100" title="नामंजूर करा">
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : <span className="text-[9px] font-black text-slate-300 uppercase italic">Waiting (Sachiv)</span>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[10px] font-black uppercase ${r.status === 'APPROVED' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {r.status === 'APPROVED' ? '✓ व्यवहार पूर्ण' : '✕ नाकारले'}
                                                        </span>
                                                        {r.remarks && r.status === 'REJECTED' && <p className="text-[8px] text-slate-400 italic max-w-[100px] truncate">{r.remarks}</p>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rejection Modal */}
            {rejectionModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-rose-100 w-full max-w-md p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                            <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl"><AlertTriangle className="w-8 h-8" /></div>
                            <button onClick={() => setRejectionModal({ id: 0, open: false })} className="p-3 hover:bg-slate-50 rounded-full transition-colors"><X className="w-6 h-6 hover:rotate-90 transition-transform" /></button>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-3">अर्ज नामंजूर करा?</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">या अर्जदानास नामंजूर करण्याचे सबळ कारण देणे आवश्यक आहे. हे कारण अर्जदारास कळवले जाईल.</p>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-2">नामंजूर करण्याचे कारण (Reason) *</label>
                            <TransliterationInput
                                isTextArea={true}
                                rows={4}
                                value={rejectionReason}
                                onChangeText={setRejectionReason}
                                placeholder="उदा. थकीत कर किंवा अपुरी कागदपत्रे..."
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold outline-none focus:border-rose-500 transition-all min-h-[120px]"
                            />
                        </div>
                        <div className="pt-4 flex flex-col gap-4">
                            <button onClick={handleReject} className="w-full h-12 py-4.5 bg-rose-600 text-white font-black rounded-3xl hover:bg-rose-700 shadow-xl shadow-rose-200 uppercase text-sm tracking-[0.2em] transition-all active:scale-[0.98]">नक्की नामंजूर करा</button>
                            <button onClick={() => setRejectionModal({ id: 0, open: false })} className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-3xl hover:bg-slate-200 uppercase text-xs tracking-widest transition-all">रद्द करा</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast System */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
