import { API_BASE_URL } from '@/utils/config';
import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, TrendingUp, Activity, Users, Search, FileText, Filter, Download, CheckSquare, Square, Printer, X } from 'lucide-react';
import { PropertyRecord } from '../types';
import MaganiBillDocument from '../components/MaganiBillDocument';

interface ReportsProps {
    records: PropertyRecord[];
    onAuthError?: () => void;
}

const MN = (v: number | string | undefined | null): string => {
    if (v === undefined || v === null) return '०';
    const s = typeof v === 'number' ? v.toLocaleString('en-IN') : v;
    return s.replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

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
        <div className={`p-4 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-sm shadow-sm group hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl bg-white shadow-sm ${theme.text}`}>
                    {React.cloneElement(icon as React.ReactElement, { size: 18 })}
                </div>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className={`text-lg font-black tracking-tighter ${theme.text}`}>{value}</p>
        </div>
    );
}

export default function Reports({ records, onAuthError }: ReportsProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'unpaid'>('overview');
    const [filterWasti, setFilterWasti] = useState('');
    const [filterKhasara, setFilterKhasara] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [printQueue, setPrintQueue] = useState<PropertyRecord[] | null>(null);

    const stats = useMemo(() => {
        const currentTax = records.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0);
        const arrears = records.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0);
        const paid = records.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
        const demand = currentTax + arrears;
        const balance = demand - paid;
        const rate = demand > 0 ? (paid / demand * 100) : 0;

        const taxBreakdown = {
            property: records.reduce((s, r) => s + (Number(r.propertyTax) || 0), 0),
            openSpace: records.reduce((s, r) => s + (Number(r.openSpaceTax) || 0), 0),
            water: records.reduce((s, r) => s + (Number(r.generalWaterTax) || 0) + (Number(r.specialWaterTax) || 0), 0),
            light: records.reduce((s, r) => s + (Number(r.streetLightTax) || 0), 0),
            health: records.reduce((s, r) => s + (Number(r.healthTax) || 0), 0),
            other: records.reduce((s, r) => s + (Number((r as any).wasteCollectionTax) || 0), 0),
        };

        const wastiNames = Array.from(new Set(records.map(r => r.wastiName).filter(Boolean)));
        const wastiData = wastiNames.map(name => {
            const wr = records.filter(r => r.wastiName === name);
            const wCurr = wr.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0);
            const wArr = wr.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0);
            const wPaid = wr.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
            const wDemand = wCurr + wArr;
            return { name, count: wr.length, demand: wDemand, paid: wPaid, balance: wDemand - wPaid, rate: wDemand > 0 ? (wPaid / wDemand * 100) : 0 };
        }).sort((a, b) => b.demand - a.demand);

        return { currentTax, arrears, paid, demand, balance, rate, wastiData, taxBreakdown };
    }, [records]);

    const unpaidRecords = useMemo(() => {
        return records.filter(r => {
            const matchesWasti = !filterWasti || r.wastiName === filterWasti;
            const matchesKhasara = !filterKhasara || (r.khasraNo && r.khasraNo.toString().includes(filterKhasara));
            const isUnpaid = (Number(r.paidAmount) || 0) <= 0;
            const hasDemand = (Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0) > 0;
            return matchesWasti && matchesKhasara && isUnpaid && hasDemand;
        }).sort((a, b) => (a.khasraNo || '').localeCompare(b.khasraNo || '', undefined, { numeric: true }));
    }, [records, filterWasti, filterKhasara]);

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === unpaidRecords.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(unpaidRecords.map(r => r.id!)));
        }
    };

    const handleBulkPrint = () => {
        const toPrint = unpaidRecords.filter(r => selectedIds.has(r.id!));
        if (toPrint.length > 0) {
            setPrintQueue(toPrint);
        }
    };

    const ProgressCircle = ({ percent, color, size = "w-20 h-20" }: { percent: number; color: string; size?: string }) => {
        const r = 36;
        const circ = 2 * Math.PI * r;
        const offset = circ - (percent / 100) * circ;
        return (
            <div className={`relative ${size} flex items-center justify-center`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={r} fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-100/10" />
                    <circle cx="50" cy="50" r={r} fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className={color} />
                </svg>
                <span className="absolute text-[12px] font-black text-slate-800">{MN(percent.toFixed(0))}%</span>
            </div>
        );
    };

    const AnalyticsCard = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
        <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col ${className}`}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {title}
            </h4>
            <div className="flex-1 flex flex-col justify-center">
                {children}
            </div>
        </div>
    );

    const PieChartSVG = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
        const total = data.reduce((s, d) => s + d.value, 0);
        let cumulativePercent = 0;
        function getCoordinatesForPercent(percent: number) {
            const x = Math.cos(2 * Math.PI * percent);
            const y = Math.sin(2 * Math.PI * percent);
            return [x, y];
        }
        return (
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 shrink-0 relative">
                    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90">
                        {data.map((d, i) => {
                            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                            cumulativePercent += d.value / (total || 1);
                            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                            const largeArcFlag = d.value / (total || 1) > 0.5 ? 1 : 0;
                            const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
                            return <path key={i} d={pathData} fill={d.color} className="hover:opacity-80 transition-opacity cursor-pointer" />;
                        })}
                        <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[8px] font-black text-slate-400 uppercase">एकूण</span>
                        <span className="text-xs font-black text-slate-800 tracking-tighter">₹{MN(total)}</span>
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                    {data.map((d, i) => (
                        <div key={i} className="flex flex-col p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{d.label}</span>
                            </div>
                            <span className="text-[11px] font-black text-slate-800">₹{MN(d.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (printQueue) {
        return (
            <div className="fixed inset-0 z-[100] bg-white overflow-auto">
                <div className="no-print sticky top-0 bg-slate-900 text-white p-4 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setPrintQueue(null)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-black uppercase tracking-widest">प्रिंट प्रिव्ह्यू ({MN(printQueue.length)} बिलं)</h2>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest transition-all"
                    >
                        <Printer className="w-5 h-5" />
                        प्रिंट करा
                    </button>
                </div>
                <div className="p-0 bg-white">
                    {printQueue.map((r, i) => (
                        <div key={r.id} className="page-break-after">
                            <MaganiBillDocument record={r} onClose={() => {}} />
                            {i < printQueue.length - 1 && <div className="no-print h-8 bg-slate-100 border-y border-slate-200" />}
                        </div>
                    ))}
                </div>
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        .page-break-after { page-break-after: always; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="p-2 lg:p-4 no-print bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            ग्रामपंचायत अहवाल
                        </h2>
                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-0.5">GramSarthi Analytics Dashboard</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            डॅशबोर्ड
                        </button>
                        <button 
                            onClick={() => setActiveTab('unpaid')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'unpaid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            थकबाकीदार शोध (Bills)
                        </button>
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 no-print animate-in fade-in slide-in-from-top-2 duration-300">
                        <SummaryCard label="एकूण मालमत्ता" value={MN(records.length)} icon={<Users />} color="primary" />
                        <SummaryCard label="एकूण मागणी" value={`₹${MN(stats.demand)}`} icon={<IndianRupee />} color="blue" />
                        <SummaryCard label="एकूण वसुली" value={`₹${MN(stats.paid)}`} icon={<IndianRupee />} color="success" />
                        <SummaryCard label="एकूण बाकी" value={`₹${MN(stats.balance)}`} icon={<IndianRupee />} color="rose" />
                        <SummaryCard label="वसुली %" value={`${MN(stats.rate.toFixed(1))}%`} icon={<TrendingUp />} color="amber" />
                    </div>
                )}

                {activeTab === 'unpaid' && (
                    <div className="flex flex-wrap gap-3 no-print animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex-1 min-w-[200px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">वस्ती निवडा</p>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <select 
                                    value={filterWasti}
                                    onChange={(e) => setFilterWasti(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="">सर्व वस्त्या</option>
                                    {stats.wastiData.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">खसरा क्र. शोध</p>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input 
                                    type="text"
                                    value={filterKhasara}
                                    onChange={(e) => setFilterKhasara(e.target.value)}
                                    placeholder="उदा. २३/१..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0">
                <div className="bg-white rounded-t-3xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col min-h-0">
                    {activeTab === 'overview' ? (
                        <div className="flex-1 overflow-auto bg-slate-50/30 p-4 lg:p-6 space-y-6 scrollbar-hide">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <AnalyticsCard title="एकूण मागणी">
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-slate-800 tracking-tighter">₹{MN(stats.demand)}</p>
                                        <TrendingUp className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Assessment Target</p>
                                </AnalyticsCard>
                                <AnalyticsCard title="एकूण वसुली">
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{MN(stats.paid)}</p>
                                        <IndianRupee className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Realized Revenue</p>
                                </AnalyticsCard>
                                <AnalyticsCard title="एकूण थकबाकी">
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-rose-600 tracking-tighter">₹{MN(stats.balance)}</p>
                                        <Activity className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Outstanding Balance</p>
                                </AnalyticsCard>
                                <AnalyticsCard title="वसुली प्रगती">
                                    <div className="flex items-center gap-4">
                                        <ProgressCircle percent={stats.rate} color="text-indigo-600" size="w-12 h-12" />
                                        <div>
                                            <p className="text-xl font-black text-slate-800 tracking-tighter">{MN(stats.rate.toFixed(1))}%</p>
                                            <p className="text-[8px] text-indigo-600 font-black uppercase">Growth Rate</p>
                                        </div>
                                    </div>
                                </AnalyticsCard>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <AnalyticsCard title="कराचे वर्गीकरण (Tax Breakdown)" className="lg:col-span-1">
                                    <PieChartSVG data={[
                                        { label: 'घरपट्टी', value: stats.taxBreakdown.property, color: '#6366f1' },
                                        { label: 'जागा कर', value: stats.taxBreakdown.openSpace, color: '#0ea5e9' },
                                        { label: 'पाणी कर', value: stats.taxBreakdown.water, color: '#10b981' },
                                        { label: 'आरोग्य', value: stats.taxBreakdown.health, color: '#f59e0b' },
                                        { label: 'इतर', value: stats.taxBreakdown.other, color: '#f43f5e' },
                                    ]} />
                                </AnalyticsCard>

                                <AnalyticsCard title="वस्तीनिहाय वसुली (Top Settlements)" className="lg:col-span-2">
                                    <div className="space-y-4">
                                        {stats.wastiData.slice(0, 5).map((w, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-500">{w.name}</span>
                                                    <span className="text-slate-800">{MN(w.rate.toFixed(1))}%</span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : i === 1 ? 'bg-blue-600' : 'bg-emerald-600'}`} 
                                                        style={{ width: `${w.rate}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AnalyticsCard>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
                            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={toggleSelectAll}
                                        className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-indigo-600"
                                        title={selectedIds.size === unpaidRecords.length ? "Deselect All" : "Select All"}
                                    >
                                        {selectedIds.size === unpaidRecords.length && unpaidRecords.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                    </button>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">थकबाकीदार यादी (खसरा निहाय)</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{MN(unpaidRecords.length)} पैकी {MN(selectedIds.size)} मालमत्ता निवडल्या</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedIds.size > 0 && (
                                        <button 
                                            onClick={handleBulkPrint}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 animate-in zoom-in duration-300"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            निवडलेले बिल प्रिंट करा ({MN(selectedIds.size)})
                                        </button>
                                    )}
                                    <span className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-100">
                                        Pending Bills Only
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                {unpaidRecords.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {unpaidRecords.map(r => (
                                            <div 
                                                key={r.id} 
                                                onClick={() => toggleSelect(r.id!)}
                                                className={`bg-white border ${selectedIds.has(r.id!) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden`}
                                            >
                                                {selectedIds.has(r.id!) && (
                                                    <div className="absolute top-0 right-0 p-1.5 bg-indigo-500 text-white rounded-bl-xl shadow-sm">
                                                        <CheckSquare className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={`p-2 ${selectedIds.has(r.id!) ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'} rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors`}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">खसरा क्र.</p>
                                                        <p className="text-sm font-black text-slate-800">{MN(r.khasraNo)}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 mb-4">
                                                    <h4 className="text-sm font-black text-slate-800 truncate">{r.ownerName}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                                        <span className="truncate max-w-[100px]">{r.wastiName}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span>मालमत्ता: {MN(r.propertyId || r.srNo)}</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[8px] font-black text-rose-400 uppercase leading-none mb-1">एकूण थकीत</p>
                                                        <p className="text-sm font-black text-rose-600">₹{MN((Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0))}</p>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPrintQueue([r]);
                                                        }}
                                                        className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all shadow-sm"
                                                        title="Download Single Bill"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Search className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h4 className="text-slate-800 font-black text-lg">थकबाकीदार सापडले नाहीत</h4>
                                        <p className="text-slate-400 font-bold text-xs mt-1">निवडलेल्या फिल्टर नुसार कोणतीही नोंद आढळली नाही.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-6 py-3 no-print z-50 flex items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">एकूण मालमत्ता</span>
                        <span className="text-sm font-black text-white tracking-tighter">{MN(records.length)}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">एकूण वसुली</span>
                        <span className="text-sm font-black text-white tracking-tighter">₹{MN(stats.paid)}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">एकूण बाकी</span>
                        <span className="text-sm font-black text-white tracking-tighter">₹{MN(stats.balance)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">प्रगती (Overall)</p>
                            <p className="text-xs font-black text-indigo-300">{MN(stats.rate.toFixed(1))}%</p>
                        </div>
                        <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" style={{ width: `${stats.rate}%` }} />
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10 mx-2" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">GramSarthi — Smart Reporting</p>
                </div>
            </div>
        </div>
    );
}
