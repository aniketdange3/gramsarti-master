import React, { useState, useMemo } from 'react';
import { IndianRupee, Search, Filter, Printer, X, FileText, CheckSquare, Square, ChevronLeft, Check } from 'lucide-react';
import { PropertyRecord } from '../types';
import MaganiBillDocument from '../components/MaganiBillDocument';
import { useNavigate } from 'react-router-dom';

interface MaganiBillsPageProps {
    records: PropertyRecord[];
    onAuthError?: () => void;
}

const MN = (v: number | string | undefined | null): string => {
    if (v === undefined || v === null) return '०';
    const s = typeof v === 'number' ? v.toLocaleString('en-IN') : v;
    return s.replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

export default function MaganiBillsPage({ records }: MaganiBillsPageProps) {
    const navigate = useNavigate();
    const [filterWasti, setFilterWasti] = useState('');
    const [filterKhasara, setFilterKhasara] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [printQueue, setPrintQueue] = useState<PropertyRecord[] | null>(null);

    const wastiNames = useMemo(() => {
        return Array.from(new Set(records.map(r => r.wastiName).filter(Boolean))).sort();
    }, [records]);

    const filteredRecords = useMemo(() => {
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
        if (selectedIds.size === filteredRecords.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecords.map(r => r.id!)));
        }
    };

    const handleBulkPrint = () => {
        const toPrint = filteredRecords.filter(r => selectedIds.has(r.id!));
        if (toPrint.length > 0) {
            setPrintQueue(toPrint);
        }
    };

    const handlePrintAll = () => {
        if (filteredRecords.length > 0) {
            const allIds = new Set(filteredRecords.map(r => r.id!));
            setSelectedIds(allIds);
            setPrintQueue(filteredRecords);
        }
    };

    React.useEffect(() => {
        if (printQueue && printQueue.length > 0) {
            // Small delay to ensure React has rendered the bills in the print-root
            const timer = setTimeout(() => {
                window.print();
                // We don't clear the queue immediately so the user can see the preview if they cancel
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [printQueue]);

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
                        <h2 className="text-lg font-black uppercase tracking-widest">मागणी बिलं प्रिंट प्रिव्ह्यू ({MN(printQueue.length)})</h2>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest transition-all"
                    >
                        <Printer className="w-5 h-5" />
                        प्रिंट करा
                    </button>
                </div>
                <div className="p-0 bg-white print-content">
                    {printQueue.map((r, i) => (
                        <div key={r.id} className="bill-page">
                            <MaganiBillDocument record={r} onClose={() => { }} />
                        </div>
                    ))}
                </div>
                <style>{`
                    @media screen {
                        .print-root {
                            position: fixed;
                            inset: 0;
                            background: #64748b;
                            z-index: 1000;
                            overflow: auto;
                        }
                        .print-content {
                            padding-top: 100px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 60px;
                            padding-bottom: 100px;
                        }
                        .bill-page {
                            background: white;
                            width: 355.6mm;
                            height: 215.9mm;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                            flex-shrink: 0;
                            overflow: hidden;
                            position: relative;
                        }
                    }
                    @media print {
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .no-print { display: none !important; }
                        .print-root {
                            position: static !important;
                            width: 100% !important;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        .print-content {
                            padding: 0 !important;
                            margin: 0 !important;
                            display: block !important;
                        }
                        .bill-page {
                            display: block !important;
                            width: 100% !important;
                            page-break-after: always !important;
                            break-after: page !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            overflow: hidden !important;
                        }
                        @page { size: legal landscape; margin: 0; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <FileText className="w-6 h-6 text-indigo-600" />
                                मागणी बिलं (Magani Bill)
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                एकूण {MN(filteredRecords.length)} बिलं प्रलंबित आहेत
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {filteredRecords.length > 0 && selectedIds.size === 0 && (
                            <button
                                onClick={handlePrintAll}
                                className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 animate-in fade-in duration-300"
                            >
                                <Printer className="w-5 h-5" />
                                सर्व बिलं प्रिंट करा ({MN(filteredRecords.length)})
                            </button>
                        )}
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkPrint}
                                className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 animate-in zoom-in duration-300"
                            >
                                <Printer className="w-5 h-5" />
                                निवडलेले बिलं प्रिंट करा ({MN(selectedIds.size)})
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">वस्ती निवडा (Settlement)</label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={filterWasti}
                                onChange={(e) => {
                                    setFilterWasti(e.target.value);
                                    setSelectedIds(new Set());
                                }}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-indigo-600 outline-none transition-all"
                            >
                                <option value="">सर्व वस्त्या</option>
                                {wastiNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">खसरा क्र. शोध (Khasra Search)</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={filterKhasara}
                                onChange={(e) => {
                                    setFilterKhasara(e.target.value);
                                    setSelectedIds(new Set());
                                }}
                                placeholder="उदा. २३/१ किंवा ४५..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleSelectAll}
                                className="p-2 hover:bg-white rounded-xl transition-colors text-indigo-600 shadow-sm"
                            >
                                {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                            </button>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">थकबाकीदार यादी</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{MN(filteredRecords.length)} रेकॉर्ड्स आढळले</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">थकबाकी बाकी</span>
                        </div>
                    </div>

                    <div className="flex-1">
                        {filteredRecords.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr className="border-b border-slate-200">
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center">अ.क्र.</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-12 text-center">निवडा</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">मालमत्ता धारक</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">वस्ती / मालमत्ता</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">खसरा क्र.</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">एकूण मागणी</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">प्रिंट</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredRecords.map((r, idx) => {
                                            const isSelected = selectedIds.has(r.id!);
                                            return (
                                                <tr 
                                                    key={r.id} 
                                                    onClick={() => toggleSelect(r.id!)}
                                                    className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : 'bg-white'}`}
                                                >
                                                    <td className="py-4 px-6 text-sm font-bold text-slate-400 text-center">
                                                        {MN(idx + 1)}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-200'}`}>
                                                            {isSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <p className="text-sm font-black text-slate-900">{r.ownerName}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">गाव: {r.villageName || '-'}</p>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <p className="text-xs font-black text-slate-700">{r.wastiName || '-'}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">मालमत्ता क्र. {MN(r.propertyId || r.srNo)}</p>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm font-black text-slate-800">
                                                        {MN(r.khasraNo)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <p className="text-sm font-black text-rose-600 tracking-tighter">₹{MN((Number(r.totalTaxAmount) || 0) + (Number(r.arrearsAmount) || 0))}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">थकबाकी</p>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPrintQueue([r]);
                                                            }}
                                                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                                                        >
                                                            <Printer className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <Search className="w-10 h-10 text-slate-200" />
                                </div>
                                <h4 className="text-slate-800 font-black text-xl tracking-tight">कोणतेही रेकॉर्ड्स सापडले नाहीत</h4>
                                <p className="text-slate-400 font-bold text-sm mt-2">कृपया फिल्टर तपासा किंवा वेगळा खसरा क्र. शोधा.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
