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
    const [filterPlotNo, setFilterPlotNo] = useState('');
    const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(true);
    const [filterPropertyType, setFilterPropertyType] = useState<string>('');
    const [activeBillRecord, setActiveBillRecord] = useState<PropertyRecord | null>(null);
    const [bulkPrintRecords, setBulkPrintRecords] = useState<PropertyRecord[] | null>(null);
    const [fetchedRecord, setFetchedRecord] = useState<PropertyRecord | null>(null);
    const { addToast } = useUI();

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100;

    const handleWastiChange = (v: string) => { setFilterWasti(v); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); };
    const handleLayoutChange = (v: string) => { setFilterLayout(v); setFilterKhasra(''); setFilterPlotNo(''); };
    const handleKhasraChange = (v: string) => { setFilterKhasra(v); setFilterPlotNo(''); };

    // Cascading Filter Logic
    const wastiFiltered = useMemo(() => filterWasti ? records.filter(r => r.wastiName === filterWasti) : records, [records, filterWasti]);
    const layoutFiltered = useMemo(() => filterLayout ? wastiFiltered.filter(r => r.layoutName === filterLayout) : wastiFiltered, [wastiFiltered, filterLayout]);
    const khasraFiltered = useMemo(() => filterKhasra ? layoutFiltered.filter(r => r.khasraNo === filterKhasra) : layoutFiltered, [layoutFiltered, filterKhasra]);

    const uniqueWastis = useMemo(() => Array.from(new Set(records.map(r => r.wastiName).filter(Boolean))).sort(), [records]);
    const uniqueLayouts = useMemo(() => Array.from(new Set(wastiFiltered.map(r => r.layoutName).filter(Boolean))).sort(), [wastiFiltered]);
    const uniqueKhasras = useMemo(() => Array.from(new Set(layoutFiltered.map(r => r.khasraNo).filter(Boolean))).sort(sortKhasra), [layoutFiltered]);
    const uniquePlots = useMemo(() => Array.from(new Set(khasraFiltered.map(r => r.plotNo).filter(Boolean))).sort(sortKhasra), [khasraFiltered]);

    const filteredRecords = useMemo(() => {
        let res = records;
        if (filterWasti) res = res.filter(r => r.wastiName === filterWasti);
        if (filterLayout) res = res.filter(r => r.layoutName === filterLayout);
        if (filterKhasra) {
            const normalizedKhasra = normalizeForSearch(filterKhasra);
            res = res.filter(r => normalizeForSearch(r.khasraNo) === normalizedKhasra);
        }
        if (filterPlotNo) {
            const normalizedPlot = normalizeForSearch(filterPlotNo);
            res = res.filter(r => normalizeForSearch(r.plotNo) === normalizedPlot);
        }
        if (searchTerm.trim()) res = res.filter(r => matchesSearch(r, searchTerm));

        if (showOnlyUnpaid) {
            res = res.filter(r => {
                const total = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0);
                const paid = (Number(r.paidAmount) || 0) + (Number(r.discountAmount) || 0);
                return total - paid > 0;
            });
        }

        // Property Type manual filter
        if (filterPropertyType === 'rcc') {
            res = res.filter(r => (r.sections || []).some((s: any) =>
                s.propertyType && s.propertyType.includes('आर.सी.सी')
            ));
        } else if (filterPropertyType === 'khali_jaga') {
            res = res.filter(r => (r.sections || []).some((s: any) =>
                s.propertyType && s.propertyType.includes('खाली जागा')
            ));
        } else if (filterPropertyType === 'vitamati') {
            res = res.filter(r => (r.sections || []).some((s: any) =>
                s.propertyType && (
                    s.propertyType.includes('विटा') ||
                    s.propertyType.includes('माती') ||
                    s.propertyType.includes('सिमेंट') ||
                    s.propertyType.includes('कुच्चा') ||
                    s.propertyType.includes('KUCHA')
                )
            ));
        }

        // Robust sort numerically + alphabetically by srNo ascending
        return [...res].sort((a, b) => {
            const aNum = Number(a.srNo) || 0;
            const bNum = Number(b.srNo) || 0;
            if (aNum !== bNum) return aNum - bNum;
            return String(a.srNo || '').localeCompare(String(b.srNo || ''), undefined, { numeric: true });
        });
    }, [records, searchTerm, filterWasti, filterKhasra, filterLayout, filterPlotNo, showOnlyUnpaid, filterPropertyType]);

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterWasti, filterKhasra, filterLayout, filterPlotNo, showOnlyUnpaid]);

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
                    onChange={handleWastiChange}
                    placeholder="वस्ती निवडा"
                    options={uniqueWastis.map(w => ({ value: w, label: w }))}
                />

                <CustomDropdown
                    value={filterLayout}
                    onChange={handleLayoutChange}
                    placeholder="लेआउट निवडा"
                    options={uniqueLayouts.map(l => ({ value: l, label: l }))}
                />

                <CustomDropdown
                    value={filterKhasra}
                    onChange={handleKhasraChange}
                    placeholder="खसरा निवडा"
                    options={uniqueKhasras.map(k => {
                        const eng = normalizeDigits(String(k), false);
                        const mar = normalizeDigits(String(k), true);
                        return { value: k, label: mar === eng ? mar : `${mar} (${eng})` };
                    })}
                />

                <CustomDropdown
                    value={filterPlotNo}
                    onChange={setFilterPlotNo}
                    placeholder="प्लॉट निवडा"
                    options={uniquePlots.map(p => ({ value: p, label: p }))}
                />

                <CustomDropdown
                    value={filterPropertyType}
                    onChange={setFilterPropertyType}
                    placeholder="प्रकार निवडा"
                    options={[
                        { value: '', label: 'सर्व प्रकार' },
                        { value: 'rcc', label: 'आर.सी.सी.' },
                        { value: 'khali_jaga', label: 'खाली जागा' },
                        { value: 'vitamati', label: 'विटामाती / मातीचे' }
                    ]}
                />

                <div className="flex items-center gap-3 ml-auto">
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
                        onClick={() => { setFilterWasti(''); setFilterKhasra(''); setFilterLayout(''); setFilterPlotNo(''); setSearchTerm(''); setShowOnlyUnpaid(true); setFilterPropertyType(''); }}
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
                                            {MN(Math.round((Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0)))}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600">
                                            {MN(Math.round(Number(r.paidAmount) || 0))}
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
