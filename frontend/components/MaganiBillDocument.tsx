import React from 'react';
import { PropertyRecord } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import { calculateBill } from '../utils/billCalculations';

interface Props {
    record: PropertyRecord;
}

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

const BillContent = ({ record, copyLabel }: { record: PropertyRecord; copyLabel: string }) => {
    const calc = calculateBill(record.arrearsAmount || 0, record.totalTaxAmount || 0);
    const currYear = PANCHAYAT_CONFIG.financialYear;

    const taxMapping = [
        { name: 'मागील थकबाकी', arrears: record.arrearsAmount || 0, current: 0, field: 'arrears' },
        { name: 'घर कर', arrears: 0, current: record.propertyTax || 0, field: 'propertyTax' },
        { name: 'जमीन कर', arrears: 0, current: record.openSpaceTax || 0, field: 'openSpaceTax' },
        { name: 'दिवाबत्ती कर', arrears: 0, current: record.streetLightTax || 0, field: 'streetLightTax' },
        { name: 'आरोग्य कर', arrears: 0, current: record.healthTax || 0, field: 'healthTax' },
        { name: 'इमला कर (अतिक्रमण)', arrears: 0, current: (record as any).surchargeTotal || 0, field: 'surchargeTotal' },
        { name: 'कचरा गाडी कर', arrears: 0, current: (record as any).wasteCollectionTax || 0, field: 'wasteCollectionTax' },
        { name: 'विशेष / सामान्य पाणी कर', arrears: 0, current: (record.specialWaterTax || 0) + (record.generalWaterTax || 0), field: 'waterTax' },
        { name: 'उशिरा भराणा (५% दंड)', arrears: calc.penaltyAmount, current: 0, field: 'penalty' },
    ];

    return (
        <div className="flex-1 p-6 relative min-h-[210mm] border-r border-dashed border-slate-300 last:border-r-0 overflow-hidden">
            {/* Watermark Logo */}
            <img
                src="/images/logo.png"
                alt="Watermark"
                className="absolute  top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-55 h-55 opacity-[0.2] pointer-events-none p-10"
            />

            {/* Copy Label Badge (Integrated with border) */}
            <div className="absolute top-[13px] right-6 z-30">
                <span className="text-[10px] font-black text-white bg-black px-3 py-1 rounded-sm shadow-md border border-gray-600">
                    {copyLabel}
                </span>
            </div>

            {/* Main Outer Border */}
            <div className="border-2 border-gray-600 p-3 h-full relative z-10 flex flex-col">

                {/* Header Section */}
                <div className="relative text-center border-b-1 border-gray-600 pb-2 mb-4">
                    {/* Top Left Logo (Aligned with Header) */}
                    <img
                        src="/images/logo.png"
                        alt="Logo"
                        className="absolute top-0 left-0 w-[65px] h-[65px] object-contain"
                    />
                    <h1 className="text-xl font-black mt-1 mb-1 leading-none">कर मागणी बिल</h1>
                    <p className="text-[10px] font-bold leading-none">(नमुना नं. ९ "क")</p>
                    <p className="text-xs font-bold mt-1">कार्यालय ग्रामपंचायत {PANCHAYAT_CONFIG.gpName}</p>
                    <p className="text-[10px] font-bold">तालुका {PANCHAYAT_CONFIG.taluka} जि. {PANCHAYAT_CONFIG.jilha}</p>
                    <p className="text-[9px] mt-1">(महाराष्ट्र शासन ग्रा. पं. कायदा १९५८ कलम १२९ अन्वये)</p>
                    <p className="text-[10px]"><b>[ सन {currYear} ]</b></p>
                </div>

                {/* Owner Info Section */}
                <div className="mb-4 text-xs">
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="flex-1 border-b border-dotted border-gray-600 font-black text-sm">{record.ownerName}</span>
                    </div>

                    <table className="w-full border-collapse border border-gray-600 mb-2 text-center">
                        <tbody>
                            <tr className="text-[9px]">
                                <td className="border border-gray-600 p-1"><b>वस्ती:</b> {record.wastiName || '-'}</td>
                                <td className="border border-gray-600 p-1"><b>वार्ड क्र:</b> {MN(record.wardNo)}</td>
                                <td className="border border-gray-600 p-1"><b>खसरा क्र:</b> {MN(record.khasraNo)}</td>
                                <td className="border border-gray-600 p-1"><b>मालमत्ता क्र:</b> {MN(record.plotNo)}</td>
                                <td className="border border-gray-600 p-1"><b>मोबाईल:</b> {MN(record.contactNo || '-')}</td>
                                <td className="border border-gray-600 p-1"><b>बिल क्र:</b> {MN(record.srNo)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mb-1">
                        <p className="text-[10px]"><b>ग्रामपंचायत {PANCHAYAT_CONFIG.gpName} येथील यांचकडून कळविण्यात येते की आपणाकडील ग्रामपंचायतीची खालील दिलेल्या तपशिलाप्रमाणे कराची रक्कम येणे आहे.
                        </b></p>
                    </div>
                </div>

                {/* Main Tax Table */}
                <table className="w-full border-collapse border-2 border-gray-600 text-[10px] mb-3">
                    <thead>
                        <tr className="bg-[#7cdc39] font-bold text-white border-b-1 border-gray-600">
                            <th className="border-r border-gray-600 p-1 text-left">कराचे प्रकार</th>
                            <th className="border-r border-gray-600 p-1 text-center w-16">बाकी</th>
                            <th className="border-r border-gray-600 p-1 text-center w-16">चालू</th>
                            <th className="p-1 text-center w-14">एकुण</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taxMapping.map((tax, idx) => (
                            <tr key={idx} className="border-b border-gray-600">
                                <td className="border-r border-gray-600 p-1 font-bold">{tax.name}</td>
                                <td className="border-r border-gray-600 p-1 text-right">{tax.arrears > 0 ? MN(tax.arrears) : '०'}</td>
                                <td className="border-r border-gray-600 p-1 text-right">{tax.current > 0 ? MN(tax.current) : '०'}</td>
                                <td className="p-1 text-right font-black">{MN(Number(tax.arrears || 0) + Number(tax.current || 0))}</td>
                            </tr>
                        ))}
                        <tr className="border-t-1 border-gray-600 text-white bg-[#7cdc39] font-black">
                            <td className="border-r border-gray-600 p-1">एकूण</td>
                            <td className="border-r border-gray-600 p-1 text-right">{MN(calc.arrearsTotal)}</td>
                            <td className="border-r border-gray-600 p-1 text-right">{MN(calc.currentTaxTotal)}</td>
                            <td className="p-1 text-right text-[12px]">रु.{MN(calc.billTotal)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer Section */}
                <div className="mt-auto">
                    <p className="text-[8px] font-bold leading-tight mb-2 underline decoration-gray-400">
                        वरील बिलात नमूद केलेल्या कर देयकाच्या रकमा दि. ________ पर्यंत आत ग्रा. पं. चे कार्यालयात पटवून पावती घ्यावी. असे न केल्यास आपले वर योग्य कारवाई करण्यात येईल.
                    </p>
                    <p className="text-[9px] font-bold leading-tight mb-4 text-center">
                        येथील बिलात नमूद रकमा ग्रा. पं. कार्यालयात भरून पावती घ्यावी.
                    </p>

                    <div className="flex justify-between items-end text-[10px]">
                        <div>
                            <p className="mb-6">सही (करदाता)</p>
                            <p>दिनांक: {MN(new Date().toLocaleDateString('mr-IN'))}</p>
                        </div>
                        <div className="text-center">
                            <p className="font-black">सरपंच/सचिव</p>
                            <p className="text-[8px]">ग्रा. पं. {PANCHAYAT_CONFIG.gpName}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function MaganiBillDocument({ record }: Props) {
    return (
        <div className="bg-white text-black font-serif leading-tight print:p-0 min-h-screen" style={{ width: '290mm', margin: 'auto' }}>
            <style>{`
                @media print {
                    @page { 
                        size: A4 landscape; 
                        margin: 0mm; 
                    }
                    body { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important;
                        background: white !important;
                        width: 100% !important;
                    }
                }
            `}</style>

            <div className="flex flex-row w-full h-[210mm] overflow-hidden print-container">
                <BillContent record={record} copyLabel="कार्यालयीन प्रत" />
                <BillContent record={record} copyLabel="ग्राहक प्रत" />
            </div>

            <div className="no-print mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-bold max-w-[210mm] mx-auto text-center mb-10 shadow-sm">
                💡 लँडस्केप (Landscape) मोड मध्ये प्रिंट करा.
            </div>
        </div>
    );
}
