import React from 'react';
import { PropertyRecord } from '../types';
import { PANCHAYAT_CONFIG } from '../utils/panchayatConfig';
import { calculateBill } from '../utils/billCalculations';
import { numberToMarathiWords } from '../utils/numberToMarathiWords';

interface BillContentProps {
    record: PropertyRecord;
    copyLabel: string;
}

const MN = (v: number | string | undefined) => {
    if (v === undefined || v === null || v === '') return '०';
    return String(v).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

export const BillContent = ({ record, copyLabel }: BillContentProps) => {
    const calc = calculateBill(
        record.arrearsAmount || 0,
        record.totalTaxAmount || 0,
        null,
        record.propertyTax || 0,
        record.openSpaceTax || 0
    );
    const currYear = PANCHAYAT_CONFIG.financialYear;

    const taxMapping = [
        { name: 'घर कर', arrears: Math.round(Number(record.arrearsAmount) || 0), current: Math.round(Number(record.propertyTax) || 0), field: 'propertyTax' },
        { name: 'जमीन कर', arrears: 0, current: Math.round(Number(record.openSpaceTax) || 0), field: 'openSpaceTax' },
        { name: 'दिवाबत्ती कर', arrears: 0, current: Math.round(Number(record.streetLightTax) || 0), field: 'streetLightTax' },
        { name: 'आरोग्य कर', arrears: 0, current: Math.round(Number(record.healthTax) || 0), field: 'healthTax' },
        { name: 'इमला कर (अतिक्रमण)', arrears: 0, current: Math.round(Number((record as any).surchargeTotal) || 0), field: 'surchargeTotal' },
        { name: 'कचरा गाडी कर', arrears: 0, current: Math.round(Number((record as any).wasteCollectionTax) || 0), field: 'wasteCollectionTax' },
        { name: 'विशेष / सामान्य पाणी कर', arrears: 0, current: Math.round(Number(record.specialWaterTax) > 0 ? Number(record.specialWaterTax) : (Number(record.generalWaterTax) || 0)), field: 'waterTax' },
        { name: '५% दंड थकीत रकमेवर', arrears: Math.round(Number(calc.penaltyAmount) || 0), current: 0, field: 'penalty' },
    ];

    const currentTotal = taxMapping.reduce((acc, row) => acc + row.current, 0);
    const arrearsTotal = taxMapping.reduce((acc, row) => acc + (row.arrears || 0), 0);
    const grandTotal = currentTotal + arrearsTotal;

    // 5% discount applies ONLY on घर कर (propertyTax) + जमीन कर (openSpaceTax)
    const discountAmt = calc.discountAmount;

    return (
        <div className="flex-1 p-4 print:p-2 relative h-full font-black border-r-2 border-dashed border-gray-400 last:border-r-0 overflow-hidden bg-white text-black">
            {/* Watermark Logo */}
            <img
                src="/images/logo.png"
                alt="Watermark"
                className="absolute  bg-transparent top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-55 h-55 opacity-[0.3] pointer-events-none p-10"
            />

            {/* Copy Label Badge (Integrated with border) */}
            <div className="absolute top-[13px] right-6 z-30">
                <span className="text-[10px] font-black text-white bg-black px-3 py-1 rounded-sm shadow-md border border-gray-600">
                    {copyLabel}
                </span>
            </div>

            {/* Main Outer Border */}
            <div className="border-2 border-gray-600 p-2 h-full relative z-10 flex flex-col">

                {/* Header Section */}
                <div className="relative text-center border-b border-gray-600 pb-2 mb-4">
                    {/* Top Left Logo (Aligned with Header) */}
                    <img
                        src="/images/logo.png"
                        alt="Logo"
                        className="absolute top-0 left-0 w-[90px] h-[90px] object-contain"
                    />
                    <h1 className="text-xl font-black mt-1 mb-1 leading-none">कर मागणी बिल</h1>
                    <p className="text-[10px] font-black leading-none">(नमुना नं. ९ "क")</p>
                    <p className="text-[9px] mt-1 font-black">[ नियम ३२ (५) पहा ]</p>
                    <p className="text-xs font-black mt-1">कार्यालय  गट ग्रामपंचायत {PANCHAYAT_CONFIG.gpName}</p>
                    <p className="text-[10px] font-black">तालुका {PANCHAYAT_CONFIG.taluka} जि. {PANCHAYAT_CONFIG.jilha}</p>

                    <p className="text-[10px] font-black"><b>[ सन {currYear} ]</b></p>
                </div>

                {/* Owner Info Section */}
                <div className="mb-4 text-xs">
                    <div className="flex items-baseline gap-1">
                        <span className="flex-1  font-black text-sm">श्री/श्रीमती: &nbsp; {record.ownerName}</span>
                    </div>

                    <table className="w-full border-collapse border border-gray-600 mb-1 text-center">
                        <tbody>
                            <tr className="text-[9px] font-black">
                                <td className="border border-gray-600 p-1"><b>मौजा:</b> {record.wastiName || '-'}</td>
                                {/* <td className="border border-gray-600 p-1"><b>वार्ड क्र:</b> {MN(record.wardNo)}</td> */}
                                <td className="border border-gray-600 p-1"><b>खसरा क्र:</b> {record.khasraNo ? MN(record.khasraNo) : '-'}</td>
                                <td className="border border-gray-600 p-1 "><b>मालमत्ता क्र.:</b> {(record.propertyId || record.plotNo) ? MN(record.propertyId || record.plotNo) : '-'}</td>
                                {/* <td className="border border-gray-600 p-1"><b>मोबाईल:</b> {record.contactNo ? MN(record.contactNo) : '-'}</td> */}
                                <td className="border border-gray-600 p-1"><b>बिल क्र:</b> {MN(record.srNo)}</td>
                            </tr>
                            <tr className="text-[9px] font-black">
                                <td className="border border-gray-600 p-1 text-left" colSpan={4}>
                                    <b>लेआऊट / सोसायटीचे नाव:</b>&nbsp;{record.layoutName || '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mb-1">
                        <p className="text-[10px] font-black"><b> गट ग्रामपंचायत {PANCHAYAT_CONFIG.gpName} कडून कळविण्यात येते की आपल्या  मालमत्तेचे खालील दिलेल्या तपशिलाप्रमाणे कराची रक्कम वसुली योग्य आहे
                        </b></p>
                    </div>
                </div>

                {/* Main Tax Table */}
                <table className="w-full border-collapse border-2 border-gray-600 text-[10px] mb-3 font-black">
                    <thead>
                        <tr className="bg-[#7cdc39] print:bg-[#7cdc39] print:text-black font-black border-b border-gray-600">
                            <th className="border-r border-gray-600 p-1 text-left">कराचे प्रकार</th>
                            <th className="border-r border-gray-600 p-1 text-center w-16"> मागील </th>
                            <th className="border-r border-gray-600 p-1 text-center w-16">चालू</th>
                            <th className="p-1 text-center w-14">एकुण</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taxMapping.map((tax, idx) => (
                            <tr key={idx} className="border-b border-gray-600 font-black">
                                <td className="border-r border-gray-600 p-1 font-black">{tax.name}</td>
                                <td className="border-r border-gray-600 p-1 text-right">{tax.arrears > 0 ? MN(tax.arrears) : '०'}</td>
                                <td className="border-r border-gray-600 p-1 text-right">{tax.current > 0 ? MN(tax.current) : '०'}</td>
                                <td className="p-1 text-right font-black">{MN(Number(tax.arrears || 0) + Number(tax.current || 0))}</td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="border-b border-gray-600 font-black">
                            <td className="border-r border-gray-600 p-1">एकूण</td>
                            <td className="border-r border-gray-600 p-1 text-right">{MN(arrearsTotal)}</td>
                            <td className="border-r border-gray-600 p-1 text-right">{MN(currentTotal)}</td>
                            <td className="p-1 text-right text-[12px]">{MN(grandTotal)}</td>
                        </tr>
                        {/* 5% Discount Row */}
                        <tr className="border-b border-gray-600 text-gray-800 font-black">
                            <td className="border-r border-gray-600 p-1 font-black text-[9px]">५% सूट (घर कर / जमीन कर - सप्टेंबर पर्यंत)</td>
                            <td className="border-r border-gray-600 p-1 text-right text-slate-400">-</td>
                            <td className="border-r border-gray-600 p-1 text-right text-green-700 font-black">({MN(discountAmt)})</td>
                            <td className="p-1 text-right font-black text-green-700">-{MN(discountAmt)}</td>
                        </tr>
                        {/* Net Payable Row */}
                        <tr className="border-b border-gray-600 bg-[#7cdc39] print:bg-[#7cdc39] print:text-black text-black font-black">
                            <td className="border-r border-gray-600 p-1">एकूण</td>
                            <td className="border-r border-gray-600 p-1 text-right">{MN(arrearsTotal)}</td>
                            <td className="border-r border-gray-600 p-1 text-right">{MN(currentTotal - discountAmt)}</td>
                            <td className="p-1 text-right text-[12px] font-black">{MN(grandTotal - discountAmt)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer Section */}
                <div className="mt-auto ">
                    <p className="text-[10px] font-black leading-tight mb-2">
                        अक्षरी - <span className="underline text-[12px]">{numberToMarathiWords(Math.round(grandTotal - discountAmt))} रु.</span> फक्त.
                    </p>

                    <div className="flex justify-between items-end gap-2">
                        {/* Left Side: Notes & Date */}
                        <div className="w-[70%] ">
                            <div className="">
                                <div className="flex text-[9px] font-black leading-tight">
                                    <span className="shrink-0 font-black">•</span>
                                    <p>सदर मागणी बिल मिळाल्यापासून १५ दिवसांच्या आत ग्रा.पं कार्यालयात कर भरणा करून कर पावती घ्यावी .</p>
                                </div>
                                <div className="flex text-[9px] font-black leading-tight">
                                    <span className="shrink-0 font-black">•</span>
                                    <p>त्याच प्रमाणे सदर कर भरणा न केल्यास महाराष्ट्र ग्रामपंचायत अधिनियम १९५९ च्या कलम १२९ (२) अन्वये पुढील कायदेशीर कार्यवाही करण्यात येईल, याची नोंद घ्यावी.</p>
                                </div>
                            </div>
                            <p className="text-[10px] font-black mt-2">
                                दिनांक: {record.paymentDate ? MN(record.paymentDate) : ''}
                            </p>
                            <div className="items-center">
                                {copyLabel === 'कार्यालयीन प्रत' ? (
                                    <>
                                        <div className="w-24 h-10 mb-1"></div>
                                        <div className="border-t border-black w-[25%] pt-1">
                                            <p className="font-black text-[9px] leading-tight">सही (मालमत्ता धारक)</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-10"></div>
                                )}
                            </div>
                        </div>
                        {/* Right Side: Official Signature */}
                        <div className="w-[30%] text-center flex flex-col items-center">
                            <div className="border-t border-black w-full pt-10">
                                <p className="font-black text-[10px] leading-tight">सरपंच / ग्रांमपंचायत अधिकारी</p>
                                <p className="text-[9px] font-black mt-0.5 text-gray-800">गट ग्रा. पं. {PANCHAYAT_CONFIG.gpName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface Props {
    record?: PropertyRecord;
    records?: PropertyRecord[];
    onClose?: () => void;
}

export default function MaganiBillDocument({ record, records, onClose }: Props) {
    const allRecords = records || (record ? [record] : []);

    React.useEffect(() => {
        if (allRecords.length > 0) {
            const r = allRecords[0];
            const w = r.wastiName || '';
            const l = r.layoutName || '';
            const k = r.khasraNo || '';
            let t = `मागणी_बिल_${w}`;
            if (l) t += `_${l}`;
            if (k) t += `_खसरा_${k}`;
            if (allRecords.length > 1) t += `_बल्क`;

            const oldTitle = document.title;
            document.title = t.replace(/\s+/g, '_');
            return () => { document.title = oldTitle; };
        }
    }, [allRecords]);

    if (allRecords.length === 0) return null;

    // Filter out records with no balance if in bulk mode
    const pendingRecords = records
        ? allRecords.filter(r => {
            const arrears = Number(r.arrearsAmount) || 0;
            const current = Number(r.totalTaxAmount) || 0;
            const paid = Number(r.paidAmount) || 0;
            const discount = Number(r.discountAmount) || 0;
            return (arrears + current) - paid - discount > 0;
        })
        : allRecords;

    if (pendingRecords.length === 0 && records) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-xl font-black text-gray-800">सर्व मागणी भरली आहे!</h2>
                <p className="text-gray-500 font-bold mt-2">निवडलेल्या फिल्टरमध्ये कोणतीही थकबाकी नाही.</p>
            </div>
        );
    }

    if (pendingRecords.length === 1 && !records) {
        const r = pendingRecords[0];
        const arrears = Number(r.arrearsAmount) || 0;
        const current = Number(r.totalTaxAmount) || 0;
        const paid = Number(r.paidAmount) || 0;
        const discount = Number(r.discountAmount) || 0;
        const balance = (arrears + current) - paid - discount;

        if (balance <= 0) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 font-sans p-4">
                    <div className="bg-white rounded-[32px] p-10 text-center shadow-xl border border-emerald-100 max-w-md w-full animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">एकूण बाकी निरंक!</h2>
                        <p className="text-gray-500 text-[15px] font-bold leading-relaxed mb-8">
                            या मालमत्तेसाठी <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">(मालमत्ता क्र. {MN(r.propertyId || r.plotNo || r.srNo)})</span> कोणतीही कर मागणी बाकी नाही. संपूर्ण कर भरणा झाला आहे.
                        </p>
                        <button
                            onClick={() => onClose ? onClose() : window.history.back()}
                            className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20 active:scale-95"
                        >
                            विंडो बंद करा
                        </button>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="bg-white min-h-screen w-full flex flex-col items-center  print:p-0 overflow-auto font-black" >
            <style>{`
              
                @media print {
                    @page { 
                        size: A4 landscape; 
                        margin: 0 !important; 
                        background: white !important; 

                    }
                    body, html { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        width: 297mm !important;
                        height: 210mm !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .print-container { 
                        display: flex !important;
                        flex-direction: row !important;
                        width: 297mm !important;
                        height: 209mm !important;
                        padding-left: 0.70in !important;
                        padding-right: 0.20in !important;
                        padding-top: 0.20in !important;
                        padding-bottom: 0.20in !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        position: relative !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .print-container:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                }
            `}</style>

            <div className="flex flex-col w-full max-w-[297mm] print:max-w-none">
                {pendingRecords.map((r, idx) => (
                    <div key={r.id || idx} className="flex flex-row w-full bg-white  print:shadow-none min-h-[189mm] overflow-hidden print-container mb-8 print:mb-0">
                        <BillContent record={r} copyLabel="कार्यालयीन प्रत" />
                        <BillContent record={r} copyLabel="लाभार्थी प्रत" />
                    </div>
                ))}
            </div>
        </div>
    );
}
