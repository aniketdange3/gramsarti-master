import { API_BASE_URL } from '@/utils/config';
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUI } from '../components/UIProvider';
import { Search, Printer, FileText, X, RotateCcw, LayoutDashboard, IndianRupee, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { PropertyRecord, DEFAULT_SECTION } from '../types';
import { CustomDropdown } from '../components/CustomDropdown';
import { TransliterationInput } from '../components/TransliterationInput';
import { matchesSearch, normalizeForSearch, normalizeDigits } from '../utils/transliterate';
import MaganiBillDocument from '../components/MaganiBillDocument';

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

const sortKhasra = (a: string, b: string) => {
    const aEng = normalizeDigits(String(a || ''), false);
    const bEng = normalizeDigits(String(b || ''), false);
    return aEng.localeCompare(bEng, undefined, { numeric: true, sensitivity: 'base' });
};

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) => (
    <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group transition-all hover:border-slate-200">
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${color} text-white shadow-md shadow-inner`}>
            {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
        <div className="flex flex-col min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none mb-1.5 truncate">{title}</p>
            <p className="text-base font-black text-slate-900 leading-none truncate">{MN(value)}</p>
        </div>
    </div>
);

interface MaganiBillProps {
    records: PropertyRecord[];
    onAuthError?: () => void;
}

export default function MaganiBill({ records, onAuthError }: MaganiBillProps) {
    const [searchParams] = useSearchParams();
    const wastiParam = searchParams.get('wasti') || '';

    const [searchTerm, setSearchTerm] = useState('');
    const [filterWasti, setFilterWasti] = useState(wastiParam);

    // Sync filterWasti if query param changes
    useEffect(() => {
        if (wastiParam) setFilterWasti(wastiParam);
    }, [wastiParam]);

    // Selective Fetching for fast load
    const selectedId = searchParams.get('id');
    useEffect(() => {
        if (!selectedId) return;
        const exists = records.find(r => r.id === selectedId);
        if (exists) {
            setFetchedRecord(null);
            setActiveBillRecord(exists);
            return;
        }

        const fetchSingle = async () => {
            try {
                const token = localStorage.getItem('gp_token');
                const res = await fetch(`${API_BASE_URL}/api/properties/${selectedId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const processed = {
                        ...data,
                        sections: (data.sections || []).map((s: any) => ({ ...DEFAULT_SECTION, ...s }))
                    };
                    setFetchedRecord(processed);
                    setActiveBillRecord(processed);
                }
            } catch (err) { console.error(err); }
        };
        fetchSingle();
    }, [selectedId, records]);
    const [filterKhasra, setFilterKhasra] = useState('');
    const [filterLayout, setFilterLayout] = useState('');
    const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(true);
    const [filterPropertyType, setFilterPropertyType] = useState<'rcc' | 'gharkaar' | ''>('');
    const [activeBillRecord, setActiveBillRecord] = useState<PropertyRecord | null>(null);
    const [bulkPrintRecords, setBulkPrintRecords] = useState<PropertyRecord[] | null>(null);
    const [fetchedRecord, setFetchedRecord] = useState<PropertyRecord | null>(null);
    const { addToast } = useUI();

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 300;

    const uniqueWastis = useMemo(() => {
        const set = new Set<string>();
        for (const r of records) if (r.wastiName) set.add(r.wastiName);
        return Array.from(set).sort();
    }, [records]);

    const wastiFiltered = useMemo(() => filterWasti ? records.filter(r => r.wastiName === filterWasti) : records, [records, filterWasti]);

    const uniqueKhasras = useMemo(() => {
        if (!filterWasti) return [];
        const set = new Set<string>();
        for (const r of wastiFiltered) if (r.khasraNo) set.add(r.khasraNo);
        const arr = Array.from(set);
        const toEng = (s: string) => s.replace(/[०-९]/g, (d: string) => '0123456789'['०१२३४५६७८९'.indexOf(d)] || d);
        return arr.map(k => ({ orig: k, eng: toEng(k) }))
            .sort((a, b) => a.eng.localeCompare(b.eng, undefined, { numeric: true, sensitivity: 'base' }))
            .map(k => k.orig);
    }, [wastiFiltered, filterWasti]);

    const uniqueLayouts = useMemo(() => {
        if (!filterWasti) return [];
        const set = new Set<string>();
        for (const r of wastiFiltered) if (r.layoutName) set.add(r.layoutName);
        const toEng = (s: string) => s.replace(/[०-९]/g, (d: string) => '0123456789'['०१२३४५६७८९'.indexOf(d)] || d);
        return Array.from(set)
            .map(l => ({ orig: l, eng: toEng(l) }))
            .sort((a, b) => a.eng.localeCompare(b.eng, undefined, { numeric: true, sensitivity: 'base' }))
            .map(l => l.orig);
    }, [wastiFiltered, filterWasti]);

    const filteredRecords = useMemo(() => {
        let res = records;
        if (filterWasti) res = res.filter(r => r.wastiName === filterWasti);
        if (filterKhasra) {
            const normalizedKhasra = normalizeForSearch(filterKhasra);
            res = res.filter(r => normalizeForSearch(r.khasraNo) === normalizedKhasra);
        }
        if (filterLayout) {
            res = res.filter(r => r.layoutName === filterLayout);
        }
        if (searchTerm.trim()) res = res.filter(r => matchesSearch(r, searchTerm));

        if (showOnlyUnpaid) {
            res = res.filter(r => {
                const total = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0);
                const paid = (Number(r.paidAmount) || 0) + (Number(r.discountAmount) || 0);
                return total - paid > 0;
            });
        }

        // --- RCC / घर कर Smart Filter ---
        const hasRCC = (r: any) => (r.sections || []).some((s: any) =>
            s.propertyType && s.propertyType.trim() === 'आर.सी.सी'
        );
        const hasGharKar = (r: any) => (r.sections || []).some((s: any) =>
            s.propertyType && (s.propertyType.includes('घर') || s.propertyType.includes('गृह'))
        );

        if (filterPropertyType === 'rcc') {
            // Manual toggle: RCC first, fallback to घर कर
            const rccRecords = res.filter(hasRCC);
            res = rccRecords.length > 0 ? rccRecords : res.filter(hasGharKar);
        } else if (filterPropertyType === 'gharkaar') {
            res = res.filter(hasGharKar);
        } else if (filterWasti) {
            // Auto-smart filter when Wasti (and optionally Khasra/Layout) is selected:
            // RCC records exist → show RCC; else → fallback to घर कर if available
            const rccRecords = res.filter(hasRCC);
            if (rccRecords.length > 0) {
                res = rccRecords;
            } else {
                const gharKarRecords = res.filter(hasGharKar);
                if (gharKarRecords.length > 0) res = gharKarRecords;
                // else: no RCC and no GharKar → show all (खाली जागा etc.)
            }
        }

        // Sort by Khasra then Plot naturally
        return [...res].sort((a, b) => {
            const kComp = sortKhasra(a.khasraNo || '', b.khasraNo || '');
            if (kComp !== 0) return kComp;
            return sortKhasra(a.plotNo || '', b.plotNo || '');
        });
    }, [records, searchTerm, filterWasti, filterKhasra, filterLayout, showOnlyUnpaid, filterPropertyType]);

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterWasti, filterKhasra, filterLayout, showOnlyUnpaid]);

    const stats = useMemo(() => {
        const unpaidRecords = records.filter(r => {
            const bal = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0) - (Number(r.paidAmount) || 0) - (Number(r.discountAmount) || 0);
            return bal > 0;
        });
        const totalPending = unpaidRecords.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0) - (Number(r.paidAmount) || 0) - (Number(r.discountAmount) || 0), 0);
        return { count: unpaidRecords.length, pending: Math.round(totalPending) };
    }, [records]);

    if (activeBillRecord || bulkPrintRecords) {
        return (
            <div className="flex flex-col h-full bg-white no-print-bg">
                <style>{`
                    @media print {
                        * { overflow: visible !important; }
                        body, html { margin: 0 !important; padding: 0 !important; background: white !important; }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center no-print shadow-sm sticky top-0 z-50">
                    <button onClick={() => { setActiveBillRecord(null); setBulkPrintRecords(null); }}
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all">
                        <ChevronLeft className="w-4 h-4" /> परत जा
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-black text-white bg-indigo-600 px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Printer className="w-4 h-4" /> प्रिंट {bulkPrintRecords ? 'सर्व' : ''} बिल
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-8 pt-4 flex justify-center no-print-bg">
                    <MaganiBillDocument record={activeBillRecord || undefined} records={bulkPrintRecords || undefined} onClose={() => { setActiveBillRecord(null); setBulkPrintRecords(null); }} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200 no-print">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                <Printer className="w-5 h-5" />
                            </div>
                            मागणी बिल व्यवस्थापन
                        </h2>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1.5 ml-12">Demand Bill & Recovery Center</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (filteredRecords.length === 0) {
                                    addToast('प्रिंट करण्यासाठी कोणतीही नोंद नाही.', 'info');
                                    return;
                                }
                                setBulkPrintRecords(filteredRecords);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            <Printer className="w-4 h-4" /> बल्क मागणी बिल प्रिंट ({MN(filteredRecords.length)})
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full p-2">
                    <StatCard title="प्रलंबित मालमत्ता" value={stats.count} icon={<Users />} color="bg-amber-500" />
                    <StatCard title="एकूण येणे रक्कम" value={`₹${MN(stats.pending)}`} icon={<IndianRupee />} color="bg-rose-500" />
                    <StatCard title="निवडलेल्या नोंदी" value={filteredRecords.length} icon={<TrendingUp />} color="bg-indigo-500" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-slate-200 no-print sticky top-0 z-30 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <TransliterationInput
                        placeholder="नाव, खसरा किंवा वस्तीने शोधा..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </div>

                <CustomDropdown
                    value={filterWasti}
                    onChange={(v) => { setFilterWasti(v); setFilterKhasra(''); }}
                    placeholder="वस्ती निवडा"
                    options={uniqueWastis.map(w => ({ value: w, label: w }))}
                />

                <CustomDropdown
                    value={filterKhasra}
                    onChange={setFilterKhasra}
                    placeholder={filterWasti ? "खसरा निवडा" : "प्रथम वस्ती निवडा"}
                    options={uniqueKhasras.map(k => {
                        const eng = normalizeDigits(String(k), false);
                        const mar = normalizeDigits(String(k), true);
                        return { value: k, label: mar === eng ? mar : `${mar} (${eng})` };
                    })}
                    disabled={!filterWasti}
                />

                {/* Layout filter — only when Wasti is selected */}
                {filterWasti && uniqueLayouts.length > 0 && (
                    <CustomDropdown
                        value={filterLayout}
                        onChange={setFilterLayout}
                        placeholder="लेआउट निवडा"
                        options={uniqueLayouts.map((l, i) => ({ value: l, label: `${i + 1}. ${l}` }))}
                    />
                )}

                <div className="flex items-center gap-3 ml-auto">
                    {/* RCC / घर कर Smart Filter Button */}
                    <button
                        onClick={() => setFilterPropertyType(p => p === 'rcc' ? '' : 'rcc')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                            filterPropertyType === 'rcc'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="आर.सी.सी मालमत्ता दाखवा (नसल्यास घर कर)">
                        <div className={`w-2 h-2 rounded-full ${filterPropertyType === 'rcc' ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
                        आर.सी.सी / घर कर
                        {filterPropertyType === 'rcc' && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-black">
                                {filteredRecords.some(r => (r.sections || []).some((s: any) => s.propertyType?.trim() === 'आर.सी.सी'))
                                    ? 'RCC' : 'घर कर'}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${showOnlyUnpaid
                            ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${showOnlyUnpaid ? 'bg-rose-600 animate-pulse' : 'bg-slate-300'}`} />
                        केवळ थकबाकी
                    </button>

                    <button
                        onClick={() => { setFilterWasti(''); setFilterKhasra(''); setFilterLayout(''); setSearchTerm(''); setShowOnlyUnpaid(true); setFilterPropertyType(''); }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="रीसेट करा"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col ">
                <div className="flex-1 overflow-auto bg-white ">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-200  sticky top-0 z-10">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">अ.क्र.</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">वस्ती / खसरा / मालमत्ता क्र.</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">मालकाचे नाव</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">मागणी (₹)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">भरलेली (₹)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">बाकी (₹)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">कृती</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedRecords.length > 0 ? paginatedRecords.map((r, idx) => {
                                const balance = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0) - (Number(r.paidAmount) || 0) - (Number(r.discountAmount) || 0);
                                const actualIdx = (currentPage - 1) * pageSize + idx + 1;
                                return (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{MN(actualIdx)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{r.wastiName || '-'}</span>
                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">खसरा: {r.khasraNo ? MN(r.khasraNo) : '-'} • मालमत्ता: {(r.propertyId || r.plotNo) ? MN(r.propertyId || r.plotNo) : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-slate-700 tracking-tight">{r.ownerName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-slate-900">
                                            {MN((Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0))}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600">
                                            {MN(Number(r.paidAmount) || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${balance > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                                                ₹{MN(Math.round(balance))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => setActiveBillRecord(r)}
                                                    className="w-10 h-10 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 group-hover:scale-110"
                                                    title="मागणी बिल प्रिंट करा"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100">
                                                <Search className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-black text-lg tracking-tight">कोणतीही मालमत्ता सापडली नाही</p>
                                                <p className="text-slate-400 font-bold text-sm mt-1">तुमचा शोध किंवा फिल्टर्स तपासा.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sticky Pagination Bar */}
                {totalPages > 1 && (
                    <div className="px-8 py-4 bg-white border border-slate-200  flex items-center justify-between no-print z-20 sticky ">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            पृष्ठ {MN(currentPage)} पैकी {MN(totalPages)} ({MN(filteredRecords.length)} एकूण नोंदी)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-600 shadow-sm">
                                {MN(currentPage)}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
