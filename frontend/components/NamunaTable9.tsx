import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Edit2, Trash2, CheckCircle2, Printer, FileText } from 'lucide-react';
import { PropertyRecord } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';

interface Props {
    records: PropertyRecord[];
    filterWasti?: string;
    onEdit?: (record: PropertyRecord) => void;
    onDelete?: (id: string) => void;
    onView?: (id: string) => void;
    showActions?: boolean;
    onPrint?: (id: string) => void;
    onPrintBill?: (id: string) => void;
    onPrintMultiple?: (records: PropertyRecord[]) => void;
}


const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

const HEADS = [
    { label: 'घरपट्टी', key: 'propertyTax' },
    { label: 'जमीन (जागा)', key: 'openSpaceTax' },
    { label: 'वीज / दिवाबत्ती', key: 'streetLightTax' },
    { label: 'आरोग्य स्वच्छता', key: 'healthTax' },
    { label: 'सामान्य पाणी', key: 'generalWaterTax' },
    { label: 'विशेष पाणी', key: 'specialWaterTax' },
    { label: 'कचरागाडी', key: 'wasteCollectionTax' },
    { label: 'एकूण मागणी', key: 'total' },
];

const PAGE_SIZE = 100;

export default function NamunaTable9({
    records,
    filterWasti,
    onEdit,
    onDelete,
    onView,
    onPrint,
    onPrintBill,
    onPrintMultiple,
    showActions = false
}: Props) {

    const [page, setPage] = useState(1);
    const [showAll, setShowAll] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Reset page to 1 when records change (e.g. after search or filter)
    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set()); // Reset selection when filters change
    }, [records]);

    const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const pageRecords = showAll
        ? records
        : records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const offset = showAll ? 0 : (safePage - 1) * PAGE_SIZE;

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAllPage = () => {
        const allOnPageSelected = pageRecords.length > 0 && pageRecords.every(r => r.id && selectedIds.has(r.id));
        const next = new Set(selectedIds);
        pageRecords.forEach(r => {
            if (r.id) {
                if (allOnPageSelected) next.delete(r.id);
                else next.add(r.id);
            }
        });
        setSelectedIds(next);
    };

    const handlePrintSelected = () => {
        if (!onPrintMultiple) return;
        const selectedRecords = records.filter(r => r.id && selectedIds.has(r.id));
        onPrintMultiple(selectedRecords);
    };

    const totals = useMemo(() => {
        return pageRecords.reduce((acc, r) => {
            const arrears = Number(r.arrearsAmount) || 0;
            const current = Number(r.totalTaxAmount) || 0;
            const demand = current + arrears;
            const paid = Number(r.paidAmount) || 0;
            const discount = Number(r.discountAmount) || 0;
            return {
                prev: acc.prev + arrears,
                curr: acc.curr + current,
                demand: acc.demand + demand,
                paid: acc.paid + paid,
                discount: acc.discount + discount
            };
        }, { prev: 0, curr: 0, demand: 0, paid: 0, discount: 0 });
    }, [pageRecords]);

    const { prev: gPrev, curr: gCurr, demand: gDemand, paid: gPaid, discount: gDiscount } = totals;

    return (
        <div className="bg-surface w-full font-sans text-sm relative flex flex-col h-full overflow-hidden transition-colors duration-300">
            {/* ── Official Header (Visible only in Print) ── */}
            <div className="hidden print:flex items-start justify-between px-6 py-4 bg-emerald-50 border-b-2 border-black text-black mb-4">
                <div className="flex items-center gap-4">
                    <img src="/images/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
                    <div className="flex flex-col text-xs uppercase font-black">
                        <p>ग्रामपंचायत: {PANCHAYAT_CONFIG.gpName}</p>
                        <p>तालुका: {PANCHAYAT_CONFIG.taluka}</p>
                        <p>जिल्हा: {PANCHAYAT_CONFIG.jilha}</p>
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-black mb-1">नमुना नं. ९</h1>
                    <h2 className="text-lg font-bold mb-1 underline">ग्रामपंचायत</h2>
                    <p className="text-[15px] font-normal italic">नियम ३२(१) पहा</p>
                    <p className="text-[15px] font-bold mt-2">सन करांच्या मागणीचे नोंदणी पुस्तक</p>
                </div>
                <div className="text-right text-[15px] flex flex-col gap-1 font-bold">
                    <p className="text-xs uppercase">ग्रामपंचायत लेखा महाराष्ट्र</p>
                    <p>तालुका : {PANCHAYAT_CONFIG.taluka}</p>
                    <p>जिल्हा : {PANCHAYAT_CONFIG.jilha}</p>
                </div>
            </div>

            {/* ── Screen-Only Table Controls ── */}
            <div className="no-print bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3 flex-none sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handlePrintSelected}
                            className="flex items-center gap-2 text-[15px] font-black px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md animate-in slide-in-from-left-2 duration-300"
                        >
                            <Printer className="w-3" /> निवडलेले प्रिंट करा ({MN(selectedIds.size)})
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowAll(!showAll)}
<<<<<<< HEAD
                    className={`text-[12px] font-black px-3 py-1 rounded-lg border transition-all ${showAll
=======
                    className={`text-[15px] font-black px-3 py-1 rounded-lg border transition-all ${showAll
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    {showAll ? 'पृष्ठानुसार पहा' : 'सर्व नोंदी पहा'}
                </button>
            </div>

            {/* ── Table Container with Watermark ── */}
            <div className="w-full flex-1 overflow-auto relative print:mt-4 print:overflow-visible">
                {/* Print Watermark */}
                <div className="hidden print:block absolute inset-0 pointer-events-none z-0 opacity-[0.08]"
                    style={{ backgroundImage: 'url("/images/logo.png")', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '500px' }}>
                </div>

                <table className="w-full border-collapse text-[15px] relative z-10">
                    <thead>
                        <tr className="gp-table-header-row">
                            <th className="gp-table-header-cell text-center w-[40px]">
                                <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={pageRecords.length > 0 && pageRecords.every(r => r.id && selectedIds.has(r.id))}
                                    onChange={toggleAllPage}
                                />
                            </th>
                            <th className="gp-table-header-cell text-center w-[50px]">अ.क्र.</th>
<<<<<<< HEAD
                            <th className="gp-table-header-cell text-center w-[100px]">वस्ती</th>
                            <th className="gp-table-header-cell text-center w-[80px]">खसरा</th>
                            <th className="gp-table-header-cell text-center w-[90px]">मालमत्ता / प्लॉट</th>
                            <th className="gp-table-header-cell text-center min-w-[160px]">मालकाचे नाव</th>
                            <th className="gp-table-header-cell text-center min-w-[130px]">प्रकार / क्षेत्रफळ</th>
                            <th className="gp-table-header-cell text-center min-w-[120px]">कराचा तपशील</th>
                            <th className="gp-table-header-cell text-center min-w-[120px]">मागील थकबाकी</th>
                            <th className="gp-table-header-cell text-center min-w-[90px]">चालू मागणी</th>
                            <th className="gp-table-header-cell text-center min-w-[100px]">एकूण मागणी</th>
                            <th className="gp-table-header-cell text-center min-w-[100px]">पावती तपशील</th>
                            <th className="gp-table-header-cell text-center min-w-[90px]">वसुली</th>
                            <th className="gp-table-header-cell text-center min-w-[90px]">एकूण बाकी</th>
                            {showActions && (
                                <th className="gp-table-header-cell text-center sticky right-0  bg-slate-50/90 border-l border-slate-200 w-[140px]">
=======
                            <th className="gp-table-header-cell text-left w-[100px]">वस्ती</th>
                            <th className="gp-table-header-cell text-left w-[80px]">खसरा</th>
                            <th className="gp-table-header-cell text-left w-[90px]">मालमत्ता / प्लॉट</th>
                            <th className="gp-table-header-cell text-left min-w-[160px]">मालकाचे नाव</th>
                            <th className="gp-table-header-cell text-left min-w-[120px]">प्रकार</th>
                            <th className="gp-table-header-cell text-right min-w-[80px]">क्षेत्रफळ</th>
                            <th className="gp-table-header-cell text-right min-w-[120px]">कराचा तपशील</th>
                            <th className="gp-table-header-cell text-right min-w-[90px]">मागील थकबाकी</th>
                            <th className="gp-table-header-cell text-right min-w-[90px]">चालू मागणी</th>
                            <th className="gp-table-header-cell text-right min-w-[100px]">एकूण मागणी</th>
                            <th className="gp-table-header-cell text-left min-w-[100px]">पावती तपशील</th>
                            <th className="gp-table-header-cell text-right min-w-[90px]">वसुली</th>
                            <th className="gp-table-header-cell text-right min-w-[90px]">एकूण बाकी</th>
                            {showActions && (
                                <th className="gp-table-header-cell text-center sticky right-0 z-20 bg-slate-50/90 border-l border-slate-200 w-[140px]">
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                    कृती
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                        {pageRecords.map((r, rIdx) => {
                            const arrears = Number(r.arrearsAmount) || 0;
                            const current = Number(r.totalTaxAmount) || 0;
                            const demand = current + arrears;
                            const paid = Number(r.paidAmount) || 0;
                            const discount = Number(r.discountAmount) || 0;
                            const balance = demand - paid - discount;

                            let remPScr = paid;
                            const mWScreen = Math.min(remPScr, arrears); remPScr -= mWScreen;
                            const cWScreen = Math.min(remPScr, current);

                            return (
                                <tr key={r.id ?? rIdx} className={`hover:bg-indigo-50/30 transition-colors group ${rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} ${r.id && selectedIds.has(r.id) ? 'bg-indigo-100/50' : ''}`}>
                                    <td className="px-3 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={!!(r.id && selectedIds.has(r.id))}
                                            onChange={() => r.id && toggleSelection(r.id)}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center font-black text-slate-400 text-xs">{MN(offset + rIdx + 1)}</td>

<<<<<<< HEAD
                                    <td className="px-3 py-2 text-center">
=======
                                    <td className="px-3 py-2">
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                        <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase leading-none">
                                            {r.wastiName || '-'}
                                        </div>
                                    </td>
<<<<<<< HEAD
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-[12px] text-indigo-700 font-black uppercase tracking-tight bg-indigo-50 px-1.5 py-0.5 rounded inline-block whitespace-nowrap">{MN(r.khasraNo) || '-'}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {/* <div className="text-[12px] font-black text-emerald-800 tracking-tight mb-0.5">{r.propertyId ? MN(r.propertyId) : '-'}</div> */}
                                        <div className="text-[11px] font-bold text-slate-500 tracking-tight">{r.plotNo ? MN(r.plotNo) : '-'}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="font-extrabold text-slate-900 text-[12px] tracking-tight leading-tight uppercase">{r.ownerName}</div>
                                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5 opacity-60">({r.occupantName || 'स्वतः'})</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                            <div key={si} className="mb-1.5 border-b border-slate-100 last:border-0 pb-1.5 leading-tight">
                                                <div className="text-[10px] font-black text-slate-700 uppercase">{s.propertyType}</div>
                                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                                    <span className="font-bold text-slate-900 text-[12px]">{MN(s.areaSqFt)}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">चौ.फु</span>
                                                </div>
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-[11px] space-y-0.5 text-slate-500 font-bold tracking-tight leading-none text-left inline-block">
                                            {Number(r.propertyTax) > 0 && <div> घरपट्टी: <span className="text-slate-900 font-black">₹{MN(Number(r.propertyTax).toFixed(2))}</span></div>}
                                            {Number(r.openSpaceTax) > 0 && <div> जागा: <span className="text-slate-900 font-black">₹{MN(Number(r.openSpaceTax).toFixed(2))}</span></div>}
                                            {Number(r.streetLightTax) > 0 && <div> दिवाबत्ती: <span className="text-slate-900 font-black">₹{MN(Number(r.streetLightTax).toFixed(2))}</span></div>}
                                            {Number(r.healthTax) > 0 && <div> आरोग्य: <span className="text-slate-900 font-black">₹{MN(Number(r.healthTax).toFixed(2))}</span></div>}
                                            {Number(r.generalWaterTax) > 0 && <div> सामान्य पाणी: <span className="text-slate-900 font-black">₹{MN(Number(r.generalWaterTax).toFixed(2))}</span></div>}
                                            {Number(r.specialWaterTax) > 0 && <div> विशेष पाणी: <span className="text-slate-900 font-black">₹{MN(Number(r.specialWaterTax).toFixed(2))}</span></div>}
                                            {Number(r.wasteCollectionTax) > 0 && <div> कचरागाडी: <span className="text-slate-900 font-black">₹{MN(Number(r.wasteCollectionTax).toFixed(2))}</span></div>}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2 text-center">
                                        <div className={`text-[12px] font-black ${arrears > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{MN(arrears.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-[12px] font-black text-slate-900">₹{MN(current.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center bg-indigo-50/30">
                                        <div className="text-[12px] font-black text-indigo-700">₹{MN(demand.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
=======
                                    <td className="px-3 py-2">
                                        <div className="text-[12px] text-indigo-700 font-black uppercase tracking-tight bg-indigo-50 px-1.5 py-0.5 rounded inline-block whitespace-nowrap">{MN(r.khasraNo) || '-'}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-[12px] font-black text-emerald-800 tracking-tight mb-0.5">{r.propertyId ? MN(r.propertyId) : '-'}</div>
                                        <div className="text-[11px] font-bold text-slate-500 tracking-tight">{r.plotNo ? MN(r.plotNo) : '-'}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-extrabold text-slate-900 text-[12px] tracking-tight leading-tight uppercase">{r.ownerName}</div>
                                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5 opacity-60">({r.occupantName || 'स्वतः'})</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                            <div key={si} className="text-[9px] font-black text-slate-700 mb-0.5 border-b border-slate-100 last:border-0 pb-0.5 leading-none">
                                                {s.propertyType}
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                            <div key={si} className="mb-0.5 border-b border-slate-100 last:border-0 pb-0.5 leading-none">
                                                <span className="font-bold text-slate-900 text-[12px]">{MN(s.areaSqFt)}</span> <span className="text-[8px] text-slate-400 font-bold uppercase">Sq.Ft</span>
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="text-[10px] space-y-0.5 text-slate-500 font-bold tracking-tight leading-none text-left inline-block">
                                            {Number(r.propertyTax) > 0 && <div>🏠 घरपट्टी: <span className="text-slate-900 font-black">₹{MN(Number(r.propertyTax).toFixed(2))}</span></div>}
                                            {Number(r.openSpaceTax) > 0 && <div>🟩 जागा: <span className="text-slate-900 font-black">₹{MN(Number(r.openSpaceTax).toFixed(2))}</span></div>}
                                            {Number(r.streetLightTax) > 0 && <div>💡 दिवाबत्ती: <span className="text-slate-900 font-black">₹{MN(Number(r.streetLightTax).toFixed(2))}</span></div>}
                                            {Number(r.healthTax) > 0 && <div>🏥 आरोग्य: <span className="text-slate-900 font-black">₹{MN(Number(r.healthTax).toFixed(2))}</span></div>}
                                            {Number(r.generalWaterTax) > 0 && <div>🚰 सामान्य पाणी: <span className="text-slate-900 font-black">₹{MN(Number(r.generalWaterTax).toFixed(2))}</span></div>}
                                            {Number(r.specialWaterTax) > 0 && <div>💧 विशेष पाणी: <span className="text-slate-900 font-black">₹{MN(Number(r.specialWaterTax).toFixed(2))}</span></div>}
                                            {Number(r.wasteCollectionTax) > 0 && <div>🗑️ कचरागाडी: <span className="text-slate-900 font-black">₹{MN(Number(r.wasteCollectionTax).toFixed(2))}</span></div>}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2 text-right">
                                        <div className={`text-[12px] font-black ${arrears > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{MN(arrears.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="text-[12px] font-black text-slate-900">₹{MN(current.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right bg-indigo-50/30">
                                        <div className="text-[12px] font-black text-indigo-700">₹{MN(demand.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-left">
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                        <div className="text-[9px] text-slate-500 font-bold mb-0.5 whitespace-nowrap">
                                            {r.paymentDate ? (r.paymentDate.includes('-') ? r.paymentDate.split('-').reverse().join('/') : r.paymentDate) : '-'}
                                        </div>
                                        {r.receiptNo ? (
                                            <div className="text-[12px] font-black text-emerald-600 flex items-center gap-1 leading-none">
                                                <CheckCircle2 className="w-3 h-3" /> {MN(r.receiptNo)}
                                            </div>
                                        ) : (
                                            <div className="text-[8px] text-slate-400 font-black uppercase tracking-wider leading-none">थकीत</div>
                                        )}
                                    </td>

<<<<<<< HEAD
                                    <td className="px-3 py-2 text-center bg-emerald-50/30">
                                        <div className="text-[15px] font-black text-emerald-600">₹{MN(paid.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center bg-rose-50/30">
=======
                                    <td className="px-3 py-2 text-right bg-emerald-50/30">
                                        <div className="text-[15px] font-black text-emerald-600">₹{MN(paid.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right bg-rose-50/30">
>>>>>>> 781cd8420829a6dbe29f6131c321462c38483fe3
                                        <div className="text-[15px] font-black text-rose-600">₹{MN(balance.toFixed(2))}</div>
                                    </td>
                                    {showActions && (
                                        <td className="no-print px-3 py-2 text-center sticky right-0 z-20 bg-white border-l border-slate-200 shadow-[-4px_0_15px_-4px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center justify-center gap-1">
                                                {onPrint && (
                                                    <button onClick={() => onPrint(r.id)} className="w-7 h-7 flex items-center justify-center text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100" title="नमुना ९ प्रिंट">
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {onPrintBill && (
                                                    <button onClick={() => onPrintBill(r.id)} className="w-7 h-7 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100" title="मागणी बिल">
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {onEdit && (
                                                    <button onClick={() => onEdit(r)} className="w-7 h-7 flex items-center justify-center text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100" title="संपादित करा">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button onClick={() => onDelete(r.id)} className="w-7 h-7 flex items-center justify-center text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100" title="हटवा">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination Bar ── */}
            {totalPages > 1 && !showAll && (
                <div className="flex items-center justify-between px-4 xl:px-6 py-3 border-t border-border bg-surface-hover/30 no-print flex-none relative z-10 w-full transition-colors duration-300">
                    <div className="text-xs font-black text-text-muted tracking-wide hidden sm:block uppercase">
                        पृष्ठ <span className="text-text font-black">{MN(safePage)}</span> पैकी <span className="text-text">{MN(totalPages)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:ml-auto w-full sm:w-auto justify-center">
                        <button onClick={() => setPage(1)} disabled={safePage === 1}
                            className="w-8 h-8 flex items-center justify-center text-xs font-black rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-all">«</button>

                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                            className="px-3 h-8 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-all text-[15px] font-black uppercase tracking-wider">
                            ‹ मागील (Prev)
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) { pageNum = i + 1; }
                            else if (safePage <= 3) { pageNum = i + 1; }
                            else if (safePage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                            else { pageNum = safePage - 2 + i; }
                            return (
                                <button key={pageNum} onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all border ${pageNum === safePage
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                        : 'border-border bg-surface text-text-muted hover:bg-surface-hover'
                                        }`}>{MN(pageNum)}</button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                            className="px-3 h-8 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-all text-[15px] font-black uppercase tracking-wider">
                            पुढील (Next) ›
                        </button>

                        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                            className="w-8 h-8 flex items-center justify-center text-xs font-black rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-all">»</button>
                    </div>
                </div>
            )}
        </div>
    );
}
