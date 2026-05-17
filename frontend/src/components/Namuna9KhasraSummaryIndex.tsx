import React from 'react';

// Marathi Number Helper (MN)
const MN = (v: number | string | undefined) => {
    if (v === undefined || v === null || v === '') return '०';
    return String(v).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

interface Namuna9KhasraSummaryIndexProps {
    records: any[];
    panchayatConfig: {
        mouza: string;
    };
    fyStart: number;
    fyEnd: number;
    wastiName?: string;
}

export default function Namuna9KhasraSummaryIndex({
    records,
    panchayatConfig,
    fyStart,
    fyEnd,
    wastiName
}: Namuna9KhasraSummaryIndexProps) {
    const effectivePageSize = 3;

    // 1. Group records by Khasra
    const groupedByKhasra: Record<string, any[]> = {};
    const sortedRecords = [...records].sort((a, b) => {
        const kA = String(a.khasraNo || '');
        const kB = String(b.khasraNo || '');
        const kComp = kA.localeCompare(kB, undefined, { numeric: true, sensitivity: 'base' });
        if (kComp !== 0) return kComp;
        const pA = String(a.plotNo || '');
        const pB = String(b.plotNo || '');
        return pA.localeCompare(pB, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedRecords.forEach(r => {
        const k = r.khasraNo || 'इतर';
        if (!groupedByKhasra[k]) groupedByKhasra[k] = [];
        groupedByKhasra[k].push(r);
    });

    const khasraSummary: any[] = [];
    let currentPageCount = 0;

    const uniqueKhasras = Array.from(new Set(sortedRecords.map(r => r.khasraNo || 'इतर')));
    uniqueKhasras.forEach((k, idx) => {
        const items = groupedByKhasra[k];
        const pagesUsed = Math.ceil(items.length / effectivePageSize);
        const startPage = currentPageCount + 1;
        const endPage = currentPageCount + pagesUsed;

        khasraSummary.push({
            srNo: idx + 1,
            khasra: k,
            count: items.length,
            pagesUsed: pagesUsed,
            startPage: startPage,
            endPage: endPage
        });
        currentPageCount += pagesUsed;
    });

    return (
        <div className="namuna9-summary-root bg-white min-h-screen p-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: legal landscape;
                        margin: 1.1in 0.40in 0.25in 0.40in;
                    }
                    body, html {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    .summary-page-container {
                        page-break-after: always !important;
                        break-after: page !important;
                        width: 100% !important;
                        background: white !important;
                    }
                }
                .summary-table th { background: #f3f4f6; font-weight: 800; font-size: 16px; padding: 10px !important; border: 1px solid #000 !important; }
                .summary-table td { font-weight: 700; font-size: 16px; padding: 10px !important; border: 1px solid #000 !important; }
                .summary-table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            `}} />

            <div className="summary-page-container p-8 bg-white relative">
                <div className="text-center mb-8">
                    <h1 className="text-[32px] font-black uppercase tracking-tighter">
                        मौजा {wastiName || panchayatConfig.mouza} - खसरा / लेआउट अनुक्रमणिका
                    </h1>
                    <p className="text-[16px] font-bold text-gray-600 mt-2">
                        सन {MN(fyStart)}-{MN(fyEnd % 100)} नमुना ९ - मालमत्ता कर नोंदवही (एकूण खसरा: {MN(khasraSummary.length)})
                    </p>
                </div>

                <table className="summary-table shadow-sm">
                    <thead>
                        <tr>
                            <th className="w-[80px]">अ.क्र.</th>
                            <th className="text-left px-4">खसरा क्र. / लेआउटचे नाव</th>
                            <th className="w-[180px]">एकूण मालमत्ता (Users)</th>
                            <th className="w-[150px]">एकूण पाने (Pages Used)</th>
                            <th className="w-[180px]">नोंदवही पान क्र. (Page No Range)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {khasraSummary.map((s, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="text-center font-bold">{MN(s.srNo)}</td>
                                <td className="text-left px-4 font-black text-[18px]">{s.khasra}</td>
                                <td className="text-center font-bold text-indigo-600">{MN(s.count)}</td>
                                <td className="text-center font-black">{MN(s.pagesUsed)}</td>
                                <td className="text-center font-black bg-gray-50">
                                    {MN(s.startPage)} {s.startPage !== s.endPage ? ` ते ${MN(s.endPage)}` : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-12 flex justify-between px-4 opacity-50">
                    <div className="text-xs font-bold uppercase">ग्रामपंचायत {panchayatConfig.mouza}</div>
                    <div className="text-xs font-bold uppercase underline">लिपिक/संगणक परिचालक स्वाक्षरी</div>
                </div>
            </div>
        </div>
    );
}
