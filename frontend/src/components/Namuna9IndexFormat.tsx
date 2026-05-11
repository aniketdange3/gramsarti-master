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
    panchayatConfig,
    fyStart,
    fyEnd,
    wastiName
}: Namuna9IndexFormatProps) {
    // Index page logic (Register Index / अनुक्रमणिका)
    const indexPageSize = 30; // 30 records per page (15 on left, 15 on right) to match the image density
    const registerPageSize = 3; // properties per register page

    const indexChunks = [];
    for (let i = 0; i < records.length; i += indexPageSize) {
        indexChunks.push(records.slice(i, i + indexPageSize));
    }

    return (
        <div className="namuna9-index-root bg-white p-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                           size: legal landscape;
                        margin: 1.3in 0.40in 0.25in 0.40in;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    .page-container {
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                    }
                }
                .text-Marathi {
                    font-family: 'Poppins', 'Inter', 'Noto Sans Devanagari', sans-serif !important;
                }
                .index-table th {
                    background-color: #f8fafc;
                    color: #0f172a;
                    border: 1.5px solid #0f172a !important;
                }
                .index-table td {
                    border: 1.2px solid #0f172a !important;
                }
            `}} />

            {indexChunks.map((chunk, chunkIdx) => {
                const leftCol = chunk.slice(0, 15);
                const rightCol = chunk.slice(15, 30);
                const currentWasti = wastiName || panchayatConfig.mouza || '';

                return (
                    <div key={chunkIdx} className="page-container p-5 min-h-screen text-Marathi relative overflow-hidden">
                        {/* Watermark Logo */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.1] z-0">
                            <img src="/images/logo.png" className="w-[500px] h-[500px] object-contain" alt="Watermark" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex flex-col items-center mb-2">
                                <div className="text-center">
                                    <h1 className="text-3xl font-black  pb-2 text-slate-900">
                                        सन {MN(fyStart)}-{MN(fyEnd % 100)} मौजा {currentWasti} नमुना ९ अनुक्रमणिका
                                    </h1>
                                </div>
                            </div>

                            <div className="flex gap-6 justify-center">
                                {[leftCol, rightCol].map((column, colIdx) => (
                                    <div key={colIdx} className="w-[48%]">
                                        <table className="index-table w-full border-collapse bg-white/90 ">
                                            <thead>
                                                <tr className="font-black">
                                                    <th className="p-2 w-[55px] text-[14px]">अ.क्र.</th>
                                                    <th className="p-2 text-left text-[14px] text-left">मालमत्ताधारकाचे नाव</th>
                                                    <th className="p-2 w-[130px] text-[14px]">प्लॉट/मालमत्ता क्र.</th>
                                                    <th className="p-2 w-[110px] text-[14px]">खासरा क्र.</th>
                                                    <th className="p-2 w-[70px] text-[14px]">पान क्र.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {column.map((r, rIdx) => {
                                                    const globalIdx = (chunkIdx * indexPageSize) + (colIdx * 15) + rIdx;
                                                    const regPageNum = Math.floor(globalIdx / registerPageSize) + 1;
                                                    return (
                                                        <tr key={r.id || globalIdx} className="h-[38px] hover:bg-slate-50 transition-colors">
                                                            <td className="p-1 text-center font-bold text-[14px] text-slate-400">{MN(globalIdx + 1)}</td>
                                                            <td className="p-1 px-3 font-black uppercase tracking-tight text-left text-[14px] text-slate-900 truncate max-w-[320px]">{r.ownerName}</td>
                                                            <td className="p-1 text-center font-bold text-[14px] text-slate-700">{r.propertyId || (r.plotNo ? MN(r.plotNo) : '-')}</td>
                                                            <td className="p-1 text-center font-bold text-[14px] text-slate-700">{r.khasraNo ? r.khasraNo.split(',').map(k => MN(k.trim())).join(', ') : '-'}</td>
                                                            <td className="p-1 text-center font-black text-[14px] text-indigo-700">{MN(regPageNum)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {column.length < 15 && Array.from({ length: 15 - column.length }).map((_, i) => (
                                                    <tr key={`empty-${i}`} className="h-[38px]">
                                                        <td className="p-1">&nbsp;</td>
                                                        <td className="p-1">&nbsp;</td>
                                                        <td className="p-1">&nbsp;</td>
                                                        <td className="p-1">&nbsp;</td>
                                                        <td className="p-1">&nbsp;</td>
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
