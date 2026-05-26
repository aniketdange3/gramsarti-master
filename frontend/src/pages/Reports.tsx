import { API_BASE_URL } from '@/utils/config';
import React, { useMemo } from 'react';
import { IndianRupee, TrendingUp, Activity, Users, Printer } from 'lucide-react';
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

export default function Reports({ records }: ReportsProps) {
    const navigate = useNavigate();
    const stats = useMemo(() => {
        const currentTax = Math.round(records.reduce((s, r) => s + (Number(r.totalTaxAmount) || 0), 0));
        const arrears = Math.round(records.reduce((s, r) => s + (Number(r.arrearsAmount) || 0), 0));
        
        // Calculate dynamic discount (5% of base current: property + openSpace)
        const totalCalculatedDiscount = Math.round(records.reduce((s, r) => {
            const base = (Number(r.propertyTax) || 0) + (Number(r.openSpaceTax) || 0);
            return s + (base * 0.05);
        }, 0));

        // Calculate dynamic penalty (5% of base arrears if available, otherwise total arrears)
        const totalCalculatedPenalty = Math.round(records.reduce((s, r) => {
            const originalArrears = Number(r.arrearsAmount) || 0;
            const prevBase = (Number(r.prev_breakdown?.propertyTax) || 0) + (Number(r.prev_breakdown?.openSpaceTax) || 0);
            const baseForPenalty = prevBase > 0 ? prevBase : originalArrears;
            return s + (baseForPenalty * 0.05);
        }, 0));
        
        const paid = Math.round(records.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0));
        const demand = Math.round(currentTax + arrears + totalCalculatedPenalty - totalCalculatedDiscount);
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
            
            // Per-wasti calculations
            const wDisc = Math.round(wr.reduce((s, r) => {
                const base = (Number(r.propertyTax) || 0) + (Number(r.openSpaceTax) || 0);
                return s + (base * 0.05);
            }, 0));
            const wPen = Math.round(wr.reduce((s, r) => {
                const originalArrears = Number(r.arrearsAmount) || 0;
                const prevBase = (Number(r.prev_breakdown?.propertyTax) || 0) + (Number(r.prev_breakdown?.openSpaceTax) || 0);
                const baseForPenalty = prevBase > 0 ? prevBase : originalArrears;
                return s + (baseForPenalty * 0.05);
            }, 0));
            
            const wPaid = Math.round(wr.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0));
            
            const wDemand = Math.round(wCurr + wArr + wPen - wDisc);
            const wBalance = Math.round(wDemand - wPaid);

            return { 
                name, 
                count: wr.length, 
                arrears: wArr,
                current: wCurr,
                penalty: wPen,
                discount: wDisc,
                demand: wDemand, 
                paid: wPaid, 
                balance: wBalance, 
                rate: wDemand > 0 ? (wPaid / wDemand * 100) : 0 
            };
        }).sort((a, b) => b.demand - a.demand);

        return { currentTax, arrears, paid, demand, balance, rate, wastiData, taxBreakdown };
    }, [records]);

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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 no-print animate-in fade-in slide-in-from-top-2 duration-300">
                    <SummaryCard label="एकूण मालमत्ता" value={MN(records.length)} icon={<Users />} color="primary" />
                    <SummaryCard label="एकूण मागणी" value={`₹${MN(stats.demand)}`} icon={<IndianRupee />} color="blue" />
                    <SummaryCard label="एकूण वसुली" value={`₹${MN(stats.paid)}`} icon={<IndianRupee />} color="success" />
                    <SummaryCard label="एकूण बाकी" value={`₹${MN(stats.balance)}`} icon={<IndianRupee />} color="rose" />
                    <SummaryCard label="वसुली %" value={`${MN(stats.rate.toFixed(1))}%`} icon={<TrendingUp />} color="amber" />
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0">
                <div className="bg-white rounded-t-3xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-auto bg-slate-50/30 p-4 lg:p-6 space-y-6 scrollbar-hide">
        
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
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">#{MN(i + 1)}</span>
                                                    <span className="text-slate-800">{w.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-400">मागणी: ₹{MN(w.demand)}</span>
                                                    <span className="text-indigo-600">{MN(w.rate.toFixed(1))}%</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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

                        {/* Detailed Wasti Table */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    वस्तीनिहाय सविस्तर माहिती (Settlement Details)
                                </h4>
                                <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                    एकूण वस्त्या: {MN(stats.wastiData.length)}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100">
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">वस्तीचे नाव</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">मालमत्ता</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">मागील</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">चालू</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">सूट</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">दंड</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">एकूण मागणी</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">वसूल</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">थकबाकी</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">प्रगती %</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">कृती</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {stats.wastiData.map((w, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4 text-xs font-black text-slate-800">{w.name}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 text-center">{MN(w.count)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-slate-600 text-right">₹{MN(w.arrears)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-indigo-600 text-right">₹{MN(w.current)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-amber-600 text-right">₹{MN(w.discount)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-rose-500 text-right">₹{MN(w.penalty)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-slate-800 text-right">₹{MN(w.demand)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-emerald-600 text-right">₹{MN(w.paid)}</td>
                                                <td className="px-6 py-4 text-xs font-black text-rose-600 text-right">₹{MN(w.balance)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black ${w.rate > 75 ? 'bg-emerald-50 text-emerald-600' : w.rate > 40 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {MN(w.rate.toFixed(1))}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => navigate(`/maganibill?wasti=${encodeURIComponent(w.name)}`)}
                                                        className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                                                        title="या वस्तीची बिले प्रिंट करा"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
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
