import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Trash2, ChevronLeft, ChevronRight, CheckCircle2, Printer } from 'lucide-react';
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

const PAGE_SIZE = 25;

export default function NamunaTable9({
    records,
    filterWasti,
    onEdit,
    onDelete,
    onView,
    onPrint,
    showActions = false
}: Props) {

    const [page, setPage] = useState(1);
    const [showAll, setShowAll] = useState(false);

    // Reset page to 1 when records change (e.g. after search or filter)
    useEffect(() => {
        setPage(1);
    }, [records]);

    const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const pageRecords = showAll
        ? records
        : records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const offset = showAll ? 0 : (safePage - 1) * PAGE_SIZE;

    let gPrev = 0, gCurr = 0, gPenalty = 0, gDemand = 0, gPaid = 0, gDiscount = 0;

    return (
        <div className="bg-white w-full font-sans text-[11px] relative flex flex-col h-full overflow-hidden">
            {/* ── Official Header (Visible only in Print) ── */}
            <div className="hidden print:flex items-start justify-between px-6 py-4 bg-[#ecfccb] border-b-2 border-black text-black mb-4">
                <div className="flex items-center gap-4">
                    <img src="/images/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
                    <div className="flex flex-col text-[10px] uppercase font-bold">
                        <p>ग्रामपंचायत: {PANCHAYAT_CONFIG.gpName}</p>
                        <p>तालुका: {PANCHAYAT_CONFIG.taluka}</p>
                        <p>जिल्हा: {PANCHAYAT_CONFIG.jilha}</p>
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-black mb-1">नमुना नं. ९</h1>
                    <h2 className="text-lg font-bold mb-1 underline">ग्रामपंचायत</h2>
                    <p className="text-[10px] font-normal italic">महाराष्ट्र ग्रामपंचायत कायदा नियम ३२(१)</p>
                    <p className="text-[11px] font-bold mt-2">सन {PANCHAYAT_CONFIG.financialYear} करांच्या मागणीचे नोंदणी पुस्तक</p>
                </div>
                <div className="text-right text-[10px] flex flex-col gap-1 font-bold">
                    <p className="text-xs uppercase">ग्रामपंचायत लेखा महाराष्ट्र</p>
                    <p>तालुका : {PANCHAYAT_CONFIG.taluka}</p>
                    <p>जिल्हा : {PANCHAYAT_CONFIG.jilha}</p>
                </div>
            </div>

            {/* ── Screen-Only Table Controls ── */}
            <div className="no-print bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-end gap-3 flex-none">
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
                        {/* Official Complex Header (Print Only) */}
                        <tr className="hidden print:table-row bg-[#ecfccb] text-black text-center text-[8px] font-bold">
                            <th rowSpan={2} className="border border-black p-1">अ.क्र.</th>
                            <th rowSpan={2} className="border border-black p-1 text-left">घरमालकाचे नाव</th>
                            <th rowSpan={2} className="border border-black p-1">प्लॉट नं. / <br /> मालमत्ता नं.</th>
                            <th rowSpan={2} className="border border-black p-1 text-left">कराची नावे</th>
                            <th colSpan={3} className="border border-black p-1">मागणी (रु.)</th>
                            <th rowSpan={2} className="border border-black p-1">पावती क्र. <br /> बुक क्र.</th>
                            <th rowSpan={2} className="border border-black p-1">तारीख</th>
                            <th rowSpan={2} className="border border-black p-1 text-left">कराची नावे</th>
                            <th colSpan={3} className="border border-black p-1">वसुली (रु.)</th>
                            <th rowSpan={2} className="border border-black p-1">बाकी</th>
                        </tr>
                        <tr className="hidden print:table-row bg-[#ecfccb] text-black text-center text-[8px] font-semibold">
                            <th className="border border-black p-0.5">मागील</th>
                            <th className="border border-black p-0.5">चालू</th>
                            <th className="border border-black p-0.5 font-bold">एकूण मागणी</th>
                            <th className="border border-black p-0.5">मागील</th>
                            <th className="border border-black p-0.5">चालू</th>
                            <th className="border border-black p-0.5 font-bold">एकूण वसुली</th>
                        </tr>
                        {/* Simplified UI Header (Screen Only) - MODERNIZED */}
                        <tr className="no-print bg-slate-50 text-slate-600 border-b-2 border-slate-200 sticky top-0 z-20 backdrop-blur-sm bg-white/90">

                            <th className="px-3 py-3 text-center text-[10px] font-black uppercase w-[50px] tracking-widest">अ.क्र.</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider w-[100px]">वस्ती</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider w-[80px]">खसरा</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider w-[80px]">प्लॉट</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider min-w-[160px]">मालकाचे नाव व पत्ता</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider min-w-[120px]">प्रकार व वर्णन</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[80px]">क्षेत्रफळ</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[140px]">कराचा तपशील</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">मागील थकबाकी</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">चालू मागणी</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">एकूण मागणी</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider min-w-[90px]">पावती तपशील</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">मागील वसुली</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">चालू वसुली</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">एकूण वसुली</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[120px]">एकूण बाकी</th>
                            {showActions && (
                                <th className="no-print px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider w-[120px] sticky right-0 z-30 bg-slate-50/90 backdrop-blur-sm border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
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

                            gPrev += arrears; gCurr += current; gDemand += demand; gPaid += paid; gDiscount += discount;

                            return (
                                <React.Fragment key={r.id ?? rIdx}>
                                    {/* Official Complex Rows (Print Only) */}
                                    {HEADS.map((head, hIdx) => {
                                        const isTotal = head.key === 'total';
                                        const taxVal = isTotal ? current : (Number((r as any)[head.key]) || 0);
                                        const prevVal = isTotal ? arrears : 0;
                                        const rowTotal = taxVal + prevVal;

                                        // Pre-compute distributed recovery for each head
                                        const recoveryDistribution = HEADS.reduce((acc: any, h: any) => {
                                            if (h.key === 'total') return acc;
                                            const headDemand = Number((r as any)[h.key]) || 0;
                                            const headPaid = Math.min(acc.remaining, headDemand);
                                            acc.mapping[h.key] = headPaid;
                                            acc.remaining -= headPaid;
                                            return acc;
                                        }, {
                                            remaining: Math.max(0, paid - Math.min(paid, arrears)), // Current portion
                                            mapping: {} as any
                                        });

                                        const arrearsPaid = head.key === 'total' ? Math.min(paid, arrears) : 0;
                                        const currentHeadPaid = head.key === 'total' ? Math.min(paid - Math.min(paid, arrears), current) : (recoveryDistribution.mapping[head.key] || 0);
                                        const totalRowPaid = arrearsPaid + currentHeadPaid;

                                        return (
                                            <tr key={`print-${hIdx}`} className="hidden print:table-row bg-white text-[8px]">
                                                {hIdx === 0 && (
                                                    <>
                                                        <td rowSpan={HEADS.length} className="border border-black p-0.5 text-center font-bold align-middle">{MN(offset + rIdx + 1)}</td>
                                                        <td rowSpan={HEADS.length} className="border border-black p-1 align-middle whitespace-normal min-w-[100px]">
                                                            <p className="font-bold uppercase">{r.ownerName}</p>
                                                            <p className="text-[7px]">({r.occupantName || 'स्वतः'})</p>
                                                        </td>
                                                        <td rowSpan={HEADS.length} className="border border-black p-0.5 text-center align-middle">
                                                            <p className="font-bold">{MN(r.propertyId || r.srNo)}</p>
                                                            <p className="text-[7px]">{MN(r.plotNo)} / {MN(r.khasraNo)}</p>
                                                        </td>
                                                    </>
                                                )}
                                                <td className={`border border-black p-0.5 ${isTotal ? 'font-bold bg-gray-50' : ''}`}>{head.label}</td>
                                                <td className={`border border-black p-0.5 text-right ${isTotal ? 'font-bold' : ''}`}>{prevVal > 0 ? MN(prevVal.toFixed(2)) : ''}</td>
                                                <td className={`border border-black p-0.5 text-right ${isTotal ? 'font-bold' : ''}`}>{taxVal > 0 ? MN(taxVal.toFixed(2)) : ''}</td>
                                                <td className={`border border-black p-0.5 text-right font-black ${isTotal ? 'bg-gray-50' : ''}`}>{rowTotal > 0 ? MN(rowTotal.toFixed(2)) : ''}</td>
                                                {hIdx === 0 && (
                                                    <>
                                                        <td rowSpan={HEADS.length} className="border border-black p-0.5 align-middle text-center">
                                                            {r.receiptNo ? MN(r.receiptNo) : '-'}
                                                        </td>
                                                        <td rowSpan={HEADS.length} className="border border-black p-0.5 align-middle text-center">
                                                            {r.paymentDate || '-'}
                                                        </td>
                                                    </>
                                                )}
                                                <td className={`border border-black p-0.5 ${isTotal ? 'font-bold bg-gray-50' : ''}`}>{head.label}</td>
                                                <td className={`border border-black p-0.5 text-right ${isTotal ? 'font-bold' : ''}`}>{arrearsPaid > 0 ? MN(arrearsPaid.toFixed(2)) : ''}</td>
                                                <td className={`border border-black p-0.5 text-right ${isTotal ? 'font-bold' : ''}`}>{currentHeadPaid > 0 ? MN(currentHeadPaid.toFixed(2)) : ''}</td>
                                                <td className={`border border-black p-0.5 text-right font-black ${isTotal ? 'bg-gray-50' : ''}`}>{totalRowPaid > 0 ? MN(totalRowPaid.toFixed(2)) : ''}</td>
                                                {hIdx === 0 && (
                                                    <td rowSpan={HEADS.length} className="border border-black p-1 text-right font-black align-middle text-red-600 bg-gray-50">{MN(balance.toFixed(2))}</td>
                                                )}
                                            </tr>
                                        );
                                    })}

                                    {/* Simplified UI Row (Screen Only) - MODERNIZED */}
                                    <tr className={`no-print hover:bg-slate-50 transition-colors group ${rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>

                                        <td className="px-3 py-2.5 text-center">
                                            <span className="text-[11px] font-bold text-slate-400">{MN(offset + rIdx + 1)}</span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{r.wastiName || '-'}</span>
                                            <div className="text-[9px] text-slate-400 font-bold mt-0.5">वॉर्ड {MN(r.wardNo)}</div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="text-[11px] text-indigo-700 font-black uppercase tracking-tight bg-indigo-50 px-2 py-1 rounded inline-block">{MN(r.khasraNo) || '-'}</div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="text-xs font-bold text-slate-700 tracking-tight">{MN(r.plotNo) || '-'}</div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="font-extrabold text-slate-800 text-[13px] tracking-tight leading-tight uppercase">{r.ownerName}</div>
                                            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">({r.occupantName || 'स्वतः'})</div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-bold">Property ID: {r.propertyId || r.srNo}</div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                                <div key={si} className="text-[11px] font-bold text-slate-600 mb-1 border-b border-slate-100 last:border-0 pb-1">
                                                    {s.propertyType}
                                                </div>
                                            )) || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-semibold text-[11px] text-slate-600">
                                            {r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                                <div key={si} className="mb-1 border-b border-slate-100 last:border-0 pb-1">
                                                    <span className="font-bold text-slate-800">{MN(s.areaSqFt)}</span> चौ.फु.
                                                </div>
                                            )) || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <div className="text-[9px] space-y-0.5 text-slate-500 font-bold uppercase tracking-tight">
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
                                            <div className={`text-[13px] font-bold ${arrears > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{MN(arrears.toFixed(2))}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <div className="text-[13px] font-bold text-slate-700">₹{MN(current.toFixed(2))}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right bg-slate-50/50">
                                            <div className="text-[14px] font-black text-slate-800">₹{MN(demand.toFixed(2))}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-left border-r border-slate-100/50">
                                            <div className="text-[12px] text-slate-600 font-semibold mb-1">
                                                {r.paymentDate ? (r.paymentDate.includes('-') ? r.paymentDate.split('-').reverse().join('/') : r.paymentDate) : '-'}
                                            </div>
                                            {r.receiptNo ? (
                                                <div className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> {MN(r.receiptNo)}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">थकीत (Unpaid)</div>
                                            )}
                                        </td>

                                        <td className="px-3 py-2.5 text-right bg-emerald-50/20">
                                            <div className={`text-[13px] font-bold ${mWScreen > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>₹{MN(mWScreen.toFixed(2))}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right bg-emerald-50/20 text-emerald-700 font-bold">
                                            <div className={`text-[13px] font-bold ${cWScreen > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>₹{MN(cWScreen.toFixed(2))}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right bg-emerald-50/50">
                                            <div className="text-[14px] font-black text-emerald-600">₹{MN(paid.toFixed(2))}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right bg-rose-50/50">
                                            <div className="text-[14px] font-black text-rose-600">₹{MN(balance.toFixed(2))}</div>
                                        </td>
                                        {showActions && (
                                            <td className="no-print px-3 py-2.5 text-center sticky right-0 z-20 bg-inherit border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center justify-center gap-1.5 group-hover:scale-105 transition-all duration-200">
                                                    {onView && <button onClick={() => onView(r.id)} className="w-8 h-8 flex items-center justify-center text-slate-500 bg-white rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200 shadow-sm"><Eye className="w-4" /></button>}
                                                    {onPrint && <button onClick={() => onPrint(r.id)} className="w-8 h-8 flex items-center justify-center text-indigo-500 bg-white rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-indigo-100 shadow-sm"><Printer className="w-4" /></button>}
                                                    {onEdit && <button onClick={() => onEdit(r)} className="w-8 h-8 flex items-center justify-center text-slate-500 bg-white rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200 shadow-sm"><Edit2 className="w-4" /></button>}
                                                    {onDelete && <button onClick={() => onDelete(r.id)} className="w-8 h-8 flex items-center justify-center text-rose-500 bg-white rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all border border-rose-100 shadow-sm"><Trash2 className="w-4" /></button>}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                </React.Fragment>

                            );
                        })}
                    </tbody>

                </table>
            </div>

            {/* ── Signature area (Print Only) ── */}
            <div className="hidden print:flex flex-col gap-8 mt-12 px-6">
                <div className="grid grid-cols-3 items-end">
                    <div className="flex flex-col items-center">
                        <p className="font-bold border-b border-black w-32 text-center pb-2 mb-8">शिक्का</p>
                        <div className="text-left w-full text-[9px] leading-tight italic">
                            <p>मागणीवरून सत्य प्रत दिली आहे.</p>
                            <p className="mt-1">रजुवात देणाऱ्याची सही</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="font-bold text-[9px] border-t border-black w-40 text-center pt-2">तयार करणाऱ्याची सही</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="font-bold text-[10px]">ग्रा.वि.अधिकारी / ग्रामसेवक</p>
                        <p className="font-bold text-[10px]">ग्रामपंचायत मौजा {PANCHAYAT_CONFIG.gpName}</p>
                    </div>
                </div>
            </div>

            {/* ── Pagination Bar ── */}
            {totalPages > 1 && !showAll && (
                <div className="flex items-center justify-between px-4 xl:px-6 py-3 border-t border-slate-200 bg-slate-50/80 backdrop-blur-[2px] no-print flex-none relative z-10 w-full">
                    <div className="text-[12px] font-bold text-slate-500 tracking-wide hidden sm:block">
                        पृष्ठ <span className="text-slate-800 font-black">{MN(safePage)}</span> पैकी <span className="text-slate-800">{MN(totalPages)}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:ml-auto w-full sm:w-auto justify-center">
                        <button onClick={() => setPage(1)} disabled={safePage === 1}
                            className="px-2 h-8 flex items-center justify-center text-[11px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 shadow-sm transition-all">«</button>
                        
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                            className="px-3 h-8 flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 shadow-sm transition-all text-[10px] font-black uppercase">
                            ‹ मागील
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) { pageNum = i + 1; }
                            else if (safePage <= 3) { pageNum = i + 1; }
                            else if (safePage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                            else { pageNum = safePage - 2 + i; }
                            return (
                                <button key={pageNum} onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all shadow-sm border ${pageNum === safePage
                                        ? 'bg-slate-800 text-white border-slate-800'
                                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                        }`}>{MN(pageNum)}</button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                            className="px-3 h-8 flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 shadow-sm transition-all text-[10px] font-black uppercase">
                            पुढील ›
                        </button>

                        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                            className="px-2 h-8 flex items-center justify-center text-[11px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 shadow-sm transition-all">»</button>
                    </div>
                </div>
            )}
        </div>
    );
}
