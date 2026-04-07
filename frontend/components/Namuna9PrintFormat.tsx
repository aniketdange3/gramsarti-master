import React from 'react';

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
    { key: 'propertyTax', label: 'घर कर' },
    { key: 'openSpaceTax', label: 'जमीन कर' },
    { key: 'streetLightTax', label: 'दिवाबत्ती कर' },
    { key: 'healthTax', label: 'आरोग्य कर' },
    { key: 'surchargeTotal', label: 'इमला कर (अतिक्रमण)' },
    { key: 'garbageTax', label: 'कचरा गाडी कर' },
    { key: 'specialWaterTax', label: 'विशेष पाणी / सामान्य पाणी कर' },
    { key: 'penaltyAmount', label: '५% दंड थकीत रकमेवर' },
];

interface Namuna9PrintFormatProps {
    records: any[];
    pageSize?: number;
}

export default function Namuna9PrintFormat({ records, pageSize = 2 }: Namuna9PrintFormatProps) {
    // Group records by pageSize for better fit on legal landscape
    const recordChunks = [];
    for (let i = 0; i < records.length; i += pageSize) {
        recordChunks.push(records.slice(i, i + pageSize));
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    // Financial year starts in April
    const fyStart = currentMonth < 3 ? currentYear - 1 : currentYear;
    const fyEnd = fyStart + 1;

    return (
        <div className="namuna9-print-root  ">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: legal landscape;
                        margin: 0;
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
                    * {
                        box-shadow: none !important;
                        text-shadow: none !important;
                        overflow: visible !important;
                    }
                    .page-container {
                        page-break-after: always;
                        break-after: page;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 10mm !important;
                        width: 100% !important;
                        max-width: none !important;
                        position: relative !important;
                    }
                    .page-container:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    .no-print { display: none !important; }
                    .namuna9-print-root {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
                .page-container {
                    width: 100%;
                    max-width: 1350px;
                    height: auto;
                    padding: 15px;
                    background: white;
                    font-family: 'Poppins', 'Inter', sans-serif;
                }
                table, th, td {
                    border: 1px solid #1e3a8a !important;
                }
                .header-logo {
                    width: 66px;
                    height: 66px;
                }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => {
                const pageTotals = chunk.reduce((acc, r) => {
                    const originalArrears = Number(r.arrearsAmount) || 0;
                    const penaltyAmount = Number((originalArrears * 0.05).toFixed(2));
                    const combinedArrears = originalArrears + penaltyAmount;
                    const originalCurrentDemand = Number(r.totalTaxAmount) || 0;
                    const discount = Number((originalCurrentDemand * 0.05).toFixed(2));
                    const grandTotalDemand = combinedArrears + originalCurrentDemand;
                    const grandTotalWithDiscount = Number((grandTotalDemand - discount).toFixed(2));
                    const paidAmount = Number(r.paidAmount) || 0;
                    const remainingBalance = Number((grandTotalWithDiscount - paidAmount).toFixed(2));

                    // Recovery Breakdown
                    const arrearsPaid = Math.min(paidAmount, originalArrears);
                    let remAfterArrears = paidAmount - arrearsPaid;
                    const penaltyPaid = Math.min(remAfterArrears, penaltyAmount);
                    let remAfterPenalty = remAfterArrears - penaltyPaid;

                    let currentPaid = 0;
                    TAX_MAPPING.forEach(taxHead => {
                        if (taxHead.key === 'penaltyAmount') return;
                        const headDemand = Number(r[taxHead.key]) || 0;
                        const paidForThisHead = Math.min(remAfterPenalty, headDemand);
                        currentPaid += paidForThisHead;
                        remAfterPenalty -= paidForThisHead;
                    });

                    return {
                        magilDemand: acc.magilDemand + combinedArrears,
                        chaluDemand: acc.chaluDemand + originalCurrentDemand,
                        totalDemand: acc.totalDemand + grandTotalDemand,
                        discount: acc.discount + discount,
                        netDemand: acc.netDemand + grandTotalWithDiscount,
                        magilRecovery: acc.magilRecovery + (arrearsPaid + penaltyPaid),
                        chaluRecovery: acc.chaluRecovery + currentPaid,
                        totalRecovery: acc.totalRecovery + paidAmount,
                        remainingBalance: acc.remainingBalance + remainingBalance
                    };
                }, {
                    magilDemand: 0, chaluDemand: 0, totalDemand: 0, discount: 0, netDemand: 0,
                    magilRecovery: 0, chaluRecovery: 0, totalRecovery: 0, remainingBalance: 0
                });

                return (
                    <div key={chunkIdx} className="page-container relative overflow-visible shadow-sm print:shadow-none">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.2]">
                            <img src="/images/logo.png" className="w-[400px] h-[400px] object-contain" alt="Watermark" />
                        </div>

                        <div className="relative z-10">
                            {/* Conditional Header Section - Hide if 3 or more per page */}
                            {pageSize < 3 && (
                                <div className="flex justify-between items-start mb-0.5 px-2 ">
                                    <div className="header-logo">
                                        <img src="/images/logo.png" alt="GP Logo" className="w-10 h-10 " />
                                    </div>

                                    <div className="text-center flex-1">
                                        <h1 className="text-lg font-black text-blue-950 tracking-tight leading-none">गट ग्रामपंचायत वेळा हरिश्चंद्र</h1>
                                        <h2 className="text-sm font-black text-blue-800 mt-0.5">नमुना ९ </h2>
                                        <p className="text-[9px] font-bold text-gray-500">[ नियम २२(९), ३२(४), ५(६) ]</p>
                                        <p className="font-bold text-[10px] text-blue-900">सन {MN(fyStart)} - {MN(fyEnd)} करांची आकारणी मागणी नोंदवही </p>
                                    </div>

                                    <div className=" text-black font-medium leading-none pt-1">
                                        <p className="text-[10px] font-bold tracking-tighter uppercase whitespace-nowrap">मौजा {PANCHAYAT_CONFIG.mouza}</p>
                                        <p className="text-[9px] mt-1">तहसील: नागपूर (ग्रामीण)</p>
                                        <p className="text-[8px] font-normal italic text-slate-400 mt-2">पान नं. ...........</p>
                                    </div>
                                </div>
                            )}

                            {/* Main Table */}
                            <table className={`w-full border-collapse ${pageSize >= 3 ? 'text-[7px] leading-none' : 'text-[7.5px] leading-[1.05]'}`}>
                                <thead className="bg-[#1e40af] text-white">
                                    <tr>
                                        <th className="p-0.5 w-[25px]" rowSpan={2}>अ.क्र.</th>
                                        <th className="p-0.5 w-[180px]" rowSpan={2}> मालमत्ताधारकाचे नाव </th>
                                        <th className="p-0.5 w-[65px]" rowSpan={2}>प्लॉट नं. /<br />मालमत्ता क्र.</th>
                                        <th className="p-0.5 w-[60px]" rowSpan={2}>खासरा क्र.</th>
                                        <th className="p-0.5 w-[120px]" rowSpan={2}>कराचे प्रकार </th>
                                        <th className="p-0.5" colSpan={3}>मागणी </th>
                                        <th className="p-0.5 w-[60px]" rowSpan={2}>पावती  बुक क्र. /<br />पावती क्र </th>
                                        <th className="p-0.5 w-[60px]" rowSpan={2}>दिनांक</th>
                                        <th className="p-0.5 w-[120px]" rowSpan={2}>कराचे प्रकार</th>
                                        <th className="p-0.5" colSpan={3}>वसुली </th>
                                        <th className="p-0.5 w-[45px]" rowSpan={2}>बाकी</th>
                                    </tr>
                                    <tr className="bg-[#2563eb]">
                                        <th className="p-0.5">मागील</th>
                                        <th className="p-0.5 border-l border-blue-400">चालू</th>
                                        <th className="p-0.5 border-l border-blue-900 bg-blue-900">एकूण मागणी</th>
                                        <th className="p-0.5">मागील</th>
                                        <th className="p-0.5 border-l border-blue-400">चालू</th>
                                        <th className="p-0.5 border-l border-blue-900 bg-blue-900">एकूण वसुली</th>
                                    </tr>
                                </thead>

                                {chunk.map((r, rIdx) => {
                                    const globalIdx = chunkIdx * pageSize + rIdx + 1;

                                    const originalArrears = Number(r.arrearsAmount) || 0;
                                    // Penalty on Arrears only (5%)
                                    const penaltyAmount = Number((originalArrears * 0.05).toFixed(2));

                                    // Combined Arrears for calculated total
                                    const combinedArrears = originalArrears + penaltyAmount;

                                    const originalCurrentDemand = Number(r.totalTaxAmount) || 0;
                                    // 5% discount (usually on current tax only)
                                    const discount = Number((originalCurrentDemand * 0.05).toFixed(2));

                                    const grandTotalDemand = Number((combinedArrears + originalCurrentDemand).toFixed(2));
                                    const grandTotalWithDiscount = Number((grandTotalDemand - discount).toFixed(2));

                                    const paidAmount = Number(r.paidAmount) || 0;
                                    const remainingBalance = Number((grandTotalWithDiscount - paidAmount).toFixed(2));

                                    return (
                                        <tbody key={r.id || rIdx} >
                                            {
                                                (() => {
                                                    const remP = paidAmount;
                                                    // Apply against Arrears first, then Penalty, then Current
                                                    const arrearsPaid = Math.min(remP, originalArrears);
                                                    let remAfterArrears = remP - arrearsPaid;

                                                    const penaltyPaid = Math.min(remAfterArrears, penaltyAmount);
                                                    let remAfterPenalty = remAfterArrears - penaltyPaid;

                                                    // Recovery mapping
                                                    const headRecoveryMap: Record<string, number> = {};
                                                    TAX_MAPPING.forEach(taxHead => {
                                                        if (taxHead.key === 'penaltyAmount') return;
                                                        const headDemand = Number(r[taxHead.key]) || 0;
                                                        const paidForThisHead = Math.min(remAfterPenalty, headDemand);
                                                        headRecoveryMap[taxHead.key] = paidForThisHead;
                                                        remAfterPenalty -= paidForThisHead;
                                                    });

                                                    (r as any)._arrearsPaid = arrearsPaid;
                                                    (r as any)._penaltyPaid = penaltyPaid;
                                                    (r as any)._headRecoveryMap = headRecoveryMap;
                                                    (r as any)._penaltyVal = penaltyAmount;
                                                    return null;
                                                })()
                                            }

                                            {
                                                TAX_MAPPING.map((tax, hIdx) => {
                                                    const isPenaltyRow = tax.key === 'penaltyAmount';
                                                    const currentVal = isPenaltyRow ? 0 : (Number(r[tax.key]) || 0);
                                                    const arrearsVal = hIdx === 0 ? originalArrears : (isPenaltyRow ? (r as any)._penaltyVal : 0);

                                                    const demandRowTotal = arrearsVal + currentVal;

                                                    // Recovery values
                                                    const recArrears = hIdx === 0 ? (r as any)._arrearsPaid : (isPenaltyRow ? (r as any)._penaltyPaid : 0);
                                                    const recCurrent = isPenaltyRow ? 0 : (r as any)._headRecoveryMap[tax.key];
                                                    const recTotal = recArrears + recCurrent;

                                                    return (
                                                        <tr key={`${r.id}-${hIdx}`} className="">
                                                            {hIdx === 0 && (
                                                                <>
                                                                    <td className="text-center font-bold text-[10px] bg-slate-50" rowSpan={11}>{MN(globalIdx)}</td>
                                                                    <td className={`p-1 px-2 align-center text-blue-950 font-black ${pageSize >= 3 ? 'leading-tight' : ''}`} rowSpan={11}>
                                                                        <div className={pageSize >= 3 ? 'text-[9.5px]' : 'text-[10px]'}>{r.ownerName}</div>
                                                                        <div className={`text-[8px] text-gray-800 font-normal italic ${pageSize >= 3 ? 'mt-1' : 'mt-3'}`}>भोगवटाधारक:  <b>{r.occupantName || 'स्वतः'}</b></div>
                                                                        <div className={`text-[8px] font-bold text-slate-800 uppercase ${pageSize >= 3 ? 'mt-1' : 'mt-4'}`}> पत्ता :{r.wastiName} </div>
                                                                    </td>
                                                                    <td className="text-center p-0.5 text-[9px] font-bold" rowSpan={11}>
                                                                        <div className="mb-0.5">{r.propertyId ? MN(r.propertyId) : ''}</div>
                                                                        <div className="text-[7px] text-slate-400 border-t border-slate-100 pt-0.5">{r.plotNo ? MN(r.plotNo) : ''}</div>
                                                                    </td>
                                                                    <td className="text-center p-0.5 font-bold text-[8px]" rowSpan={11}>
                                                                        {r.khasraNo ? r.khasraNo.split(',').map((k: string, ki: number) => <div key={ki}>{MN(k.trim())}</div>) : '-'}
                                                                    </td>
                                                                </>
                                                            )}

                                                            <td className="p-0.5 px-2 font-medium border-l-[2px] border-l-blue-100 leading-none">{tax.label}</td>
                                                            <td className={` pr-1.5 p-0.5 font-medium ${isPenaltyRow || hIdx === 0 ? 'text-indigo-900 font-bold bg-indigo-50/10 shadow-inner' : 'text-slate-300'}`}>
                                                                {arrearsVal > 0 ? MN(arrearsVal.toFixed(2)) : ''}
                                                            </td>
                                                            <td className=" pr-1.5 p-0.5 font-medium text-slate-600">
                                                                {currentVal > 0 ? MN(currentVal.toFixed(2)) : ''}
                                                            </td>
                                                            <td className=" pr-1.5 p-0.5 font-bold bg-blue-50/20">
                                                                {demandRowTotal > 0 ? MN(demandRowTotal.toFixed(2)) : ''}
                                                            </td>

                                                            {hIdx === 0 && (
                                                                <>
                                                                    <td className="text-center p-0.5 font-bold text-[8px] bg-slate-50/30" rowSpan={11}>
                                                                        <div className="text-[6px] text-slate-300 border-b border-black p-2">{r.receiptBook ? `B.${MN(r.receiptBook)}` : ''}</div>

                                                                        <div className="mb-1 p-2 ">{r.receiptNo ? MN(r.receiptNo) : '-'}</div>
                                                                    </td>
                                                                    <td className="text-center p-0.5 font-bold text-slate-500 text-[6px]" rowSpan={11}>
                                                                        {r.paymentDate || '-'}
                                                                    </td>
                                                                </>
                                                            )}

                                                            <td className="p-0.5 px-2 font-medium border-l-[2px] border-l-blue-100 text-slate-500 leading-none">{tax.label}</td>
                                                            <td className={` pr-1.5 p-0.5 font-medium ${isPenaltyRow || hIdx === 0 ? 'text-emerald-800 font-bold bg-emerald-50/10' : 'text-slate-200'}`}>
                                                                {recArrears > 0 ? MN(recArrears.toFixed(2)) : ''}
                                                            </td>
                                                            <td className=" pr-1.5 p-0.5 font-medium text-emerald-700">
                                                                {recCurrent > 0 ? MN(recCurrent.toFixed(2)) : ''}
                                                            </td>
                                                            <td className=" pr-1.5 p-0.5 font-black bg-emerald-50/30 text-emerald-900 shadow-inner">
                                                                {recTotal > 0 ? MN(recTotal.toFixed(2)) : ''}
                                                            </td>

                                                            {hIdx === 0 && (
                                                                <td className=" pr-2 font-black text-[10px] text-blue-950 bg-blue-50/50" rowSpan={11}>
                                                                    {remainingBalance > 0 ? MN(remainingBalance.toFixed(2)) : '-'}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })
                                            }

                                            {/* 
                                                FINAL SUMMARY ROWS PER PROPERTY 
                                                -------------------------------
                                                These rows provide the subtotal, discount, and net total for each property.
                                                The columns aligned are:
                                                - Demand: Magil (Arrears), Chalu (Current), Total
                                                - Recovery: Magil (Arrears), Chalu (Current), Total
                                            */}

                                            {/* Subtotal Row (Total excluding discount) */}
                                            <tr className="bg-slate-100/50 font-bold border-t border-slate-200">
                                                <td className="p-0.5 px-2 italic text-[8px] text-blue-600">एकूण </td>
                                                <td className=" pr-1.5 p-0.5 text-indigo-900 font-black">{MN(combinedArrears.toFixed(2))}</td>
                                                <td className=" pr-1.5 p-0.5 text-blue-800">{MN(originalCurrentDemand.toFixed(2))}</td>
                                                <td className=" pr-1.5 p-0.5 bg-blue-900 text-white text-[9px] shadow-lg">{MN(grandTotalDemand.toFixed(2))}</td>

                                                {/* Labels for Recovery section starts here (Column 11) */}
                                                <td className="p-0.5 px-2  italic text-[7px] text-emerald-600">एकूण वसूल</td>
                                                <td className=" pr-1.5 p-0.5 text-emerald-800 font-black">{MN(((r as any)._arrearsPaid + (r as any)._penaltyPaid).toFixed(2))}</td>
                                                <td className=" pr-1.5 p-0.5 text-emerald-700">{MN(Number(Object.values((r as any)._headRecoveryMap || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)).toFixed(2))}</td>
                                                <td className=" pr-1.5 p-0.5 bg-emerald-700 text-white shadow-lg">{MN(paidAmount.toFixed(2))}</td>
                                            </tr>

                                            {/* 5% Discount Row */}
                                            <tr className="bg-white font-bold h-[12px]">
                                                <td className="p-0.5 px-2 text-[8px] text-emerald-600 font-black">५% सूट (चालू रकमेवर सप्टेंबर पर्यंत)</td>
                                                <td className=" pr-1.5">-</td>
                                                <td className=" pr-1.5 text-emerald-600">({MN(discount.toFixed(2))})</td>
                                                <td className=" pr-1.5 bg-emerald-50 text-emerald-700 shadow-inner italic">-{MN(discount.toFixed(2))}</td>

                                                {/* Symmetric Label on Recovery side */}
                                                <td className="p-0.5 px-2  text-slate-400 text-[6px] italic leading-none whitespace-nowrap">५% सूट (वसुली)</td>
                                                <td className=" pr-1.5 text-[6px] text-slate-300">-</td>
                                                <td className=" pr-1.5 text-[6px] text-slate-300">-</td>
                                                <td className=" pr-1.5 text-[6px] font-bold text-slate-400 bg-slate-50/50 italic border-l border-slate-100"></td>
                                            </tr>

                                            {/* Net Total Row (Actual Payable vs Actual Paid) */}
                                            <tr className="bg-[#1e40af] text-white font-black text-[8px] h-[14px]">
                                                <td className="p-0.5 px-2  uppercase tracking-tighter"> एकूण </td>
                                                <td className=" pr-1.5 p-0.5 border-l border-blue-400/30">{MN(combinedArrears.toFixed(2))}</td>
                                                <td className=" pr-1.5 p-0.5 border-l border-blue-400/30">{MN((originalCurrentDemand - discount).toFixed(2))}</td>
                                                <td className=" pr-1.5 p-0.5 bg-red-600 shadow-lg text-[9px]">₹ {MN(grandTotalWithDiscount.toFixed(2))}</td>

                                                {/* Recovery Section (Actuals) */}
                                                <td className="p-0.5 px-2  uppercase tracking-tighter bg-blue-900/40" colSpan={3}>एकूण </td>
                                                <td className=" pr-1.5 p-0.5 border-l border-white/20">{MN(paidAmount.toFixed(2))}</td>

                                            </tr>
                                        </tbody>
                                    );
                                })}


                            </table>


                        </div>
                    </div>
                );
            })}
        </div >
    );
}
