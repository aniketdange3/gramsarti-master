import React, { useState, useEffect, useMemo } from 'react';
import { useUI } from '../components/UIProvider';
import { API_BASE_URL } from '@/config';
<<<<<<< HEAD
import {
    Search, History, BookOpen, UserCheck, AlertTriangle,
    FileSignature, CheckCircle2, XCircle, ChevronRight, X,
=======
import { 
    Search, History, BookOpen, UserCheck, AlertTriangle, 
    FileSignature, CheckCircle2, XCircle, ChevronRight, X, 
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
    Loader2, UserPlus, Activity, ArrowRight, UserMinus,
    Info, Calendar, Hash, User, ExternalLink, Filter, Shield
} from 'lucide-react';
import { PropertyRecord, FerfarRequest } from '../types';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import OwnerNameDisplay from '../components/OwnerNameDisplay';

interface Props {
    records: PropertyRecord[];
    fetchRecords: () => void;
}

// --- Marathi Numerals Helper ---
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

export default function Ferfar({ records, fetchRecords }: Props) {
    const [activeTab, setActiveTab] = useState<'NEW' | 'MONITOR' | 'HISTORY'>('NEW');
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
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [requests, setRequests] = useState<FerfarRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('ALL');

    const { addToast } = useUI();
    const [rejectionModal, setRejectionModal] = useState<{ id: number, open: boolean }>({ id: 0, open: false });
    const [rejectionReason, setRejectionReason] = useState('');

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const canApprove = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv';

    const BASE = `${API_BASE_URL}`;
    const token = localStorage.getItem('gp_token') || '';


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
    const historyRequests = requests.filter(r => r.status === 'APPROVED');

    // Find pending request for the selected property
<<<<<<< HEAD
    const existingPending = useMemo(() =>
        requests.find(r => r.property_id === selectedProp?.id && r.status === 'PENDING'),
        [requests, selectedProp]);
=======
    const existingPending = useMemo(() => 
        requests.find(r => r.property_id === selectedProp?.id && r.status === 'PENDING'),
    [requests, selectedProp]);
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3

    const pendingDues = selectedProp
        ? (Number(selectedProp.totalTaxAmount) || 0) + (Number(selectedProp.arrearsAmount) || 0) - (Number(selectedProp.paidAmount) || 0)
        : 0;

    const handleApply = async () => {
        if (!selectedProp || !newOwnerName) {
            addToast('कृपया मालमत्ता निवडा आणि नवीन मालमत्तेसाठी नवीन मालकाचे नाव टाका.', 'error');
            return;
        }

        // Duplicate Check 1: Pending Request
        if (existingPending) {
            addToast('या मालमत्तेचा फेरफार अर्ज आधीच प्रलंबित आहे.', 'error');
            return;
        }

        // Duplicate Check 2: Same Name Recently Approved (Today)
        const today = new Date().toISOString().split('T')[0];
<<<<<<< HEAD
        const isDuplicateAction = historyRequests.find(r =>
            r.property_id === selectedProp.id &&
=======
        const isDuplicateAction = historyRequests.find(r => 
            r.property_id === selectedProp.id && 
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
            r.new_owner_name === newOwnerName &&
            (r.approved_date || '').startsWith(today)
        );
        if (isDuplicateAction) {
            addToast('या मालकासाठी फेरफार आजच मंजूर झाला आहे.', 'error');
            return;
        }

        if (pendingDues > 0) {
            addToast('संपूर्ण कर भरल्याशिवाय फेरफार नोंद करता येणार नाही.', 'error');
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
            addToast('नवीन फेरफार अर्ज यशस्वीरित्या जतन झाला.', 'success');
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
            setActiveTab('MONITOR');
        } catch (err: any) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('तुम्हाला खात्री आहे का? मालमत्तेचे नाव बदलले जाईल.')) return;
        setProcessingId(id);
        try {
            const res = await fetch(`${BASE}/api/ferfar/approve/${id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('मंजुरी अयशस्वी.');
            addToast('अभिनंदन! फेरफार मंजूर झाला आणि रेकॉर्ड अपडेट झाले.', 'success');
            fetchRequests();
            fetchRecords();
        } catch (e: any) {
            addToast(e.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason) {
            addToast('कृपया नामंजूर करण्याचे कारण द्या.', 'error');
            return;
        }
        try {
            const res = await fetch(`${BASE}/api/ferfar/reject/${rejectionModal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ remarks: rejectionReason })
            });
            if (!res.ok) throw new Error('Reject failed');
            addToast('अर्ज नामंजूर करण्यात आला.', 'success');
            setRejectionModal({ id: 0, open: false });
            setRejectionReason('');
            fetchRequests();
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-bg overflow-hidden relative transition-colors duration-300">

            {/* Header Area - Clear and Normal */}
            <div className="bg-surface border-b border-border px-6 py-3 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-xl text-white shadow-md shadow-indigo-100">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">फेरफार नोंदवही (Mutation Register)</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mt-1 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-emerald-500" /> Administrative Hub
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs - Normal Visibility */}
                <div className="flex items-center gap-10 overflow-x-auto no-scrollbar">
                    {(['NEW', 'MONITOR', 'HISTORY'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-1 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2.5
                                ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                            {tab === 'NEW' && <UserPlus className="w-4 h-4" />}
                            {tab === 'MONITOR' && <Activity className="w-4 h-4" />}
                            {tab === 'HISTORY' && <History className="w-4 h-4" />}
                            {tab === 'NEW' ? 'नवीन अर्ज नोंदणी' : tab === 'MONITOR' ? 'अर्ज स्थिती मॉनिटर' : 'हस्तांतरण तपशील'}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full transition-all" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'NEW' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
<<<<<<< HEAD

=======
                            
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">मालमत्ता निवडा (Select Property)</label>
                                <div className="relative group max-w-3xl">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                        <Search className="text-slate-300 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <TransliterationInput
                                        placeholder="पूर्ण नाव, प्लॉट क्रमांक किंवा अनु. क्र. टाका..."
                                        value={search}
                                        onChangeText={(val) => { setSearch(val); setSelectedProp(null); }}
                                        className="w-full pl-14 pr-6 py-4 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all bg-white shadow-sm"
                                    />
                                </div>
                                {search && !selectedProp && (
                                    <div className="mt-2 max-h-[30vh] overflow-y-auto border-2 border-slate-100 rounded-2xl bg-white shadow-2xl relative z-20 animate-in fade-in max-w-3xl">
                                        {filtered.map(r => (
                                            <button key={r.id} onClick={() => { setSelectedProp(r); setSearch(r.ownerName + ' - ' + r.srNo); }}
                                                className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 flex flex-col group transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors"><OwnerNameDisplay name={r.ownerName || ''} /></span>
                                                    <div className="bg-slate-100 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><ChevronRight className="w-4 h-4 text-indigo-500" /></div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-wider flex items-center gap-4">
<<<<<<< HEAD
                                                    <span>अनु. क्र: {MN(r.srNo)}</span>
                                                    <span>वार्ड: {MN(r.wardNo || '१')}</span>
                                                    <span>प्लॉट: {MN(r.plotNo)}</span>
                                                    <span className="text-indigo-300 italic">{r.wastiName}</span>
=======
                                                   <span>अनु. क्र: {MN(r.srNo)}</span>
                                                   <span>वार्ड: {MN(r.wardNo || '१')}</span>
                                                   <span>प्लॉट: {MN(r.plotNo)}</span>
                                                   <span className="text-indigo-300 italic">{r.wastiName}</span>
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedProp && (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm relative group/card">
<<<<<<< HEAD
                                        <button
=======
                                        <button 
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                            onClick={() => { setSelectedProp(null); setSearch(''); }}
                                            className="absolute -top-2 -right-2 bg-white border border-slate-200 p-1.5 rounded-full text-slate-400 hover:text-rose-600 shadow-sm transition-all hover:scale-110 active:scale-95 z-30"
                                            title="Clear Selection"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-inner flex flex-col items-center">
                                                    <UserCheck className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none">विद्यमान मालक (Owner)</p>
                                                        {existingPending && (
                                                            <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1 animate-pulse">
                                                                <Activity className="w-2 h-2" /> प्रलंबित फेरफार
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-base font-black text-slate-900 leading-none mt-1">
                                                        <OwnerNameDisplay name={selectedProp.ownerName || ''} />
                                                    </p>
                                                    {existingPending && (
                                                        <p className="text-[9px] font-bold text-amber-600 mt-1 italic tracking-tight">प्रस्तावित नवीन नाव: {existingPending.new_owner_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-8">
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ID</p>
                                                    <p className="text-xs font-black text-slate-800 tracking-tighter">A.SR-{MN(selectedProp.srNo)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">थकबाकी (TAX)</p>
                                                    <p className={`text-xs font-black ${pendingDues > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹ {MN(pendingDues)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-3 border-t border-slate-50 text-[10px] font-bold text-slate-500">
                                            <div className="flex items-center gap-1.5"><span className="text-slate-300 font-black uppercase text-[8px]">वस्ती:</span> {selectedProp.wastiName || '-'}</div>
                                            <div className="flex items-center gap-1.5"><span className="text-slate-300 font-black uppercase text-[8px]">वार्ड:</span> {MN(selectedProp.wardNo) || '-'}</div>
                                            <div className="flex items-center gap-1.5"><span className="text-slate-300 font-black uppercase text-[8px]">प्लॉट:</span> {MN(selectedProp.plotNo) || '-'}</div>
                                            <div className="flex items-center gap-1.5"><span className="text-slate-300 font-black uppercase text-[8px]">संपर्क:</span> {MN(selectedProp.contactNo) || '-'}</div>
<<<<<<< HEAD
                                            <div className="flex items-center gap-1.5"><span className="text-slate-300 font-black uppercase text-[8px]">क्षेत्रफळ:</span> <span className="text-indigo-600 font-black">{MN(selectedProp.totalAreaSqFt)}चौ.फु </span></div>
=======
                                            <div className="flex items-center gap-1.5"><span className="text-slate-300 font-black uppercase text-[8px]">क्षेत्रफळ:</span> <span className="text-indigo-600 font-black">{MN(selectedProp.totalAreaSqFt)} sq.ft</span></div>
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                        </div>
                                    </div>

                                    {pendingDues > 0 ? (
                                        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl flex items-center gap-6 shadow-sm">
                                            <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-lg ring-4 ring-rose-100 animate-pulse"><AlertTriangle className="w-8 h-8" /></div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black text-rose-800 uppercase tracking-tight">फेरफार करण्यास मज्जाव (Action Restricted)</h4>
                                                <p className="text-[11px] font-bold text-rose-700">सदर मालमत्ता कर थकीत असल्यामुळे फेरफार नोंदवता येणार नाही. कृपया वसुली विभाग संपर्क साधावा.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 space-y-6">
                                            <div className="space-y-6 bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1 flex items-center gap-2"><ArrowRight className="w-3 h-3 text-indigo-500" /> व्यवहार प्रकार *</label>
                                                        <select
                                                            value={ferfarType}
                                                            onChange={e => setFerfarType(e.target.value)}
                                                            className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                                        >
                                                            <option value="खरेदीखत">खरेदीखत (Sale Deed)</option>
                                                            <option value="वारस नोंद">वारस नोंद (Heirship)</option>
                                                            <option value="हक्कसोड पत्र">हक्कसोड पत्र (Release Deed)</option>
                                                            <option value="बक्षीस पत्र">बक्षीस पत्र (Gift Deed)</option>
                                                            <option value="इतर">इतर (Misc)</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1 flex items-center gap-2"><UserPlus className="w-3 h-3 text-emerald-500" /> नवीन मालकाचे नाव *</label>
                                                        <TransliterationInput
                                                            value={newOwnerName}
                                                            onChangeText={setNewOwnerName}
                                                            placeholder="नवीन मालकाचे पूर्ण नाव मराठीत..."
                                                            className="w-full px-6 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 bg-slate-50/20"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">अर्जदाराचे नाव (Applicant Name)</label>
                                                        <TransliterationInput value={applicantName} onChangeText={setApplicantName} placeholder="अर्जदाराचे नाव..." className="w-full px-6 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-slate-50/20" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">मोबाईल क्रमांक</label>
                                                        <div className="relative">
<<<<<<< HEAD
                                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">+९१</span>
                                                            <input type="text" maxLength={10} value={applicantMobile} onChange={e => setApplicantMobile(e.target.value.replace(/\D/g, ''))} placeholder="९९९९९९९९९९" className="w-full pl-16 pr-6 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-slate-50/20" />
=======
                                                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">+९१</span>
                                                           <input type="text" maxLength={10} value={applicantMobile} onChange={e => setApplicantMobile(e.target.value.replace(/\D/g, ''))} placeholder="९९९९९९९९९९" className="w-full pl-16 pr-6 py-3.5 border-2 border-slate-100 rounded-2xl text-sm font-bold bg-slate-50/20" />
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-indigo-50/30 p-8 rounded-[2rem] border-2 border-indigo-50 space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white p-2 rounded-lg text-indigo-400 shadow-sm"><Calendar className="w-4 h-4" /></div>
                                                        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.25em]">मासिक सभा / ठराव आणि नोंदणी तपशील</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ठराव दिनांक</label>
                                                            <input type="date" value={remarkDate} onChange={e => setRemarkDate(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black shadow-inner" />
                                                        </div>
                                                        <div className="col-span-2 space-y-2">
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ठराव विषय</label>
                                                            <TransliterationInput value={remarkSubject} onChangeText={setRemarkSubject} placeholder="उदा. खरेदीखत मंजूर करणे..." className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold shadow-inner" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">फेरफार बुक क्र.</label>
                                                            <input type="text" maxLength={4} value={remarkFerfarNo} onChange={e => setRemarkFerfarNo(e.target.value.replace(/\D/g, ''))} placeholder="०००१" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-center shadow-inner" />
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="space-y-2 flex-1">
                                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">पान क्र.</label>
                                                                <input type="text" maxLength={4} value={remarkPageNo} onChange={e => setRemarkPageNo(e.target.value.replace(/\D/g, ''))} placeholder="०१" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-center shadow-inner" />
                                                            </div>
                                                            <div className="space-y-2 flex-1">
                                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">अनु क्र.</label>
                                                                <input type="text" maxLength={4} value={remarkSerialNo} onChange={e => setRemarkSerialNo(e.target.value.replace(/\D/g, ''))} placeholder="०१" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-center shadow-inner" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button onClick={handleApply} disabled={loading} className="w-full h-16 bg-[#A80D40] text-white font-black rounded-3xl hover:bg-[#952B32] transition-all uppercase text-base tracking-[0.2em] shadow-xl shadow-rose-100 flex items-center justify-center gap-4 active:scale-[0.98]">
                                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> नोंद यशस्वीरित्या जतन करा (SUBMIT MUTATION)</>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!selectedProp && (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-200 py-32 space-y-6">
                                    <div className="p-8 rounded-[2rem] bg-white border-4 border-slate-100 shadow-sm animate-pulse"><Search className="w-16 h-16 opacity-30 text-indigo-300" /></div>
                                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">मालमत्ता शोधून कामास सुरुवात करा</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(activeTab === 'MONITOR' || activeTab === 'HISTORY') && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-400">
                        <div className="flex-1 overflow-hidden flex flex-col p-6">
                            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] flex-1 flex flex-col overflow-hidden shadow-sm">
                                <div className="px-8 py-5 border-b-2 border-slate-50 flex items-center justify-between shrink-0 bg-slate-50/30">
                                    <div className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-widest">
                                        <div className={`p-2 rounded-xl text-white ${activeTab === 'MONITOR' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                            {activeTab === 'MONITOR' ? <Activity className="w-4 h-4" /> : <History className="w-4 h-4" />}
                                        </div>
                                        {activeTab === 'MONITOR' ? 'अर्ज स्थिती मॉनिटर : अर्जदारांचा मागोवा' : 'यशस्वी हस्तांतरण इतिहास'}
                                    </div>
                                    {activeTab === 'MONITOR' && (
                                        <div className="flex gap-2 p-1.5 bg-white border-2 border-slate-100 rounded-2xl shadow-inner">
                                            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
                                                <button key={s} onClick={() => setStatusFilter(s)}
                                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest
                                                        ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                                                    {s === 'PENDING' ? 'प्रलंबित' : s === 'APPROVED' ? 'मंजूर' : s === 'REJECTED' ? 'नामंजूर' : 'सर्व'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b-2 border-slate-100 sticky top-0 z-10">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">मालमत्ता आणि मूळ मालक</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">नवीन वारस / मालकाचे नाव</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">व्यवहार प्रकार</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">सद्यस्थिती</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">प्रशासकीय कृती</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-50/50">
                                            {(activeTab === 'MONITOR' ? displayRequests : historyRequests).length === 0 ? (
                                                <tr><td colSpan={5} className="py-40 text-center text-xs font-black text-slate-200 uppercase tracking-[0.3em] italic">कोणत्याही नोंदी आढळल्या नाहीत</td></tr>
                                            ) : (activeTab === 'MONITOR' ? displayRequests : historyRequests).map(r => (
                                                <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-3 mb-1.5 font-bold">
                                                                <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">A.No: {MN(r.srNo)}</span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase">WARD-{MN(r.wardNo || '१')}</span>
                                                            </div>
                                                            <span className="text-sm font-black text-slate-700 leading-tight group-hover:text-slate-900 transition-colors"><OwnerNameDisplay name={r.old_owner_name} /></span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                                <span className="text-sm font-black text-indigo-900 group-hover:text-indigo-600 transition-colors tracking-tight">{r.new_owner_name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold ml-4">
                                                                <Calendar className="w-3.5 h-3.5 opacity-50" />
                                                                {new Date(r.created_at).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="space-y-1">
                                                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{r.ferfar_type}</span>
                                                            <p className="text-[10px] text-slate-400 font-bold italic ml-1">By: {r.applicant_name || 'N/A'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2
                                                            ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-50' :
                                                                r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-50' :
                                                                    'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-50'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'PENDING' ? 'bg-amber-500 animate-pulse' : r.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                            {r.status === 'PENDING' ? 'प्रलंबित' : r.status === 'APPROVED' ? 'मंजूर' : 'नामंजूर'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        {r.status === 'PENDING' ? (
                                                            canApprove ? (
                                                                <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                                    <button onClick={() => handleApprove(r.id)} disabled={processingId === r.id}
                                                                        className="p-3 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-[1.2rem] border-2 border-emerald-50 hover:border-emerald-600 shadow-md transition-all active:scale-95 translate-y-1 group-hover:translate-y-0 disabled:opacity-50" title="मंजूर करा">
                                                                        {processingId === r.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                                                    </button>
<<<<<<< HEAD
                                                                    <button onClick={() => setRejectionModal({ id: r.id, open: true })}
=======
                                                                    <button onClick={() => setRejectionModal({ id: r.id, open: true })} 
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                                                        className="p-3 bg-white text-rose-600 hover:bg-rose-600 hover:text-white rounded-[1.2rem] border-2 border-rose-50 hover:border-rose-600 shadow-md transition-all active:scale-95 translate-y-1 group-hover:translate-y-0" title="नामंजूर करा">
                                                                        <XCircle className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-end gap-2 text-slate-400 opacity-60">
                                                                    <Shield className="w-4 h-4" />
                                                                    <span className="text-[10px] font-black uppercase tracking-tighter italic">Approval Restricted</span>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 ${r.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {r.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                                    {r.status === 'APPROVED' ? 'व्यवहार पूर्ण' : 'नोंद नाकारली'}
                                                                </span>
                                                                {r.remarks && <p className="text-[10px] text-slate-500 font-bold italic bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 shadow-inner max-w-[150px] truncate-2-lines">{r.remarks}</p>}
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
                )}
            </div>

            {rejectionModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-400">
                    <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-rose-50 w-full max-w-sm p-10 space-y-8 animate-in zoom-in-95 duration-400">
                        <div className="flex justify-between items-center">
                            <div className="bg-rose-100 text-rose-600 p-4 rounded-[1.5rem] shadow-sm"><AlertTriangle className="w-8 h-8" /></div>
                            <button onClick={() => setRejectionModal({ id: 0, open: false })} className="text-slate-300 hover:text-slate-600 hover:rotate-90 transition-all p-2 bg-slate-50 rounded-full"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">अर्ज नाकारावा?</h3>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कृपया अर्ज नामंजूर करण्याचे सबळ कारण द्या.</p>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block ml-1">नाकारण्याचे सबळ कारण *</label>
                            <TransliterationInput
                                isTextArea={true}
                                rows={4}
                                value={rejectionReason}
                                onChangeText={setRejectionReason}
                                placeholder="उदा. थकीत कर किंवा चुकीची माहिती..."
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm font-black outline-none focus:border-rose-500 transition-all min-h-[120px]"
                            />
                        </div>
                        <div className="pt-4 flex flex-col gap-4">
                            <button onClick={handleReject} className="w-full h-14 bg-rose-600 text-white font-black rounded-[1.5rem] hover:bg-rose-700 shadow-xl shadow-rose-100 uppercase text-xs tracking-widest transition-all">नक्की नाकारा</button>
                            <button onClick={() => setRejectionModal({ id: 0, open: false })} className="w-full py-4 text-slate-400 font-black rounded-[1.5rem] hover:bg-slate-50 uppercase text-[10px] tracking-widest transition-all">रद्द करा</button>
                        </div>
                    </div>
                </div>
            )}

            {/* No local toast container - handled globally */}
        </div>
    );
}
