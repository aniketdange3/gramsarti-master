import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/config';
import { Search, History, BookOpen, UserCheck, AlertTriangle, FileSignature, CheckCircle2, XCircle } from 'lucide-react';
import { PropertyRecord, FerfarRequest } from '../types';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import { hasModulePermission } from '../utils/permissions';
import OwnerNameDisplay from '../components/OwnerNameDisplay';

interface Props {
    records: PropertyRecord[];
    fetchRecords: () => void;
}

export default function Ferfar({ records, fetchRecords }: Props) {
    const [search, setSearch] = useState('');
    const [selectedProp, setSelectedProp] = useState<PropertyRecord | null>(null);
    const [newOwnerName, setNewOwnerName] = useState('');
    const [applicantName, setApplicantName] = useState('');
    const [applicantMobile, setApplicantMobile] = useState('');
    const [remarkDate, setRemarkDate] = useState('');
    const [remarkSubject, setRemarkSubject] = useState('');
    const [remarkFerfarNo, setRemarkFerfarNo] = useState('');
    const [remarkPageNo, setRemarkPageNo] = useState('');
    const [remarkSerialNo, setRemarkSerialNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<FerfarRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    // Using super_admin for approval rights. Customize as per actual roles.
    const canApprove = currentUser.role === 'super_admin' || currentUser.role === 'gram_sevak';

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

    const pendingDues = selectedProp 
        ? (Number(selectedProp.totalTaxAmount) || 0) + (Number(selectedProp.arrearsAmount) || 0) - (Number(selectedProp.paidAmount) || 0)
        : 0;

    const handleApply = async () => {
        if (!selectedProp || !newOwnerName) {
            alert('कृपया मालमत्ता निवडा आणि नवीन मालकाचे नाव टाका.');
            return;
        }

        // --- Validations ---
        
        // 1. Dues Validation
        if (pendingDues > 0) {
            alert('संपूर्ण कर भरल्याशिवाय फेरफार नोंद करता येणार नाही.');
            return;
        }

        // 2. Date Validation (DD/MM/YYYY)
        const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        if (remarkDate && !dateRegex.test(remarkDate)) {
            alert('कृपया योग्य दिनांक टाका (उदा. १०/०५/२०२४)');
            return;
        }

        // 3. Mobile Validation (10 digits)
        if (applicantMobile && applicantMobile.length !== 10) {
            alert('मोबाईल नंबर १० अंकी असणे आवश्यक आहे.');
            return;
        }

        // 4. Mutation/Page/Serial Number Validation (4 digits length check as requested)
        if (remarkFerfarNo && remarkFerfarNo.length !== 4) {
            alert('फेरफार क्र. ४ अंकी असणे आवश्यक आहे.');
            return;
        }
        if (remarkPageNo && remarkPageNo.length !== 4) {
            alert('पान क्र. ४ अंकी असणे आवश्यक आहे.');
            return;
        }
        if (remarkSerialNo && remarkSerialNo.length !== 4) {
            alert('अनु क्र. ४ अंकी असणे आवश्यक आहे.');
            return;
        }

        setLoading(true);
        try {
            console.log(`[FERFAR] Sending POST to: ${BASE}/api/ferfar/apply`, { property_id: selectedProp.id, new_owner_name: newOwnerName });
            const res = await fetch(`${BASE}/api/ferfar/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    property_id: selectedProp.id,
                    new_owner_name: newOwnerName,
                    applicant_name: applicantName,
                    applicant_mobile: applicantMobile,
                    remarks: `मासिक सभा\nदिनांक: ${remarkDate}\nविषय: ${remarkSubject}\nफेरफार क्र: ${remarkFerfarNo}\nपान क्र: ${remarkPageNo}\nअनु क्र: ${remarkSerialNo}`
                })
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('[FERFAR] POST failed:', res.status, text);
                try {
                    const data = JSON.parse(text);
                    throw new Error(data.error || 'Failed to apply');
                } catch {
                    throw new Error(`सर्व्हर एरर (${res.status}): कृपया सर्व्हर रीस्टार्ट करा.`);
                }
            }

            const data = await res.json();
            alert('फेरफार अर्ज यशस्वीरित्या जतन झाला.');
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
            console.error('[FERFAR] Error:', err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('तुम्हाला खात्री आहे का की हा फेरफार मंजूर करायचा आहे? मालमत्तेचे नाव बदलले जाईल.')) return;
        try {
            console.log(`[FERFAR] Sending Approval PUT to: ${BASE}/api/ferfar/approve/${id}`);
            const res = await fetch(`${BASE}/api/ferfar/approve/${id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const text = await res.text();
                console.error('[FERFAR] Approval failed:', res.status, text);
                try {
                    const d = JSON.parse(text);
                    throw new Error(d.error || 'Failed to approve');
                } catch {
                    throw new Error(`मंजुरी अयशस्वी (${res.status}): सर्व्हर कडून प्रतिसाद मिळाला नाही.`);
                }
            }
            
            alert('फेरफार मंजूर झाला आणि मालमत्तेचे मालक बदलले.');
            fetchRequests();
            fetchRecords(); // Refresh global records
        } catch (e: any) {
            console.error('[FERFAR] Approval Error:', e);
            alert(e.message);
        }
    };

    const handleReject = async (id: number) => {
        const reason = prompt('नामंजूर करण्याचे कारण (Remarks):');
        if (reason === null) return;
        try {
            const res = await fetch(`${BASE}/api/ferfar/reject/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ remarks: reason })
            });
            if (!res.ok) throw new Error('Failed to reject');
            alert('अर्ज नामंजूर करण्यात आला.');
            fetchRequests();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> फेरफार नोंदवही (Mutation Register)
                    </h2>
                    <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
                        मालमत्ता हस्तांतरण आणि वारस नोंद व्यवस्थापन
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel: Apply Ferfar */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                        <h3 className="font-black text-gray-800 flex items-center gap-2">
                            <FileSignature className="w-5 h-5 text-indigo-600" /> नवीन फेरफार अर्ज (Apply Ferfar)
                        </h3>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">मालमत्ता निवडा</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                                <input
                                    type="text"
                                    placeholder="नाव, प्लॉट, अ.क्र. शोधा..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setSelectedProp(null); }}
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            {search && !selectedProp && (
                                <div className="mt-1 max-h-[40vh] overflow-y-auto border border-gray-100 rounded-xl bg-white shadow-md relative z-20">
                                    {filtered.map(r => (
                                        <button key={r.id} onClick={() => { setSelectedProp(r); setSearch(r.ownerName + ' - ' + r.srNo); }}
                                            className="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm border-b border-gray-50 flex flex-col">
                                            <span className="font-bold text-gray-800">
                                                <OwnerNameDisplay name={r.ownerName || ''} />
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-semibold">अ.क्र. {r.srNo} | {r.wastiName} | प्लॉट: {r.plotNo}</span>
                                        </button>
                                    ))}
                                    {filtered.length === 0 && <div className="p-3 text-sm text-gray-400 text-center">मालमत्ता आढळली नाही</div>}
                                </div>
                            )}
                        </div>

                        {selectedProp && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500">सध्याचे मालक</p>
                                        <div className="text-sm font-black text-slate-800 mt-1">
                                            <OwnerNameDisplay name={selectedProp.ownerName || ''} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-slate-500">थकबाकी (Dues)</p>
                                        {pendingDues > 0 ? (
                                            <p className="text-sm font-black text-rose-600">₹{pendingDues}</p>
                                        ) : (
                                            <p className="text-sm font-black text-emerald-600 flex items-center justify-end gap-1"><CheckCircle2 className="w-4 h-4"/> निरंक</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedProp && pendingDues > 0 ? (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm">फेरफार नोंदवणे शक्य नाही</p>
                                    <p className="text-xs mt-1">या मालमत्तेवर ₹{pendingDues} कर थकीत आहे. फेरफार नोंद करण्यासाठी सर्वप्रथम १००% कर भरणे आवश्यक आहे.</p>
                                </div>
                            </div>
                        ) : selectedProp ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">नवीन मालकाचे नाव (New Owner) <span className="text-rose-500">*</span></label>
                                    <TransliterationInput 
                                        placeholder="नवीन मालकाचे पूर्ण नाव..."
                                        value={newOwnerName}
                                        onChangeText={setNewOwnerName}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">अर्जदाराचे नाव (Applicant)</label>
                                        <TransliterationInput 
                                            placeholder="अर्जदाराचे नाव..."
                                            value={applicantName}
                                            onChangeText={setApplicantName}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">मोबाईल नंबर</label>
                                        <input 
                                            type="text"
                                            maxLength={10}
                                            placeholder="9999999999"
                                            value={applicantMobile}
                                            onChange={e => setApplicantMobile(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <h4 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center gap-2">
                                        मासिक सभा (Remarks/Notes)
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">दिनांक (DD/MM/YYYY)</label>
                                            <input 
                                                type="text" 
                                                value={remarkDate} 
                                                onChange={e => setRemarkDate(e.target.value)} 
                                                placeholder="DD/MM/YYYY" 
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">विषय (Text)</label>
                                            <TransliterationInput value={remarkSubject} onChangeText={setRemarkSubject} placeholder="उदा. खरेदीखत" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">फेरफार क्र (४ अंकी)</label>
                                            <input 
                                                type="text" 
                                                maxLength={4} 
                                                value={remarkFerfarNo} 
                                                onChange={e => setRemarkFerfarNo(e.target.value.replace(/\D/g, ''))} 
                                                placeholder="0001" 
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">पान क्र (४ अंकी)</label>
                                            <input 
                                                type="text" 
                                                maxLength={4} 
                                                value={remarkPageNo} 
                                                onChange={e => setRemarkPageNo(e.target.value.replace(/\D/g, ''))} 
                                                placeholder="0001" 
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">अनु क्र (४ अंकी)</label>
                                            <input 
                                                type="text" 
                                                maxLength={4} 
                                                value={remarkSerialNo} 
                                                onChange={e => setRemarkSerialNo(e.target.value.replace(/\D/g, ''))} 
                                                placeholder="0001" 
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleApply}
                                    disabled={loading || !newOwnerName}
                                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                                    {loading ? 'प्रक्रिया सुरू आहे...' : 'फेरफार नोंदवा (Submit)'}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {/* Right Panel: Recent Ferfar Applications */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-800 flex items-center gap-2">
                                    <History className="w-5 h-5 text-emerald-600" /> फेरफार अर्ज स्थिती (Status)
                                </h3>
                            </div>
                            <div className="flex space-x-2">
                                {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setStatusFilter(s as any)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                            statusFilter === s 
                                                ? 'bg-primary text-white border-primary shadow-sm' 
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}>
                                        {s === 'PENDING' ? 'प्रलंबित (Pending)' : s === 'APPROVED' ? 'मंजूर (Approved)' : s === 'REJECTED' ? 'नामंजूर (Rejected)' : 'सर्व (All)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {displayRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                                    <UserCheck className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="font-medium">एकही नोंद आढळली नाही</p>
                                </div>
                            ) : (
                                <div className="space-y-3 p-2">
                                    {displayRequests.map(r => (
                                        <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1 
                                                        ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                                                        r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                                                        'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                                                        {r.status}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold ml-2 inline-block">अ.क्र. {r.srNo}</p>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-semibold">{new Date(r.created_at).toLocaleDateString()}</span>
                                            </div>
                                            
                                            <div className="bg-gray-50 rounded-lg p-3 text-sm flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500 text-xs font-bold">जुने मालक:</span>
                                                    <OwnerNameDisplay name={r.old_owner_name} className="text-right" />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-indigo-600 text-xs font-bold">नवीन मालक:</span>
                                                    <span className="font-black text-indigo-900 text-right">{r.new_owner_name}</span>
                                                </div>
                                            </div>

                                            {r.remarks && <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 whitespace-pre-wrap">{r.remarks}</p>}
                                            
                                            {r.status === 'PENDING' && canApprove && (
                                                <div className="mt-4 grid grid-cols-2 gap-3">
                                                    <button onClick={() => handleApprove(r.id)} className="flex justify-center items-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold rounded-lg border border-emerald-200 transition-colors text-xs">
                                                        <CheckCircle2 className="w-4 h-4"/> मंजूर करा
                                                    </button>
                                                    <button onClick={() => handleReject(r.id)} className="flex justify-center items-center gap-1.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-bold rounded-lg border border-rose-200 transition-colors text-xs">
                                                        <XCircle className="w-4 h-4"/> नामंजूर करा
                                                    </button>
                                                </div>
                                            )}
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
