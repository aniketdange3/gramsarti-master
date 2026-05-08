import React from 'react';

// Marathi Number Helper (MN)
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

interface Namuna9IndexFormatProps {
    records: any[];
    effectivePageSize: number;
    panchayatConfig: {
        gpName: string;
        taluka: string;
        jilha: string;
        mouza?: string;
    };
    fyStart: number;
    fyEnd: number;
    wastiName?: string;
}

export default function Namuna9IndexFormat({
    records,
    effectivePageSize,
    panchayatConfig,
    fyStart,
    fyEnd,
    wastiName
}: Namuna9IndexFormatProps) {
    // Index page logic (Register Index / अनुक्रमणिका)
    const indexPageSize = 30; // 30 records per page (15 on left, 15 on right)
    const indexChunks = [];
    for (let i = 0; i < records.length; i += indexPageSize) {
        indexChunks.push(records.slice(i, i + indexPageSize));
    }

    return (
        <div className="w-full bg-white no-print-bg">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: legal landscape;
                        margin: 1.3in 0.25in 0.25in 0.25in;
                    }
                    body, html {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        background: white !important;
                    }
                    .page-container {
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        background: white !important;
                    }
                }
            `}} />
            {indexChunks.map((idxChunk, idxPageIdx) => {
                const midPoint = 15; // 15 items per side
                const leftColumn = idxChunk.slice(0, midPoint);
                const rightColumn = idxChunk.slice(midPoint);

                const currentWasti = wastiName || records[0]?.wastiName || panchayatConfig.mouza || '';

                return (
                    <div key={`index-${idxPageIdx}`} className="page-container relative overflow-visible print:shadow-none bg-white p-2 mb-8 print:mb-0" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.15]">
                            <img src="/images/logo.jpeg" className="w-[500px] h-[500px] object-contain" alt="Watermark" />
                        </div>

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="text-center mb-4 border-b-2 border-slate-900 pb-2">
                                <h1 className="text-4xl font-black">सन २०२६-२७ मौजा {currentWasti} नमुना ९ अनुक्रमाणिक  </h1>

                            </div>

                            {/* Two Column Layout */}
                            <div className="flex gap-2 justify-center">
                                {[leftColumn, rightColumn].map((column, colIdx) => (
                                    <div key={colIdx} className="w-[49%]">
                                        <table className="w-full border-collapse border-2 border-slate-900">
                                            <thead>
                                                <tr className="bg-slate-50 font-black border-b-2 border-slate-900 ">
                                                    <th className="border border-slate-900 p-1 w-[30px] text-[42px]">अ.क्र.</th>
                                                    <th className="border border-slate-900 p-1 text-left text-[42px]">मालमत्ताधारकाचे नाव</th>
                                                    <th className="border border-slate-900 p-1 w-[60px] text-[42px]">प्लॉट/मालमत्ता क्र.</th>
                                                    <th className="border border-slate-900 p-1 w-[60px] text-[42px]">खासरा क्र.</th>
                                                    <th className="border border-slate-900 p-1 w-[60px] text-[42px]">पान क्र.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {column.map((r, rIdx) => {
                                                    const globalIdx = idxPageIdx * indexPageSize + (colIdx * midPoint) + rIdx;
                                                    const recordPageNo = Math.floor(globalIdx / effectivePageSize) + 1;
                                                    return (
                                                        <tr key={r.id || rIdx} >
                                                            <td className="border border-slate-400 p-1 text-center font-bold text-[58px]">{MN(globalIdx + 1)}</td>
                                                            <td className="border border-slate-400 p-1 px-2 font-bold text-left uppercase text-[68px] break-words leading-none">{r.ownerName}</td>
                                                            <td className="border border-slate-400 p-2 text-center font-bold text-[48px]">
                                                                {r.propertyId ? MN(r.propertyId) : ''}
                                                                {r.propertyId && r.plotNo ? '/' : ''}
                                                                {r.plotNo ? MN(r.plotNo) : ''}
                                                            </td>
                                                            <td className="border border-slate-400 p-2 text-center font-bold text-[48px] break-all">{r.khasraNo ? MN(r.khasraNo) : '-'}</td>
                                                            <td className="border border-slate-400 p-1 text-center font-bold text-[58px]">{MN(recordPageNo)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* Fill empty rows to maintain exactly 15 rows per column */}
                                                {column.length < 15 && Array.from({ length: 15 - column.length }).map((_, i) => (
                                                    <tr key={`empty-${i}`} className="h-auto">
                                                        <td className="border border-slate-100 p-1 text-[58px]">&nbsp;</td>
                                                        <td className="border border-slate-100 p-1 text-[68px]">&nbsp;</td>
                                                        <td className="border border-slate-100 p-1 text-[48px]">&nbsp;</td>
                                                        <td className="border border-slate-100 p-1 text-[48px]">&nbsp;</td>
                                                        <td className="border border-slate-100 p-1 text-[58px]">&nbsp;</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

