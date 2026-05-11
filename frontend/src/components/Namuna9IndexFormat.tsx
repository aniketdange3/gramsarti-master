import React from 'react';

// Marathi Number Helper (MN)
const MN = (v: number | string | undefined) => {
    if (v === undefined || v === null || v === '') return '०';
    return String(v).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

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
    // Current User Logic for Mauje fetching
    const currentUser = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('gp_user') || '{}');
        } catch (e) {
            return {};
        }
    }, []);

    const displayMauje = React.useMemo(() => {
        // 1. Current selected wasti (if not "सर्व")
        if (wastiName && wastiName !== 'सर्व' && wastiName !== 'All') {
            return wastiName;
        }
        // 2. User's assigned wasti (if available)
        if (currentUser.wasti && currentUser.wasti !== 'सर्व') {
            return currentUser.wasti;
        }
        // 3. Fallback to panchayatConfig.mouza
        return panchayatConfig.mouza || 'वेळाहरी';
    }, [wastiName, currentUser, panchayatConfig]);

    // Index Density: 15 left, 15 right (30 total per page)
    const rowsPerColumn = 15;
    const indexPageSize = rowsPerColumn * 2;
    const registerPageSize = 3; // properties per register page

    // Sort records by khasraNo and then plotNo naturally
    const sortedRecords = [...records].sort((a, b) => {
        const kA = String(a.khasraNo || '');
        const kB = String(b.khasraNo || '');
        const kComp = kA.localeCompare(kB, undefined, { numeric: true, sensitivity: 'base' });
        if (kComp !== 0) return kComp;
        const pA = String(a.plotNo || '');
        const pB = String(b.plotNo || '');
        return pA.localeCompare(pB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const indexChunks = [];
    if (sortedRecords && sortedRecords.length > 0) {
        for (let i = 0; i < sortedRecords.length; i += indexPageSize) {
            indexChunks.push(sortedRecords.slice(i, i + indexPageSize));
        }
    } else {
        // If no records, show at least one empty page
        indexChunks.push([]);
    }

    return (
        <div className="namuna9-index-root bg-white p-0" style={{ fontFamily: "'Kokila', 'Mangal', serif" }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @font-face {
                    font-family: 'Kokila';
                    src: local('Kokila');
                }
                @media print {
                    @page {
                        size: legal landscape;
                        margin: 1.30in 0.3in 0.3in 0.3in;
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
                        position: relative;
                        width: 100% !important;
                        height: 6.8in !important;
                        background: white !important;
                    }
                }
                .text-Marathi {
                    font-family: 'Poppins', 'Inter', 'Noto Sans Devanagari', sans-serif !important;
                }
                .index-table {
                    border: 1px solid #000 !important;
                    table-layout: fixed;
                    width: 100%;
                }
                .index-table th {
                    background-color: #ffffff;
                    color: #000;
                    height: 42px;
                    font-weight: 600;
                    font-size: 16px;
                    padding: 1px;
                }
                .index-table td {
                    border: 1px solid #000 !important;
                    height: 35px;
                    font-size: 16px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-weight: 600;
                    color: #000;
                    max-width: 0; /* Critical for text-overflow in fixed tables */
                }
                .col-sr { width: 35px; }
                .col-plot { width: 85px; }
                .col-khasra { width: 100px; }
                .col-page { width: 50px; }
            `}} />

            {indexChunks.map((chunk, chunkIdx) => {
                const leftCol = chunk.slice(0, rowsPerColumn);
                const rightCol = chunk.slice(rowsPerColumn, indexPageSize);

                return (
                    <div key={chunkIdx} className="page-container p-2 text-Marathi relative">
                        {/* High Fidelity Watermark Logo */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.15] z-0">
                            <img src="/images/logo.jpeg" className="w-[550px] h-[550px] object-contain" alt="Watermark" />
                        </div>

                        <div className="relative z-10">
                            <div className="text-center mb-4">
                                <h1 className="text-[28px] font-black text-black tracking-tight">
                                    सन {MN(fyStart)}-{MN(fyEnd % 100)} मौजा {displayMauje} नमुना ९ अनुक्रमणिका
                                </h1>
                            </div>

                            <div className="flex gap-2 justify-between">
                                {[leftCol, rightCol].map((column, colIdx) => (
                                    <div key={colIdx} className="w-[49%] overflow-hidden">
                                        <table className="index-table ">
                                            <thead>
                                                <tr>
                                                    <th className="col-sr">अ.क्र.</th>
                                                    <th className="text-left">मालमत्ताधारकाचे नाव</th>
                                                    <th className="col-plot">प्लॉट क्र/<br />मालमत्ता क्र.</th>
                                                    <th className="col-khasra">खसरा क्र.</th>
                                                    <th className="col-page">पान क्र.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.from({ length: rowsPerColumn }).map((_, rIdx) => {
                                                    const r = column[rIdx];
                                                    const globalIdx = (chunkIdx * indexPageSize) + (colIdx * rowsPerColumn) + rIdx;
                                                    const regPageNum = Math.floor(globalIdx / registerPageSize) + 1;

                                                    if (!r) {
                                                        return (
                                                            <tr key={`empty-${rIdx}`}>
                                                                <td className="text-center">&nbsp;</td>
                                                                <td>&nbsp;</td>
                                                                <td className="text-center">&nbsp;</td>
                                                                <td className="text-center">&nbsp;</td>
                                                                <td className="text-center">&nbsp;</td>
                                                            </tr>
                                                        );
                                                    }

                                                    return (
                                                        <tr key={r.id || globalIdx}>
                                                            <td className="text-center">{MN(globalIdx + 1)}</td>
                                                            <td className="text-left font-bold uppercase truncate">
                                                                <span style={{ fontSize: '15px' }}>
                                                                    {(() => {
                                                                        const parts = r.ownerName?.split(' ') || [];
                                                                        if (parts.length > 7) {
                                                                            return parts.slice(0, 7).join(' ') + '...';
                                                                        }
                                                                        return r.ownerName;
                                                                    })()}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">{r.propertyId || (r.plotNo ? MN(r.plotNo) : '-')}</td>
                                                            <td className="text-center">{r.khasraNo ? r.khasraNo.split(',').map(k => MN(k.trim())).join(', ') : '-'}</td>
                                                            <td className="text-center">{MN(regPageNum)}</td>
                                                        </tr>
                                                    );
                                                })}
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
