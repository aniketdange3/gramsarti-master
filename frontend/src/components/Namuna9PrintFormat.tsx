import React from 'react';
import Namuna9IndexFormat from './Namuna9IndexFormat';

// Marathi Number Helper (MN)
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

const PANCHAYAT_CONFIG = {
    gpName: 'वेळा हरिश्चंद्र',
    mouza: 'गोटाळपांजरी',
    taluka: 'नागपूर',
    jilha: 'नागपूर',
};

// Mapping labels to actual record keys found in PropertyRecord
const TAX_MAPPING = [
    { key: 'propertyTax', label: 'घर कर', type: 'base' },
    { key: 'openSpaceTax', label: 'जमीन कर', type: 'base' },
    { key: 'streetLightTax', label: 'दिवाबत्ती कर', type: 'normal' },
    { key: 'healthTax', label: 'आरोग्य कर', type: 'normal' },
    { key: 'surchargeTotal', label: 'इमला कर (अतिक्रमण)', type: 'normal' },
    { key: 'wasteCollectionTax', label: 'कचरा गाडी कर', type: 'normal' },
    { key: 'specialWaterTax', label: 'विशेष/सामान्य पाणी कर', type: 'normal' },
    { key: 'penaltyAmount', label: 'थकीत रकमेवर ५% दंड ', type: 'penalty' },
];

interface Namuna9PrintFormatProps {
    records: any[];
    pageSize?: number;
}

export default function Namuna9PrintFormat({ records, pageSize = 3 }: Namuna9PrintFormatProps) {
    // Force pageSize to 3 for audit consistency as requested
    const effectivePageSize = 3;

    // Group records by effectivePageSize for better fit on legal landscape
    const recordChunks = [];
    for (let i = 0; i < records.length; i += effectivePageSize) {
        recordChunks.push(records.slice(i, i + effectivePageSize));
    }

    // Financial year set to 2026-27 as per user request
    const fyStart = 2025;
    const fyEnd = 26;

    return (
        <div className="namuna9-print-root bg-white min-h-screen flex flex-col items-center print:p-0 print:bg-white print:min-h-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: 345mm 215mm;
                        margin: 1.3in 0.4in 0.25in 0.4in;
                    }
                    body, html {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        width: 100%;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Force white background even on screen for audit look */
                    #root, .app-container {
                        background: white !important;
                    }
                    * {
                        box-shadow: none !important;
                        text-shadow: none !important;
                        overflow: visible !important;
                    }
                    .page-container {
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                        position: relative !important;
                        background: white !important;
                    }
                    .page-container:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    .no-print { display: none !important; }
                    .namuna9-print-root {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }
                }
                .page-container {
                    width: 100%;
                    max-width: 100%;
                    margin: 0 auto;
                    height: auto;
                    font-family: 'Poppins', 'Inter', sans-serif;
                }
                table, th, td {
                    border: 1px solid #1c1c1cb6 !important;
                }
                td, th {
                    padding: 1.5px !important;
                    font-size: 12px !important;
                    color: black !important;
                    font-family: 'Inter', 'Noto Sans Devanagari', sans-serif !important;
                    vertical-align: middle !important;
                    text-align: center;
                }
                .total-row-highlight td {
                    background-color: #dcdddeff !important; /* bg-slate-900 */
                }
                .screen-data {
                    color: black !important; /* Changed from blue to black as requested */
                    font-weight: 700 !important;
                }
                @media print {
                    .screen-data {
                        display: none !important;
                    }
                }
            `}} />

            {/* 1. Register Index (नोंदवही अनुक्रमणिका) - Separate Component */}
            <Namuna9IndexFormat
                records={records}
                effectivePageSize={effectivePageSize}
                panchayatConfig={PANCHAYAT_CONFIG}
                fyStart={fyStart}
                fyEnd={fyEnd}
            />

            {/* 2. Main Register Content */}
            {recordChunks.map((chunk, chunkIdx) => {
                const pageTotals = chunk.reduce((acc, r) => {
                    const originalArrears = Number(r.arrearsAmount) || 0;
                    // ५% दंड (Penalty): मागील थकबाकीच्या 'घर कर' + 'जमीन कर' वर ५% दंड. तपशील नसल्यास एकूण थकबाकीवर.
                    const prevBase = (Number(r.prev_breakdown?.propertyTax) || 0) + (Number(r.prev_breakdown?.openSpaceTax) || 0);
                    const baseForPenalty = prevBase > 0 ? prevBase : originalArrears;
                    const finalPenalty = (originalArrears > 0 && baseForPenalty > 0) ? Number((baseForPenalty * 0.05).toFixed(2)) : 0;
                    const combinedArrears = originalArrears + finalPenalty;

                    const originalCurrentDemand = Number(r.totalTaxAmount) || 0;
                    const baseForDiscount = (Number(r.propertyTax) || 0) + (Number(r.openSpaceTax) || 0);

                    // ५% सूट (Discount): चालू वर्षाच्या 'घर कर' + 'जमीन कर' वर ३० सप्टेंबरपूर्वी ५% सूट.
                    const today = new Date();
                    const cutoffDate = new Date(fyStart, 8, 30);
                    const effectivePaymentDate = r.paymentDate ? new Date(r.paymentDate) : today;
                    const isEligible = effectivePaymentDate <= cutoffDate;
                    const finalDiscount = isEligible ? Number((baseForDiscount * 0.05).toFixed(2)) : 0;

                    const grandTotalWithDiscount = (combinedArrears + originalCurrentDemand) - finalDiscount;
                    const paidAmount = Number(r.paidAmount) || 0;
                    const remainingBalance = grandTotalWithDiscount - paidAmount;

                    return {
                        magilDemand: acc.magilDemand + combinedArrears,
                        chaluDemand: acc.chaluDemand + originalCurrentDemand,
                        totalDemand: acc.totalDemand + (combinedArrears + originalCurrentDemand),
                        discount: acc.discount + finalDiscount,
                        netDemand: acc.netDemand + grandTotalWithDiscount,
                        recovery: acc.recovery + paidAmount,
                        balance: acc.balance + remainingBalance
                    };
                }, {
                    magilDemand: 0, chaluDemand: 0, totalDemand: 0,
                    discount: 0, netDemand: 0, recovery: 0, balance: 0
                });

                return (
                    <div key={chunkIdx} className="page-container relative overflow-visible shadow-sm print:shadow-none bg-white mb-8 print:mb-0">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.25]">
                            <img src="/images/logo.jpeg" className="w-[500px] h-[500px] object-contain" alt="Watermark" />
                        </div>

                        <div className="relative z-10">
                            {/* Main Table */}
                            <table className="w-full border-collapse leading-tight">
                                <thead className="bg-gray-200 text-black">
                                    <tr>
                                        <th className="p-0.5 w-[20px] text-center" rowSpan={2}>अ.क्र.</th>
                                        <th className="p-1 w-[100px] text-center" rowSpan={2}> मालमत्ता धारकाचे नाव </th>
                                        <th className="p-0.5 w-[40px] text-center" rowSpan={2}>प्लॉट नं.<br />मालमत्ता क्र.</th>
                                        <th className="p-0.5 w-[40px] text-center" rowSpan={2}>खसरा क्र.</th>
                                        <th className="p-0.5 w-[100px] text-left" rowSpan={2}>कराचे प्रकार </th>
                                        <th className="p-0.5 text-center" colSpan={3}>मागणी </th>
                                        <th className="p-0.5 w-[60px] text-center" rowSpan={2}>पावती बुक क्र. <br />पावती क्र </th>
                                        <th className="p-0.5 w-[60px] text-center" rowSpan={2}>दिनांक</th>
                                        <th className="p-0.5 w-[100px] text-left" rowSpan={2}>कराचे प्रकार</th>
                                        <th className="p-0.5 text-center" colSpan={3}>वसुली </th>
                                        <th className="p-0.5 w-[75px] text-center" rowSpan={2}>बाकी</th>
                                    </tr>
                                    <tr className="bg-transparent text-center">
                                        <th className="p-0.5 border-l border-slate-900 w-[45px]">मागील</th>
                                        <th className="p-0.5 border-l border-slate-900 w-[45px]">चालू</th>
                                        <th className="p-0.5 border-l border-slate-900 w-[45px]">एकूण मागणी</th>
                                        <th className="p-0.5 border-l border-slate-900 w-[65px]">मागील</th>
                                        <th className="p-0.5 border-l border-slate-900 w-[65px]">चालू</th>
                                        <th className="p-0.5 border-l border-slate-900 w-[65px]">एकूण वसुली</th>
                                    </tr>
                                </thead>

                                {chunk.map((r, rIdx) => {
                                    const globalIdx = chunkIdx * effectivePageSize + rIdx + 1;

                                    const originalArrears = Number(r.arrearsAmount) || 0;
                                    // ५% दंड (Penalty): मागील थकबाकीच्या 'घर कर' + 'जमीन कर' वर ५% दंड. तपशील नसल्यास एकूण थकबाकीवर.
                                    const prevBase = (Number(r.prev_breakdown?.propertyTax) || 0) + (Number(r.prev_breakdown?.openSpaceTax) || 0);
                                    const baseForPenalty = prevBase > 0 ? prevBase : originalArrears;
                                    const finalPenalty = (originalArrears > 0 && baseForPenalty > 0) ? Number((baseForPenalty * 0.05).toFixed(2)) : 0;
                                    const combinedArrears = originalArrears + finalPenalty;

                                    const originalCurrentDemand = Number(r.totalTaxAmount) || 0;
                                    const baseForDiscount = (Number(r.propertyTax) || 0) + (Number(r.openSpaceTax) || 0);

                                    // ५% सूट (Discount): चालू वर्षाच्या 'घर कर' + 'जमीन कर' वर ३० सप्टेंबरपूर्वी ५% सूट.
                                    const today = new Date();
                                    const cutoffDate = new Date(fyStart, 8, 30);
                                    const effectivePaymentDate = r.paymentDate ? new Date(r.paymentDate) : today;
                                    const isEligible = effectivePaymentDate <= cutoffDate;
                                    const finalDiscount = isEligible ? Number((baseForDiscount * 0.05).toFixed(2)) : 0;

                                    const grandTotalDemand = combinedArrears + originalCurrentDemand;
                                    const grandTotalWithDiscount = Number((grandTotalDemand - finalDiscount).toFixed(2));
                                    const paidAmount = Number(r.paidAmount) || 0;
                                    const remainingBalance = Number((grandTotalWithDiscount - paidAmount).toFixed(2));

                                    // Base current demand for subtotal (excludes penalty)
                                    const baseCurrentDemand = originalCurrentDemand;

                                    // Recovery Distribution Logic
                                    const remP = paidAmount;
                                    const arrearsPaid = Math.min(remP, originalArrears);
                                    let remAfterArrears = remP - arrearsPaid;

                                    const penaltyPaid = Math.min(remAfterArrears, finalPenalty);
                                    let remAfterPenalty = remAfterArrears - penaltyPaid;

                                    const headRecoveryMap: Record<string, number> = {};
                                    TAX_MAPPING.forEach(taxHead => {
                                        if (taxHead.type === 'penalty' || taxHead.type === 'discount') return;
                                        const headDemand = Number(r[taxHead.key]) || 0;
                                        const paidForThisHead = Math.min(remAfterPenalty, headDemand);
                                        headRecoveryMap[taxHead.key] = paidForThisHead;
                                        remAfterPenalty -= paidForThisHead;
                                    });

                                    return (
                                        <tbody key={r.id || rIdx} className="border-b-2 border-slate-900 last:border-b-0" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                            {TAX_MAPPING.map((tax, hIdx) => {
                                                const isPenaltyRow = tax.type === 'penalty';
                                                const isDiscountRow = tax.type === 'discount';

                                                // Demand side logic: Arrears shown in specific rows if breakdown is available
                                                const breakdownArrears = r.prev_breakdown ? Number((r.prev_breakdown as any)[tax.key]) || 0 : 0;
                                                const demandArrears = (isPenaltyRow || isDiscountRow)
                                                    ? (isPenaltyRow ? finalPenalty : 0)
                                                    : (breakdownArrears > 0 ? breakdownArrears : (hIdx === 0 ? originalArrears : 0));

                                                const demandCurrent = isPenaltyRow ? 0 : (isDiscountRow ? -finalDiscount : (Number(r[tax.key]) || 0));
                                                const demandRowTotal = demandArrears + demandCurrent;

                                                // Recovery side logic
                                                const recTotal = 0;

                                                return (
                                                    <tr key={tax.key} className="border-b border-slate-200 bg-transparent">
                                                        {hIdx === 0 && (
                                                            <>
                                                                {/* Column 1: Serial No */}
                                                                <td className="text-center font-bold bg-transparent" rowSpan={11}>{MN(globalIdx)}</td>

                                                                {/* Column 2: Property Owner Details */}
                                                                <td className=" text-left  font-bold leading-tight" rowSpan={11}>
                                                                    <div className=" p-2">{r.ownerName}</div>
                                                                    {r.occupantName && r.occupantName !== 'स्वतः' && (
                                                                        <div className="font-normal italic p-2 text-[10px]">भोगवटाधारक: <b>{r.occupantName}</b></div>
                                                                    )}
                                                                    <div className="font-bold uppercase p-2 text-[10px]">मौजा: {r.wastiName}</div>
                                                                </td>

                                                                {/* Column 3: Plot/Property ID */}
                                                                <td className="text-center p-0.5 font-bold bg-transparent" rowSpan={11}>
                                                                    <div className="mb-0.5">{r.propertyId ? MN(r.propertyId) : ''}</div>
                                                                    <div className="border-t border-slate-100 pt-0.5">{r.plotNo ? MN(r.plotNo) : ''}</div>
                                                                </td>

                                                                {/* Column 4: Khasra Number (Arranged properly) */}
                                                                <td className="text-center p-0.5 font-bold align-middle bg-transparent" rowSpan={11}>
                                                                    <div className="flex flex-col gap-0.5 items-center justify-center h-full">
                                                                        {r.khasraNo ? r.khasraNo.split(',').map((k: string, ki: number) => (
                                                                            <div key={ki} className="px-1 py-0.5">
                                                                                {MN(k.trim())}
                                                                            </div>
                                                                        )) : '-'}
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* Column 5: Tax Category (Demand Side) */}
                                                        <td className="p-0.5 px-2 text-left font-medium leading-none">{tax.label}</td>

                                                        {/* Column 6: Arrears (मागील) Demand */}
                                                        <td className="pr-1.5 p-0.5 font-medium">
                                                            {demandArrears > 0 ? MN(demandArrears.toFixed(2)) : ''}
                                                        </td>

                                                        {/* Column 7: Current (चालू) Demand */}
                                                        <td className="pr-1.5 p-0.5 font-medium">
                                                            {demandCurrent > 0 ? MN(demandCurrent.toFixed(2)) : ''}
                                                        </td>

                                                        {/* Column 8: Row Total (एकूण मागणी) */}
                                                        <td className="pr-1.5 p-0.5 font-bold">
                                                            {demandRowTotal > 0 ? MN(demandRowTotal.toFixed(2)) : ''}
                                                        </td>

                                                        {hIdx === 0 && (
                                                            <>
                                                                {/* Column 9: Receipt Book/No */}
                                                                <td className="text-center p-0.5 font-bold bg-transparent" rowSpan={11}>
                                                                    <span className="screen-data">
                                                                        {r.receiptNo ? `${r.receiptBook || '—'}/${r.receiptNo}` : ''}
                                                                    </span>
                                                                </td>

                                                                {/* Column 10: Payment Date */}
                                                                <td className="text-center p-0.5 font-bold" rowSpan={11}>
                                                                    <span className="screen-data">
                                                                        {r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-GB') : ''}
                                                                    </span>
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* Column 11: Tax Category (Recovery Side) */}
                                                        <td className="p-0.5 px-2 text-left font-medium leading-none">{tax.label}</td>

                                                        {/* Column 12: Arrears (मागील) Recovery */}
                                                        <td className="pr-1.5 p-0.5">
                                                            <span className="screen-data">{isPenaltyRow ? '' : (hIdx === 0 ? MN(arrearsPaid.toFixed(2)) : '')}</span>
                                                        </td>

                                                        {/* Column 13: Chalu (चालू) Recovery */}
                                                        <td className="pr-1.5 p-0.5">
                                                            <span className="screen-data">{isPenaltyRow ? MN(penaltyPaid.toFixed(2)) : (headRecoveryMap[tax.key] > 0 ? MN(headRecoveryMap[tax.key].toFixed(2)) : '')}</span>
                                                        </td>

                                                        {/* Column 14: Row Total Recovery */}
                                                        <td className="pr-1.5 p-0.5 font-bold">
                                                            <span className="screen-data">
                                                                {isPenaltyRow
                                                                    ? (penaltyPaid > 0 ? MN(penaltyPaid.toFixed(2)) : '')
                                                                    : (hIdx === 0
                                                                        ? MN((arrearsPaid + (headRecoveryMap[tax.key] || 0)).toFixed(2))
                                                                        : (headRecoveryMap[tax.key] > 0 ? MN(headRecoveryMap[tax.key].toFixed(2)) : '')
                                                                    )
                                                                }
                                                            </span>
                                                        </td>

                                                        {hIdx === 0 && (
                                                            /* Column 15: Balance (बाकी) */
                                                            <td className="pr-2 font-black bg-transparent" rowSpan={11}>
                                                                <span className="screen-data">₹ {MN(remainingBalance.toFixed(2))}</span>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}

                                            {/* Subtotal Row */}
                                            <tr className="font-bold border-t border-slate-300">
                                                <td className="p-0.5 px-2 text-center">एकूण </td>
                                                <td className="pr-1.5 p-0.5">{MN(combinedArrears.toFixed(2))}</td>
                                                <td className="pr-1.5 p-0.5">{MN(baseCurrentDemand.toFixed(2))}</td>
                                                <td className="pr-1.5 p-0.5">{MN((combinedArrears + baseCurrentDemand).toFixed(2))}</td>

                                                <td className="p-0.5 px-2 text-left font-medium bg-slate-100" colSpan={3}>एकूण वसुली </td>
                                                <td className="p-0.5 text-right pr-2">
                                                    <span className="screen-data">₹ {MN(paidAmount.toFixed(2))}</span>
                                                </td>
                                            </tr>

                                            {/* Discount Row */}
                                            <tr className="bg-transparent font-medium border-t border-slate-200">
                                                <td className="p-0.5 px-2 italic text-left">चालू रक्कमेवर (५%) सूट  </td>
                                                <td className="p-0.5"></td>
                                                <td className="p-0.5 text-red-600">-{MN(finalDiscount.toFixed(2))}</td>
                                                <td className="p-0.5 text-red-600">-{MN(finalDiscount.toFixed(2))}</td>

                                                <td className="p-0.5" colSpan={4} style={{ height: '15px' }}></td>
                                            </tr>

                                            {/* Net Total Row */}
                                            <tr className="total-row-highlight font-black border-b-2 border-black">
                                                <td className="p-0.5 px-2 uppercase tracking-tighter"> एकूण </td>
                                                <td className="pr-1.5 p-0.5 border-l border-slate-300">{MN(combinedArrears.toFixed(2))}</td>
                                                <td className="pr-1.5 p-0.5 border-l border-slate-300">{MN((originalCurrentDemand - finalDiscount).toFixed(2))}</td>
                                                <td className="pr-1.5 p-0.5 border-l border-slate-900">₹ {MN(grandTotalWithDiscount.toFixed(2))}</td>

                                                <td className="p-0.5 px-2 text-left font-black bg-slate-200 print:hidden" colSpan={3}>बाकी रक्कम </td>
                                                <td className="p-0.5 text-right pr-2 bg-slate-200 print:hidden">
                                                    <span className="screen-data">₹ {MN(remainingBalance.toFixed(2))}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    );
                                })}

                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
