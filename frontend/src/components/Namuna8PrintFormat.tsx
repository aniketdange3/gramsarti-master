import React, { useState } from 'react';
import { PropertyRecord, FLOOR_NAMES } from '../types';
import { calculateTax } from '../utils/taxUtils';
import { PANCHAYAT_CONFIG } from '../utils/panchayatConfig';
import OwnerNameDisplay from './OwnerNameDisplay';

interface Props {
    records: PropertyRecord[];
}

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

export default function Namuna8PrintFormat({ records }: Props) {
    const [selectedRecordForFormula, setSelectedRecordForFormula] = useState<PropertyRecord | null>(null);

    // Financial Year Logic
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
    const fyEnd = fyStart + 1;

    // Chunk records: 7 records per page for Legal Landscape to accommodate margins
    const RECORDS_PER_PAGE = 7;
    const recordChunks = [];
    for (let i = 0; i < records.length; i += RECORDS_PER_PAGE) {
        recordChunks.push(records.slice(i, i + RECORDS_PER_PAGE));
    }

    return (
        <div className="min-h-screen bg-white p-0 m-0  font-sans print:bg-white print:min-h-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: 345mm 215mm;
                        margin: 1.3in 0.45in 0.45in 0.45in;
                    }
                    body, html {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        background: white !important;
                        width: 100%;
                        overflow: visible !important;
                        font-family: 'Inter', sans-serif;
                    }
                    .page-container {
                        page-break-after: always;
                    }
                    .page-container:last-child {
                        page-break-after: avoid;
                    }
                    .page-container {
                        box-shadow: none !important;
                        margin: 0 !important;
                        border: 1px solid #7A0000 !important;
                        padding: 10px !important;
                        width: 100% !important;
                        max-width: none !important;
                        position: relative !important;
                        overflow: visible !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                        align-items: center !important;
                        background: white !important;
                    }
                    .print-bg-white { background-color: white !important; }
                    .print-no-border { border-color: #ccc !important; }
                    .no-print { display: none !important; }
                    ::-webkit-scrollbar { display: none !important; }
                }
                .no-print-bg { background: none !important; }
                .page-container {
                    width: 100%;
                    Background-color : WHITE;
                    height: auto;
                    margin: 0;
                    padding: 0;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    font-family: 'Inter', sans-serif;
                }
                table, th, td {
                    border: 1px solid #a9a9a9fc !important;
                    border-collapse: collapse;
                }
                thead th {
                    border: 1px solid #a9a9a9fc !important;
                }
                .header-logo {
                    width: 150px;
                    height: 150px;
                }
                .text-brand-maroon { color: #7A0000; }
                .bg-brand-maroon { background: #7A0000; }
                .bg-brand-gold { background: #FDEFB2; }
                .bg-cream { background: #FDF5E6; }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="page-container relative overflow-visible">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.1]">
                        <img src="/images/logo.jpeg" className="w-[500px] h-[500px] object-contain" alt="Watermark" />
                    </div>

                    <div className="relative z-10 w-full flex flex-col justify-center items-center">
                        <div className="w-full" style={{ marginTop: '15px' }}>
                            {/* Header Section - Modern Balanced Layout */}
                            <div className="relative mb-2 w-full flex justify-between items-start px-0">
                                {/* Left: Logo */}
                                <div className="header-logo flex-shrink-0 pt-0">
                                    <img src="/images/logo.jpeg" alt="GP Logo" className="w-[150px] h-[150px] object-contain" />
                                </div>

                                {/* Center: Titles */}
                                <div className="flex-1 flex flex-col items-center text-center">
                                    <h2 className="text-[42px] font-bold tracking-tight leading-none text-[#7A0000] mb-2" style={{ fontFamily: "'Arya', serif" }}>
                                        गट ग्रामपंचायत वेळा (हरिश्चंद्र)
                                    </h2>
                                    <div className="mb-3">
                                        <span className="text-[15px] font-black px-14 py-1.5 rounded-full text-white bg-[#7A0000] shadow-lg inline-block">नमुना ८</span>
                                    </div>
                                    <p className="text-[14px] font-bold text-[#7A0000] italic   ">नियम ३२ (१) पहा</p>
                                    <div className="inline-block py-1.5  print:border-[#7A0000] ">
                                        <h1 className="text-[13px] font-black text-gray-900 tracking-wide">
                                            सन २०{MN(fyStart % 100)} - २०{MN(fyEnd % 100)} या वर्षाची कर आकारणी नोंदवही
                                        </h1>
                                    </div>
                                </div>

                                {/* Right: Location Details */}
                                <div className="flex-shrink-0 text-left space-y-1 bg-[#FFF9E5] print:bg-white p-5  rounded-2xl border border-[#D4AF37]/30 print:border-[#7A0000] min-w-[240px] shadow-sm">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[14px] font-black">
                                        <span className="text-gray-600">मौजा:</span>
                                        <span className="text-right text-gray-900">{chunk[0]?.wastiName || PANCHAYAT_CONFIG.mouza || 'वेळा'}</span>
                                        <span className="text-gray-600">तालुका:</span>
                                        <span className="text-right text-gray-900">{PANCHAYAT_CONFIG.taluka || 'नागपूर'}</span>
                                        <span className="text-gray-600">जिल्हा:</span>
                                        <span className="text-right text-gray-900">{PANCHAYAT_CONFIG.jilha || 'नागपूर'}</span>
                                        <span className="text-gray-600 pt-2">पान नं:</span>
                                        <span className="inline-block border-b border-gray-400 mt-2 h-4"></span>
                                    </div>
                                </div>
                            </div>

                            {/* Main Table - bg-white ensures watermark is hidden behind data */}
                            <table className="w-full text-[10px] border-collapse border border-[#7A0000] leading-tight mt-2 bg-white">
                                <thead>
                                    <tr className="text-[#7A0000] bg-[#fff9e5] print:bg-gray-50">
                                        <th rowSpan={2} className="p-1 border border-[#7A0000]/30 w-[25px]">अ.क्र.</th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[80px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">वस्ती नाव</div>
                                            <div className="p-1">खसरा क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[60px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">मालमत्ता</div>
                                            <div className="p-1">प्लॉट क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[160px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">मालमत्ता धारकाचे नाव</div>
                                            <div className="p-1">भोगवटदाराचे नाव</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[50px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">एकूण</div>
                                            <div className="p-1">क्षेत्रफळ</div>
                                        </th>
                                        <th rowSpan={2} className="p-1 border border-[#7A0000]/30 w-[100px]">मालमत्ता प्रकार</th>
                                        <th rowSpan={2} className="p-1 border border-[#7A0000]/30 w-[60px]">क्षेत्रफळ <br />(चौ.फूट / चौ.मी)</th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[70px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">बांधकाम वर्ष</div>
                                            <div className="p-1">वय</div>
                                        </th>
                                        <th colSpan={2} className="p-1 border border-[#7A0000]/30">वार्षिक मूल्य दर</th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[50px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">भारांक</div>
                                            <div className="p-1">घसारा</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[80px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">भांडवली मूल्य</div>
                                            <div className="p-1">(रु.)</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-[#7A0000]/30 w-[40px]">
                                            <div className="p-1 border-b border-[#7A0000]/20">कराचा दर</div>
                                            <div className="p-1">(पैसे)</div>
                                        </th>
                                        <th colSpan={7} className="p-1 border border-[#7A0000]/30 uppercase tracking-widest text-[9px]">आकारणी केलेल्या करांची रक्कम (रु.)</th>
                                        <th rowSpan={2} className="p-1 border border-[#7A0000]/30 w-[80px]">शेरा</th>
                                    </tr>
                                    <tr className="text-[#7A0000] text-[8.5px] font-black bg-[#FDEFB2] print:bg-gray-50 uppercase tracking-wider">
                                        <th className="p-1 border border-[#7A0000]/30">जमीन</th>
                                        <th className="p-1 border border-[#7A0000]/30">बांधकाम</th>
                                        <th className="p-1 border border-[#7A0000]/30 w-[50px]">मालमत्ता <br />कर </th>
                                        <th className="p-1 border border-[#7A0000]/30 w-[50px]">दिवाबत्ती <br />कर</th>
                                        <th className="p-1 border border-[#7A0000]/30 w-[50px]">आरोग्य <br />कर</th>
                                        <th className="p-1 border border-[#7A0000]/30 w-[50px]">सामान्य पाणी
                                            <br />कर</th>
                                        <th className="p-1 border border-[#7A0000]/30 w-[50px]">विशेष पाणी
                                            <br />कर</th>
                                        <th className="p-1 border border-[#7A0000]/30 w-[50px]">कचरागाडी <br />कर</th>

                                        <th className="p-1 border border-[#7A0000]/30 w-[60px]">एकूण</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {chunk.map((r, rIdx) => {
                                        const activeSections = (r.sections || [])
                                            .map((s, idx) => ({ ...s, floorIndex: idx }))
                                            .filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');

                                        const displaySections = activeSections.length > 0 ? activeSections : [null];
                                        const rowCount = displaySections.length;

                                        const recordTaxDetails = activeSections.map(s => {
                                            const area = Number(s?.areaSqMt || 0);

                                            // Building Tax (RCC)
                                            const bRes = calculateTax({
                                                areaSqMt: area,
                                                rate: Number(s?.buildingRate || 0),
                                                taxRate: Number(s?.buildingTaxRate || 0),
                                                weightage: Number(s?.weightage || 1),
                                                valueMultiplier: Number(s?.depreciationRate || 1)
                                            });

                                            // Open Space Tax (Khalia)
                                            const lRes = calculateTax({
                                                areaSqMt: area,
                                                rate: Number(s?.landRate || 0),
                                                taxRate: Number(s?.openSpaceTaxRate || 0),
                                                weightage: 1.0,
                                                valueMultiplier: 1.0
                                            });

                                            return {
                                                ...s,
                                                finalBVal: bRes.valuation,
                                                finalLVal: lRes.valuation,
                                                sTaxB: bRes.finalTax,
                                                sTaxO: lRes.finalTax,
                                                rowGharpatti: bRes.finalTax + lRes.finalTax,
                                                weightage: s?.weightage || 1.0,
                                                depreciationRate: s?.depreciationRate || 0
                                            };
                                        });

                                        const calculatedGharpattiB = recordTaxDetails.reduce((sum, d) => sum + d.sTaxB, 0);
                                        const calculatedGharpattiO = recordTaxDetails.reduce((sum, d) => sum + d.sTaxO, 0);

                                        const pTaxDb = r.propertyTax !== undefined && r.propertyTax !== null;
                                        const oTaxDb = r.openSpaceTax !== undefined && r.openSpaceTax !== null;
                                        const tTaxDb = r.totalTaxAmount !== undefined && r.totalTaxAmount !== null;

                                        const finalPropertyTax = pTaxDb ? Number(r.propertyTax) : calculatedGharpattiB;
                                        const finalOpenSpaceTax = oTaxDb ? Number(r.openSpaceTax) : calculatedGharpattiO;

                                        const recordTotalGharpatti = finalPropertyTax + finalOpenSpaceTax;
                                        const recordTotalTax = tTaxDb ? Number(r.totalTaxAmount) : (recordTotalGharpatti +
                                            (Number(r.streetLightTax) || 0) +
                                            (Number(r.healthTax) || 0) +
                                            (Number(r.wasteCollectionTax) || 0) +
                                            (Number(r.generalWaterTax) || 0) +
                                            (Number(r.specialWaterTax) || 0));

                                        const totalArea = Number(r.totalAreaSqFt) > 0 ? Number(r.totalAreaSqFt) : activeSections.reduce((sum: number, s: any) => sum + (Number(s?.areaSqFt) || 0), 0);
                                        const srNo = chunkIdx * RECORDS_PER_PAGE + rIdx + 1;

                                        return (
                                            <React.Fragment key={rIdx}>
                                                {displaySections.map((s: any, sIdx: number) => {
                                                    const details = recordTaxDetails.find(d => d.floorIndex === s?.floorIndex);
                                                    const finalBVal = details?.finalBVal || 0;
                                                    const finalLVal = details?.finalLVal || 0;
                                                    const sTaxB = details?.sTaxB || 0;
                                                    const sTaxO = details?.sTaxO || 0;

                                                    return (
                                                        <tr key={sIdx} className={sIdx % 2 === 0 ? "bg-white" : "bg-[#FCF8E8]"}>
                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle border border-[#7A0000]/30 text-xs text-[#7A0000]">{MN(srNo)}</td>
                                                                    <td rowSpan={rowCount} className="p-0 text-center align-middle border border-[#7A0000]/30 text-[10px]">
                                                                        <div className="p-1 font-bold border-b border-[#7A0000]/20 text-gray-800">{r.wastiName || '-'}</div>
                                                                        <div className="p-1 font-black text-[#7A0000]">{r.khasraNo || '-'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle border border-[#7A0000]/30 text-[10px] text-gray-900">
                                                                        {r.propertyId || r.plotNo || '-'}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-0 align-middle border border-black text-[10px]">
                                                                        <div className="p-1 font-black border-b border-black flex items-center justify-between text-gray-900 uppercase">
                                                                            <OwnerNameDisplay name={r.ownerName || '-'} />


                                                                        </div>
                                                                        <div className="p-1 text-[9px]  font-bold italic border-b border-black/10">भोगवटदाराचे नाव: {r.occupantName || 'स्वतः'}</div>
                                                                        <div className="p-1 text-[9px]  font-bold">संपर्क: {r.contactNo ? MN(r.contactNo) : '-'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 justify-center items-center text-center font-black align-middle border border-[#7A0000]/30 text-[10px] bg-[#FDEFB2]/30 print:bg-white leading-tight">
                                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                                            {Number(r.propertyLength) > 0 && Number(r.propertyWidth) > 0 && (
                                                                                <span className="text-[#7A0000] whitespace-nowrap text-[9px]">
                                                                                    {MN(r.propertyLength)} × {MN(r.propertyWidth)}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[#7A0000] font-black whitespace-nowrap">
                                                                                {MN(r.totalAreaSqFt || totalArea)} <span className="text-[8px] font-bold">चौ.फूट</span>
                                                                            </span>
                                                                            {Number(r.totalAreaSqMt || 0) > 0 && (
                                                                                <span title="चौरस मीटर" className="text-[9px]  italic border-t border-[#7A0000]/20">
                                                                                    ({MN(r.totalAreaSqMt || 0)} <span className="text-[7.5px]">चौ.मी</span>)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="p-1 text-center font-black border border-[#7A0000]/30 bg-white text-[10px] text-[#7A0000]">
                                                                <div>{s?.propertyType || '-'}</div>
                                                                {s?.propertyType === 'आर.सी.सी' && activeSections.length > 1 && (
                                                                    <div className="text-[8px] font-black text-[#7A0000]">({FLOOR_NAMES[s.floorIndex]})</div>
                                                                )}
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[10px]">
                                                                <div className="p-1 border-b border-black bg-white font-black">{s ? MN(s.areaSqFt || 0) : '-'}</div>
                                                                <div className="p-1  font-black text-[8.5px] bg-gray-50">{s ? MN(s.areaSqMt || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[9px]">
                                                                <div className="p-1 font-black border-b border-black ">
                                                                    {s?.propertyType === 'आर.सी.सी' ? (s?.constructionYear || r.constructionYear ? MN(s?.constructionYear || r.constructionYear) : '-') : '-'}
                                                                </div>
                                                                <div className="p-1 font-bold text-[#7A0000]">
                                                                    {s?.propertyType === 'आर.सी.सी' ? `(${MN(s?.propertyAge || r.propertyAge || 0)} वर्ष)` : ''}
                                                                </div>
                                                            </td>
                                                            <td className="p-1 text-right border border-[#7A0000]/30 text-[10px] font-bold">
                                                                {s?.propertyType === 'खाली जागा' ? MN(s.landRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-1 text-right border border-[#7A0000]/30 text-[10px] font-bold">
                                                                {s?.propertyType !== 'खाली जागा' ? MN(s.buildingRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-0 text-center border border-[#7A0000]/30 text-[10px] font-black">
                                                                <div className="p-1 border-b border-[#7A0000]/20">{s ? MN(details?.weightage || 0) : '-'}</div>
                                                                <div className="p-1 text-[#7A0000]">{s ? MN(details?.depreciationRate || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-1 text-right font-black border border-[#7A0000]/30 text-[10px] bg-[#FDEFB2]/20 print:bg-white text-[#7A0000]">
                                                                {s ? MN((finalBVal + finalLVal).toFixed(2)) : '-'}
                                                            </td>
                                                            <td className="p-1 text-center border border-[#7A0000]/30 text-[10px] font-black" style={{ color: '#7A0000' }}>
                                                                {s ? MN(s.buildingTaxRate || s.openSpaceTaxRate || 0) : '-'}
                                                            </td>
                                                            {/* Column 15: Property Tax per section with breakdown */}
                                                            <td className="p-0 text-right align-middle border border-black text-[10px] font-bold">
                                                                <div className="p-1 flex flex-col gap-1">
                                                                    {(details?.sTaxB || 0) > 0 && (details?.sTaxO || 0) > 0 ? (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <div className="flex justify-between items-center text-[#7A0000]">
                                                                                <span className="text-[7px] italic">इमारत:</span>
                                                                                <span>{MN(details.sTaxB.toFixed(2))}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-blue-800">
                                                                                <span className="text-[7px] italic">जागा:</span>
                                                                                <span>{MN(details.sTaxO.toFixed(2))}</span>
                                                                            </div>
                                                                            <div className="mt-1 pt-1 border-t border-[#7A0000]/20 text-center font-black text-[#7A0000]">
                                                                                {MN((details.sTaxB + details.sTaxO).toFixed(2))}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`text-center ${(details?.sTaxB || 0) > 0}`}>
                                                                            {MN(((details?.sTaxB || 0) + (details?.sTaxO || 0)).toFixed(2))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-[#7A0000]/30 text-[10px] font-bold">{MN((Number(r.streetLightTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-[#7A0000]/30 text-[10px] font-bold">{MN((Number(r.healthTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-[#7A0000]/30 text-[10px] font-bold">{MN((Number(r.generalWaterTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-[#7A0000]/30 text-[10px] font-bold">{MN((Number(r.specialWaterTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-[#7A0000]/30 text-[10px] font-bold">{MN((Number(r.wasteCollectionTax) || 0).toFixed(2))}</td>

                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle border border-[#7A0000]/30 text-[11px] ">{MN(recordTotalTax.toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-[9px] align-middle border border-[#7A0000]/30 whitespace-pre-wrap font-bold text-gray-700">{(r.remarksNotes || '-').replace(/फेरफार क्र:/g, 'फेरफार बुक क्र:') || '-'}</td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#7A0000] print:bg-gray-100 text-white print:text-black font-black text-[12px] h-[35px]">
                                        <td colSpan={13} className="p-2 text-right uppercase tracking-widest text-white print:text-black font-black whitespace-nowrap">एकूण रक्कम:</td>
                                        <td className="p-1 text-right border-white/20">
                                            {MN(chunk.reduce((sum: number, r: any) => {
                                                const active = (r.sections || [])
                                                    .filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');
                                                const rGhar = active.reduce((sSum: number, s: any) => {
                                                    const area = Number(s?.areaSqMt || 0);
                                                    const bRes = calculateTax({
                                                        areaSqMt: area,
                                                        rate: Number(s?.buildingRate || 0),
                                                        taxRate: Number(s?.buildingTaxRate || 0),
                                                        weightage: Number(s?.weightage || 1),
                                                        valueMultiplier: Number(s?.depreciationRate || 1)
                                                    });
                                                    const lRes = calculateTax({
                                                        areaSqMt: area,
                                                        rate: Number(s?.landRate || 0),
                                                        taxRate: Number(s?.openSpaceTaxRate || 0),
                                                        weightage: 1.0,
                                                        valueMultiplier: 1.0
                                                    });
                                                    return sSum + bRes.finalTax + lRes.finalTax;
                                                }, 0);
                                                return sum + rGhar;
                                            }, 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/20">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.streetLightTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/20">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.healthTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/20">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.generalWaterTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/20">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.specialWaterTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/20">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.wasteCollectionTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-2 text-right border border-white/40 text-[14px] bg-[#7A0000] text-white">
                                            {MN(chunk.reduce((sum: number, r: any) => {
                                                const active = (r.sections || [])
                                                    .filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');
                                                const rGhar = active.reduce((sSum: number, s: any) => {
                                                    const area = Number(s?.areaSqMt || 0);
                                                    const bRes = calculateTax({
                                                        areaSqMt: area,
                                                        rate: Number(s?.buildingRate || 0),
                                                        taxRate: Number(s?.buildingTaxRate || 0),
                                                        weightage: Number(s?.weightage || 1),
                                                        valueMultiplier: Number(s?.depreciationRate || 1)
                                                    });
                                                    const lRes = calculateTax({
                                                        areaSqMt: area,
                                                        rate: Number(s?.landRate || 0),
                                                        taxRate: Number(s?.openSpaceTaxRate || 0),
                                                        weightage: 1.0,
                                                        valueMultiplier: 1.0
                                                    });
                                                    return sSum + bRes.finalTax + lRes.finalTax;
                                                }, 0);
                                                const other = (Number(r.streetLightTax) || 0) +
                                                    (Number(r.healthTax) || 0) +
                                                    (Number(r.wasteCollectionTax) || 0) +
                                                    (Number(r.generalWaterTax) || 0) +
                                                    (Number(r.specialWaterTax) || 0);
                                                return sum + rGhar + other;
                                            }, 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-center border-white/40 uppercase text-[9px] font-black">प्रमाणित</td>
                                    </tr>
                                </tfoot>
                            </table>
                            <center>
                                <p className="text-[#A80D40]  font-bold text-[11px]  whitespace-nowrap  ">
                                    नक्कल दिल्याची दिनांक : {MN(currentDate.toLocaleDateString('en-GB'))}
                                </p>
                            </center>


                            {/* Footer Section: Left Tips, Right Signatures */}
                            <div className="mt-10 flex gap-8 items-end w-full px-0 pb-2">
                                {/* Left Side: Tips */}
                                <div className="flex-1 text-[12px] font-bold text-[#7A0000] leading-tight border-1 border-[#7A0000] p-2 bg-[#FFF9E5]        rounded-xl shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-[#7A0000]"></div>
                                    <div className="flex flex-col gap-2 ml-2">
                                        <p className="flex items-start gap-2">
                                            <span className="text-[#7A0000] font-black tracking-tighter shrink-0 bg-[#7A0000]/10 px-2 py-0.5 rounded">टीप (१) :</span>
                                            <span className="leading-snug">सदरचा उतारा हा मालकी हक्काचा नसून कर आकारणीचा आहे. सदरचा उताऱ्यावरून खरेदी-विक्रीचा व्यवहार झाल्यास त्यास ग्रामपंचायत जबाबदार राहणार नाही.</span>
                                        </p>
                                        <p className="flex items-start gap-3">
                                            <span className="text-[#7A0000] font-black tracking-tighter shrink-0 bg-[#7A0000]/10 px-2 py-0.5 rounded">टीप (२) :</span>
                                            <span className="leading-snug">शासन परिपत्रक क्र. VPM२६०३/ प्र.क्र. २०६८/ पं.रा. ४ दि २० नोव्हेंबर २००३ नुसार ग्रामीण भागातील घरांची नोंदणी पती-पत्नी यांच्या संयुक्त नावे करण्याबाबत निर्देशित करण्यात आलेले आहेत.</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Signatures */}
                                <div className="flex-shrink-0 w-[450px] flex flex-col gap-10">

                                    <div className="flex justify-between items-end gap-12 px-4">
                                        <div className="text-center flex-1">
                                            <div className="pt-3 border-t-2 border-[#7A0000] text-[#7A0000] uppercase font-black text-[15px] tracking-widest whitespace-nowrap">लिपिक</div>
                                        </div>
                                        <div className="text-center flex-1">
                                            <div className="pt-3 border-t-2 border-[#7A0000] text-[#7A0000] uppercase font-black text-[15px] tracking-widest whitespace-nowrap">ग्रामपंचायत अधिकारी</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {selectedRecordForFormula && (
                <div className="no-print fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-[#7A0000]/20 scale-100 animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="px-10 py-8 flex justify-between items-center text-white shrink-0 bg-[#7A0000] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none">
                                <span className="text-[120px] font-black">₹</span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black flex items-center gap-4">
                                    <span className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">🧮</span>
                                    <div className="flex flex-col">
                                        <span>गणना सूत्र मार्गदर्शक</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50">Tax Calculation Logic</span>
                                    </div>
                                </h3>
                                <p className="text-white/80 text-[12px] font-black uppercase tracking-widest mt-4">
                                    मालमत्ता क्र: {MN(selectedRecordForFormula.propertyId || '-')} • {selectedRecordForFormula.ownerName}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecordForFormula(null)}
                                className="relative z-10 w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 group border border-white/20 shadow-2xl"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {(selectedRecordForFormula.sections || [])
                                    .filter(s => s.propertyType && s.propertyType !== 'निवडा')
                                    .map((s, idx) => {
                                        const areaSqFt = Number(s.areaSqFt) || 0;
                                        const areaSqMt = Number(s.areaSqMt) || 0;
                                        const bRate = Number(s.buildingRate) || 0;
                                        const lRate = Number(s.landRate) || 0;
                                        const tr = Number(s.buildingTaxRate || s.openSpaceTaxRate || 0);
                                        const results = calculateTax({
                                            areaSqMt: areaSqMt,
                                            rate: bRate || lRate,
                                            taxRate: tr,
                                            weightage: Number(s.weightage || 1),
                                            valueMultiplier: 1 - Number(s.depreciationRate || 0)
                                        });

                                        return (
                                            <div key={idx} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-premium group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                                                    <span className="text-[100px] font-black italic" style={{ color: '#7A0000' }}>{MN(idx + 1)}</span>
                                                </div>
                                                <h4 className="text-base font-black mb-6 border-b pb-4 flex items-center gap-4" style={{ color: '#7A0000', borderColor: '#7A0000' }}>
                                                    <div className="w-10 h-10 bg-[#7A0000] rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg">{MN(idx + 1)}</div>
                                                    <div className="flex flex-col">
                                                        <span>{s.propertyType}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{s.floorIndex !== undefined ? FLOOR_NAMES[s.floorIndex] : ''}</span>
                                                    </div>
                                                </h4>

                                                <div className="space-y-6">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">१. मोजमाप रुपांतरण</span>
                                                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:border-[#7A0000]/10 transition-colors">
                                                            <span className="text-[13px] font-black text-gray-700">{MN(areaSqFt.toFixed(2))} <span className="text-[10px] text-gray-400">SqFt</span> ÷ १०.७६</span>
                                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                                                                <span className="font-black text-sm" style={{ color: '#7A0000' }}>= {MN(areaSqMt.toFixed(2))}</span>
                                                                <span className="text-[9px] font-black text-gray-400">SqMt</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">२. भांडवली मूल्य (Valuation)</span>
                                                        <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:border-[#7A0000]/10 transition-colors">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[13px] font-black text-gray-700">मूलभूत मूल्य: {MN(areaSqMt.toFixed(2))} × {MN(bRate || lRate)}</span>
                                                                <span className="font-black text-gray-500">₹ {MN((areaSqMt * (bRate || lRate)).toFixed(2))}</span>
                                                            </div>
                                                            {Number(s.weightage || 1) !== 1 && (
                                                                <div className="flex justify-between items-center text-[#7A0000]">
                                                                    <span className="text-[11px] font-black italic">× भारांक (Weightage):</span>
                                                                    <span className="font-black">× {MN(s.weightage)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                                <span className="text-[11px] font-black text-gray-400">अंतिम भांडवली मूल्य:</span>
                                                                <div className="bg-[#7A0000] px-4 py-1.5 rounded-xl shadow-xl text-white font-black text-sm">
                                                                    ₹ {MN(results.valuation.toFixed(2))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#7A0000' }}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#7A0000] animate-pulse"></div> ३. वार्षिक मालमत्ता कर
                                                        </span>
                                                        <div className="flex flex-col gap-3 bg-[#7A0000]/5 p-5 rounded-2xl border-2 border-[#7A0000]/10 group-hover:border-[#7A0000]/30 transition-all duration-500">
                                                            {Number(s.depreciationRate || 0) > 0 && (
                                                                <div className="flex justify-between items-center text-gray-500 text-[11px] font-bold border-b border-[#7A0000]/10 pb-2 mb-1">
                                                                    <span>घसारा (Depreciation {MN(Number(s.depreciationRate) * 100)}%):</span>
                                                                    <span>- ₹ {MN((results.valuation - results.depreciatedValue).toFixed(2))}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[13px] font-black text-gray-800 tracking-tight">({MN(results.depreciatedValue.toFixed(2))} × {MN(tr)}) ÷ १०००</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-xl" style={{ color: '#7A0000' }}>₹ {MN(results.finalTax.toFixed(2))}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div className="mt-12 bg-white border-2 border-[#7A0000]/10 rounded-[48px] p-10 relative overflow-hidden shadow-premium-dark">
                                <div className="absolute top-0 left-0 w-full h-2 bg-[#7A0000]"></div>
                                <h4 className="text-2xl font-black mb-10 flex items-center gap-5 text-[#7A0000]">
                                    <div className="w-12 h-12 bg-[#7A0000] rounded-2xl flex items-center justify-center text-white shadow-premium">Σ</div>
                                    <div className="flex flex-col">
                                        <span>एकूण मागणी सारांश</span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-black mt-1">Consolidated Summary</span>
                                    </div>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                                    <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 hover:scale-105 transition-transform duration-300">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">मालमत्ता कर</div>
                                        <div className="text-2xl font-black text-gray-900 leading-none">₹ {MN(Number(selectedRecordForFormula.propertyTax || 0).toFixed(2))}</div>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 hover:scale-105 transition-transform duration-300">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">जमीन कर</div>
                                        <div className="text-2xl font-black text-gray-900 leading-none">₹ {MN(Number(selectedRecordForFormula.openSpaceTax || 0).toFixed(2))}</div>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 hover:scale-105 transition-transform duration-300">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">इतर सर्व कर</div>
                                        <div className="text-2xl font-black text-gray-900 leading-none">
                                            ₹ {MN((
                                                (Number(selectedRecordForFormula.streetLightTax) || 0) +
                                                (Number(selectedRecordForFormula.healthTax) || 0) +
                                                (Number(selectedRecordForFormula.wasteCollectionTax) || 0) +
                                                (Number(selectedRecordForFormula.generalWaterTax) || 0) +
                                                (Number(selectedRecordForFormula.specialWaterTax) || 0)
                                            ).toFixed(2))}
                                        </div>
                                    </div>
                                    <div className="bg-[#7A0000] p-6 rounded-[32px] shadow-premium-dark ring-8 ring-[#7A0000]/5 hover:scale-110 transition-transform duration-500 cursor-default">
                                        <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2 leading-none">एकूण वार्षिक मागणी</div>
                                        <div className="text-3xl font-black text-white leading-none mt-2 tracking-tighter">₹ {MN(Number(selectedRecordForFormula.totalTaxAmount || 0).toFixed(2))}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedRecordForFormula(null)}
                                className="px-12 py-4 bg-[#7A0000] text-white font-black rounded-2xl hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-premium flex items-center gap-3 uppercase tracking-widest text-xs"
                            >
                                <span>बंद करा</span>
                                <span className="opacity-40 font-normal">|</span>
                                <span>CLOSE</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
