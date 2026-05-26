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

    // Chunk records: 8 records per page for Legal Landscape
    const RECORDS_PER_PAGE = 8;
    const recordChunks = [];
    for (let i = 0; i < records.length; i += RECORDS_PER_PAGE) {
        recordChunks.push(records.slice(i, i + RECORDS_PER_PAGE));
    }

    return (
        <div className="bg-white min-h-screen p-0 no-print-bg font-sans">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                @media print {
                    @page {
                        size: legal landscape;
                        margin: 0.25in;
                    }
                    body, html {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        width: 100%;
                        font-family: 'Inter', sans-serif;
                    }
                    * {
                        scrollbar-width: none !important;
                    }
                    ::-webkit-scrollbar {
                        display: none !important;
                    }
                    .page-container {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 10px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: 95vh !important;
                        height: 95vh !important;
                        position: relative !important;
                        overflow: hidden !important;
                        border: 3px double #800000 !important;
                        box-sizing: border-box !important;
                    }
                    .page-container:not(:last-child) {
                        page-break-after: always;
                        break-after: page;
                    }
                    .flower-corner { display: block !important; }
                    .no-print { display: none !important; }
                    table { font-size: 8px !important; }
                    thead th { font-size: 8px !important; }
                    tbody td { font-size: 8px !important; }
                }
                .no-print-bg { background: none !important; }
                .page-container {
                    /* Legal landscape printable area with 0.5in margins:
                       14in - 1in = 13in = 330.2mm wide
                       8.5in - 1in = 7.5in = 190.5mm tall */
                    width: 330.2mm;
                    min-height: 190.5mm;
                    margin: 0 auto;
                    padding: 10px;
                    border: 3px double #800000;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    font-family: 'Inter', sans-serif;
                    background: white;
                    box-sizing: border-box;
                }
                .flower-corner {
                    position: absolute;
                    width: 48px;
                    height: 48px;
                    opacity: 0.75;
                    z-index: 2;
                    pointer-events: none;
                }
                .flower-corner.tl { top: 4px; left: 4px; }
                .flower-corner.tr { top: 4px; right: 4px; transform: scaleX(-1); }
                .flower-corner.bl { bottom: 4px; left: 4px; transform: scaleY(-1); }
                .flower-corner.br { bottom: 4px; right: 4px; transform: scale(-1,-1); }
                table, th, td {
                    border: 1px solid #800000 !important;
                    border-collapse: collapse;
                }
                thead th, tbody td:not(.p-0), tbody td.p-0 > div {
                    padding-top: 5px !important;
                    padding-bottom: 5px !important;
                }
                thead th {
                    border: 1px solid #800000 !important;
                }
            `}} />

            {recordChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="page-container relative overflow-visible mt-4 mb-4 print:mt-0 print:mb-0">
                    {/* Decorative flower corners */}
                    <svg className="flower-corner tl" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="5" fill="#4a0000" opacity="0.85" />
                        <circle cx="20" cy="6" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="6" cy="20" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="14" cy="14" r="6" fill="#4a0000" opacity="0.95" />
                        <circle cx="28" cy="10" r="3" fill="#4a0000" opacity="0.65" />
                        <circle cx="10" cy="28" r="3" fill="#4a0000" opacity="0.65" />
                        <path d="M4 4 Q14 2 24 8 Q12 10 4 4Z" fill="#4a0000" opacity="0.7" />
                        <path d="M4 4 Q2 14 8 24 Q10 12 4 4Z" fill="#4a0000" opacity="0.7" />
                        <circle cx="4" cy="4" r="2.5" fill="#4a0000" opacity="1" />
                        <path d="M0 0 L36 0 L36 3 Q18 3 3 18 L0 18 Z" fill="#4a0000" opacity="0.35" />
                        <path d="M0 0 L0 36 L3 36 Q3 18 18 3 L18 0 Z" fill="#4a0000" opacity="0.35" />
                    </svg>
                    <svg className="flower-corner tr" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="5" fill="#4a0000" opacity="0.85" />
                        <circle cx="20" cy="6" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="6" cy="20" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="14" cy="14" r="6" fill="#4a0000" opacity="0.95" />
                        <circle cx="28" cy="10" r="3" fill="#4a0000" opacity="0.65" />
                        <circle cx="10" cy="28" r="3" fill="#4a0000" opacity="0.65" />
                        <path d="M4 4 Q14 2 24 8 Q12 10 4 4Z" fill="#4a0000" opacity="0.7" />
                        <path d="M4 4 Q2 14 8 24 Q10 12 4 4Z" fill="#4a0000" opacity="0.7" />
                        <circle cx="4" cy="4" r="2.5" fill="#4a0000" opacity="1" />
                        <path d="M0 0 L36 0 L36 3 Q18 3 3 18 L0 18 Z" fill="#4a0000" opacity="0.35" />
                        <path d="M0 0 L0 36 L3 36 Q3 18 18 3 L18 0 Z" fill="#4a0000" opacity="0.35" />
                    </svg>
                    <svg className="flower-corner bl" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="5" fill="#4a0000" opacity="0.85" />
                        <circle cx="20" cy="6" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="6" cy="20" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="14" cy="14" r="6" fill="#4a0000" opacity="0.95" />
                        <circle cx="28" cy="10" r="3" fill="#4a0000" opacity="0.65" />
                        <circle cx="10" cy="28" r="3" fill="#4a0000" opacity="0.65" />
                        <path d="M4 4 Q14 2 24 8 Q12 10 4 4Z" fill="#4a0000" opacity="0.7" />
                        <path d="M4 4 Q2 14 8 24 Q10 12 4 4Z" fill="#4a0000" opacity="0.7" />
                        <circle cx="4" cy="4" r="2.5" fill="#4a0000" opacity="1" />
                        <path d="M0 0 L36 0 L36 3 Q18 3 3 18 L0 18 Z" fill="#4a0000" opacity="0.35" />
                        <path d="M0 0 L0 36 L3 36 Q3 18 18 3 L18 0 Z" fill="#4a0000" opacity="0.35" />
                    </svg>
                    <svg className="flower-corner br" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="5" fill="#4a0000" opacity="0.85" />
                        <circle cx="20" cy="6" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="6" cy="20" r="4" fill="#4a0000" opacity="0.75" />
                        <circle cx="14" cy="14" r="6" fill="#4a0000" opacity="0.95" />
                        <circle cx="28" cy="10" r="3" fill="#4a0000" opacity="0.65" />
                        <circle cx="10" cy="28" r="3" fill="#4a0000" opacity="0.65" />
                        <path d="M4 4 Q14 2 24 8 Q12 10 4 4Z" fill="#4a0000" opacity="0.7" />
                        <path d="M4 4 Q2 14 8 24 Q10 12 4 4Z" fill="#4a0000" opacity="0.7" />
                        <circle cx="4" cy="4" r="2.5" fill="#4a0000" opacity="1" />
                        <path d="M0 0 L36 0 L36 3 Q18 3 3 18 L0 18 Z" fill="#4a0000" opacity="0.35" />
                        <path d="M0 0 L0 36 L3 36 Q3 18 18 3 L18 0 Z" fill="#4a0000" opacity="0.35" />
                    </svg>
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1, opacity: 0.3 }}>
                        <img src="/images/logo.jpeg" onError={(e: any) => { e.target.src = '/images/logo.png'; }} className="w-[450px] h-[450px] object-contain" alt="Watermark" />
                    </div>

                    <div className="relative w-full flex flex-col justify-start items-center" style={{ zIndex: 2 }}>
                        <div className="w-full flex-1 flex flex-col">
                            {/* Header Section */}
                            <div className="relative mb-3 mt-8 w-full flex justify-between items-start px-2">
                                {/* Left: Logo */}
                                <div className="flex-shrink-0">
                                    <img src="/images/logo.jpeg" onError={(e: any) => { e.target.src = '/images/logo.png'; }} alt="GP Logo" className="w-[130px] h-[130px] object-contain" />
                                </div>

                                {/* Center: Titles */}
                                <div className="flex-1 flex flex-col items-center text-center -mt-2">
                                    <h2 className="text-[32px] font-black tracking-tight leading-none text-[#800000] mb-3">
                                        गट ग्रामपंचायत वेळा हरिश्चंद्र
                                    </h2>
                                    <div className="flex items-center justify-center mb-1">
                                        <span className="text-[20px] font-black px-8 py-1 rounded-full text-white bg-[#800000] shadow-sm tracking-wide">नमुना ८</span>
                                    </div>
                                    <p className="text-[12px] font-bold text-[#800000] italic mb-3 tracking-widest">नियम ३२ (१) पहा</p>
                                    <div className="border border-[#800000] rounded-full px-6 py-1">
                                        <h1 className="text-[14px] font-bold text-black tracking-wide">
                                            सन २०{MN(fyStart % 100)} - २०{MN(fyEnd % 100)} या वर्षाची कर आकारणी नोंदवही
                                        </h1>
                                    </div>
                                </div>

                                {/* Right: Location Details */}
                                <div className="flex-shrink-0 text-left space-y-1 p-3 rounded-xl border border-[#800000] min-w-[200px] bg-white">
                                    <p className="text-[12px] font-bold flex justify-between gap-4">
                                        <span className="text-gray-700">मौजा:</span>
                                        <span className="text-black font-black">{chunk[0]?.wastiName || PANCHAYAT_CONFIG.mouza || 'वेळा'}</span>
                                    </p>
                                    <p className="text-[12px] font-bold flex justify-between gap-4">
                                        <span className="text-gray-700">तालुका:</span>
                                        <span className="text-black font-black">{PANCHAYAT_CONFIG.taluka || 'नागपूर'}</span>
                                    </p>
                                    <p className="text-[12px] font-bold flex justify-between gap-4">
                                        <span className="text-gray-700">जिल्हा:</span>
                                        <span className="text-black font-black">{PANCHAYAT_CONFIG.jilha || 'नागपूर'}</span>
                                    </p>
                                    <p className="text-[12px] font-bold flex justify-between gap-4 mt-2">
                                        <span className="text-gray-700">पान नं:</span>
                                        <span className="text-black border-b border-gray-400 w-16 inline-block h-4"></span>
                                    </p>
                                </div>
                            </div>

                            {/* Main Table */}
                            <table className="w-full text-[9px] border-collapse leading-tight mb-2" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '22px' }} />{/* अ.क्र. */}
                                    <col style={{ width: '60px' }} />{/* वस्ती/खसरा */}
                                    <col style={{ width: '42px' }} />{/* प्लॉट */}
                                    <col style={{ width: '110px' }} />{/* मालकाचे नाव */}
                                    <col style={{ width: '40px' }} />{/* एकूण क्षेत्रफळ */}
                                    <col style={{ width: '55px' }} />{/* मालमत्ता प्रकार */}
                                    <col style={{ width: '45px' }} />{/* क्षेत्रफळ */}
                                    <col style={{ width: '45px' }} />{/* बांधकाम वर्ष */}
                                    <col style={{ width: '35px' }} />{/* जमीन दर */}
                                    <col style={{ width: '35px' }} />{/* बांधकाम दर */}
                                    <col style={{ width: '35px' }} />{/* भारांक/घसारा */}
                                    <col style={{ width: '52px' }} />{/* भांडवली मूल्य */}
                                    <col style={{ width: '35px' }} />{/* कराचा दर */}
                                    <col style={{ width: '40px' }} />{/* मालमत्ता कर */}
                                    <col style={{ width: '35px' }} />{/* दिवाबत्ती */}
                                    <col style={{ width: '35px' }} />{/* आरोग्य */}
                                    <col style={{ width: '35px' }} />{/* सामान्य पाणी */}
                                    <col style={{ width: '35px' }} />{/* विशेष पाणी */}
                                    <col style={{ width: '35px' }} />{/* कचरागाडी */}
                                    <col style={{ width: '30px' }} />{/* एकूण */}
                                    <col style={{ width: '50px' }} />{/* शेरा */}
                                </colgroup>
                                <thead>
                                    <tr className="text-[#800000] bg-gray-100 text-center font-bold">
                                        <th rowSpan={2} className="p-1 w-[25px]">अ.क्र.</th>
                                        <th rowSpan={2} className="p-0 w-[70px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">वस्तीचे नाव </div>
                                            <div className="p-1 text-[#800000]">खसरा क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 w-[50px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">मालमत्ता क्र</div>
                                            <div className="p-1 text-[#800000]">प्लॉट क्र.</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 w-[140px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">मालकाचे नाव</div>
                                            <div className="border-b border-red-900 p-1 text-[#800000]">भोगवटादाराचे नाव</div>
                                            <div className="p-1 text-[#800000]">संपर्क क्र:</div>
                                        </th>
                                        <th rowSpan={2} className="p-1 w-[40px] text-[#800000]">
                                            एकूण<br />क्षेत्रफळ
                                        </th>
                                        <th rowSpan={2} className="p-1 w-[70px] text-[#800000]">
                                            मालमत्ता प्रकार
                                        </th>
                                        <th rowSpan={2} className="p-0 w-[50px]">
                                            <div className="p-1 text-[#800000]">क्षेत्रफळ</div>
                                            <div className="p-1 text-[#800000]">(चौ.फुट /<br />चौ.मी)</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 w-[50px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">बांधकाम वर्ष</div>
                                            <div className="p-1 text-[#800000]">वय</div>
                                        </th>
                                        <th colSpan={2} className="p-1 text-[#800000]">वार्षिक मूल्य दर</th>
                                        <th rowSpan={2} className="p-0 w-[40px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">भारांक</div>
                                            <div className="p-1 text-[#800000]">घसारा</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 w-[60px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">भांडवली मूल्य</div>
                                            <div className="p-1 text-[#800000]">(रु.)</div>
                                        </th>
                                        <th rowSpan={2} className="p-0 w-[40px]">
                                            <div className="border-b border-red-900 p-1 text-[#800000]">कराचा दर</div>
                                            <div className="p-1 text-[#800000]">(पैसे)</div>
                                        </th>
                                        <th colSpan={7} className="p-1 text-[#800000]">आकारणी केलेल्या करांची रक्कम (रु.)</th>
                                        <th rowSpan={2} className="p-1 w-[50px] text-[#800000]">शेरा</th>
                                    </tr>
                                    <tr className="text-[#800000] bg-gray-100 text-center font-bold text-[8px]">
                                        <th className="p-1 w-[40px]">जमीन</th>
                                        <th className="p-1 w-[40px]">बांधकाम</th>
                                        <th className="p-1 w-[40px]">मालमत्ता<br />कर</th>
                                        <th className="p-1 w-[40px]">दिवाबत्ती<br />कर</th>
                                        <th className="p-1 w-[40px]">आरोग्य<br />कर</th>
                                        <th className="p-1 w-[40px]">सामान्य पाणी<br />कर</th>
                                        <th className="p-1 w-[40px]">विशेष पाणी<br />कर</th>
                                        <th className="p-1 w-[40px]">कचरागाडी<br />कर</th>
                                        <th className="p-1 w-[50px]">एकूण</th>
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
                                        const totalAreaSqMt = Number(r.totalAreaSqMt) > 0 ? Number(r.totalAreaSqMt) : activeSections.reduce((sum: number, s: any) => sum + (Number(s?.areaSqMt) || 0), 0);
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
                                                        <tr key={sIdx} style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}>
                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle text-[#800000]">{MN(srNo)}</td>
                                                                    <td rowSpan={rowCount} className="p-0 text-center align-middle">
                                                                        <div className="p-1 font-bold border-b border-red-900 text-black">{r.wastiName || '-'}</div>
                                                                        <div className="p-1 font-black text-[#800000]">{r.khasraNo || '-'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle text-black">
                                                                        {r.propertyId || r.plotNo || '-'}
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-0 align-middle">
                                                                        <div className="p-1 font-black border-b border-red-900 text-black flex items-center justify-between">
                                                                            <OwnerNameDisplay name={r.ownerName || '-'} />
                                                                        </div>
                                                                        <div className="p-1 text-[9px] text-black border-b border-red-900">भोगवटादार: {r.occupantName || 'स्वतः'}</div>
                                                                        <div className="p-1 text-[9px] text-black">संपर्क क्र: {r.contactNo ? MN(r.contactNo) : '-'}</div>
                                                                    </td>
                                                                    <td rowSpan={rowCount} className="p-0 text-center align-middle">
                                                                        <div className="p-1 border-b border-red-900 font-black text-black">
                                                                            {MN(r.totalAreaSqFt || totalArea)} <span className="text-[7.5px] font-bold">चौ.फूट</span>
                                                                        </div>
                                                                        <div className="p-1 font-black text-[#800000] text-[8.5px]">
                                                                            {MN(r.totalAreaSqMt || totalAreaSqMt)} <span className="text-[7.5px] font-bold">चौ.मी</span>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="p-1 text-center font-black text-[#800000]">
                                                                <div>{s?.propertyType || '-'}</div>
                                                                {s?.propertyType === 'आर.सी.सी' && activeSections.length > 1 && (
                                                                    <div className="text-[8px] font-black">({FLOOR_NAMES[s.floorIndex]})</div>
                                                                )}
                                                            </td>
                                                            <td className="p-0 text-center">
                                                                <div className="p-1 border-b border-red-900 font-black text-black">{s ? MN(s.areaSqFt || 0) : '-'}</div>
                                                                <div className="p-1  font-black text-[8.5px]">{s ? MN(s.areaSqMt || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-0 text-center">
                                                                <div className="p-1 font-black border-b border-red-900 text-black">
                                                                    {s?.propertyType === 'आर.सी.सी' ? (s?.constructionYear || r.constructionYear ? MN(s?.constructionYear || r.constructionYear) : '-') : '-'}
                                                                </div>
                                                                <div className="p-1 font-bold text-[#800000]">
                                                                    {s?.propertyType === 'आर.सी.सी' ? `(${MN(s?.propertyAge || r.propertyAge || 0)} वर्षे)` : ''}
                                                                </div>
                                                            </td>
                                                            <td className="p-1 text-right font-bold text-black">
                                                                {s && s.propertyType === 'खाली जागा' ? MN(s.landRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-1 text-right font-bold text-black">
                                                                {s && s.propertyType !== 'खाली जागा' ? MN(s.buildingRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-0 text-center font-black">
                                                                <div className="p-1 border-b border-red-900 text-black">{s ? MN(details?.weightage || 0) : '-'}</div>
                                                                <div className="p-1 text-[#800000]">{s ? MN(details?.depreciationRate || 0) : '-'}</div>
                                                            </td>
                                                            <td className="p-1 text-right font-black text-[#800000]">
                                                                {s ? MN((finalBVal + finalLVal).toFixed(0)) : '-'}
                                                            </td>
                                                            <td className="p-1 text-center font-black text-[#800000]">
                                                                {s ? MN(s.buildingTaxRate || s.openSpaceTaxRate || 0) : '-'}
                                                            </td>
                                                            <td className="p-0 text-right align-middle font-bold text-black">
                                                                <div className="p-1 flex flex-col gap-1">
                                                                    {s ? (
                                                                        (details?.sTaxB || 0) > 0 && (details?.sTaxO || 0) > 0 ? (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <div className="flex justify-between items-center text-[#800000]">
                                                                                    <span className="text-[7px] italic">इमारत:</span>
                                                                                    <span>{MN(details.sTaxB.toFixed(0))}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-blue-700">
                                                                                    <span className="text-[7px] italic">जागा:</span>
                                                                                    <span>{MN(details.sTaxO.toFixed(0))}</span>
                                                                                </div>
                                                                                <div className="mt-1 pt-1 border-t border-red-900 text-center font-black text-[#800000]">
                                                                                    {MN((details.sTaxB + details.sTaxO).toFixed(0))}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center text-black">
                                                                                {MN(((details?.sTaxB || 0) + (details?.sTaxO || 0)).toFixed(0))}
                                                                            </div>
                                                                        )
                                                                    ) : '-'}
                                                                </div>
                                                            </td>

                                                            {sIdx === 0 && (
                                                                <>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle font-bold text-black">{MN((Number(r.streetLightTax) || 0).toFixed(0))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle font-bold text-black">{MN((Number(r.healthTax) || 0).toFixed(0))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle font-bold text-black">{MN((Number(r.generalWaterTax) || 0).toFixed(0))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle font-bold text-black">{MN((Number(r.specialWaterTax) || 0).toFixed(0))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-center align-middle font-bold text-black">{MN((Number(r.wasteCollectionTax) || 0).toFixed(0))}</td>

                                                                    <td rowSpan={rowCount} className="p-1 text-center font-black align-middle text-black">{MN(recordTotalTax.toFixed(0))}</td>
                                                                    <td rowSpan={rowCount} className="p-1 text-[9px] align-middle whitespace-pre-wrap font-bold text-gray-700">{(r.remarksNotes || '-').replace(/फेरफार क्र:/g, 'फेरफार बुक क्र:') || '-'}</td>
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
                                    <tr className="font-black text-[9px]  text-[#800000]">
                                        {/* Spans: Sr(1)+Wasti(1)+Plot(1)+Owner(1)+Area(1)+Type(1)+SqFt(1)+Year(1)+LandRate(1)+BuildRate(1)+Weightage(1)+Capital(1)+TaxRate(1) = 13 */}
                                        <td colSpan={13} className="p-2 text-right font-black text-[#800000] tracking-wide">एकूण रक्कम :</td>
                                        {/* मालमत्ता कर total */}
                                        <td className="p-1 text-center font-black text-[#800000]">
                                            {MN(chunk.reduce((sum: number, r: any) => {
                                                const active = (r.sections || []).filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');
                                                return sum + active.reduce((sSum: number, s: any) => {
                                                    const area = Number(s?.areaSqMt || 0);
                                                    const bRes = calculateTax({ areaSqMt: area, rate: Number(s?.buildingRate || 0), taxRate: Number(s?.buildingTaxRate || 0), weightage: Number(s?.weightage || 1), valueMultiplier: Number(s?.depreciationRate || 1) });
                                                    const lRes = calculateTax({ areaSqMt: area, rate: Number(s?.landRate || 0), taxRate: Number(s?.openSpaceTaxRate || 0), weightage: 1.0, valueMultiplier: 1.0 });
                                                    return sSum + bRes.finalTax + lRes.finalTax;
                                                }, 0);
                                            }, 0).toFixed(0))}
                                        </td>
                                        {/* दिवाबत्ती कर */}
                                        <td className="p-1 text-center text-[#800000]">{MN(chunk.reduce((s: number, r: any) => s + (Number(r.streetLightTax) || 0), 0).toFixed(0))}</td>
                                        {/* आरोग्य कर */}
                                        <td className="p-1 text-center text-[#800000]">{MN(chunk.reduce((s: number, r: any) => s + (Number(r.healthTax) || 0), 0).toFixed(0))}</td>
                                        {/* सामान्य पाणी कर */}
                                        <td className="p-1 text-center text-[#800000]">{MN(chunk.reduce((s: number, r: any) => s + (Number(r.generalWaterTax) || 0), 0).toFixed(0))}</td>
                                        {/* विशेष पाणी कर */}
                                        <td className="p-1 text-center text-[#800000]">{MN(chunk.reduce((s: number, r: any) => s + (Number(r.specialWaterTax) || 0), 0).toFixed(0))}</td>
                                        {/* कचरागाडी कर */}
                                        <td className="p-1 text-center text-[#800000]">{MN(chunk.reduce((s: number, r: any) => s + (Number(r.wasteCollectionTax) || 0), 0).toFixed(0))}</td>
                                        {/* एकूण grand total */}
                                        <td className="p-2 text-center text-white bg-[#800000] font-black text-[12px]">
                                            {MN(chunk.reduce((sum: number, r: any) => {
                                                const active = (r.sections || []).filter((s: any) => s.propertyType && s.propertyType !== 'निवडा');
                                                const rGhar = active.reduce((sSum: number, s: any) => {
                                                    const area = Number(s?.areaSqMt || 0);
                                                    const bRes = calculateTax({ areaSqMt: area, rate: Number(s?.buildingRate || 0), taxRate: Number(s?.buildingTaxRate || 0), weightage: Number(s?.weightage || 1), valueMultiplier: Number(s?.depreciationRate || 1) });
                                                    const lRes = calculateTax({ areaSqMt: area, rate: Number(s?.landRate || 0), taxRate: Number(s?.openSpaceTaxRate || 0), weightage: 1.0, valueMultiplier: 1.0 });
                                                    return sSum + bRes.finalTax + lRes.finalTax;
                                                }, 0);
                                                return sum + rGhar + (Number(r.streetLightTax) || 0) + (Number(r.healthTax) || 0) + (Number(r.wasteCollectionTax) || 0) + (Number(r.generalWaterTax) || 0) + (Number(r.specialWaterTax) || 0);
                                            }, 0).toFixed(0))}
                                        </td>
                                        <td className="p-1 text-center font-black text-[#800000] text-[9px]">प्रमाणित</td>
                                    </tr>




                                </tfoot>
                            </table>
                            <center>
                                <p className="  Center text-red-900 p-1 mt-1  w-fit rounded-sm font-bold text-[11px] whitespace-nowrap  ">
                                    नक्कल दिल्याची दिनांक : {MN(currentDate.toLocaleDateString('en-GB'))}</p>
                            </center>
                            {/* Footer Signatures and Notes */}
                            <div className="mt-28 flex w-full gap-5 items-end">
                                <div className="w-[60%] border border-[#800000] rounded-xl p-3 bg-white">
                                    <p className="text-[#800000] font-bold text-[10px]  mb-1">
                                        टीप (१): सदरचा उतारा हा मालकी हक्काचा नसून कर आकारणीचा आहे. सदरच्या उताऱ्यावरून खरेदी-विक्रीचा व्यवहार झाल्यास त्यास ग्रामपंचायत जबाबदार राहणार नाही.
                                    </p>
                                    <p className="text-[#800000] font-bold text-[10px]">
                                        टीप (२): शासन परिपत्रक क्र. VTM2603/ प्र.क्र. २०६८/ पं.रा. ४ दि २० नोव्हेंबर २००३ नुसार ग्रामीण भागातील घरांची नोंदणी पती-पत्नी यांच्या संयुक्त नावे करण्याबाबत निर्देशित करण्यात आलेले आहेत.
                                    </p>
                                </div>
                                <div className="w-[40%] flex justify-between gap-9 px-2 pb-1">
                                    <div className="flex-1  pt-1 text-[#800000] font-black text-[13px] text-center">लिपिक</div>
                                    <div className="flex-1  pt-1 text-[#800000] font-black text-[13px] text-center">ग्राम पंचायत अधिकारी</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
