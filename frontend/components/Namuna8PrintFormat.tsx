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
        <div className="bg-gray-100 min-h-screen p-0 no-print-bg">
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
                .no-print-bg { background: none !important; }
                .page-container {
                    background: white;
                    width: 355.6mm; /* Legal Landscape Width */
                    height: 215.9mm; /* Legal Landscape Height */
                    margin: 0 auto;
                    padding: 30px 40px;
                    box-shadow: 0 0 15px rgba(0,0,0,0.1);
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                table, th, td {
                    border: 1px solid black !important;
                    border-collapse: collapse;
                }
                thead th {
                    border: 1px solid rgba(255,255,255,0.5) !important;
                }
                .header-logo {
                    width:75px;
                    height: 75px;
                }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="page-container relative overflow-visible">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08]">
                        <img src="/images/logo.png" className="w-[600px] h-[600px] object-contain" alt="Watermark" />
                    </div>

                    <div className="relative z-10 w-full flex flex-col justify-center items-center">
                        <div className="w-full">
                            {/* Header Section */}
                            <div className="flex justify-between items-center mb-2 border-b-2 border-blue-800 pb-10">
                                <div className="flex-shrink-0 header-logo">
                                    <img src="/images/logo.png" alt="GP Logo" className="w-full h-full object-contain" />
                                </div>
                                <div className="text-center flex-1 px-4">
                                    <h2 className="text-[28px] font-black text-blue-900 tracking-tight leading-tight">
                                        गट ग्रामपंचायत वेळा हरिश्चंद्र
                                    </h2>
                                    <div className="mt-1 mb-0.5">
                                        <span className="text-[28px] font-black text-blue-800  pb-0.5">नमुना ८</span>
                                    </div>
                                    <p className="text-[12px] text-gray-500 italic mt-1"> नियम ३२ (१) पहा </p>
                                    <h1 className="text-[12px] font-extrabold text-black mt-1 tracking-wide">
                                        सन २०{MN(fyStart % 100)} - २०{MN(fyEnd % 100)} या वर्षाची कर आकारणी नोंदवही
                                    </h1>
                                </div>
                                <div className="text-right text-black leading-snug flex-shrink-0">
                                    <p className="text-[11px] font-bold">मौजा: <span className="font-extrabold">{PANCHAYAT_CONFIG.mouza || 'गोटाळपांजरी'}</span></p>
                                    <p className="text-[11px] font-bold">तालुका: <span className="font-extrabold">{PANCHAYAT_CONFIG.taluka || 'नागपूर (ग्रामीण)'}</span></p>
                                    <p className="text-[11px] font-bold">जिल्हा: <span className="font-extrabold">{PANCHAYAT_CONFIG.jilha || 'नागपूर'}</span></p>
                                    <p className="text-[10px] font-semibold mt-2 border-t border-gray-300 pt-1">
                                        पान नं: <span className="inline-block w-12 border-b border-black ml-1">&nbsp;</span>
                                    </p>
                                </div>
                            </div>

                            {/* Main Table */}
                            <table className="w-full text-[10px] border-collapse border border-black leading-tight mt-2">
                                <thead>
                                    <tr className="bg-blue-800 text-white">
                                        <th rowSpan={2} className="p-1 border border-white w-[25px]">अ.क्र.</th>
                                        <th rowSpan={2} className="p-0 border border-white w-[80px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">वस्ती नाव</div>
                                            <div className="p-1">खसरा क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white w-[60px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">मालमत्ता</div>
                                            <div className="p-1">प्लॉट क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white w-[160px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">मालकाचे नाव</div>
                                            <div className="p-1">भोगवटादाराचे नाव</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white w-[50px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">एकूण</div>
                                            <div className="p-1">क्षेत्रफळ</div>
                                        </th>
                                        <th rowSpan={2} className="p-1 border border-white w-[100px]">मालमत्ता प्रकार</th>
                                        <th rowSpan={2} className="p-1 border border-white w-[60px]">क्षेत्रफळ <br />(चौ.फूट / चौ.मी)</th>
                                        <th rowSpan={2} className="p-0 border border-white w-[70px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">बांधकाम वर्ष</div>
                                            <div className="p-1">वय</div>
                                        </th>
                                        <th colSpan={2} className="p-1 border border-white">रेडी रेकनर दर</th>
                                        <th rowSpan={2} className="p-0 border border-white w-[50px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">भारांक</div>
                                            <div className="p-1">घसारा</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white w-[80px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">भांडवली मूल्य</div>
                                            <div className="p-1">(रु.)</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 border border-white w-[40px]">
                                            <div className="p-1 border-b border-white/30 border-dashed">कराचा दर</div>
                                            <div className="p-1">(पैसे)</div>
                                        </th>
                                        <th colSpan={6} className="p-1 border border-white">आकारणी केलेल्या करांची रक्कम (रु.)</th>
                                        <th rowSpan={2} className="p-1 border border-white w-[80px]">शेरा</th>
                                    </tr>
                                    <tr className="bg-blue-700 text-white text-[8px]">
                                        <th className="p-1 border border-white">जमीन</th>
                                        <th className="p-1 border border-white">बांधकाम</th>
                                        <th className="p-1 border border-white w-[50px]">मालमत्ता <br />कर </th>
                                        <th className="p-1 border border-white w-[50px]">दिवाबत्ती <br />कर</th>
                                        <th className="p-1 border border-white w-[50px]">सा. पाणी <br />कर</th>
                                        <th className="p-1 border border-white w-[50px]">वि. पाणी <br />कर</th>
                                        <th className="p-1 border border-white w-[50px]">कचरागाडी <br />कर</th>
                                        <th className="p-1 border border-white w-[60px]">एकूण</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {chunk.map((r, rIdx) => {
                                        // 1. Filter active sections and include floor index
                                        const activeSections = (r.sections || [])
                                            .map((s, idx) => ({ ...s, floorIndex: idx }))
                                            .filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');

                                        // 2. Setup display sections
                                        const displaySections = activeSections.length > 0 ? activeSections : [null];
                                        const rowCount = displaySections.length;

                                        // 3. Pre-calculate on-the-fly taxes for the entire record
                                        const recordTaxDetails = activeSections.map(s => {
                                            const area = Number(s?.areaSqMt || 0);
                                            const bRate = Number(s?.buildingRate || 0);
                                            const lRate = Number(s?.landRate || 0);

                                            // Formula: Capital Value = Area * Rate
                                            const valB = Number((area * bRate).toFixed(2));
                                            const valL = Number((area * lRate).toFixed(2));

                                            // Tax = (Value * TaxRate) / 1000
                                            const sTaxB = Number(((valB * Number(s?.buildingTaxRate || 0)) / 1000).toFixed(2));
                                            const sTaxO = Number(((valL * Number(s?.openSpaceTaxRate || 0)) / 1000).toFixed(2));

                                            return {
                                                ...s,
                                                finalBVal: valB,
                                                finalLVal: valL,
                                                sTaxB,
                                                sTaxO,
                                                rowGharpatti: sTaxB + sTaxO
                                            };
                                        });

                                        const recordTotalGharpatti = recordTaxDetails.reduce((sum, d) => sum + d.rowGharpatti, 0);
                                        const recordTotalTax = recordTotalGharpatti +
                                            (Number(r.streetLightTax) || 0) +
                                            (Number(r.generalWaterTax) || 0) +
                                            (Number(r.specialWaterTax) || 0) +
                                            (Number(r.healthTax) || 0);

                                        const totalArea = activeSections.reduce((sum: number, s: any) => sum + (Number(s?.areaSqFt) || 0), 0);
                                        const srNo = chunkIdx * RECORDS_PER_PAGE + rIdx + 1;

                                        return (
                                            <React.Fragment key={rIdx}>
                                                {displaySections.map((s: any, sIdx: number) => {
                                                    const details = recordTaxDetails.find(d => d.floorIndex === s?.floorIndex);
                                                    const dep = details?.depreciationRate || 1;
                                                    const weight = details?.weightage || 1;
                                                    const finalBVal = details?.finalBVal || 0;
                                                    const finalLVal = details?.finalLVal || 0;
                                                    const sTaxB = details?.sTaxB || 0;
                                                    const sTaxO = details?.sTaxO || 0;

                                                    return (
                                                        <tr key={sIdx} className={sIdx % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                                                            {/* Property-level cells (Spanned) */}
                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-bold align-middle border border-black text-xs">{MN(srNo)}</td>
                                                                    <td rowSpan={rowCount} className="p-0 text-center align-middle border border-black text-[10px]">
                                                                        <div className="p-1 font-bold border-b border-black">{r.wastiName || '-'}</div>
                                                                        <div className="p-1">{r.khasraNo || '-'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-bold align-middle border border-black text-[10px]">
                                                                        {r.propertyId || r.plotNo || '-'}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-0 align-middle border border-black text-[10px]">
                                                                        <div className="p-1 font-bold border-b border-black flex items-center justify-between">
                                                                            <OwnerNameDisplay name={r.ownerName || '-'} />
                                                                            {/* Formula Button (Screen Only) */}
                                                                            <button
                                                                                onClick={() => setSelectedRecordForFormula(r)}
                                                                                className="no-print ml-2 w-6 h-6 flex items-center justify-center bg-blue-50 text-blue-600 rounded-md border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                                title="गणना सूत्र पहा"
                                                                            >
                                                                                🧮
                                                                            </button>
                                                                        </div>
                                                                        <div className="p-1 text-[8px] text-gray-500 italic">भोगवटादार: {r.occupantName || 'स्वतः'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-bold align-middle border border-black text-[10px]">
                                                                        {MN(totalArea)}
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* Section-specific cells (One per Floor) */}
                                                            <td className="p-1 text-center font-bold border border-black bg-blue-50/20 text-[10px]">
                                                                <div>{s?.propertyType || '-'}</div>
                                                                {s?.propertyType === 'आर.सी.सी' && activeSections.filter(sec => sec.propertyType === 'आर.सी.सी').length > 1 && (
                                                                    <div className="text-[8px] font-normal text-gray-600">({FLOOR_NAMES[s.floorIndex]})</div>
                                                                )}
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[10px]">
                                                                <div className="p-1 border-b border-black bg-blue-50/10 font-bold">{s ? MN(s.areaSqFt || 0) : '-'}</div>
                                                                <div className="p-1 text-gray-600 font-medium text-[8.5px] bg-gray-50/30">{s ? MN(s.areaSqMt || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[9px]">
                                                                <div className="p-1 font-bold border-b border-black">{r.constructionYear ? MN(r.constructionYear) : '-'}</div>
                                                                <div className="p-1">({MN(r.propertyAge || 0)} वर्ष)</div>
                                                            </td>
                                                            <td className="p-1 text-right border border-black text-[10px]">
                                                                {s?.propertyType === 'खाली जागा' ? MN(s.landRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-1 text-right border border-black text-[10px]">
                                                                {s?.propertyType !== 'खाली जागा' ? MN(s.buildingRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-0 text-center border border-black text-[10px] font-bold">
                                                                <div className="p-1 border-b border-black">{s ? MN(details?.weightage || 0) : '-'}</div>
                                                                <div className="p-1">{s ? MN(details?.depreciationRate || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-1 text-right font-bold border border-black text-[10px]">
                                                                {s ? MN((finalBVal + finalLVal).toFixed(2)) : '-'}
                                                            </td>
                                                            <td className="p-1 text-center border border-black text-[10px] font-bold text-blue-800">
                                                                {s ? MN(s.buildingTaxRate || s.openSpaceTaxRate || 0) : '-'}
                                                            </td>

                                                            <td className="p-0 text-right align-middle border border-black text-[10px]">
                                                                {s ? (
                                                                    <>
                                                                        {sTaxB > 0 && sTaxO > 0 ? (
                                                                            <>
                                                                                <div className="p-1 border-b border-black" title="इमारत कर">{MN(sTaxB.toFixed(2))}</div>
                                                                                <div className="p-1" title="खाली जागा कर">{MN(sTaxO.toFixed(2))}</div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="p-1">{MN((sTaxB + sTaxO).toFixed(2) || (sTaxB === 0 && sTaxO === 0 ? '-' : '०.००'))}</div>
                                                                        )}
                                                                    </>
                                                                ) : '-'}
                                                            </td>

                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-right align-middle border border-black text-[10px]">{MN((Number(r.streetLightTax) || 0).toFixed(2))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-right align-middle border border-black text-[10px]">
                                                                        {MN((Number(r.generalWaterTax) || 0).toFixed(2))}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-right align-middle border border-black text-[10px]">
                                                                        {MN((Number(r.specialWaterTax) || 0).toFixed(2))}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-right align-middle border border-black text-[10px]">
                                                                        {MN((Number(r.healthTax) || 0).toFixed(2))}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-right font-black align-middle border border-black text-[10px] bg-blue-50">
                                                                        {MN(recordTotalTax.toFixed(2))}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-[9px] align-middle border border-black whitespace-pre-wrap">{r.remarksNotes || '-'}</td>
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
                                    <tr className="bg-blue-900 text-white font-black text-[10px]">
                                        <td colSpan={6} className="p-2 text-right border border-white uppercase tracking-wider">एकूण पृष्ठ बेरीज &gt;&gt;</td>
                                        <td className="p-1 text-center border border-white">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (r.sections?.reduce((s2: number, s: any) => s2 + (Number(s.areaSqFt) || 0), 0) || 0), 0))}
                                        </td>
                                        <td colSpan={4} className="border border-white bg-blue-800"></td>
                                        <td className="p-1 text-right border border-white">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (r.sections?.reduce((s2: number, s: any) => s2 + Number((Number(s.areaSqMt || 0) * (Number(s.buildingRate) || Number(s.landRate) || 0)).toFixed(2)), 0) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="border border-white bg-blue-800"></td>
                                        <td className="p-0 text-right border border-white text-[9px]">
                                            <div className="p-1 font-bold">
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
                                        <td className="p-1 text-right border border-white">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.streetLightTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border border-white">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.generalWaterTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border border-white">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.specialWaterTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border border-white">
                                            {MN(chunk.reduce((sum: number, r: any) => sum + (Number(r.healthTax) || 0), 0).toFixed(2))}
                                        </td>
                                        <td className="p-1 text-right border border-white bg-blue-600 text-[11px]">
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
                                        <td className="p-1 text-center border border-white">प्रमाणित</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Signatures */}
                            <div className="mt-10 flex flex-col items-start px-4 pb-0.5 w-full">
                                <div className="grid grid-cols-3 gap-16 w-full mb-0.5 pt-10">
                                    <div className="text-center">
                                        <div className="pt-1.5 border-t border-black text-black uppercase font-bold text-[10px]">लिपिक</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="pt-1.5 border-t border-black text-black uppercase font-bold text-[10px]">सरपंच / उपसरपंच</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="pt-1.5 border-t border-black text-black uppercase font-bold text-[10px]">ग्रामविकास अधिकारी</div>
                                    </div>
                                </div>
                                <div className="text-[9px] font-bold text-gray-900 leading-none border-t border-gray-300 p-4 w-full mt-4">
                                    <div className="flex flex-col gap-2">
                                        <p>टीप : (१) सदरचा उतारा हा मालकी हक्काचा नसून कर आकारणीचा आहे. सदरचा उताऱ्यावरून खरेदी-विक्रीचा व्यवहार झाल्यास त्यास ग्रामपंचायत जबाबदार राहणार नाही.</p>
                                        <p>(२) शासन परिपत्रक क्र. VTM2603/ प्र.क्र. २०६८/ पं.रा. ४ दि २० नोव्हेंबर २००३ नुसार ग्रामीण भागातील घरांची नोंदणी पती-पत्नी यांच्या संयुक्त नावे करण्याबाबत निर्देशित करण्यात आलेले आहेत.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {/* Formula Modal (Screen Only) */}
            {selectedRecordForFormula && (
                <div className="no-print fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-blue-100 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex justify-between items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #1e40af, #1e3a8a)' }}>
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    <span>🧮</span> गणना सूत्र मार्गदर्शक (Calculation Guide)
                                </h3>
                                <p className="text-blue-100/70 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    मालमत्ता क्र: {MN(selectedRecordForFormula.propertyId || '-')} • {selectedRecordForFormula.ownerName}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecordForFormula(null)}
                                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                            <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <span className="text-4xl font-black italic">#{MN(idx + 1)}</span>
                                                </div>
                                                <h4 className="text-sm font-black text-blue-900 mb-4 border-b border-blue-100 pb-2 flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-black text-[10px]">{MN(idx + 1)}</div>
                                                    {s.propertyType} {s.floorIndex !== undefined ? `(${FLOOR_NAMES[s.floorIndex]})` : ''}
                                                </h4>

                                                <div className="space-y-4">
                                                    {/* Step 1: Area */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">१. मोजमाप रुपांतरण (Area Conversion)</span>
                                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                                            <span className="text-[11px] font-black">{MN(areaSqFt.toFixed(2))} चौ.फूट ÷ १०.७६</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-blue-600 font-black text-xs">= {MN(areaSqMt.toFixed(2))}</span>
                                                                <span className="text-[8px] font-bold text-gray-400">चौ.मी</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Step 2: Capital Value */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">२. भांडवली मूल्य (Capital Value)</span>
                                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                                            <span className="text-[11px] font-black">{MN(areaSqMt.toFixed(2))} (क्षेत्र) × {MN(bRate || lRate)} (दर)</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-emerald-600 font-black text-xs">= ₹{MN(capVal.toFixed(2))}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Step 3: Tax */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-tight">३. मालमत्ता कर (Property Tax)</span>
                                                        <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                                            <span className="text-[11px] font-black tracking-tighter">({MN(capVal.toFixed(2))} × {MN(tr)}) ÷ १०००</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-blue-700 font-black text-sm">= ₹{MN(tax.toFixed(2))}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Final Total Section */}
                            <div className="mt-8 bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-blue-100 mix-blend-multiply opacity-20">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-black text-blue-900 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">Σ</div>
                                    एकूण मागणी सारांश (Total Summary)
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-blue-100/50 h-full">
                                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">एकूण मालमत्ता कर</div>
                                        <div className="text-xl font-black text-blue-900">₹{MN(Number(selectedRecordForFormula.propertyTax || 0).toFixed(2))}</div>
                                        <div className="text-[8px] font-medium text-blue-300 mt-1 italic">सर्व मजल्यांसाहित</div>
                                    </div>
                                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-blue-100/50 h-full">
                                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">जमीन कर</div>
                                        <div className="text-xl font-black text-blue-900">₹{MN(Number(selectedRecordForFormula.openSpaceTax || 0).toFixed(2))}</div>
                                    </div>
                                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-blue-100/50 h-full">
                                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">इतर सर्व कर</div>
                                        <div className="text-xl font-black text-blue-900">
                                            ₹{MN((
                                                Number(selectedRecordForFormula.streetLightTax || 0) +
                                                Number(selectedRecordForFormula.healthTax || 0) +
                                                Number(selectedRecordForFormula.generalWaterTax || 0) +
                                                Number(selectedRecordForFormula.specialWaterTax || 0) +
                                                Number(selectedRecordForFormula.wasteCollectionTax || 0)
                                            ).toFixed(2))}
                                        </div>
                                    </div>
                                    <div className="bg-white backdrop-blur-sm p-4 rounded-2xl border-2 border-blue-600 h-full shadow-lg scale-105">
                                        <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 leading-none">एकूण वार्षिक मागणी</div>
                                        <div className="text-2xl font-black text-blue-900 leading-none mt-2">₹{MN(Number(selectedRecordForFormula.totalTaxAmount || 0).toFixed(2))}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedRecordForFormula(null)}
                                className="px-8 py-2 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-all text-xs"
                            >
                                बंद करा (Close)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
