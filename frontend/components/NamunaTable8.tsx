import React, { useState } from 'react';
import { Eye, Edit2, Trash2, Printer } from 'lucide-react';
import { PropertyRecord } from '../types';
import OwnerNameDisplay from './OwnerNameDisplay';
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

const PAGE_SIZE = 50;

export default function NamunaTable8({
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

    const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    // Records for current page
    const pageRecords = showAll ? records : records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // ── Totals (current page only) ──────────────────────────────────────────
    const totals = pageRecords.reduce((a, r) => {
        const sectionsData = (r.sections as any[])?.filter(s => s.propertyType && s.propertyType !== 'निवडा') || [];
        
        // 1. Calculate Per-Section Taxes
        const sectionTaxes = sectionsData.map(s => {
            const dep = Number(s?.depreciationRate) || 1;
            const weight = Number(s?.weightage) || 1;
            const bVal = Math.round((Number(s?.buildingValue) || 0) * dep * weight);
            const lVal = Math.round((Number(s?.openSpaceValue) || 0) * weight);
            
            const floorFactor = 1 + ((s.floorIndex || 0) * 0.2);
            const divisor = 2705 * floorFactor;
            
            const tB = Math.round((bVal * Number(s?.buildingTaxRate || 0)) / divisor);
            const tO = Math.round((lVal * Number(s?.openSpaceTaxRate || 0)) / divisor);
            return { bVal, lVal, tB, tO };
        });

        // 2. Sum up property-level values
        const bSum = sectionTaxes.reduce((sum, d) => sum + d.bVal, 0);
        const lSum = sectionTaxes.reduce((sum, d) => sum + d.lVal, 0);
        const pTaxSum = sectionTaxes.reduce((sum, d) => sum + d.tB + d.tO, 0);

        const dTotal = pTaxSum + (Number(r.streetLightTax) || 0) +
            (Number(r.healthTax) || 0) +
            (Number(r.generalWaterTax) || 0) + (Number(r.specialWaterTax) || 0) +
            (Number(r.wasteCollectionTax) || 0);

        const isPaid = (Number(r.paidAmount) || 0) > 0;

        return {
            cap: a.cap + bSum + lSum,
            prop: a.prop + pTaxSum,
            lite: a.lite + (Number(r.streetLightTax) || 0),
            hlth: (a as any).hlth + (Number(r.healthTax) || 0),
            gwat: a.gwat + (Number(r.generalWaterTax) || 0),
            swat: a.swat + (Number(r.specialWaterTax) || 0),
            waste: a.waste + (Number(r.wasteCollectionTax) || 0),
            dtot: a.dtot + dTotal,
            rtot: a.rtot + (isPaid ? dTotal : 0),
        };
    }, { cap: 0, prop: 0, lite: 0, hlth: 0, gwat: 0, swat: 0, waste: 0, dtot: 0, rtot: 0 });

    // Global serial number offset
    const offset = showAll ? 0 : (safePage - 1) * PAGE_SIZE;

    return (
        <div className="bg-white w-full font-sans text-[11px] relative flex flex-col h-full overflow-hidden">
            {/* ── Official Header (Visible only in Print) ── */}
            <div className="hidden print:flex items-start justify-between px-6 py-4 bg-[#ecfccb] border-b-2 border-black text-black mb-4">
                <div className="flex items-center gap-4">
                    <img src="/images/logo.png" alt="Logo" className="w-20 h-20 object-contain" />
                    <div className="flex flex-col text-[10px] uppercase font-bold">
                        <p>ग्रामपंचायत: {PANCHAYAT_CONFIG.gpName}</p>
                        <p>तालुका: {PANCHAYAT_CONFIG.taluka}</p>
                        <p>जिल्हा: {PANCHAYAT_CONFIG.jilha}</p>
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-3xl font-black mb-1">नमुना ८</h1>
                    <h2 className="text-lg font-bold mb-1 underline">ग्रामपंचायत</h2>
                    <p className="text-[10px] font-normal italic">महाराष्ट्र ग्रामपंचायत कायदा नियम ३२(१)</p>
                    <p className="text-[12px] font-bold mt-2">सन २०२५-२०२६ या वर्षासाठी कर आकारणी नोंद</p>
                </div>
                <div className="text-right text-[10px] flex flex-col gap-1 font-bold">
                    <p className="text-xs uppercase">ग्रामपंचायत लेखा हरिश्चंद्र मौजा घोटाळापांजरी</p>
                    <p>तालुका : {PANCHAYAT_CONFIG.taluka}</p>
                    <p>जिल्हा : {PANCHAYAT_CONFIG.jilha}</p>
                </div>
            </div>

            {/* ── Simple UI Header (Screen Only) ── */}
            <div className="no-print bg-white border-b border-slate-200 px-4 xl:px-6 py-3 flex flex-wrap items-center justify-between gap-3 flex-none">
                <div className="flex items-center gap-4">
                    <h3 className="text-[15px] font-black text-slate-800">मालमत्ता आकारणी तपशील</h3>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${showAll
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                    >
                        {showAll ? 'पृष्ठानुसार पहा' : 'सर्व नोंदी पहा'}
                    </button>
                </div>
                <p className="text-[11px] tracking-wide text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-md">
                    एकूण <span className="text-indigo-600">{MN(records.length)}</span> नोंदी {showAll ? '(सर्व)' : `पैकी ${MN(pageRecords.length)} (पृष्ठ ${MN(safePage)})`}
                </p>
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
                        <tr className="hidden print:table-row bg-[#ecfccb] text-black text-center text-[8px] font-black">
                            <th rowSpan={2} className="border border-black p-1">अ.क्र.</th>
                            <th rowSpan={2} className="border border-black p-1">वस्ती नाव <br /> खासरा क्र.</th>
                            <th rowSpan={2} className="border border-black p-1">मालमत्ता / <br /> प्लॉट क्र.</th>
                            <th rowSpan={2} className="border border-black p-1 text-left">मालकाचे नाव <br /> भोगवटादाराचे नाव</th>
                            <th rowSpan={2} className="border border-black p-1 text-left">मालमत्तेचे वर्णन <br /> मालमत्तेचे क्षेत्रफळ</th>
                            <th rowSpan={2} className="border border-black p-1">बांधकामाचे वर्ष <br /> इमारतीचे वय</th>
                            <th colSpan={2} className="border border-black p-1">रेडी रेकनर प्रति चौ.मी.</th>
                            <th rowSpan={2} className="border border-black p-1">घसारा</th>
                            <th rowSpan={2} className="border border-black p-1 text-right">भांडवली <br /> मूल्य (रुपये)</th>
                            <th rowSpan={2} className="border border-black p-1">कराचा प्रकार <br /> (पैसे)</th>
                            <th colSpan={7} className="border border-black p-1">आकारणी केलेल्या करांची रक्कम (मागणी)</th>
                            <th colSpan={7} className="border border-black p-1">वसूल केलेल्या करांची रक्कम (वसुली)</th>
                            <th rowSpan={2} className="border border-black p-1">शेरा</th>
                        </tr>
                        <tr className="hidden print:table-row bg-[#ecfccb] text-black text-center text-[8px] font-bold">
                            <th className="border border-black p-1">जमीन</th>
                            <th className="border border-black p-1">बांधकाम</th>
                            <th className="border border-black p-1">घरपट्टी</th>
                            <th className="border border-black p-1">दिवाबत्ती</th>
                            <th className="border border-black p-1">आरोग्य</th>
                            <th className="border border-black p-1">सामान्य पाणी</th>
                            <th className="border border-black p-1">विशेष पाणी</th>
                            <th className="border border-black p-1">कचरागाडी</th>
                            <th className="border border-black p-1">एकूण</th>
                            <th className="border border-black p-1">घरपट्टी</th>
                            <th className="border border-black p-1">दिवाबत्ती</th>
                            <th className="border border-black p-1">आरोग्य</th>
                            <th className="border border-black p-1">सामान्य पाणी</th>
                            <th className="border border-black p-1">विशेष पाणी</th>
                            <th className="border border-black p-1">कचरागाडी</th>
                            <th className="border border-black p-1">एकूण</th>
                        </tr>
                        <tr className="hidden print:table-row text-center text-[7px] bg-white">
                            {Array.from({ length: 26 }).map((_, i) => (
                                <th key={i} className="border border-black p-0.5">{MN(i + 1)}</th>
                            ))}
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
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">भांडवली मूल्य</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-wider min-w-[100px]">एकूण कर</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider min-w-[120px]">शेरा</th>
                            {showActions && (
                                <th className="no-print px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider w-[120px] sticky right-0 z-30 bg-slate-50/90 backdrop-blur-sm border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                    कृती
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-primary/10">
                        {pageRecords.map((r, idx) => {
                            const activeSections = (r.sections as any[])?.filter(s => s.propertyType && s.propertyType !== 'निवडा') || [];
                            
                            // 3. Pre-calculate on-the-fly taxes for the entire record
                            const recordTaxDetails = activeSections.map(s => {
                                const dep = Number(s?.depreciationRate) || 1;
                                const weight = Number(s?.weightage) || 1;
                                const finalBVal = Math.round((Number(s?.buildingValue) || 0) * dep * weight);
                                const finalLVal = Math.round((Number(s?.openSpaceValue) || 0) * weight);
                                
                                // Unified Formula: Tax = (CV * Rate) / (2705 * FloorFactor)
                                // Floor Factor: Ground=1.0, First=1.2, Second=1.4...
                                const floorFactor = 1 + ((s.floorIndex || 0) * 0.2);
                                const divisor = 2705 * floorFactor;
                                
                                const sTaxB = Math.round((finalBVal * Number(s?.buildingTaxRate || 0)) / divisor);
                                const sTaxO = Math.round((finalLVal * Number(s?.openSpaceTaxRate || 0)) / divisor);
                                return { b: finalBVal, o: finalLVal, tb: sTaxB, to: sTaxO, rowGharpatti: sTaxB + sTaxO };
                            });

                            const buildingVal = recordTaxDetails.reduce((sum, d) => sum + d.b, 0);
                            const openSpaceVal = recordTaxDetails.reduce((sum, d) => sum + d.o, 0);
                            const cap = buildingVal + openSpaceVal;

                            const dProp = recordTaxDetails.reduce((sum, d) => sum + d.rowGharpatti, 0);
                            const dLight = Number(r.streetLightTax) || 0;
                            const dHealth = Number(r.healthTax) || 0;
                            const dGenWater = Number(r.generalWaterTax) || 0;
                            const dSpecWater = Number(r.specialWaterTax) || 0;
                            const dWaste = Number(r.wasteCollectionTax) || 0;
                            const dTotal = dProp + dLight + dHealth + dGenWater + dSpecWater + dWaste;

                            const isPaid = (Number(r.paidAmount) || 0) > 0;
                            const even = idx % 2 === 0;
                            return (
                                <tr key={r.id ?? idx} className={`hover:bg-blue-50/30 transition-colors group ${even ? 'bg-white' : 'bg-slate-50/60'}`}>
                                    {/* Official Complex Row (Print Only) ignored as per user request for frontend data screen view, but we keep it for consistency if needed */}
                                    <td className="hidden print:table-cell border border-black p-1 text-center font-bold text-[9px]">{MN(offset + idx + 1)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-[8px]">
                                        <p>{r.wastiName || '-'}</p>
                                        <p>{MN(r.khasraNo) || '-'}</p>
                                    </td>
                                    <td className="hidden print:table-cell border border-black p-1 text-center text-[8px]">
                                        <p>{r.propertyId || '-'}</p>
                                        <p>{r.plotNo || '-'}</p>
                                    </td>
                                    <td className="hidden print:table-cell border border-black p-1 text-[9px]">
                                        <div className="font-bold uppercase"><OwnerNameDisplay name={r.ownerName || '-'} /></div>
                                        <p className="text-[8px]">({r.occupantName || 'स्वतः'})</p>
                                    </td>
                                    <td className="hidden print:table-cell border border-black p-1 text-[8px]">
                                        {activeSections.map((s, sIdx) => (
                                            <div key={sIdx} className="mb-0.5">
                                                <p>{s.propertyType}</p>
                                                <p className="text-[7.5px] italic text-gray-500">{s.areaSqFt ? MN(s.areaSqFt) + ' चौ.फु.' : ''}</p>
                                            </div>
                                        ))}
                                    </td>
                                    <td className="hidden print:table-cell border border-black p-1 text-center text-[8px]">
                                        <p>{r.constructionYear || '-'}</p>
                                        <p>{(r as any).buildingAge || '-'}</p>
                                    </td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(r.readyReckonerLand || 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(r.readyReckonerComposite || 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN((r as any).depreciationAmount || 5)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right font-black text-[10px] bg-gray-50">{MN(cap)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-center text-[9px] font-bold">{activeSections[0]?.buildingTaxRate || '३२०'}</td>

                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(dProp)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(dLight)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(dHealth)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(dGenWater)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(dSpecWater)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(dWaste)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right font-black text-[9px] bg-gray-50">{MN(dTotal)}</td>

                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(isPaid ? dProp : 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(isPaid ? dLight : 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(isPaid ? dHealth : 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(isPaid ? dGenWater : 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(isPaid ? dSpecWater : 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right text-[8px]">{MN(isPaid ? dWaste : 0)}</td>
                                    <td className="hidden print:table-cell border border-black p-1 text-right font-black text-[9px] bg-gray-50">{MN(isPaid ? dTotal : 0)}</td>

                                    <td className="hidden print:table-cell border border-black p-1 text-[8px] whitespace-pre-wrap">{r.remarksNotes || '-'}</td>

                                    {/* Simplified UI Row (Screen Only) - MODERNIZED */}
                                    <td className="no-print px-3 py-2.5 text-center font-bold text-slate-400 text-[11px]">{MN(offset + idx + 1)}</td>

                                    <td className="no-print px-3 py-2.5">
                                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase leading-none">
                                            {r.wastiName || '-'}
                                        </div>
                                    </td>
                                    <td className="no-print px-3 py-2.5">
                                        <div className="text-[11px] text-indigo-700 font-black uppercase tracking-tight bg-indigo-50 px-2 py-1 rounded inline-block">{MN(r.khasraNo) || '-'}</div>
                                    </td>
                                    <td className="no-print px-3 py-2.5">
                                        <div className="text-xs font-bold text-slate-700 tracking-tight">{MN(r.plotNo) || '-'}</div>
                                    </td>
                                    <td className="no-print px-3 py-2.5">
                                        <div className="font-extrabold text-slate-800 text-[13px] tracking-tight leading-tight uppercase">
                                            <OwnerNameDisplay name={r.ownerName || ''} />
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">({r.occupantName || 'स्वतः'})</div>
                                        <div className="text-[10px] text-slate-400 mt-1 font-bold">Property ID: {r.propertyId || r.srNo}</div>
                                    </td>
                                    <td className="no-print px-3 py-2.5">
                                        {activeSections.map((s, si) => (
                                            <div key={si} className="text-[11px] font-bold text-slate-600 mb-1 border-b border-slate-100 last:border-0 pb-1">
                                                {s.propertyType}
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="no-print px-3 py-2.5 text-right font-semibold text-[11px] text-slate-600">
                                        {activeSections.map((s, si) => (
                                            <div key={si} className="mb-1 border-b border-slate-100 last:border-0 pb-1">
                                                <span className="font-bold text-slate-800">{MN(s.areaSqFt)}</span> चौ.फु.
                                            </div>
                                        )) || '-'}
                                    </td>
                                    <td className="no-print px-3 py-2.5 text-right">
                                        <div className="text-[9px] space-y-0.5 text-slate-500 font-bold uppercase tracking-tight">
                                            {dProp > 0 && <div>मालमत्ता कर: ₹{MN(dProp)}</div>}
                                            {dLight > 0 && <div>दिवा बत्ती कर: ₹{MN(dLight)}</div>}
                                            {dHealth > 0 && <div>आरोग्य कर: ₹{MN(dHealth)}</div>}
                                            {dGenWater > 0 && <div>सामान्य पाणी कर: ₹{MN(dGenWater)}</div>}
                                            {dSpecWater > 0 && <div>विशेष पाणी कर: ₹{MN(dSpecWater)}</div>}
                                            {dWaste > 0 && <div>कचरा संकलन कर: ₹{MN(dWaste)}</div>}
                                        </div>
                                    </td>
                                    <td className="no-print px-3 py-2.5 text-right font-black text-slate-700 text-[13px]">₹{cap.toLocaleString()}</td>
                                    <td className="no-print px-3 py-2.5 text-right font-black text-slate-800 text-[14px] bg-slate-50/50">₹{dTotal.toLocaleString()}</td>
                                    <td className="no-print px-3 py-2.5 text-left text-[11px] text-slate-500 font-medium max-w-[200px] leading-tight whitespace-pre-wrap">{r.remarksNotes || '-'}</td>
                                    {showActions && (
                                        <td className="no-print px-3 py-2.5 text-center sticky right-0 z-20 bg-inherit border-l border-slate-200 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center justify-center gap-1.5 group-hover:scale-105 transition-all duration-200">
                                                {onView && <button onClick={() => onView(r.id)} title="पहा" className="w-8 h-8 flex items-center justify-center text-slate-500 bg-white rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200 shadow-sm"><Eye className="w-4" /></button>}
                                                {onPrint && <button onClick={() => onPrint(r.id)} title="प्रिंट करा" className="w-8 h-8 flex items-center justify-center text-indigo-500 bg-white rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-indigo-100 shadow-sm"><Printer className="w-4" /></button>}
                                                {onEdit && <button onClick={() => onEdit(r)} title="सुधारा" className="w-8 h-8 flex items-center justify-center text-slate-500 bg-white rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200 shadow-sm"><Edit2 className="w-4" /></button>}
                                                {onDelete && <button onClick={() => onDelete(r.id)} title="हटवा" className="w-8 h-8 flex items-center justify-center text-rose-500 bg-white rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all border border-rose-100 shadow-sm"><Trash2 className="w-4" /></button>}
                                            </div>
                                        </td>
                                    )}
                                </tr>

                            );
                        })}
                    </tbody>

                    <tfoot>
                        {/* Official Footer (Print Only) */}
                        <tr className="hidden print:table-row bg-white font-black text-[9px]">
                            <td colSpan={11} className="border border-black p-1 text-right uppercase">एकूण बेरीज</td>
                            <td className="border border-black p-1 text-right">{MN(totals.prop)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.lite)}</td>
                            <td className="border border-black p-1 text-right">{MN((totals as any).hlth)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.gwat)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.swat)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.waste)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.dtot)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.prop)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.lite)}</td>
                            <td className="border border-black p-1 text-right">{MN((totals as any).hlth)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.gwat)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.swat)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.waste)}</td>
                            <td className="border border-black p-1 text-right">{MN(totals.rtot)}</td>
                            <td className="border border-black p-1"></td>
                        </tr>


                    </tfoot>
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

                <div className="mt-4 border-t border-black pt-2 text-[8px] leading-tight text-black font-normal italic">
                    <p>टिप :- * सदरील उतारा हा मालकी हक्काचा नसून कर आकारणीचा आहे. सदरील उताऱ्यावरून खरेदी-विक्रीचा व्यवहार झाल्यास त्यास ग्रामपंचायत जबाबदार राहणार नाही.</p>
                    <p className="mt-0.5">* शासन परिपत्रक क्र. VTM2603/ प्र.क्र. २०६८/पं.रा. ४ दि २० नोव्हेंबर २००३ नुसार ग्रामीण भागातील घरांची नोंदणी पती-पत्नी यांच्या संयुक्त नावे करण्याबाबत निर्देशित करण्यात आलेले आहेत </p>
                </div>
            </div>

            {/* ── Pagination Bar ── */}
            {totalPages > 1 && !showAll && (
                <div className="flex items-center justify-between px-4 xl:px-6 py-3 border-t border-slate-200 bg-slate-50/80 backdrop-blur-[2px] no-print flex-none relative z-10 w-full">
                    <div className="text-[12px] font-bold text-slate-500 tracking-wide hidden sm:block">
                        पृष्ठ <span className="text-slate-800">{safePage}</span> पैकी <span className="text-slate-800">{totalPages}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:ml-auto w-full sm:w-auto justify-center">
                        <button onClick={() => setPage(1)} disabled={safePage === 1}
                            className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm">&#171;</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm">
                            <span className="leading-none text-lg -mt-0.5">‹</span>
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
                                        }`}>{pageNum}</button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm">
                            <span className="leading-none text-lg -mt-0.5">›</span>
                        </button>
                        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                            className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm">&#187;</button>
                    </div>
                </div>
            )}
        </div>
    );
}
