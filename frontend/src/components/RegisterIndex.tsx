import React from 'react';
import { PropertyRecord } from '../types';

// Marathi Number Helper
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

interface RegisterIndexProps {
    records: PropertyRecord[];
    pageSize?: number; // How many records per page in the main register
}

export default function RegisterIndex({ records, pageSize = 2 }: RegisterIndexProps) {
    const PANCHAYAT_CONFIG = {
        gpName: 'वेळा हरिश्चंद्र',
        mouza: 'गोटाळपांजरी',
        taluka: 'नागपूर',
        jilha: 'नागपूर',
    };

    return (
        <div className="register-index-root bg-white p-8 min-h-screen">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: legal landscape; margin: 1.20in 10mm 10mm 10mm; }
                    .no-print { display: none !important; }
                    body { background: white !important; }
                }
                .index-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-family: 'Inter', 'Arial', sans-serif;
                }
                .index-table th, .index-table td {
                    border: 1px solid #000;
                    padding: 4px 8px;
                    text-align: center;
                    font-size: 13px;
                    color: black;
                }
                .index-table th {
                    background-color: #f2f2f2;
                    font-weight: 900;
                    text-transform: uppercase;
                    font-size: 11px;
                }
                .index-table tr:nth-child(even) {
                    background-color: #fafafa;
                }
                .index-table td.text-left {
                    text-align: left;
                }
                .page-no-cell {
                    font-weight: 900;
                    font-size: 15px;
                    background-color: #fffbeb;
                }
            `}} />

            <div className="text-center mb-6">
                <h1 className="text-xl font-black uppercase tracking-[0.2em] border-b-4 border-black inline-block pb-1">
                    नोंदवही अनुक्रमणिका (REGISTER INDEX)
                </h1>
                <div className="flex justify-center gap-10 mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <p>ग्रामपंचायत: <span className="text-black">{PANCHAYAT_CONFIG.gpName}</span></p>
                    <p>तालुका: <span className="text-black">{PANCHAYAT_CONFIG.taluka}</span></p>
                    <p>जिल्हा: <span className="text-black">{PANCHAYAT_CONFIG.jilha}</span></p>
                </div>
            </div>

            <table className="index-table">
                <thead>
                    <tr>
                        <th className="w-[60px]">अनु क्र.</th>
                        <th className="text-left w-[350px]">घरमालकाचे नाव</th>
                        <th className="w-[250px]">भोगवटदाराचे नाव</th>
                        <th className="w-[350px]">सोसायटीचे नाव/पत्ता</th>
                        <th className="w-[120px]">खसरा नं.</th>
                        <th className="w-[120px]">मालमत्ता नं.</th>
                        <th className="w-[100px]">पान नं.</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((r, idx) => {
                        const pageNo = Math.ceil((idx + 1) / pageSize);
                        return (
                            <tr key={r.id || idx}>
                                <td>{MN(idx + 1)}</td>
                                <td className="text-left font-bold">{r.ownerName}</td>
                                <td>{r.occupantName || '-'}</td>
                                <td>{r.wastiName || '-'}</td>
                                <td>{MN(r.khasraNo)}</td>
                                <td>{MN(r.propertyId || r.plotNo)}</td>
                                <td className="page-no-cell">{MN(pageNo)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-12 flex justify-between px-10 no-print">
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">एकूण नोंदी: {MN(records.length)}</p>
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all">
                    इंडेक्स प्रिंट करा
                </button>
            </div>
        </div>
    );
}
