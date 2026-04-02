import React from 'react';
import { PropertyRecord } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import { calculateBill } from '../utils/billCalculations';

interface Props {
    record: PropertyRecord;
}

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

export default function MaganiBillDocument({ record }: Props) {
    const calc = calculateBill(record.arrearsAmount || 0, record.totalTaxAmount || 0);
    const currYear = PANCHAYAT_CONFIG.financialYear;
    const prevYear = PANCHAYAT_CONFIG.financialYearEn.split('-').map(y => Number(y) - 1).join('-');

    return (
        <div className="bg-white text-black p-8 font-serif leading-tight print:p-0 relative" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
            {/* Watermark Logo */}
            <img
                src="/images/logo.png"
                alt="Watermark"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-[0.05] pointer-events-none"
            />

            {/* Main Outer Border (Optional for fidelity, standard in many bills) */}
            <div className="border-2 border-black p-4 h-full relative z-10">

                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
                    <div className="text-sm font-bold">
                        {/* Book No Removed */}
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold leading-none">(नमुना नं. ९ "क")</p>
                        <h1 className="text-2xl font-black mt-1 mb-1 leading-none">कराच्या मागणीचे बिल</h1>
                        <p className="text-sm font-bold">कार्यालय ग्रामपंचायत {PANCHAYAT_CONFIG.gpName} मौजा {record.wastiName || ''}</p>
                        <p className="text-xs font-bold">पंचायत समिती {PANCHAYAT_CONFIG.taluka} जि. {PANCHAYAT_CONFIG.jilha}</p>
                        <p className="text-[10px] mt-1">(मुंबई ग्रा. पं. कायदा १९५८ कलम १२९ अन्वये)</p>
                    </div>
                    <div className="text-sm font-bold text-right">
                        {/* Bill No Removed */}
                    </div>
                </div>

                {/* Owner Info Section */}
                <div className="mb-4 text-sm">
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-bold">श्री</span>
                        <span className="flex-1 border-b border-dotted border-black font-black text-base">{record.ownerName}</span>
                    </div>
                    <p className="font-bold italic text-xs mb-3">यांचेकडुन</p>

                    <table className="w-full border-collapse border border-black mb-3">
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 w-1/4"><b>वार्ड नं. -</b> {MN(record.wardNo)}</td>
                                <td className="border border-black p-2 w-1/4"><b>घर नं. -</b> {MN(record.srNo)}</td>
                                <td className="border border-black p-2 w-1/4"><b>प्लॉट नं. -</b> {MN(record.plotNo)}</td>
                                <td className="border border-black p-2 w-1/4"><b>खसरा नं. -</b> {MN(record.khasraNo)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mb-2">
                        <p><b>सोसायटीचे नाव -</b> <span className="border-b border-dotted border-black min-w-[150px] inline-block">{record.layoutName || '-'}</span> याबद्दल</p>
                    </div>
                    <div>
                        <p><b>सन {currYear} करीता पुढे नमूद केलेल्या रकमा</b></p>
                    </div>
                </div>

                {/* Main Tax Table */}
                <table className="w-full border-collapse border-t-2 border-x-2 border-black text-sm">
                    <thead>
                        <tr className="bg-[#ecfccb] font-bold border-b-2 border-black">
                            <th className="border-r border-black p-2 text-center align-middle" rowSpan={2}>कराची नावे</th>
                            <th className="border-b border-black p-1 text-center" colSpan={3}>वसूल करावयाच्या रकमा</th>
                        </tr>
                        <tr className="bg-[#ecfccb] font-bold border-b-2 border-black text-[11px]">
                            <th className="border-r border-black p-1 text-center w-32">सन २०२४-२५<br />मागील बाकी रुपये</th>
                            <th className="border-r border-black p-1 text-center w-32">सन {currYear}<br />चालू कर रुपये</th>
                            <th className="p-1 text-center w-32">एकुण रुपये</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { name: 'घरपट्टी', arrears: 0, current: record.propertyTax, field: 'propertyTax' },
                            { name: 'घरपट्टी (जागा)', arrears: 0, current: record.openSpaceTax, field: 'openSpaceTax' },
                            { name: 'दिवाबत्ती कर', arrears: 0, current: record.streetLightTax, field: 'streetLightTax' },
                            { name: 'आरोग्य कर', arrears: 0, current: record.healthTax, field: 'healthTax' },
                            { name: 'कचरा गाडी कर', arrears: 0, current: record.wasteCollectionTax, field: 'wasteCollectionTax' },
                            { name: 'सामान्य पाणी कर', arrears: 0, current: record.generalWaterTax, field: 'genWater' },
                            { name: 'विशेष पाणी कर', arrears: 0, current: record.specialWaterTax, field: 'specWater' },
                        ].map((tax, idx) => (
                            <tr key={idx} className="border-b border-black">
                                <td className="border-r border-black p-1.5 font-bold px-4">{tax.name}</td>
                                <td className="border-r border-black p-1.5 text-right font-medium px-4">{tax.arrears > 0 ? MN(tax.arrears) : '०'}</td>
                                <td className="border-r border-black p-1.5 text-right font-medium px-4">{tax.current > 0 ? MN(tax.current) : '०'}</td>
                                <td className="p-1.5 text-right font-black px-4">{MN(tax.arrears + tax.current)}</td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="border-t-2 border-black bg-[#ecfccb] font-black">
                            <td className="border-r border-black p-2 px-4 uppercase tracking-tighter">एकूण</td>
                            <td className="border-r border-black p-2 text-right px-4 underline decoration-double">{MN(calc.arrearsTotal)}</td>
                            <td className="border-r border-black p-2 text-right px-4 underline decoration-double">{MN(calc.currentTaxTotal)}</td>
                            <td className="p-2 text-right px-4 underline decoration-double text-lg">रु. {MN(calc.billTotal)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer Notes Section */}
                <div className="mt-4 text-xs font-bold leading-relaxed">
                    <p className="mb-2 underline decoration-gray-400">वरील बिलात नमूद केलेल्या कर देयकाच्या रकमा दि. <span className="inline-block border-b border-black min-w-[120px]"></span> पर्यंत आत ग्रा. पं. चे कार्यालयात पटवून पावती घ्यावी. असे न केल्यास आपले वर योग्य कारवाई करण्यात येईल.</p>

                    <div className="flex justify-between items-end mt-12">
                        <div className="w-1/2">
                            <p className="mb-8">मागणी बिल मिळाल्याबाबत स्वाक्षरी</p>
                            <p>दिनांक : <span className="inline-block border-b border-black min-w-[120px] font-black">{MN(new Date().toLocaleDateString('mr-IN'))}</span></p>
                        </div>
                        <div className="text-center">
                            <div className="mb-14 h-12 w-32 border-2 border-gray-100 border-dashed rounded flex items-center justify-center text-[8px] text-gray-300 uppercase">सही व शिक्का</div>
                            <p className="font-black text-sm">सरपंच/सचिव</p>
                            <p>ग्रामपंचायत {PANCHAYAT_CONFIG.gpName}</p>
                            <p>पं. स. {PANCHAYAT_CONFIG.taluka}</p>
                        </div>
                    </div>
                </div>

                {/* Discount Tip Box */}
                <div className="mt-8 border-2 border-black p-2 bg-[#ecfccb]">
                    <p className="text-[11px] font-black text-center italic">
                        टिप: महाराष्ट्र ग्रामपंचायत कर व फी (सुधारणा) व नियम २०१५ नुसार ३० सप्टेंबर पर्यंत कर भरल्यास ५% सुट देण्यात येईल.
                    </p>
                </div>

            </div>

            {/* Visual Instruction (Hidden on Print) */}
            <div className="no-print mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-bold mb-10">
                💡 ही मूळ प्रत (Official Record) आहे. प्रिंटसाठी वर दिलेले 'प्रिंट' बटण वापरा.
            </div>
        </div>
    );
}
