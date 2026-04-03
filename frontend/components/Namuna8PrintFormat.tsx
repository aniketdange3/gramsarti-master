import React, { useState } from 'react';
import { PropertyRecord, FLOOR_NAMES } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
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

    // Chunk records: 8 records per page for Legal Landscape
    const RECORDS_PER_PAGE = 8;
    const recordChunks = [];
    for (let i = 0; i < records.length; i += RECORDS_PER_PAGE) {
        recordChunks.push(records.slice(i, i + RECORDS_PER_PAGE));
    }

    return (
        <div className="bg-gray-100 min-h-screen p-0 no-print-bg font-sans">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
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
                        font-family: 'Inter', sans-serif;
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
                .no-print-bg { background: none !important; }
                .page-container {
                    background: transparent;
                    width: 355.6mm; /* Legal Landscape Width */
                    height: 215.9mm; /* Legal Landscape Height */
                    margin: 0 auto;
                    padding: 30px 40px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
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
                    width: 85px;
                    height: 85px;
                }
                .text-brand-red { color: #bf0644f1; }
                .bg-brand-gradient { background: #a02f37ff; }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="page-container relative overflow-visible">
                    {/* Watermark */}
                    <div className="absolute inset-0   flex items-center justify-center pointer-events-none opacity-[0.1]">
                        <img src="/images/logo.png" className="w-[550px] h-[550px] object-contain " alt="Watermark" />
                    </div>

                    <div className="relative z-10 w-full flex flex-col justify-center items-center">
                        <div className="w-full">
                            {/* Header Section - Modern Balanced Layout */}
                            <div className="relative mb-10 w-full flex justify-between items-center px-4">
                                {/* Left: Logo */}
                                <div className="header-logo flex-shrink-0">
                                    <img src="/images/logo.png" alt="GP Logo" className="w-[110px] h-[110px] object-contain" />
                                </div>

                                {/* Center: Titles */}
                                <div className="flex-1 flex flex-col items-center text-center">
                                    <h2 className="text-[36px] font-black tracking-tight leading-none text-[#A80D40] uppercase mb-4">
                                        गट ग्रामपंचायत वेळा हरिश्चंद्र
                                    </h2>
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <div className="h-[2px] w-16 bg-brand-gradient opacity-30"></div>
                                        <span className="text-[26px] font-black px-10 py-1.5 rounded-full text-white bg-brand-gradient shadow-xl">नमुना ८</span>
                                        <div className="h-[2px] w-16 bg-brand-gradient opacity-30"></div>
                                    </div>
                                    <p className="text-[13px] font-bold text-gray-500 italic mb-2 tracking-[0.2em] uppercase text-brand-red font-bold">नियम ३२ (१) पहा</p>
                                    <h1 className="text-[15px] font-black text-gray-900 tracking-wide">
                                        सन २०{MN(fyStart % 100)} - २०{MN(fyEnd % 100)} या वर्षाची कर आकारणी नोंदवही
                                    </h1>
                                </div>

                                {/* Right: Location Details */}
                                <div className="flex-shrink-0 text-right space-y-1 bg-[#A80D40]/5 p-6 rounded-[32px] border border-[#A80D40]/10 min-w-[200px]">
                                    <p className="text-[13px] font-black flex justify-between gap-4">
                                        <span className="text-gray-500 uppercase tracking-tighter">मौजा:</span>
                                        <span className="text-[#A80D40]">{chunk[0]?.wastiName || PANCHAYAT_CONFIG.mouza || 'वेळा'}</span>
                                    </p>
                                    <p className="text-[13px] font-black flex justify-between gap-4">
                                        <span className="text-gray-500 uppercase tracking-tighter">तालुका:</span>
                                        <span className="text-[#A80D40]">{PANCHAYAT_CONFIG.taluka || 'नागपूर'}</span>
                                    </p>
                                    <p className="text-[13px] font-black flex justify-between gap-4">
                                        <span className="text-gray-500 uppercase tracking-tighter">जिल्हा:</span>
                                        <span className="text-[#A80D40]">{PANCHAYAT_CONFIG.jilha || 'नागपूर'}</span>
                                    </p>
                                    <div className="pt-2 mt-2 border-t border-[#A80D40]/20">
                                        <p className="text-[13px] font-black flex justify-between items-center">
                                            <span className="text-gray-500 uppercase tracking-tighter">पान नं:</span>
                                            <span className="inline-block w-12 border-b-2 border-[#A80D40] mt-1 h-4"></span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Table */}
                            <table className="w-full text-[10px] border-collapse border-2 border-[#4a0000] leading-tight mt-2 shadow-xl">
                                <thead>
                                    <tr className="text-white bg-brand-gradient">
                                        <th rowSpan={2} className="p-1 border border-white/30 w-[25px]">अ.क्र.</th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[80px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">वस्ती नाव</div>
                                            <div className="p-1">खसरा क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[60px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">मालमत्ता</div>
                                            <div className="p-1">प्लॉट क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[160px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">मालकाचे नाव</div>
                                            <div className="p-1">भोगवटादाराचे नाव</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[50px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">एकूण</div>
                                            <div className="p-1">क्षेत्रफळ</div>
                                        </th>
                                        <th rowSpan={2} className="p-1 border border-white/30 w-[100px]">मालमत्ता प्रकार</th>
                                        <th rowSpan={2} className="p-1 border border-white/30 w-[60px]">क्षेत्रफळ <br />(चौ.फूट / चौ.मी)</th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[70px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">बांधकाम वर्ष</div>
                                            <div className="p-1">वय</div>
                                        </th>
                                        <th colSpan={2} className="p-1 border border-white/30">रेडी रेकनर दर</th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[50px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">भारांक</div>
                                            <div className="p-1">घसारा</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[80px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">भांडवली मूल्य</div>
                                            <div className="p-1">(रु.)</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white/30 w-[40px]">
                                            <div className="p-1 border-b border-white/10 border-dashed">कराचा दर</div>
                                            <div className="p-1">(पैसे)</div>
                                        </th>
                                        <th colSpan={6} className="p-1 border border-white/30 uppercase tracking-widest text-[9px]">आकारणी केलेल्या करांची रक्कम (रु.)</th>
                                        <th rowSpan={2} className="p-1 border border-white/30 w-[80px]">शेरा</th>
                                    </tr>
                                    <tr className="text-white text-[8.5px] font-black bg-brand-gradient uppercase tracking-wider">
                                        <th className="p-1 border border-white/30">जमीन</th>
                                        <th className="p-1 border border-white/30">बांधकाम</th>
                                        <th className="p-1 border border-white/30 w-[50px]">मालमत्ता <br />कर </th>
                                        <th className="p-1 border border-white/30 w-[50px]">दिवाबत्ती <br />कर</th>
                                        <th className="p-1 border border-white/30 w-[50px]">सा. पाणी <br />कर</th>
                                        <th className="p-1 border border-white/30 w-[50px]">वि. पाणी <br />कर</th>
                                        <th className="p-1 border border-white/30 w-[50px]">कचरागाडी <br />कर</th>
                                        <th className="p-1 border border-white/30 w-[60px]">एकूण</th>
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
                                            const bRate = Number(s?.buildingRate || 0);
                                            const lRate = Number(s?.landRate || 0);
                                            const valB = Number((area * bRate).toFixed(2));
                                            const valL = Number((area * lRate).toFixed(2));
                                            const sTaxB = Number(((valB * Number(s?.buildingTaxRate || 0)) / 1000).toFixed(2));
                                            const sTaxO = Number(((valL * Number(s?.openSpaceTaxRate || 0)) / 1000).toFixed(2));
                                            return { ...s, finalBVal: valB, finalLVal: valL, sTaxB, sTaxO, rowGharpatti: sTaxB + sTaxO };
                                        });

                                        const recordTotalGharpatti = recordTaxDetails.reduce((sum, d) => sum + d.rowGharpatti, 0);
                                        const recordTotalTax = recordTotalGharpatti +
                                            (Number(r.streetLightTax) || 0) +
                                            (Number(r.generalWaterTax) || 0) +
                                            (Number(r.specialWaterTax) || 0) +
                                            (Number(r.healthTax) || 0);

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
                                                        <tr key={sIdx} className={sIdx % 2 === 0 ? "bg-white" : "bg-red-50/20"}>
                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle border border-black text-xs text-[#A80D40]">{MN(srNo)}</td>
                                                                    <td rowSpan={rowCount} className="p-0 text-center align-middle border border-black text-[10px]">
                                                                        <div className="p-1 font-bold border-b border-black text-gray-800">{r.wastiName || '-'}</div>
                                                                        <div className="p-1 font-black text-[#A80D40]">{r.khasraNo || '-'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle border border-black text-[10px] text-gray-900">
                                                                        {r.propertyId || r.plotNo || '-'}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-0 align-middle border border-black text-[10px]">
                                                                        <div className="p-1 font-black border-b border-black flex items-center justify-between text-gray-900 uppercase">
                                                                            <OwnerNameDisplay name={r.ownerName || '-'} />

                                                                            <button
                                                                                onClick={() => setSelectedRecordForFormula(r)}
                                                                                className="no-print ml-2 w-7 h-7 flex items-center justify-center bg-[#A80D40]/10 text-[#A80D40] rounded-lg border border-[#A80D40]/20 hover:bg-[#A80D40] hover:text-white transition-all shadow-md active:scale-95"
                                                                                title="गणना सूत्र पहा"
                                                                            >
                                                                                🧮
                                                                            </button>
                                                                        </div>
                                                                        <div className="p-1 text-[9px] text-gray-500 font-bold italic">भोगवटादार: {r.occupantName || 'स्वतः'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 justify-center items-center text-center font-black align-middle border border-black text-[10px] bg-[#A80D40]/5 leading-tight">
                                                                        {Number(r.propertyLength) > 0 && Number(r.propertyWidth) > 0 ? (
                                                                            <div className="flex flex-col items-center justify-center gap-1">
                                                                                <span className="text-[#A80D40] whitespace-nowrap">
                                                                                    {MN(r.propertyLength)} × {MN(r.propertyWidth)} = {MN(r.totalAreaSqFt || totalArea)} <span className="text-[8px] font-bold text-gray-500">SqFt</span>
                                                                                </span>
                                                                                <span title="चौरस मीटर" className="text-[9px] text-gray-600">({MN(r.totalAreaSqMt || 0)} <span className="text-[7.5px]">SqMt</span>)</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center gap-1">
                                                                                <span title="चौरस फूट" className="text-[#A80D40] whitespace-nowrap">{MN(totalArea)} <span className="text-[8px] font-bold text-gray-500">SqFt</span></span>
                                                                                {Number(r.totalAreaSqMt) > 0 && <span title="चौरस मीटर" className="text-[9px] text-gray-600">({MN(r.totalAreaSqMt)} <span className="text-[7.5px]">SqMt</span>)</span>}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="p-1 text-center font-black border border-black bg-white text-[10px] text-[#A80D40]">
                                                                <div>{s?.propertyType || '-'}</div>
                                                                {s?.propertyType === 'आर.सी.सी' && activeSections.length > 1 && (
                                                                    <div className="text-[8px] font-black text-[#952B32]">({FLOOR_NAMES[s.floorIndex]})</div>
                                                                )}
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[10px]">
                                                                <div className="p-1 border-b border-black bg-white font-black">{s ? MN(s.areaSqFt || 0) : '-'}</div>
                                                                <div className="p-1 text-gray-500 font-black text-[8.5px] bg-gray-50">{s ? MN(s.areaSqMt || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[9px]">
                                                                <div className="p-1 font-black border-b border-black text-gray-800">{r.constructionYear ? MN(r.constructionYear) : '-'}</div>
                                                                <div className="p-1 font-bold text-[#A80D40]">({MN(r.propertyAge || 0)} वर्ष)</div>
                                                            </td>
                                                            <td className="p-1 text-right border border-black text-[10px] font-bold">
                                                                {s?.propertyType === 'खाली जागा' ? MN(s.landRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-1 text-right border border-black text-[10px] font-bold">
                                                                {s?.propertyType !== 'खाली जागा' ? MN(s.buildingRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[10px] font-black">
                                                                <div className="p-1 border-b border-black">{s ? MN(details?.weightage || 0) : '-'}</div>
                                                                <div className="p-1 text-[#A80D40]">{s ? MN(details?.depreciationRate || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-1 text-right font-black border border-black text-[10px] bg-[#A80D40]/5 text-[#952B32]">
                                                                {s ? MN((finalBVal + finalLVal).toFixed(2)) : '-'}
                                                            </td>
                                                            <td className="p-1 text-center border border-black text-[10px] font-black" style={{ color: '#A80D40' }}>
                                                                {s ? MN(s.buildingTaxRate || s.openSpaceTaxRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-0 text-right align-middle border border-black text-[10px] font-bold">
                                                                {s ? (
                                                                    <>
                                                                        {sTaxB > 0 && sTaxO > 0 ? (
                                                                            <>
                                                                                <div className="p-1 border-b border-black">{MN(sTaxB.toFixed(2))}</div>
                                                                                <div className="p-1">{MN(sTaxO.toFixed(2))}</div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="p-1">{MN((sTaxB + sTaxO).toFixed(2) || (sTaxB === 0 && sTaxO === 0 ? '-' : '०.००'))}</div>
                                                                        )}
                                                                    </>
                                                                ) : '-'}
                                                            </td>
                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-black text-[10px] font-bold">{MN((Number(r.streetLightTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-black text-[10px] font-bold">{MN((Number(r.generalWaterTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-black text-[10px] font-bold">{MN((Number(r.specialWaterTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle border border-black text-[10px] font-bold">{MN((Number(r.healthTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle border border-black text-[11px] ">{MN(recordTotalTax.toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-[9px] align-middle border border-black whitespace-pre-wrap font-bold text-gray-700">{r.remarksNotes || '-'}</td>
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
                                    <tr className="text-white font-black text-[10px] bg-brand-gradient">
                                        <td colSpan={6} className="p-3 text-right  uppercase tracking-widest opacity-80 text-white font-black whitespace-nowrap"></td>
                                        {/* <td className="p-1 text-center border-white/30 bg-brand-gradient">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (r.sections?.reduce((s2: number, s: any) => s2 + (Number(s.areaSqFt) || 0), 0) || 0), 0))}
                                        </td> */}
                                        <td className="bg-brand-gradient border-white/20"></td>

                                        <td colSpan={4} className="bg-brand-gradient "></td>
                                        <td className="p-1 text-right  bg-brand-gradient">
                                            &nbsp;
                                        </td>
                                        <td className="bg-brand-gradient border-white/20"></td>
                                        <td className="p-0 text-right border-white/30 text-[9px] bg-brand-gradient">
                                            <div className="p-1 font-black bg-brand-gradient">
                                                {MN(chunk.reduce((sum: number, r: any) => {
                                                    const active = (r.sections || [])
                                                        .map((s, idx) => ({ ...s, floorIndex: idx }))
                                                        .filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');
                                                    const rGhar = active.reduce((sSum: number, s: any) => {
                                                        const area = Number(s?.areaSqMt || 0);
                                                        const bRate = Number(s?.buildingRate || 0);
                                                        const lRate = Number(s?.landRate || 0);
                                                        const valB = Number((area * bRate).toFixed(2));
                                                        const valL = Number((area * lRate).toFixed(2));
                                                        const tB = Number(((valB * Number(s?.buildingTaxRate || 0)) / 1000).toFixed(2));
                                                        const tO = Number(((valL * Number(s?.openSpaceTaxRate || 0)) / 1000).toFixed(2));
                                                        return sSum + tB + tO;
                                                    }, 0);
                                                    return sum + rGhar;
                                                }, 0).toFixed(2))}
                                            </div>
                                        </td>
                                        <td className="p-1 text-right border-white/30 bg-brand-gradient">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.streetLightTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/30 bg-brand-gradient">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.generalWaterTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/30 bg-brand-gradient">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.specialWaterTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border-white/30 bg-brand-gradient">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.healthTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-2 text-right border border-white/30 text-[12px] bg-brand-gradient text-white ">
                                            {MN(chunk.reduce((sum: number, r: any) => {
                                                const active = (r.sections || [])
                                                    .map((s, idx) => ({ ...s, floorIndex: idx }))
                                                    .filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');
                                                const rGhar = active.reduce((sSum: number, s: any) => {
                                                    const area = Number(s?.areaSqMt || 0);
                                                    const bRate = Number(s?.buildingRate || 0);
                                                    const lRate = Number(s?.landRate || 0);
                                                    const valB = Number((area * bRate).toFixed(2));
                                                    const valL = Number((area * lRate).toFixed(2));
                                                    const tB = Number(((valB * Number(s?.buildingTaxRate || 0)) / 1000).toFixed(2));
                                                    const tO = Number(((valL * Number(s?.openSpaceTaxRate || 0)) / 1000).toFixed(2));
                                                    return sSum + tB + tO;
                                                }, 0);
                                                const other = (Number(r.streetLightTax) || 0) + (Number(r.generalWaterTax) || 0) + (Number(r.specialWaterTax) || 0) + (Number(r.healthTax) || 0);
                                                return sum + rGhar + other;
                                            }, 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-center border-white/30 uppercase text-[9px] font-black">प्रमाणित</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Signatures */}
                            <div className="mt-12 flex flex-col items-start px-4 pb-2 w-full">
                                <div className="grid grid-cols-3 gap-24 w-full mb-4 pt-12">
                                    <div className="text-center group">
                                        <div className="pt-2 border-t-2 border-[#A80D40] text-[#A80D40] uppercase font-black text-[11px] tracking-widest">लिपिक</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="pt-2 border-t-2 border-[#A80D40] text-[#A80D40] uppercase font-black text-[11px] tracking-widest">सरपंच / उपसरपंच</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="pt-2 border-t-2 border-[#A80D40] text-[#A80D40] uppercase font-black text-[11px] tracking-widest">ग्रामविकास अधिकारी</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-gray-900 leading-relaxed border-t-2 border-gray-200 p-6 w-full mt-6 bg-[#A80D40]/5 rounded-3xl">
                                    <div className="flex flex-col gap-3">
                                        <p className="flex items-start gap-2">
                                            <span className="text-[#A80D40] font-black tracking-tighter shrink-0">टीप (१) :</span>
                                            <span>सदरचा उतारा हा मालकी हक्काचा नसून कर आकारणीचा आहे. सदरचा उताऱ्यावरून खरेदी-विक्रीचा व्यवहार झाल्यास त्यास ग्रामपंचायत जबाबदार राहणार नाही.</span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <span className="text-[#A80D40] font-black tracking-tighter shrink-0">टीप (२) :</span>
                                            <span>शासन परिपत्रक क्र. VTM2603/ प्र.क्र. २०६८/ पं.रा. ४ दि २० नोव्हेंबर २००३ नुसार ग्रामीण भागातील घरांची नोंदणी पती-पत्नी यांच्या संयुक्त नावे करण्याबाबत निर्देशित करण्यात आलेले आहेत.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {selectedRecordForFormula && (
                <div className="no-print fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-[#A80D40]/20 scale-100 animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="px-10 py-8 flex justify-between items-center text-white shrink-0 bg-brand-gradient relative overflow-hidden">
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
                                        const capVal = areaSqMt * (bRate || lRate);
                                        const tax = (capVal * tr) / 1000;

                                        return (
                                            <div key={idx} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-premium group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                                                    <span className="text-[100px] font-black italic" style={{ color: '#A80D40' }}>{MN(idx + 1)}</span>
                                                </div>
                                                <h4 className="text-base font-black mb-6 border-b pb-4 flex items-center gap-4" style={{ color: '#A80D40', borderColor: '#A80D40' }}>
                                                    <div className="w-10 h-10 bg-brand-gradient rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg">{MN(idx + 1)}</div>
                                                    <div className="flex flex-col">
                                                        <span>{s.propertyType}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{s.floorIndex !== undefined ? FLOOR_NAMES[s.floorIndex] : ''}</span>
                                                    </div>
                                                </h4>

                                                <div className="space-y-6">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">१. मोजमाप रुपांतरण</span>
                                                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:border-[#A80D40]/10 transition-colors">
                                                            <span className="text-[13px] font-black text-gray-700">{MN(areaSqFt.toFixed(2))} <span className="text-[10px] text-gray-400">SqFt</span> ÷ १०.७६</span>
                                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                                                                <span className="font-black text-sm" style={{ color: '#A80D40' }}>= {MN(areaSqMt.toFixed(2))}</span>
                                                                <span className="text-[9px] font-black text-gray-400">SqMt</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">२. भांडवली मूल्य</span>
                                                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:border-[#A80D40]/10 transition-colors">
                                                            <span className="text-[13px] font-black text-gray-700">{MN(areaSqMt.toFixed(2))} <span className="text-[10px] text-gray-400">क्षेत्र</span> × {MN(bRate || lRate)} <span className="text-[10px] text-gray-400">दर</span></span>
                                                            <div className="flex items-center gap-2 bg-brand-gradient px-4 py-2 rounded-xl shadow-xl">
                                                                <span className="text-white font-black text-sm">₹ {MN(capVal.toFixed(2))}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#A80D40' }}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#A80D40] animate-pulse"></div> ३. मालमत्ता कर
                                                        </span>
                                                        <div className="flex justify-between items-center bg-[#A80D40]/5 p-5 rounded-2xl border-2 border-[#A80D40]/10 group-hover:border-[#A80D40]/30 transition-all duration-500">
                                                            <span className="text-[13px] font-black text-gray-800 tracking-tight">({MN(capVal.toFixed(2))} × {MN(tr)}) ÷ १०००</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-xl" style={{ color: '#A80D40' }}>₹ {MN(tax.toFixed(2))}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div className="mt-12 bg-white border-2 border-[#A80D40]/10 rounded-[48px] p-10 relative overflow-hidden shadow-premium-dark">
                                <div className="absolute top-0 left-0 w-full h-2 bg-brand-gradient"></div>
                                <h4 className="text-2xl font-black mb-10 flex items-center gap-5 text-[#A80D40]">
                                    <div className="w-12 h-12 bg-brand-gradient rounded-2xl flex items-center justify-center text-white shadow-premium">Σ</div>
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
                                                (Number(selectedRecordForFormula.generalWaterTax) || 0) +
                                                (Number(selectedRecordForFormula.specialWaterTax) || 0)
                                            ).toFixed(2))}
                                        </div>
                                    </div>
                                    <div className="bg-brand-gradient p-6 rounded-[32px] shadow-premium-dark ring-8 ring-[#A80D40]/5 hover:scale-110 transition-transform duration-500 cursor-default">
                                        <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2 leading-none">एकूण वार्षिक मागणी</div>
                                        <div className="text-3xl font-black text-white leading-none mt-2 tracking-tighter">₹ {MN(Number(selectedRecordForFormula.totalTaxAmount || 0).toFixed(2))}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedRecordForFormula(null)}
                                className="px-12 py-4 bg-brand-gradient text-white font-black rounded-2xl hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-premium flex items-center gap-3 uppercase tracking-widest text-xs"
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
