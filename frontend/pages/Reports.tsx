import { API_BASE_URL } from '@/config';

import React, { useState, useMemo } from 'react';
import { FileText, Printer, IndianRupee, Users, TrendingUp, BarChart3, PieChart, Download, Calendar, FileDown } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES } from '../types';
import NamunaTable8 from '../components/NamunaTable8';
import NamunaTable9 from '../components/NamunaTable9';
import { generateNamuna8PDF, generateNamuna9PDF } from '../utils/pdfGenerator';
import { CustomDropdown } from '../components/CustomDropdown';


interface ReportsProps {
    records: PropertyRecord[];
    onAuthError?: () => void;
}

type ReportType = 'demand' | 'collection' | 'wasti' | 'arrears';

function SummaryCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
    const colorMap: Record<string, { bg: string, text: string, border: string, gradient: string }> = {
        primary: { bg: 'bg-indigo-50/50', text: 'text-indigo-700', border: 'border-indigo-100', gradient: 'from-indigo-600 to-indigo-700' },
        blue: { bg: 'bg-blue-50/50', text: 'text-blue-700', border: 'border-blue-100', gradient: 'from-blue-500 to-blue-600' },
        success: { bg: 'bg-emerald-50/50', text: 'text-emerald-700', border: 'border-emerald-100', gradient: 'from-emerald-500 to-emerald-600' },
        rose: { bg: 'bg-rose-50/50', text: 'text-rose-700', border: 'border-rose-100', gradient: 'from-rose-500 to-rose-600' },
        amber: { bg: 'bg-amber-50/50', text: 'text-amber-700', border: 'border-amber-100', gradient: 'from-amber-500 to-amber-600' },
    };
    const theme = colorMap[color] || colorMap.primary;

    return (
        <div className={`bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group flex items-center gap-3`}>
            <div className={`w-[30px] h-[30px] shrink-0 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1 truncate">{label}</p>
                <p className={`text-sm font-black ${theme.text} leading-none tracking-tight`}>{value}</p>
            </div>
        </div>
    );
}

export default function Reports({ records, onAuthError }: ReportsProps) {
    const [activeReport, setActiveReport] = useState<ReportType>('demand');
    const [filterWasti, setFilterWasti] = useState('');
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAll, setShowAll] = useState(false);
    const ITEMS_PER_PAGE = 50;

    React.useEffect(() => {
        const fetchWastis = async () => {
            try {
                const token = localStorage.getItem('gp_token');
                const res = await fetch(`${API_BASE_URL}/api/master/items/WASTI`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 && onAuthError) onAuthError();
                const data = await res.json();
                setDynamicWastis(data.map((i: any) => i.item_value_mr));
            } catch (err) { console.error(err); }
        };
        fetchWastis();
    }, []);

    React.useEffect(() => {
        // Reset page on report change or filter change
        setCurrentPage(1);
    }, [activeReport, filterWasti]);

    const filteredRecords = useMemo(() => {
        if (!filterWasti) return records;
        return records.filter(r => r.wastiName === filterWasti);
    }, [records, filterWasti]);

    const arrearsRecords = useMemo(() => {
        return filteredRecords.filter(r => {
            const dem = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0);
            return dem - (Number(r.paidAmount) || 0) > 0;
        }).sort((a, b) => {
            const bala = ((Number(a.totalTaxAmount) || 0) + (Number(a.arrearsAmount) || 0) - (Number(a.paidAmount) || 0));
            const balb = ((Number(b.totalTaxAmount) || 0) + (Number(b.arrearsAmount) || 0) - (Number(b.paidAmount) || 0));
            return balb - bala;
        });
    }, [filteredRecords]);

    const totalPages = Math.ceil(arrearsRecords.length / ITEMS_PER_PAGE);
    const paginatedArrears = useMemo(() => {
        if (showAll) return arrearsRecords;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return arrearsRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [arrearsRecords, currentPage, showAll]);

    const stats = useMemo(() => {
        const currentTax = records.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0);
        const arrears = records.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0);
        const paid = records.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
        const demand = currentTax + arrears;
        const balance = demand - paid;
        const rate = demand > 0 ? (paid / demand * 100) : 0;

        const effectiveWastis = dynamicWastis.length > 0 ? dynamicWastis : Array.from(new Set(records.map(r => r.wastiName).filter(Boolean)));

        const wastiData = effectiveWastis.map(name => {
            const wr = records.filter(r => r.wastiName === name);
            const wCurr = wr.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0);
            const wArr = wr.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0);
            const wPaid = wr.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
            const wDemand = wCurr + wArr;
            return { name, count: wr.length, demand: wDemand, paid: wPaid, balance: wDemand - wPaid, rate: wDemand > 0 ? (wPaid / wDemand * 100) : 0 };
        });

        return { currentTax, arrears, paid, demand, balance, rate, wastiData };
    }, [records, dynamicWastis]);

    const handlePrint = () => window.print();

    const reports: { id: ReportType; label: string; icon: React.ReactNode }[] = [
        { id: 'demand', label: 'मागणी रजिस्टर (N8)', icon: <FileText className="w-4 h-4" /> },
        { id: 'collection', label: 'वसुली रजिस्टर (N9)', icon: <IndianRupee className="w-4 h-4" /> },
        { id: 'wasti', label: 'वस्तीनिहाय अहवाल', icon: <PieChart className="w-4 h-4" /> },
        { id: 'arrears', label: 'थकबाकी अहवाल', icon: <BarChart3 className="w-4 h-4" /> },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-6 sticky top-0 z-20 no-print">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            अहवाल शाखा — Reports
                        </h2>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1 ml-13">सन २०२५-२६ शासकीय कर प्रणाली</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-2 hover:bg-white transition-all group">
                            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">वस्ती फिल्टर:</span>
                            <CustomDropdown 
                                value={filterWasti}
                                onChange={setFilterWasti}
                                placeholder="सर्व वस्त्या"
                                options={dynamicWastis.map(w => ({ value: w, label: w }))}
                                className="!min-w-[150px]"
                            />

                        </div>
                        <div className="flex gap-2">
                            {activeReport === 'demand' && (
                                <button onClick={async () => await generateNamuna8PDF(filteredRecords, filterWasti)} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 hover:bg-rose-700 hover-lift no-print">
                                    <FileDown className="w-4 h-4" /> PDF (N8)
                                </button>
                            )}
                            {activeReport === 'collection' && (
                                <button onClick={async () => await generateNamuna9PDF(filteredRecords, filterWasti)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-700/20 hover:bg-indigo-800 hover-lift no-print">
                                    <FileDown className="w-4 h-4" /> PDF (N9)
                                </button>
                            )}
                            <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover-lift no-print">
                                <Printer className="w-4 h-4" /> प्रिंट
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Tabs */}
            <div className="flex bg-white/50 backdrop-blur-sm border-b border-slate-200 px-8 gap-4 no-print overflow-x-auto hide-scrollbar sticky top-[89px] z-10">
                {reports.map(r => (
                    <button key={r.id} onClick={() => setActiveReport(r.id)}
                        className={`flex items-center gap-2 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeReport === r.id ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                        {r.icon} {r.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden p-4 xl:p-8 space-y-4 xl:space-y-6 flex flex-col min-h-0 pb-0">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 no-print">
                    <SummaryCard label="एकूण मालमत्ता" value={records.length} icon={<Users />} color="primary" />
                    <SummaryCard label="एकूण मागणी" value={`₹${(stats.demand / 1000).toFixed(1)}K`} icon={<IndianRupee />} color="blue" />
                    <SummaryCard label="एकूण वसुली" value={`₹${(stats.paid / 1000).toFixed(1)}K`} icon={<IndianRupee />} color="success" />
                    <SummaryCard label="एकूण बाकी" value={`₹${(stats.balance / 1000).toFixed(1)}K`} icon={<IndianRupee />} color="rose" />
                    <SummaryCard label="वसुली %" value={`${stats.rate.toFixed(1)}%`} icon={<TrendingUp />} color="amber" />
                </div>

                {/* Report Content */}
                <div className="bg-white rounded-t-3xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col min-h-0">
                    {activeReport === 'demand' && (
                        <NamunaTable8 records={filteredRecords} filterWasti={filterWasti} />
                    )}

                    {activeReport === 'collection' && (
                        <NamunaTable9 records={filteredRecords} filterWasti={filterWasti} />
                    )}

                    {(activeReport === 'wasti' || activeReport === 'arrears') && (
                        <div className="print-block flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Print Header */}
                            <div className="hidden print:block p-12 text-center border-b border-slate-200">
                                <img src="/images/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">मालमत्ता कर अहवाल — ग्रामपंचायत</h1>
                                <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest">सन २०२५-२६ | दिनांक: {new Date().toLocaleDateString('mr-IN')}</p>
                            </div>

                            {activeReport === 'wasti' && (
                                <>
                                    <div className="px-5 xl:px-8 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 relative z-10 bg-white">
                                        <div>
                                            <h3 className="text-[15px] font-black text-slate-800 tracking-tight">वस्तीनिहाय अहवाल (Settlement-wise Analytics)</h3>
                                            <p className="text-[11px] font-bold tracking-wide text-slate-500 mt-0.5">सर्व वस्त्यांची संकलित माहिती</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead className="sticky top-0 z-20">
                                                <tr className="bg-slate-50 text-slate-600 border-b-2 border-slate-200 backdrop-blur-sm bg-white/90">
                                                    <th className="px-5 xl:px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600">वस्ती</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 text-right">मालमत्ता</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 text-right">मागणी</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 text-right">वसुली</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 text-right">बाकी</th>
                                                    <th className="px-5 xl:px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 text-right">वसुली %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {stats.wastiData.filter(w => !filterWasti || w.name === filterWasti).map(w => (
                                                    <tr key={w.name} className="hover:bg-indigo-50/20 transition-colors group">
                                                        <td className="px-8 py-5 font-black text-slate-800 text-sm tracking-tight">{w.name}</td>
                                                        <td className="px-6 py-5 text-right font-bold text-slate-500">{w.count}</td>
                                                        <td className="px-6 py-5 text-right font-black text-indigo-600 text-sm">₹{w.demand.toLocaleString()}</td>
                                                        <td className="px-6 py-5 text-right font-black text-emerald-600 text-sm">₹{w.paid.toLocaleString()}</td>
                                                        <td className="px-6 py-5 text-right font-black text-rose-600 text-sm">₹{w.balance.toLocaleString()}</td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center justify-end gap-3 font-bold text-slate-700 text-xs">
                                                                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(w.rate, 100)}%` }} />
                                                                </div>
                                                                <span className="w-12 text-right">{w.rate.toFixed(1)}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="sticky bottom-0 bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] no-print z-20 border-t border-slate-700">
                                                <tr>
                                                    <td className="px-8 py-5 font-black text-white text-base">एकूण बेरीज</td>
                                                    <td className="px-6 py-5 text-right font-black text-indigo-200">{filteredRecords.length}</td>
                                                    <td className="px-6 py-5 text-right font-black text-emerald-400 text-base">₹{filteredRecords.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0), 0).toLocaleString()}</td>
                                                    <td className="px-6 py-5 text-right font-black text-white text-base">₹{filteredRecords.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0).toLocaleString()}</td>
                                                    <td className="px-6 py-5 text-right font-black text-rose-400 text-base">₹{(filteredRecords.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0), 0) - filteredRecords.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0)).toLocaleString()}</td>
                                                    <td className="px-8 py-5 text-right font-black text-white">{(filteredRecords.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0) / (filteredRecords.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0), 0) || 1) * 100).toFixed(1)}%</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </>
                            )}

                            {activeReport === 'arrears' && (
                                <>
                                    <div className="px-5 xl:px-8 py-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between shrink-0 relative z-10 bg-white">
                                        <div>
                                            <h3 className="text-[15px] font-black text-slate-800 tracking-tight">थकबाकी विशेष अहवाल (Outstanding Arrears)</h3>
                                            <p className="text-[11px] font-bold tracking-wide text-rose-500 mt-0.5">थकबाकीदार मालमत्तांची यादी</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setShowAll(!showAll)}
                                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${showAll
                                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                            >
                                                {showAll ? 'पृष्ठानुसार पहा' : 'सर्व नोंदी पहा'}
                                            </button>
                                            <p className="text-[11px] font-bold tracking-wide text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                                                एकूण {arrearsRecords.length} थकबाकीदार
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead className="sticky top-0 z-20">
                                                <tr className="bg-slate-50 text-slate-600 border-b-2 border-slate-200 backdrop-blur-sm bg-white/90">
                                                    <th className="px-5 xl:px-8 py-3 text-[11px] font-black uppercase tracking-widest w-[80px]">अ.क्र.</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest">मालक</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest w-[150px]">वस्ती</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest text-right w-[130px]">एकूण मागणी</th>
                                                    <th className="px-4 xl:px-6 py-3 text-[11px] font-black uppercase tracking-widest text-right w-[130px]">भरलेले</th>
                                                    <th className="px-5 xl:px-8 py-3 text-[11px] font-black uppercase tracking-widest text-right w-[130px]">बाकी</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedArrears.map(r => {
                                                    const dem = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0);
                                                    const pd = Number(r.paidAmount) || 0;
                                                    return (
                                                        <tr key={r.id} className="hover:bg-rose-50/20 transition-colors group">
                                                            <td className="px-8 py-5 font-black text-slate-300 text-sm">{r.srNo}</td>
                                                            <td className="px-6 py-5 font-black text-slate-800 text-sm">
                                                                {r.ownerName}
                                                                <div className="text-[10px] text-rose-400 font-bold uppercase mt-1">Defaulter</div>
                                                            </td>
                                                            <td className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{r.wastiName}</td>
                                                            <td className="px-6 py-5 text-right font-black text-slate-600 text-sm">₹{dem.toLocaleString()}</td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="font-black text-emerald-600 text-sm">₹{pd.toLocaleString()}</div>
                                                                {pd > 0 && r.paymentDate && (
                                                                    <div className="text-[9px] text-slate-400 font-bold mt-0.5 whitespace-nowrap">
                                                                        दि. {new Date(r.paymentDate).toLocaleDateString('mr-IN')}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-5 text-right font-black text-rose-600 text-base leading-none tracking-tight">₹{(dem - pd).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && !showAll && (
                                        <div className="px-4 xl:px-6 py-3 border-t border-slate-200 bg-slate-50/80 backdrop-blur-[2px] flex items-center justify-between shrink-0 relative z-10 w-full no-print">
                                            <div className="text-[12px] font-bold text-slate-500 tracking-wide hidden sm:block">
                                                पृष्ठ <span className="text-slate-800">{currentPage}</span> पैकी <span className="text-slate-800">{totalPages}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:ml-auto w-full sm:w-auto justify-center">
                                                <button
                                                    onClick={() => setCurrentPage(1)}
                                                    disabled={currentPage === 1}
                                                    className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    &#171;
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    <span className="leading-none text-lg -mt-0.5">‹</span>
                                                </button>
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum: number;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all shadow-sm border ${pageNum === currentPage
                                                                ? 'bg-slate-800 text-white border-slate-800'
                                                                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                                                }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    <span className="leading-none text-lg -mt-0.5">›</span>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    disabled={currentPage === totalPages}
                                                    className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                                >
                                                    &#187;
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Print footer */}
                            <div className="hidden print:flex justify-between p-12 bg-slate-50 border-t border-slate-200 font-black text-[10px] text-slate-400 uppercase tracking-widest leading-none mt-auto">
                                <div className="flex flex-col gap-2">
                                    <span>अभिकल्पित: GramSarthi AI — २०२६</span>
                                    <span>प्रमाणपत्र: महाराष्ट्र ग्रा.पं. नियम ३२(१) नुसार</span>
                                </div>
                                <div className="text-right flex flex-col gap-2">
                                    <span>जनरेट वेळ: {new Date().toLocaleString('mr-IN')}</span>
                                    <span>पृष्ठ: १ / १</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

