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
                    <p className="text-[10px] font-normal italic">नियम ३२(१) पहा</p>
                    <p className="text-[11px] font-bold mt-2">सन करांच्या मागणीचे नोंदणी पुस्तक</p>
                </div>
                <div className="text-right text-[10px] flex flex-col gap-1 font-bold">
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
                            className="flex items-center gap-2 text-[10px] font-black px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md animate-in slide-in-from-left-2 duration-300"
                        >
                            <Printer className="w-3" /> निवडलेले प्रिंट करा ({MN(selectedIds.size)})
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowAll(!showAll)}
                    className={`text-[10px] font-black px-3 py-1 rounded-lg border transition-all ${showAll
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

                <table className="w-full border-collapse text-[10px] relative z-10">
                    <thead>
                        <tr className="no-print bg-surface-hover/50 text-text-muted border-b border-border sticky top-0 z-20 backdrop-blur-sm">
                            <th className="px-3 py-3 text-center w-[40px]">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    checked={pageRecords.length > 0 && pageRecords.every(r => r.id && selectedIds.has(r.id))}
                                    onChange={toggleAllPage}
                                />
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-black uppercase w-[50px] tracking-widest">अ.क्र.</th>
                            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider w-[100px]">वस्ती</th>
                            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider w-[80px]">खसरा</th>
                            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider w-[80px]">प्लॉट</th>
                            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider min-w-[160px]">मालकाचे नाव व पत्ता</th>
                            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider min-w-[120px]">प्रकार व वर्णन</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[80px]">क्षेत्रफळ</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[140px]">कराचा तपशील</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[100px]">मागील थकबाकी</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[100px]">चालू मागणी</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[100px]">एकूण मागणी</th>
                            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider min-w-[90px]">पावती तपशील</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[100px]">मागील वसुली</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[100px]">चालू वसुली</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[100px]">एकूण वसुली</th>
                            <th className="px-3 py-3 text-right text-xs font-black uppercase tracking-wider min-w-[120px]">एकूण बाकी</th>
                            {showActions && (
                                <th className="no-print px-3 py-3 text-center text-xs font-black uppercase sticky right-0 z-20 bg-surface border-l border-border w-[180px]">
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
                                <tr key={r.id ?? rIdx} className={`no-print hover:bg-surface-hover transition-colors group ${rIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-hover/30'} ${r.id && selectedIds.has(r.id) ? 'bg-primary-soft' : ''}`}>
                                    <td className="px-3 py-2.5 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                                            checked={!!(r.id && selectedIds.has(r.id))}
                                            onChange={() => r.id && toggleSelection(r.id)}
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        <span className="text-xs font-black text-text-light">{MN(offset + rIdx + 1)}</span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-[10px] font-black text-text-muted uppercase">{r.wastiName || '-'}</span>
                                        <div className="text-[9px] text-text-light font-bold mt-0.5">वॉर्ड {MN(r.wardNo)}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="text-xs text-accent font-black uppercase tracking-tight bg-accent/5 px-2 py-1 rounded inline-block">{MN(r.khasraNo) || '-'}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="text-sm font-black text-text uppercase tracking-tight">{MN(r.plotNo) || '-'}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="font-black text-text text-sm tracking-tight leading-tight uppercase">{r.ownerName}</div>
                                        <div className="text-[10px] font-bold text-text-muted mt-0.5">({r.occupantName || 'स्वतः'})</div>
                                        <div className="text-[9px] text-text-muted mt-1 font-black uppercase tracking-wider">ID: {r.propertyId || r.srNo}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                            <div key={si} className="text-sm font-black text-text-muted mb-1 border-b border-border last:border-0 pb-1">
                                                {s.propertyType}
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-sm text-text-muted">
                                        {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                            <div key={si} className="mb-1 border-b border-border last:border-0 pb-1">
                                                <span className="font-black text-text">{MN(s.areaSqFt)}</span> चौ.फु.
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <div className="text-[9px] space-y-0.5 text-text-muted font-black uppercase tracking-tight">
                                            {Number(r.propertyTax) > 0 && <div>मालमत्ता कर: ₹{MN(Number(r.propertyTax).toFixed(2))}</div>}
                                            {Number(r.streetLightTax) > 0 && <div>दिवा बत्ती कर: ₹{MN(Number(r.streetLightTax).toFixed(2))}</div>}
                                            {Number(r.healthTax) > 0 && <div>आरोग्य कर: ₹{MN(Number(r.healthTax).toFixed(2))}</div>}
                                            {Number(r.generalWaterTax) > 0 && <div>सामान्य पाणी कर: ₹{MN(Number(r.generalWaterTax).toFixed(2))}</div>}
                                            {Number(r.specialWaterTax) > 0 && <div>विशेष पाणी कर: ₹{MN(Number(r.specialWaterTax).toFixed(2))}</div>}
                                            {Number(r.wasteCollectionTax) > 0 && <div>कचरा संकलन कर: ₹{MN(Number(r.wasteCollectionTax).toFixed(2))}</div>}
                                            {Number(r.openSpaceTax) > 0 && <div>जमीन कर: ₹{MN(Number(r.openSpaceTax).toFixed(2))}</div>}
                                        </div>
                                    </td>

                                    <td className="px-3 py-2.5 text-right">
                                        <div className={`text-base font-black ${arrears > 0 ? 'text-error' : 'text-text-light'}`}>₹{MN(arrears.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <div className="text-base font-black text-text">₹{MN(current.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right bg-surface-hover/50">
                                        <div className="text-lg font-black text-secondary dark:text-primary">₹{MN(demand.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-left border-r border-border">
                                        <div className="text-xs text-text-muted font-black mb-1">
                                            {r.paymentDate ? (r.paymentDate.includes('-') ? r.paymentDate.split('-').reverse().join('/') : r.paymentDate) : '-'}
                                        </div>
                                        {r.receiptNo ? (
                                            <div className="text-[11px] font-black text-success flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> {MN(r.receiptNo)}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-text-light font-black uppercase tracking-wider">थकीत (Unpaid)</div>
                                        )}
                                    </td>

                                    <td className="px-3 py-2.5 text-right bg-emerald-50/20 dark:bg-emerald-900/10">
                                        <div className={`text-base font-black ${mWScreen > 0 ? 'text-success' : 'text-text-light'}`}>₹{MN(mWScreen.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right bg-emerald-50/20 dark:bg-emerald-900/10 text-success font-black">
                                        <div className={`text-base font-black ${cWScreen > 0 ? 'text-success' : 'text-text-light'}`}>₹{MN(cWScreen.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right bg-emerald-50/50 dark:bg-emerald-900/20">
                                        <div className="text-lg font-black text-success">₹{MN(paid.toFixed(2))}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right bg-rose-50/50 dark:bg-rose-900/20">
                                        <div className="text-lg font-black text-error">₹{MN(balance.toFixed(2))}</div>
                                    </td>
                                    {showActions && (
                                        <td className="no-print px-3 py-2.5 text-center sticky right-0 z-20 bg-surface border-l border-border shadow-[-8px_0_15px_-5px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center justify-center gap-1.5 transition-all duration-200">
                                                {onView && <button onClick={() => onView(r.id)} className="btn-action w-9 h-9" title="पहा"><Eye className="w-4.5 h-4.5" /></button>}
                                                {onPrint && <button onClick={() => onPrint(r.id)} className="btn-action w-9 h-9 text-accent border-accent/20 hover:bg-accent/5" title="नमुना ९ प्रिंट"><Printer className="w-4.5 h-4.5" /></button>}
                                                {onPrintBill && <button onClick={() => onPrintBill(r.id)} className="btn-action w-9 h-9 text-success border-success/20 hover:bg-success/5" title="मागणी बिल"><FileText className="w-4.5 h-4.5" /></button>}
                                                {onEdit && <button onClick={() => onEdit(r)} className="btn-action w-9 h-9 text-text-muted" title="संपादित करा"><Edit2 className="w-4.5 h-4.5" /></button>}
                                                {onDelete && <button onClick={() => onDelete(r.id)} className="btn-action w-9 h-9 text-error border-error/20 hover:bg-error/5" title="हटवा"><Trash2 className="w-4.5 h-4.5" /></button>}
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
                            className="px-3 h-8 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-all text-[10px] font-black uppercase tracking-wider">
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
                            className="px-3 h-8 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-all text-[10px] font-black uppercase tracking-wider">
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
