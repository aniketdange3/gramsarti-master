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
    { key: 'garbageTax', label: 'कचरा गाडी कर' }, // Placeholder key if not in schema
    { key: 'specialWaterTax', label: 'विशेष पाणी / सामान्य पाणी कर' },
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
    // Financial year starts in April, so if month is Jan-Mar (0, 1, 2), 
    // we are still in the FY that started last year.
    const fyStart = currentMonth < 3 ? currentYear - 1 : currentYear;
    const fyEnd = fyStart + 1;

    return (
        <div className="namuna9-print-root bg-gray-100 min-h-screen p-4">
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
                        background: white !important;
                        width: 100%;
                    }
                    .page-container {
                        page-break-after: always;
                        break-after: page;
                        box-shadow: none !important;
                        margin: 0 !important;
                        border: none !important;
                        padding: 20px !important;
                        width: 100% !important;
                        max-width: none !important;
                        position: relative !important;
                        overflow: visible !important;
                    }
                    .no-print { display: none !important; }
                }
                .writing-mode-vertical {
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                    white-space: nowrap;
                }
                .page-container {
                    width: 100%;
                    max-width: 1400px;
                    margin: 20px auto;
                    padding: 15px;
                    background: white;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    border: 1px solid #ddd;
                    font-family: 'Poppins', 'Inter', sans-serif;
                }
                table, th, td {
                    border: 1.5px solid #1e3a8a !important;
                }
                .header-logo {
                    width: 55px;
                    height: 55px;
                }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="page-container relative overflow-visible">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08]">
                        <img src="/images/logo.png" className="w-[600px] h-[600px] object-contain" alt="Watermark" />
                    </div>

                    <div className="relative z-10">
                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-1">
                            <div className="header-logo">
                                <img src="/images/logo.png" alt="GP Logo" className="w-full h-full object-contain" />
                            </div>

                            <div className="text-center flex-1">
                                <h2 className="text-2xl font-bold text-blue-900  inline-block ">गट ग्रामपंचायत वेळा हरिश्चंद्र</h2>

                                <h1 className="text-xl font-black text-blue-950 tracking-tight ">नमुना ९</h1>
                                <h1 className="text-[10px] leading-none p-2">[ नियम २२(९), ३२(४), ५(६), व  (७) पहा ] </h1>
                                <h1 className="font-bold text-[11px] mt-0.5">सन {MN(fyStart)} - {MN(fyEnd)} या वर्षाची आकारणी केलेल्या करांची मागणी नोंदवही </h1>

                                {/* <p className="text-xl font-bold text-blue-800">तालुका {PANCHAYAT_CONFIG.taluka}</p> */}
                            </div>

                            <div className="text-right text-black font-medium leading-relaxed pr-2 pt-2">
                                <p className="text-xs font-semibold ">मौजा {PANCHAYAT_CONFIG.mouza || 'गोटाळपांजरी'}</p>
                                <p className="text-xs font-semibold">तालुका नागपूर <span className="text-xs">(ग्रामीण)</span> </p>
                                <p className="text-xs font-semibold">जिल्हा नागपूर </p>
                                <p className="text-xs mt-1 font-normal">पान नं. ...........</p>
                            </div>
                        </div>

                        {/* Main Table */}
                        <table className="w-full text-[8.5px] border-collapse leading-none">
                            <thead className="bg-[#1e40af] text-white">
                                <tr>
                                    <th className="p-0.5 w-[25px]" rowSpan={2}>अ.क्र.</th>
                                    <th className="p-0.5 w-[200px]" rowSpan={2}> मालमत्ताधारकाचे नाव </th>
                                    <th className="p-0.5 w-[75px]" rowSpan={2}>प्लॉट नं. /<br />मालमत्ता क्र.</th>
                                    <th className="p-0.5 w-[65px]" rowSpan={2}>खासरा क्र </th>
                                    <th className="p-0.5 w-[130px]" rowSpan={2}>कराचे प्रकार </th>
                                    <th className="p-0.5" colSpan={3}>मागणी</th>
                                    <th className="p-0.5 w-[65px]" rowSpan={2}>बुक क्र. /<br />पावती क्र.</th>
                                    <th className="p-0.5 w-[65px]" rowSpan={2}>दिनांक</th>
                                    <th className="p-0.5 w-[130px]" rowSpan={2}>कराचे नांवे</th>
                                    <th className="p-0.5" colSpan={3}>वसुली</th>
                                    <th className="p-0.5 w-[50px]" rowSpan={2}>बाकी</th>
                                </tr>
                                <tr className="bg-[#2563eb]">
                                    <th className="p-0.5 border-t border-blue-400">मागील</th>
                                    <th className="p-0.5 border-t border-blue-400">चालू</th>
                                    <th className="p-0.5 border-t border-blue-400">एकूण मागणी</th>
                                    <th className="p-0.5 border-t border-blue-400">मागील</th>
                                    <th className="p-0.5 border-t border-blue-400">चालू</th>
                                    <th className="p-0.5 border-t border-blue-400">एकूण वसुली</th>
                                </tr>
                            </thead>

                            {chunk.map((r, rIdx) => {
                                const globalIdx = chunkIdx * 2 + rIdx + 1;

                                const prevArrears = Number(r.arrearsAmount) || 0;
                                const currentDemand = Number(r.totalTaxAmount) || 0;
                                const discount = Number((currentDemand * 0.05).toFixed(2));

                                const grandTotalDemand = Number((prevArrears + currentDemand).toFixed(2));
                                const grandTotalWithDiscount = Number((grandTotalDemand - discount).toFixed(2));

                                const paidAmount = Number(r.paidAmount) || 0;
                                const remainingBalance = Number((grandTotalWithDiscount - paidAmount).toFixed(2));

                                return (
                                    <tbody key={r.id || rIdx}>
                                        {(() => {
                                            const remP = paidAmount;
                                            const mWP = Math.min(remP, prevArrears); 
                                            let remC = remP - mWP;
                                            
                                            // Create recovery mapping for individual heads
                                            const headRecoveryMap: Record<string, number> = {};
                                            TAX_MAPPING.forEach(taxHead => {
                                                const headDemand = Number(r[taxHead.key]) || 0;
                                                const paidForThisHead = Math.min(remC, headDemand);
                                                headRecoveryMap[taxHead.key] = paidForThisHead;
                                                remC -= paidForThisHead;
                                            });

                                            // Attach to r for use in the map
                                            (r as any)._mWP = mWP;
                                            (r as any)._headRecoveryMap = headRecoveryMap;
                                            return null;
                                        })()}
                                        {TAX_MAPPING.map((tax, hIdx) => {
                                            const val = Number(r[tax.key]) || 0;
                                            return (
                                                <tr key={`${r.id}-${hIdx}`} className="bg-white">
                                                    {hIdx === 0 && (
                                                        <>
                                                            <td className="text-center font-bold text-base" rowSpan={11}>{MN(globalIdx)}</td>
                                                            <td className="p-2 align-top" rowSpan={11}>
                                                                <div className="font-bold text-[12px] text-blue-950 mb-1">{r.ownerName}</div>
                                                                <div className="text-[9px] text-gray-500 mb-0.5 mt-3 leading-none italic">भोगवटादाराचे नाव:</div>
                                                                <div className="font-bold text-[10px] mb-1">{r.occupantName || 'स्वतः'}</div>
                                                                <div className="text-[10px] mt-3 font-medium">पत्ता :- वेळा हरिद्र</div>
                                                            </td>
                                                            <td className="text-center p-1 text-[10px] font-bold" rowSpan={11}>
                                                                {r.propertyId ? MN(r.propertyId) : ''}<br />
                                                                {r.plotNo ? MN(r.plotNo) : ''}
                                                            </td>
                                                            <td className="text-center p-1 leading-relaxed font-bold text-[10px]" rowSpan={11}>
                                                                {r.khasraNo ? r.khasraNo.split(',').map((k: string) => <div key={k}>{MN(k)}</div>) : '-'}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="p-0.5 px-2 font-medium border-l-[3px] border-l-blue-200">{tax.label}</td>
                                                    <td className="text-right pr-2 p-0.5 font-medium">{hIdx === 0 ? MN(prevArrears.toFixed(2)) : ''}</td>
                                                    <td className="text-right pr-2 p-0.5 font-medium">{val > 0 ? MN(val.toFixed(2)) : ''}</td>
                                                    <td className="text-right pr-2 p-0.5 font-bold">{val > 0 ? MN(val.toFixed(2)) : ''}</td>


                                                    {hIdx === 0 && (
                                                        <>
                                                            <td className="text-center p-1 font-bold italic" rowSpan={11}> {r.billBookNo ? MN(r.billBookNo) : ''} / {r.billNo ? MN(r.billNo) : ''} </td>
                                                            <td className="text-center p-1 font-bold" rowSpan={11}> {r.lastBillDate ? MN(r.lastBillDate) : ''} </td>
                                                        </>
                                                    )}

                                                    <td className="p-0.5 px-2 font-medium border-l-[3px] border-l-blue-200">{tax.label}</td>
                                                    <td className="text-right pr-2 p-0.5 font-medium">{hIdx === 0 && (r as any)._mWP > 0 ? MN((r as any)._mWP.toFixed(2)) : '-'}</td>
                                                    <td className="text-right pr-2 p-0.5 font-medium">{(r as any)._headRecoveryMap[tax.key] > 0 ? MN((r as any)._headRecoveryMap[tax.key].toFixed(2)) : '-'}</td>
                                                    <td className="text-right pr-2 p-0.5 font-bold">
                                                        {((hIdx === 0 ? (r as any)._mWP : 0) + (r as any)._headRecoveryMap[tax.key]) > 0 
                                                            ? MN(((hIdx === 0 ? (r as any)._mWP : 0) + (r as any)._headRecoveryMap[tax.key]).toFixed(2)) 
                                                            : '-'}
                                                    </td>
                                                    {hIdx === 0 && (
                                                        <td className="text-right pr-4 font-black text-[14px] text-blue-950 px-1 bg-blue-50/30" rowSpan={11}>
                                                            {remainingBalance > 0 ? MN(remainingBalance.toFixed(2)) : '-'}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}

                                        <tr className="bg-blue-50/40">
                                            <td className="p-1 px-2 font-black text-right italic text-blue-800">एकूण</td>
                                            <td className="text-right pr-2 p-1 font-black text-blue-900">{MN(prevArrears.toFixed(2))}</td>
                                            <td className="text-right pr-2 p-1 font-black text-blue-900">{MN(currentDemand.toFixed(2))}</td>
                                            <td className="text-right pr-2 p-1 font-black bg-blue-100 text-blue-950 text-[10px]">{MN((prevArrears + currentDemand).toFixed(2))}</td>
                                            <td className="p-1 px-2 font-black text-right italic text-blue-800">एकूण</td>
                                            <td className="text-right pr-2 p-1 font-black text-emerald-700">{(r as any)._mWP > 0 ? MN((r as any)._mWP.toFixed(2)) : '०.००'}</td>
                                            <td className="text-right pr-2 p-1 font-black text-emerald-700">
                                                {(Object.values((r as any)._headRecoveryMap) as number[]).reduce((a, b) => a + b, 0) > 0 
                                                    ? MN((Object.values((r as any)._headRecoveryMap) as number[]).reduce((a, b) => a + b, 0).toFixed(2)) 
                                                    : '०.००'}
                                            </td>
                                            <td className="text-right pr-2 p-1 font-black bg-emerald-100 text-emerald-900">
                                                {paidAmount > 0 ? MN(paidAmount.toFixed(2)) : '०.००'}
                                            </td>
                                        </tr>

                                        <tr className="bg-white italic">
                                            <td className="p-1 px-2 text-[8.5px] font-bold text-emerald-700">५% सुट (चालू करावर सप्टेंबर पर्यंत)</td>
                                            <td className="text-right pr-2 p-1">-</td>
                                            <td className="text-right pr-2 p-1 text-emerald-700 font-black">{discount > 0 ? MN(discount.toFixed(2)) : ''}</td>
                                            <td className="text-right pr-2 p-1 text-emerald-700 font-black">{discount > 0 ? MN(discount.toFixed(2)) : ''}</td>
                                            <td className="p-1 px-2 text-[8.5px] font-bold text-emerald-700">५% सुट (चालू करावर सप्टेंबर पर्यंत)</td>
                                            <td className="text-right pr-2 p-1">-</td>
                                            <td className="text-right pr-2 p-1">-</td>
                                            <td className="text-right pr-2 p-1">-</td>
                                        </tr>

                                        <tr className="bg-blue-50/60 font-bold">
                                            <td className="p-1 px-2 font-black text-right italic text-blue-800 uppercase">एकूण (मागणी)</td>
                                            <td className="text-right pr-2 p-1 font-black text-blue-900">{MN(prevArrears.toFixed(2))}</td>
                                            <td className="text-right pr-2 p-1 font-black text-blue-900">{MN((currentDemand - discount).toFixed(2))}</td>
                                            <td className="text-right pr-2 p-1 font-black bg-blue-200/50 text-blue-950 text-[11px]">{MN(grandTotalWithDiscount.toFixed(2))}</td>
                                            <td className="p-1 px-2 font-black text-right italic text-blue-800 uppercase">एकूण (वसुली)</td>
                                            <td className="text-right pr-2 p-1 font-black text-emerald-700">{r.mW > 0 ? MN(r.mW.toFixed(2)) : '०.००'}</td>
                                            <td className="text-right pr-2 p-1 font-black text-emerald-700">{r.cW > 0 ? MN(r.cW.toFixed(2)) : '०.००'}</td>
                                            <td className="text-right pr-2 p-1 font-black bg-emerald-100 text-emerald-900">{paidAmount > 0 ? MN(paidAmount.toFixed(2)) : '०.००'}</td>
                                        </tr>

                                        <tr className="bg-blue-800 text-white font-black text-[10px] border-t-2 border-blue-950">
                                            <td className="p-1 py-1 text-right tracking-[0.2em] pr-4 uppercase" colSpan={7}>एकूण मागणी रुपये</td>
                                            <td className="p-1 py-1 text-right pr-2 bg-blue-900 shadow-inner">{MN(grandTotalWithDiscount.toFixed(2))}</td>
                                            <td colSpan={2} className="bg-white border-none"></td>
                                            <td className="p-1 py-1 text-right tracking-[0.2em] pr-4 uppercase" colSpan={3}>एकूण वसुली रुपये</td>
                                            <td className="p-1 py-1 text-right pr-2 bg-blue-900 shadow-inner">{paidAmount > 0 ? MN(paidAmount.toFixed(2)) : '०.००'}</td>
                                            <td className="bg-blue-950"></td>
                                        </tr>
                                    </tbody>
                                );
                            })}
                        </table>

                        <div className="mt-1 flex flex-col items-start px-4 pb-0.5 w-full">
                            <div className="grid grid-cols-3 gap-16 w-full mb-0.5 pt-10">
                                <div className="text-center">
                                    <div className="pt-1.5 border-t border-blue-500 text-blue-900 uppercase tracking-[0.1em] font-black font-mono text-[9px]">
                                        लिपिक
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="pt-1.5 border-t border-blue-500 text-blue-900 uppercase tracking-[0.1em] font-black font-mono text-[9px]">
                                        सरपंच / उपसरपंच
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="pt-1.5 border-t border-blue-500 text-blue-900 uppercase tracking-[0.1em] font-black text-[9px]">
                                        ग्रामविकास अधिकारी
                                    </div>
                                </div>
                            </div>

                            <div className="text-[9px] font-bold text-gray-900 leading-none border-t border-gray-300 p-4 w-full ">
                                <div className="flex gap-2">
                                    <span className="whitespace-nowrap">टीप : (१)सूट मंजूर करणाऱ्या आदेशाची शेऱ्यांसह नोंद करण्यात यावी</span>
                                    <span>(२)सरपंचाने शेरे व दुरुस्त्या अनुप्रमाणीत कराव्यात</span>

                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
