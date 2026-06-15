import { API_BASE_URL } from '@/utils/config';
import React, { useMemo } from 'react';
import {
    IndianRupee, TrendingUp, Activity, Users, Printer,
    AlertTriangle, CheckCircle2, BarChart3, PieChart, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyRecord } from '../types';

interface ReportsProps {
    records: PropertyRecord[];
    onAuthError?: () => void;
}

const MN = (v: number | string | undefined | null): string => {
    if (v === undefined || v === null) return '०';
    const rounded = typeof v === 'number' ? Math.round(v) : v;
    const s = typeof rounded === 'number' ? rounded.toLocaleString('en-IN') : String(rounded);
    return s.replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

export default function Reports({ records }: ReportsProps) {
    const navigate = useNavigate();

    const stats = useMemo(() => {
        const currentTax = Math.round(records.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0));
        const arrears = Math.round(records.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0));
        const totalDiscount = Math.round(records.reduce((s, r) => {
            const base = (Number(r.propertyTax) || 0) + (Number(r.openSpaceTax) || 0);
            return s + (base * 0.05);
        }, 0));
        const totalPenalty = Math.round(records.reduce((s, r) => {
            const orig = Number(r.arrearsAmount) || 0;
            const prevBase = (Number(r.prev_breakdown?.propertyTax) || 0) + (Number(r.prev_breakdown?.openSpaceTax) || 0);
            return s + ((prevBase > 0 ? prevBase : orig) * 0.05);
        }, 0));
        const paid = Math.round(records.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0));
        const demand = Math.round(currentTax + arrears + totalPenalty - totalDiscount);
        const balance = Math.round(demand - paid);
        const rate = demand > 0 ? (paid / demand * 100) : 0;

        const taxBreakdown = {
            property: Math.round(records.reduce((s, r) => s + (Number(r.propertyTax) || 0), 0)),
            openSpace: Math.round(records.reduce((s, r) => s + (Number(r.openSpaceTax) || 0), 0)),
            water: Math.round(records.reduce((s, r) => s + (Number(r.generalWaterTax) || 0) + (Number(r.specialWaterTax) || 0), 0)),
            light: Math.round(records.reduce((s, r) => s + (Number(r.streetLightTax) || 0), 0)),
            health: Math.round(records.reduce((s, r) => s + (Number(r.healthTax) || 0), 0)),
            other: Math.round(records.reduce((s, r) => s + (Number((r as any).wasteCollectionTax) || 0), 0)),
        };

        const wastiNames = Array.from(new Set(records.map(r => String(r.wastiName || '').trim()).filter(Boolean)));
        const wastiData = wastiNames.map(name => {
            const wr = records.filter(r => String(r.wastiName || '').trim() === name);
            const wCurr = Math.round(wr.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0));
            const wArr = Math.round(wr.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0));
            const wDisc = Math.round(wr.reduce((s, r) => { const b = (Number(r.propertyTax)||0)+(Number(r.openSpaceTax)||0); return s+(b*0.05); }, 0));
            const wPen = Math.round(wr.reduce((s, r) => { const o=Number(r.arrearsAmount)||0; const pb=(Number(r.prev_breakdown?.propertyTax)||0)+(Number(r.prev_breakdown?.openSpaceTax)||0); return s+((pb>0?pb:o)*0.05); }, 0));
            const wPaid = Math.round(wr.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0));
            const wDemand = Math.round(wCurr + wArr + wPen - wDisc);
            const wBal = Math.round(wDemand - wPaid);
            return { name, count: wr.length, arrears: wArr, current: wCurr, penalty: wPen, discount: wDisc, demand: wDemand, paid: wPaid, balance: wBal, rate: wDemand > 0 ? (wPaid / wDemand * 100) : 0 };
        }).sort((a, b) => b.demand - a.demand);

        return { currentTax, arrears, paid, demand, balance, rate, wastiData, taxBreakdown, totalDiscount, totalPenalty };
    }, [records]);

    // ---- Donut Chart ----
    const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
        const total = data.reduce((s, d) => s + d.value, 0) || 1;
        let cum = 0;
        const r = 42, cx = 50, cy = 50, stroke = 14;
        const toXY = (pct: number) => {
            const angle = 2 * Math.PI * pct - Math.PI / 2;
            return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
        };
        return (
            <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                        {data.map((d, i) => {
                            const startPct = cum;
                            cum += d.value / total;
                            const endPct = cum;
                            const s = toXY(startPct), e = toXY(endPct);
                            const large = (endPct - startPct) > 0.5 ? 1 : 0;
                            const circ = 2 * Math.PI * r;
                            const pct = d.value / total;
                            return (
                                <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                                    stroke={d.color} strokeWidth={stroke}
                                    strokeDasharray={`${pct * circ} ${circ}`}
                                    strokeDashoffset={-startPct * circ}
                                    transform={`rotate(-90 ${cx} ${cy})`}
                                    className="transition-all duration-700"
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">एकूण</span>
                        <span className="text-[11px] font-black text-slate-800 tracking-tighter leading-tight">₹{MN(data.reduce((s,d)=>s+d.value,0))}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                    {data.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <div className="min-w-0">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{d.label}</p>
                                <p className="text-[11px] font-black text-slate-800">₹{MN(d.value)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ---- Collection Gauge ----
    const Gauge = ({ percent }: { percent: number }) => {
        const r = 38, circ = Math.PI * r;
        const offset = circ - (Math.min(percent, 100) / 100) * circ;
        const color = percent >= 75 ? '#10b981' : percent >= 40 ? '#f59e0b' : '#f43f5e';
        return (
            <div className="flex flex-col items-center gap-2">
                <div className="relative" style={{ width: 140, height: 80 }}>
                    <svg viewBox="0 0 100 54" className="w-full h-full">
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color}
                            strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={`${circ}`}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-end justify-end pb-1 pr-1 pointer-events-none items-center">
                        <span className="text-2xl font-black tracking-tighter" style={{ color }}>{MN(percent.toFixed(1))}%</span>
                    </div>
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">वसुली दर (Collection Rate)</p>
            </div>
        );
    };

    const rateColor = (r: number) => r >= 75 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : r >= 40 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-rose-600 bg-rose-50 border-rose-100';
    const rateBar = (r: number) => r >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : r >= 40 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-gradient-to-r from-rose-500 to-pink-400';

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

            {/* ===== HEADER ===== */}
            <header className="no-print shrink-0 bg-white border-b border-slate-100 px-6 pt-5 pb-0">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">ग्रामपंचायत अहवाल</h2>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.25em] mt-1">GramSarthi Analytics Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-xl">{MN(records.length)} नोंदी</span>
                    </div>
                </div>

                {/* ===== KPI CARDS ===== */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pb-5">
                    {[
                        { label: 'एकूण मालमत्ता', sub: 'Total Properties', value: MN(records.length), icon: <Users className="w-5 h-5" />, from: 'from-slate-700', to: 'to-slate-900', light: 'bg-slate-50 border-slate-200', txt: 'text-slate-900' },
                        { label: 'एकूण मागणी', sub: 'Total Demand', value: `₹${MN(stats.demand)}`, icon: <IndianRupee className="w-5 h-5" />, from: 'from-blue-500', to: 'to-indigo-600', light: 'bg-blue-50 border-blue-100', txt: 'text-blue-900' },
                        { label: 'एकूण वसुली', sub: 'Total Collected', value: `₹${MN(stats.paid)}`, icon: <CheckCircle2 className="w-5 h-5" />, from: 'from-emerald-500', to: 'to-teal-600', light: 'bg-emerald-50 border-emerald-100', txt: 'text-emerald-900' },
                        { label: 'एकूण बाकी', sub: 'Balance Due', value: `₹${MN(stats.balance)}`, icon: <AlertTriangle className="w-5 h-5" />, from: 'from-rose-500', to: 'to-pink-600', light: 'bg-rose-50 border-rose-100', txt: 'text-rose-900' },
                        { label: 'वसुली %', sub: 'Collection Rate', value: `${MN(stats.rate.toFixed(1))}%`, icon: <TrendingUp className="w-5 h-5" />, from: 'from-amber-400', to: 'to-orange-500', light: 'bg-amber-50 border-amber-100', txt: 'text-amber-900' },
                    ].map((card, i) => (
                        <div key={i} className={`relative rounded-2xl border ${card.light} p-4 overflow-hidden group hover:shadow-lg transition-all duration-300`}>
                            <div className={`absolute right-0 top-0 bottom-0 w-1 rounded-r-2xl bg-gradient-to-b ${card.from} ${card.to} opacity-80`} />
                            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${card.from} ${card.to} text-white shadow-sm mb-3`}>
                                {card.icon}
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">{card.label}</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 mb-2">{card.sub}</p>
                            <p className={`text-lg font-black tracking-tighter leading-none ${card.txt}`}>{card.value}</p>
                        </div>
                    ))}
                </div>
            </header>

            {/* ===== BODY ===== */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 no-scrollbar">

                {/* ROW 1: Donut + Gauge + Top Settlements */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Tax Breakdown Donut */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">कराचे वर्गीकरण (Tax Breakdown)</h4>
                        </div>
                        <DonutChart data={[
                            { label: 'घरपट्टी', value: stats.taxBreakdown.property, color: '#6366f1' },
                            { label: 'जागा कर', value: stats.taxBreakdown.openSpace, color: '#0ea5e9' },
                            { label: 'पाणी कर', value: stats.taxBreakdown.water, color: '#10b981' },
                            { label: 'आरोग्य', value: stats.taxBreakdown.health, color: '#f59e0b' },
                            { label: 'दिवाबत्ती', value: stats.taxBreakdown.light, color: '#8b5cf6' },
                            { label: 'इतर', value: stats.taxBreakdown.other, color: '#f43f5e' },
                        ]} />
                    </div>



                    {/* Top Settlements */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">शीर्ष वस्त्या (Top Settlements)</h4>
                        </div>
                        <div className="space-y-3">
                            {stats.wastiData.slice(0, 5).map((w, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black w-5 h-5 rounded-md flex items-center justify-center ${i === 0 ? 'bg-indigo-600 text-white' : i === 1 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {MN(i + 1)}
                                            </span>
                                            <span className="text-[11px] font-black text-slate-800 tracking-tight">{w.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400">₹{MN(w.demand)}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${rateColor(w.rate)}`}>{MN(w.rate.toFixed(1))}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${rateBar(w.rate)}`} style={{ width: `${Math.min(w.rate, 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ROW 2: Detailed Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">वस्तीनिहाय सविस्तर माहिती (Settlement Details)</h4>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                            एकूण वस्त्या: {MN(stats.wastiData.length)}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    {['वस्तीचे नाव', 'मालमत्ता', 'मागील', 'चालू', 'सूट', 'दंड', 'एकूण मागणी', 'वसूल', 'थकबाकी', 'प्रगती %', 'कृती'].map((h, i) => (
                                        <th key={i} className={`px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ${i >= 2 && i <= 8 ? 'text-right' : i === 1 || i === 9 ? 'text-center' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.wastiData.map((w, i) => (
                                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-6 rounded-full ${rateBar(w.rate)}`} />
                                                <span className="text-xs font-black text-slate-800">{w.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{MN(w.count)}</span>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-bold text-slate-600 text-right">₹{MN(w.arrears)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-indigo-600 text-right">₹{MN(w.current)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-amber-600 text-right">₹{MN(w.discount)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-rose-500 text-right">₹{MN(w.penalty)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-slate-900 text-right">₹{MN(w.demand)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-emerald-600 text-right">₹{MN(w.paid)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-rose-600 text-right">₹{MN(w.balance)}</td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${rateColor(w.rate)}`}>{MN(w.rate.toFixed(1))}%</span>
                                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${rateBar(w.rate)}`} style={{ width: `${Math.min(w.rate, 100)}%`, transition: 'width 1s ease' }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => navigate(`/maganibill?wasti=${encodeURIComponent(w.name)}`)}
                                                className="p-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 opacity-0 group-hover:opacity-100"
                                                title="या वस्तीची बिले प्रिंट करा"
                                            >
                                                <Printer size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Totals Row */}
                            <tfoot>
                                <tr className="bg-gradient-to-r from-indigo-50 to-slate-50 border-t-2 border-indigo-100">
                                    <td className="px-5 py-4 text-xs font-black text-indigo-800 uppercase tracking-wider">एकूण</td>
                                    <td className="px-5 py-4 text-center text-xs font-black text-indigo-800">{MN(records.length)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-slate-700">₹{MN(stats.arrears)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-indigo-700">₹{MN(stats.currentTax)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-amber-700">₹{MN(stats.totalDiscount)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-rose-600">₹{MN(stats.totalPenalty)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-slate-900">₹{MN(stats.demand)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-emerald-700">₹{MN(stats.paid)}</td>
                                    <td className="px-5 py-4 text-right text-xs font-black text-rose-700">₹{MN(stats.balance)}</td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${rateColor(stats.rate)}`}>{MN(stats.rate.toFixed(1))}%</span>
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* ===== DARK FOOTER ===== */}
            <footer className="no-print shrink-0 bg-slate-900 border-t border-white/10 px-6 py-3 flex items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    {[
                        { label: 'एकूण मालमत्ता', value: MN(records.length), color: 'text-white' },
                        { label: 'एकूण वसुली', value: `₹${MN(stats.paid)}`, color: 'text-emerald-400' },
                        { label: 'एकूण बाकी', value: `₹${MN(stats.balance)}`, color: 'text-rose-400' },
                    ].map((s, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <div className="w-px h-6 bg-white/10" />}
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{s.label}</span>
                                <span className={`text-sm font-black tracking-tighter ${s.color}`}>{s.value}</span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Overall Progress</p>
                            <p className="text-xs font-black text-indigo-400">{MN(stats.rate.toFixed(1))}%</p>
                        </div>
                        <div className="w-28 bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" style={{ width: `${stats.rate}%` }} />
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">GramSarthi — Smart Reporting</p>
                </div>
            </footer>
        </div>
    );
}
