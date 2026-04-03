import React from 'react';
import { PropertyRecord, PropertySection, FLOOR_NAMES } from '../types';
import { Calculator, Printer, X, FileText, TrendingUp, Info } from 'lucide-react';

interface CalculationGuideProps {
    property: PropertyRecord;
    onClose: () => void;
}

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

export default function CalculationGuide({ property, onClose }: CalculationGuideProps) {
    const sections = property.sections.filter(s => s.propertyType && s.propertyType !== 'निवडा');

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                {/* Header */}
                <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 text-white">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">गणना सूत्र मार्गदर्शक</h2>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Calculation Proof & Formula Guide</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-50 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                        >
                            <Printer className="w-4 h-4" /> पीडीएफ प्रिंट
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all active:scale-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 print:bg-white print:p-0 print:overflow-visible">
                    <div className="max-w-3xl mx-auto space-y-8 print:max-w-none">
                        
                        {/* Property Header Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:mb-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">मालकाचे नाव</p>
                                <p className="text-sm font-black text-slate-800">{property.ownerName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">वस्ती / वॉर्ड</p>
                                <p className="text-sm font-black text-slate-800">{property.wastiName} (वॉर्ड {MN(property.wardNo)})</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">प्लॉट / खसरा</p>
                                <p className="text-sm font-black text-slate-800">{property.plotNo} / {property.khasraNo}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">एकूण चालू कर</p>
                                <p className="text-lg font-black text-indigo-600">₹ {MN(property.totalTaxAmount)}</p>
                            </div>
                        </div>

                        {/* Calculations Breakdown */}
                        <div className="space-y-6">
                            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest">
                                <TrendingUp className="w-4 h-4 text-indigo-500" /> कर गणना सूत्र (Step-by-Step Calculation)
                            </h3>

                            {sections.map((s, idx) => {
                                const isRCC = s.propertyType === 'आर.सी.सी';
                                const isKhaliJaga = s.propertyType === 'खाली जागा';
                                const areaMt = Number(s.areaSqMt || 0);
                                const rate = isKhaliJaga ? Number(s.landRate || 0) : Number(s.buildingRate || 0);
                                const taxRate = isKhaliJaga ? Number(s.openSpaceTaxRate || 0) : Number(s.buildingTaxRate || 0);
                                const capitalValue = isKhaliJaga ? Number(s.openSpaceValue || 0) : Number(s.buildingValue || 0);
                                const finalTax = isKhaliJaga ? Number(s.openSpaceFinalValue || 0) : Number(s.buildingFinalValue || 0);

                                return (
                                    <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-300">
                                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase">
                                                {FLOOR_NAMES[s.floorIndex]} - {s.propertyType}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">नोंद #{MN(idx + 1)}</span>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            {/* Formula Step 1: Area */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0 mt-1">१</div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-600 mb-1">क्षेत्रफळ रूपांतरण (Area Conversion):</p>
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block font-mono text-xs">
                                                        {MN(s.lengthFt)} फूट (L) × {MN(s.widthFt)} फूट (W) = <span className="font-black">{MN(s.areaSqFt)} चौ. फूट</span>
                                                        <br />
                                                        <span className="text-slate-400 text-[10px]">{MN(s.areaSqFt)} ÷ १०.७६३९ (रूपांतरण घटक) = </span>
                                                        <span className="font-black text-indigo-600">{MN(areaMt)} चौ. मीटर</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Formula Step 2: Value */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0 mt-1">२</div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-600 mb-1">भांडवली मूल्य (Capital Value):</p>
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block font-mono text-xs">
                                                        {MN(areaMt)} चौ. मी. × ₹{MN(rate)} (रेडी रेकनर दर) = 
                                                        <span className="font-black text-indigo-600 ml-2">₹ {MN(capitalValue)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">
                                                        * {isKhaliJaga ? "खाली जागेचा" : "बांधकामाचा"} दर सरकारी रेडी रेकनर पत्रकानुसार ({property.wastiName})
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Formula Step 3: Tax */}
                                            <div className="flex items-start gap-4 border-t border-slate-100 pt-4">
                                                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-1 shadow-sm shadow-indigo-200">३</div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-600 mb-1">मजल्याचा वार्षिक कर (Annual Tax):</p>
                                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 inline-block font-mono text-xs">
                                                        (₹{MN(capitalValue)} × {MN(taxRate)}%) ÷ १,००० = 
                                                        <span className="font-black text-indigo-700 ml-2">₹ {MN(finalTax)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Other Tax Heads Summary */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm print:border-slate-300">
                             <div className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest mb-6">
                                <FileText className="w-4 h-4 text-indigo-500" /> इतर कर आकारणी (Other Tax Components)
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-xs font-bold text-slate-500 italic">मालमत्ता कर (एकूण मजले)</span>
                                    <span className="text-xs font-black text-slate-700">₹ {MN(property.propertyTax)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-xs font-bold text-slate-500 italic">खाली जागा कर</span>
                                    <span className="text-xs font-black text-slate-700">₹ {MN(property.openSpaceTax)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-xs font-bold text-slate-500 italic">आरोग्य कर</span>
                                    <span className="text-xs font-black text-slate-700">₹ {MN(property.healthTax)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-xs font-bold text-slate-500 italic">दिवाबत्ती कर</span>
                                    <span className="text-xs font-black text-slate-700">₹ {MN(property.streetLightTax)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-xs font-bold text-slate-500 italic">इतर पाणीपट्टी</span>
                                    <span className="text-xs font-black text-slate-700">₹ {MN(property.generalWaterTax)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-2">
                                    <span className="text-xs font-bold text-slate-500 italic">विशेष पाणीपट्टी</span>
                                    <span className="text-xs font-black text-slate-700">₹ {MN(property.specialWaterTax)}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 flex items-center justify-between">
                                <div>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none">एकूण आकारलेला कर</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">* वरील सर्व घटकांची बेरीज</p>
                                </div>
                                <div className="text-3xl font-black text-indigo-600 bg-indigo-50 px-6 py-3 rounded-2xl shadow-inner">
                                    ₹ {MN(property.totalTaxAmount)}
                                </div>
                            </div>
                        </div>

                        {/* Footer / Notes */}
                        <div className="text-[10px] text-slate-400 font-bold bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-2 italic">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                            <p>हा अहवाल ग्रामपंचायत 'ग्रामसाथी' संगणक प्रणालीद्वारे तयार करण्यात आला आहे. कर आकारणी महाराष्ट्र ग्रामपंचायत अधिनियम १९५८ अंतर्गत ठरवण्यात आलेल्या नियमांनुसार आहे. काही तांत्रिक त्रुटी आढळल्यास ग्रामपंचायत कार्यालयाशी संपर्क साधावा.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Only Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 15mm; }
                    body { font-family: sans-serif; }
                    .no-print { display: none !ve; }
                    .print-visible { display: block; }
                }
            ` }} />
        </div>
    );
}
