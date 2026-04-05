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
    { key: 'penaltyAmount', label: '५% मागील दंडात्मक कर (Penalty)' },
];

interface Namuna9PrintFormatProps {
    records: any[];
}

export default function Namuna9PrintFormat({ records }: Namuna9PrintFormatProps) {
    // Group records by 2 for better fit on legal landscape as per image
    const recordChunks = [];
    for (let i = 0; i < records.length; i += 2) {
        recordChunks.push(records.slice(i, i + 2));
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    // Financial year starts in April
    const fyStart = currentMonth < 3 ? currentYear - 1 : currentYear;
    const fyEnd = fyStart + 1;

    return (
        <div className="namuna9-print-root bg-gray-100 min-h-screen p-2">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: legal landscape;
                        margin: 5mm;
                    }
                    body, html {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        background: white !important;
                        width: 100%;
                    }
                    .page-container {
                        page-break-after: always;
                        break-after: page;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 10px !important;
                        width: 100% !important;
                        max-width: none !important;
                        position: relative !important;
                    }
                    .no-print { display: none !important; }
                }
                .page-container {
                    width: 100%;
                    max-width: 1350px;
                    margin: 10px auto;
                    padding: 15px;
                    background: white;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    border: 1px solid #ddd;
                    font-family: 'Poppins', 'Inter', sans-serif;
                }
                table, th, td {
                    border: 1.2px solid #1e3a8a !important;
                }
                .header-logo {
                    width: 45px;
                    height: 45px;
                }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="page-container relative overflow-visible">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                        <img src="/images/logo.png" className="w-[450px]" alt="Watermark" />
                    </div>

                    <div className="relative z-10">
                        {/* Compact Header Section */}
                        <div className="flex justify-between items-start mb-1 px-2 border-b border-blue-200 pb-1">
                            <div className="header-logo">
                                <img src="/images/logo.png" alt="GP Logo" className="w-full h-full object-contain" />
                                <p className="text-[7px] text-blue-900 font-bold mt-1 uppercase text-center leading-none">GP {PANCHAYAT_CONFIG.gpName}</p>
                            </div>

                            <div className="text-center flex-1">
                                <h1 className="text-lg font-black text-blue-950 tracking-tight leading-none">गट ग्रामपंचायत वेळा हरिश्चंद्र</h1>
                                <h2 className="text-sm font-black text-blue-800 mt-0.5">नमुना ९ - मागणी नोंदवही</h2>
                                <p className="text-[9px] font-bold text-gray-500">[ नियम २२(९), ३२(४), ५(६) ]</p>
                                <p className="font-bold text-[10px] text-blue-900">सन {MN(fyStart)} - {MN(fyEnd)} करांची आकारणी</p>
                            </div>

                            <div className="text-right text-black font-medium leading-none pt-1">
                                <p className="text-[10px] font-bold tracking-tighter uppercase whitespace-nowrap">मौजा {PANCHAYAT_CONFIG.mouza}</p>
                                <p className="text-[9px] mt-1">तहसील: नागपूर (ग्रामीण)</p>
                                <p className="text-[8px] font-normal italic text-slate-400 mt-2">पान नं. ...........</p>
                            </div>
                        </div>

                        {/* Main Table */}
                        <table className="w-full text-[8px] border-collapse leading-[1.1]">
                            <thead className="bg-[#1e40af] text-white">
                                <tr>
                                    <th className="p-0.5 w-[25px]" rowSpan={2}>अ.क्र.</th>
                                    <th className="p-0.5 w-[180px]" rowSpan={2}> मालमत्ताधारकाचे नाव </th>
                                    <th className="p-0.5 w-[65px]" rowSpan={2}>प्लॉट नं. /<br />मालमत्ता क्र.</th>
                                    <th className="p-0.5 w-[60px]" rowSpan={2}>खासरा क्र.</th>
                                    <th className="p-0.5 w-[120px]" rowSpan={2}>कराचे प्रकार </th>
                                    <th className="p-0.5" colSpan={3}>मागणी (Demand)</th>
                                    <th className="p-0.5 w-[60px]" rowSpan={2}>पावती क्र. /<br />दिनांक</th>
                                    <th className="p-0.5 w-[60px]" rowSpan={2}>देय तारीख</th>
                                    <th className="p-0.5 w-[120px]" rowSpan={2}>कराचे नांवे</th>
                                    <th className="p-0.5" colSpan={3}>वसुली (Collection)</th>
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
                                const globalIdx = chunkIdx * 2 + rIdx + 1;

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
                                    <tbody key={r.id || rIdx} className="border-b-[1.5px] border-blue-900">
                                        {(() => {
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
                                        })()}
                                        
                                        {TAX_MAPPING.map((tax, hIdx) => {
                                            const isPenaltyRow = tax.key === 'penaltyAmount';
                                            const currentVal = isPenaltyRow ? 0 : (Number(r[tax.key]) || 0);
                                            const arrearsVal = hIdx === 0 ? originalArrears : (isPenaltyRow ? (r as any)._penaltyVal : 0);
                                            
                                            const demandRowTotal = arrearsVal + currentVal;
                                            
                                            // Recovery values
                                            const recArrears = hIdx === 0 ? (r as any)._arrearsPaid : (isPenaltyRow ? (r as any)._penaltyPaid : 0);
                                            const recCurrent = isPenaltyRow ? 0 : (r as any)._headRecoveryMap[tax.key];
                                            const recTotal = recArrears + recCurrent;

                                            return (
                                                <tr key={`${r.id}-${hIdx}`} className="bg-white">
                                                    {hIdx === 0 && (
                                                        <>
                                                            <td className="text-center font-bold text-[10px] bg-slate-50" rowSpan={12}>{MN(globalIdx)}</td>
                                                            <td className="p-1 px-2 align-top text-blue-950 font-black leading-tight" rowSpan={12}>
                                                                <div className="text-[9px] truncate">{r.ownerName}</div>
                                                                <div className="text-[7px] text-gray-400 mt-3 font-normal italic">भो. नाव: {r.occupantName || 'स्वतः'}</div>
                                                                <div className="text-[7px] mt-4 font-bold text-slate-300 uppercase tracking-tighter">वेळा हरि.</div>
                                                            </td>
                                                            <td className="text-center p-0.5 text-[9px] font-bold" rowSpan={12}>
                                                                <div className="mb-0.5">{r.propertyId ? MN(r.propertyId) : ''}</div>
                                                                <div className="text-[7px] text-slate-400 border-t border-slate-100 pt-0.5">{r.plotNo ? MN(r.plotNo) : ''}</div>
                                                            </td>
                                                            <td className="text-center p-0.5 font-bold text-[8px]" rowSpan={12}>
                                                                {r.khasraNo ? r.khasraNo.split(',').map((k: string, ki: number) => <div key={ki}>{MN(k.trim())}</div>) : '-'}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="p-0.5 px-2 font-medium border-l-[2px] border-l-blue-100 leading-none">{tax.label}</td>
                                                    <td className={`text-right pr-1.5 p-0.5 font-medium ${isPenaltyRow || hIdx === 0 ? 'text-indigo-900 font-bold bg-indigo-50/10 shadow-inner' : 'text-slate-300'}`}>
                                                        {arrearsVal > 0 ? MN(arrearsVal.toFixed(2)) : ''}
                                                    </td>
                                                    <td className="text-right pr-1.5 p-0.5 font-medium text-slate-600">
                                                        {currentVal > 0 ? MN(currentVal.toFixed(2)) : ''}
                                                    </td>
                                                    <td className="text-right pr-1.5 p-0.5 font-bold bg-blue-50/20">
                                                        {demandRowTotal > 0 ? MN(demandRowTotal.toFixed(2)) : ''}
                                                    </td>

                                                    {hIdx === 0 && (
                                                        <>
                                                            <td className="text-center p-0.5 font-bold text-[8px] bg-slate-50/30" rowSpan={12}>
                                                                <div className="mb-1">{r.receiptNo ? MN(r.receiptNo) : '-'}</div>
                                                                <div className="text-[6px] text-slate-300">{r.receiptBook ? `B.${MN(r.receiptBook)}` : ''}</div>
                                                            </td>
                                                            <td className="text-center p-0.5 font-bold text-slate-500 text-[6px]" rowSpan={12}>
                                                                {r.paymentDate || '-'}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="p-0.5 px-2 font-medium border-l-[2px] border-l-blue-100 text-slate-500 leading-none">{tax.label}</td>
                                                    <td className={`text-right pr-1.5 p-0.5 font-medium ${isPenaltyRow || hIdx === 0 ? 'text-emerald-800 font-bold bg-emerald-50/10' : 'text-slate-200'}`}>
                                                        {recArrears > 0 ? MN(recArrears.toFixed(2)) : ''}
                                                    </td>
                                                    <td className="text-right pr-1.5 p-0.5 font-medium text-emerald-700">
                                                        {recCurrent > 0 ? MN(recCurrent.toFixed(2)) : ''}
                                                    </td>
                                                    <td className="text-right pr-1.5 p-0.5 font-black bg-emerald-50/30 text-emerald-900 shadow-inner">
                                                        {recTotal > 0 ? MN(recTotal.toFixed(2)) : ''}
                                                    </td>

                                                    {hIdx === 0 && (
                                                        <td className="text-right pr-2 font-black text-[10px] text-blue-950 bg-blue-50/50" rowSpan={12}>
                                                            {remainingBalance > 0 ? MN(remainingBalance.toFixed(2)) : '-'}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}

                                        {/* Summaries */}
                                        <tr className="bg-slate-100/50 font-bold border-t border-slate-200">
                                            <td className="p-0.5 px-2 text-right italic text-[7px] text-blue-600">उपआंकडा एकूण</td>
                                            <td className="text-right pr-1.5 p-0.5 text-indigo-900 font-black">{MN(combinedArrears.toFixed(2))}</td>
                                            <td className="text-right pr-1.5 p-0.5 text-blue-800">{MN(originalCurrentDemand.toFixed(2))}</td>
                                            <td className="text-right pr-1.5 p-0.5 bg-blue-900 text-white text-[9px] shadow-lg">{MN(grandTotalDemand.toFixed(2))}</td>
                                            <td className="p-0.5 px-2 text-right italic text-[7px] text-emerald-600">वसूल एकूण</td>
                                            <td className="text-right pr-1.5 p-0.5 text-emerald-800 font-black">{MN(((r as any)._arrearsPaid + (r as any)._penaltyPaid).toFixed(2))}</td>
                                            <td className="text-right pr-1.5 p-0.5 text-emerald-700">{MN(Number(Object.values((r as any)._headRecoveryMap || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)).toFixed(2))}</td>
                                            <td className="text-right pr-1.5 p-0.5 bg-emerald-700 text-white shadow-lg">{MN(paidAmount.toFixed(2))}</td>
                                        </tr>

                                        <tr className="bg-white font-bold h-[12px]">
                                            <td className="p-0.5 px-2 text-[7px] text-emerald-600 text-right uppercase tracking-[0.2em] font-black">५% चालू कर सवलत (सुट)</td>
                                            <td className="text-right pr-1.5">-</td>
                                            <td className="text-right pr-1.5 text-emerald-600">({MN(discount.toFixed(2))})</td>
                                            <td className="text-right pr-1.5 bg-emerald-50 text-emerald-700 shadow-inner italic">-{MN(discount.toFixed(2))}</td>
                                            <td className="p-0.5 px-2 text-right text-slate-400 text-[6px]" colSpan={4}>कपातीची नोंद पावतीत असावी.</td>
                                        </tr>

                                        <tr className="bg-blue-900 text-white font-black text-[9px]">
                                            <td className="p-1 px-3 text-right uppercase tracking-widest text-[8px]" colSpan={3}>एकूण मागणी रुपये</td>
                                            <td className="text-right px-2 p-1 bg-red-600 text-[10px] shadow-2xl">₹ {MN(grandTotalWithDiscount.toFixed(2))}</td>
                                            <td className="p-1 px-3 text-right uppercase tracking-widest text-[8px]" colSpan={3}>एकूण वसुली रुपये</td>
                                            <td className="text-right px-2 p-1 bg-emerald-600 text-[10px] shadow-2xl">₹ {MN(paidAmount.toFixed(2))}</td>
                                        </tr>
                                    </tbody>
                                );
                            })}
                        </table>

                        {/* Signature area */}
                        <div className="mt-4 grid grid-cols-3 gap-10 w-full px-10">
                            <div className="text-center border-t border-blue-400 pt-0.5 text-[7px] font-black uppercase text-blue-900">लिपिक</div>
                            <div className="text-center border-t border-blue-400 pt-0.5 text-[7px] font-black uppercase text-blue-900">सरपंच / उपसरपंच</div>
                            <div className="text-center border-t border-blue-400 pt-0.5 text-[7px] font-black uppercase text-blue-900 text-[7px]">ग्रामविकास अधिकारी</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
