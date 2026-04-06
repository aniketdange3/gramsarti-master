import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, FileSpreadsheet, CheckCircle2, Download } from 'lucide-react';
import { PropertyRecord, DEFAULT_SECTION } from '../types';
import { EXCEL_HEADERS } from '../constants';
import { API_BASE_URL } from '../config';

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

interface ExcelActionsProps {
    records: PropertyRecord[];
    onImportSuccess: () => void;
    type: 'namuna8' | 'namuna9';
}

export default function ExcelActions({ records, onImportSuccess, type }: ExcelActionsProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [importPreviewData, setImportPreviewData] = useState<PropertyRecord[] | null>(null);

    const API_URL = `${API_BASE_URL}/api/properties`;

    const exportToExcel = () => {
        const data = records.map(r => {
            const row: any = {};
            row[EXCEL_HEADERS[0]] = r.srNo;
            row[EXCEL_HEADERS[1]] = r.wastiName;
            row[EXCEL_HEADERS[2]] = r.wardNo;
            row[EXCEL_HEADERS[3]] = r.khasraNo;
            row[EXCEL_HEADERS[4]] = r.layoutName;
            row[EXCEL_HEADERS[5]] = r.plotNo;
            row[EXCEL_HEADERS[6]] = r.occupantName;
            row[EXCEL_HEADERS[7]] = r.ownerName;
            row[EXCEL_HEADERS[8]] = r.hasConstruction ? 'हो' : 'नाही';
            row[EXCEL_HEADERS[9]] = r.openSpace;

            // Mapping 5 sections (floors)
            for (let i = 0; i < 5; i++) {
                const s = r.sections[i] || DEFAULT_SECTION;
                const baseIdx = 10 + (i * 13);
                row[EXCEL_HEADERS[baseIdx]] = s.propertyType;
                row[EXCEL_HEADERS[baseIdx + 1]] = s.lengthFt;
                row[EXCEL_HEADERS[baseIdx + 2]] = s.widthFt;
                row[EXCEL_HEADERS[baseIdx + 3]] = s.areaSqFt;
                row[EXCEL_HEADERS[baseIdx + 4]] = s.areaSqMt;
                row[EXCEL_HEADERS[baseIdx + 5]] = s.buildingTaxRate;
                row[EXCEL_HEADERS[baseIdx + 6]] = s.openSpaceTaxRate;
                row[EXCEL_HEADERS[baseIdx + 7]] = s.landRate;
                row[EXCEL_HEADERS[baseIdx + 8]] = s.buildingRate;
                row[EXCEL_HEADERS[baseIdx + 9]] = s.depreciationRate;
                row[EXCEL_HEADERS[baseIdx + 10]] = s.weightage;
                row[EXCEL_HEADERS[baseIdx + 11]] = s.buildingValue;
                row[EXCEL_HEADERS[baseIdx + 12]] = s.openSpaceValue;
            }

            const lastIdx = 10 + (5 * 13);
            row[EXCEL_HEADERS[lastIdx]] = r.propertyTax;
            row[EXCEL_HEADERS[lastIdx + 1]] = r.openSpaceTax;
            row[EXCEL_HEADERS[lastIdx + 2]] = r.streetLightTax;
            row[EXCEL_HEADERS[lastIdx + 3]] = r.healthTax;
            row[EXCEL_HEADERS[lastIdx + 4]] = r.generalWaterTax;
            row[EXCEL_HEADERS[lastIdx + 5]] = r.specialWaterTax;
            row[EXCEL_HEADERS[lastIdx + 6]] = r.wasteCollectionTax || 0;
            row[EXCEL_HEADERS[lastIdx + 7]] = r.receiptNo || '';
            row[EXCEL_HEADERS[lastIdx + 8]] = r.receiptBook || '';
            row[EXCEL_HEADERS[lastIdx + 9]] = r.paymentDate || '';
            row[EXCEL_HEADERS[lastIdx + 10]] = r.totalTaxAmount;
            row[EXCEL_HEADERS[lastIdx + 11]] = r.arrearsAmount;
            row[EXCEL_HEADERS[lastIdx + 12]] = r.paidAmount;
            
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data, { header: EXCEL_HEADERS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PropertyData");
        XLSX.writeFile(wb, `${type}_data_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                // Helper to find column index by multiple potential names
                const findCol = (row: any, aliases: string[], defaultHeader: string) => {
                    const rowKeys = Object.keys(row);
                    for (const alias of aliases) {
                        const found = rowKeys.find(k => k.toLowerCase().includes(alias.toLowerCase()));
                        if (found) return row[found];
                    }
                    return row[defaultHeader] || '';
                };

                const mappedRecords: PropertyRecord[] = data.map((row: any) => {
                    const sections: any[] = [];
                    for (let i = 0; i < 5; i++) {
                        const baseIdx = 10 + (i * 13);
                        sections.push({
                            ...DEFAULT_SECTION,
                            propertyType: row[EXCEL_HEADERS[baseIdx]] || '',
                            lengthFt: Number(row[EXCEL_HEADERS[baseIdx + 1]]) || 0,
                            widthFt: Number(row[EXCEL_HEADERS[baseIdx + 2]]) || 0,
                            areaSqFt: Number(row[EXCEL_HEADERS[baseIdx + 3]]) || 0,
                            areaSqMt: Number(row[EXCEL_HEADERS[baseIdx + 4]]) || 0,
                            buildingTaxRate: Number(row[EXCEL_HEADERS[baseIdx + 5]]) || 0,
                            openSpaceTaxRate: Number(row[EXCEL_HEADERS[baseIdx + 6]]) || 0,
                            landRate: Number(row[EXCEL_HEADERS[baseIdx + 7]]) || 0,
                            buildingRate: Number(row[EXCEL_HEADERS[baseIdx + 8]]) || 0,
                            depreciationRate: Number(row[EXCEL_HEADERS[baseIdx + 9]]) || 0,
                            weightage: Number(row[EXCEL_HEADERS[baseIdx + 10]]) || 0,
                            buildingValue: Number(row[EXCEL_HEADERS[baseIdx + 11]]) || 0,
                            openSpaceValue: Number(row[EXCEL_HEADERS[baseIdx + 12]]) || 0,
                        });
                    }
                    const lastIdx = 10 + (5 * 13);
                    return {
                        id: '', 
                        srNo: Number(row[EXCEL_HEADERS[0]]) || 0,
                        wastiName: row[EXCEL_HEADERS[1]] || '', 
                        wardNo: row[EXCEL_HEADERS[2]] || '',
                        khasraNo: row[EXCEL_HEADERS[3]] || '', 
                        layoutName: row[EXCEL_HEADERS[4]] || '',
                        plotNo: String(findCol(row, ['plot', 'प्लॉट', 'मालमत्ता क्र'], EXCEL_HEADERS[5]) || '').trim(), 
                        occupantName: row[EXCEL_HEADERS[6]] || '',
                        ownerName: row[EXCEL_HEADERS[7]] || '',
                        hasConstruction: (row[EXCEL_HEADERS[8]] || '').toString().includes('हो'),
                        openSpace: Number(row[EXCEL_HEADERS[9]]) || 0, 
                        sections,
                        propertyTax: Number(row[EXCEL_HEADERS[lastIdx]]) || 0,
                        openSpaceTax: Number(row[EXCEL_HEADERS[lastIdx + 1]]) || 0,
                        streetLightTax: Number(row[EXCEL_HEADERS[lastIdx + 2]]) || 0,
                        healthTax: Number(row[EXCEL_HEADERS[lastIdx + 3]]) || 0,
                        generalWaterTax: Number(row[EXCEL_HEADERS[lastIdx + 4]]) || 0,
                        specialWaterTax: Number(row[EXCEL_HEADERS[lastIdx + 5]]) || 0,
                        wasteCollectionTax: Number(row[EXCEL_HEADERS[lastIdx + 6]]) || 0,
                        receiptNo: row[EXCEL_HEADERS[lastIdx + 7]] || '',
                        receiptBook: row[EXCEL_HEADERS[lastIdx + 8]] || '',
                        paymentDate: row[EXCEL_HEADERS[lastIdx + 9]] || '',
                        totalTaxAmount: Number(row[EXCEL_HEADERS[lastIdx + 10]]) || 0,
                        arrearsAmount: Number(row[EXCEL_HEADERS[lastIdx + 11]]) || 0,
                        paidAmount: Number(row[EXCEL_HEADERS[lastIdx + 12]]) || 0,
                        createdAt: new Date().toISOString()
                    };
                });
                setImportPreviewData(mappedRecords);
            } catch (error) {
                console.error(error);
                alert('फाईल वाचण्यात त्रुटी आली. कृपया फाईल तपासा.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = async () => {
        if (!importPreviewData) return;
        setIsImporting(true);
        try {
            const response = await fetch(`${API_URL}/import`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importPreviewData)
            });
            if (response.ok) {
                setImportPreviewData(null);
                onImportSuccess();
                alert('डेटा यशस्वीरित्या आयात केला गेला.');
            } else {
                const err = await response.json();
                alert(`इंपोर्ट अयशस्वी: ${err.error || 'अनोळखी त्रुटी'}`);
            }
        } catch (error) {
            console.error(error);
            alert('सर्व्हरशी संपर्क साधण्यात त्रुटी आली.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <label className="gp-btn-secondary cursor-pointer">
                    <FileUp className="w-3.5 h-3.5" /> आयात (Import)
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={importFromExcel} />
                </label>
                <button onClick={exportToExcel} className="gp-btn-secondary">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> एक्सपोर्ट (Export)
                </button>
            </div>

            {/* Import Preview Modal */}
            {importPreviewData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* Header */}
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <FileUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">आयात पूर्वावलोकन (Import Preview)</h3>
                                    <p className="text-slate-500 text-xs font-bold mt-1">एकूण {MN(importPreviewData.length)} नोंदी साठवण्यापूर्वी तपासा</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setImportPreviewData(null)}
                                    disabled={isImporting}
                                    className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 bg-white"
                                >
                                    रद्द करा
                                </button>
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={isImporting}
                                    className="px-8 py-2.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isImporting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    साठवा (Save All)
                                </button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <table className="w-full border-collapse text-[10px]">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-100">
                                        <th className="px-3 py-2 border border-slate-200 text-center font-black text-slate-500">अ.क्र.</th>
                                        <th className="px-3 py-2 border border-slate-200 text-left font-black text-slate-500">वस्ती</th>
                                        <th className="px-3 py-2 border border-slate-200 text-left font-black text-slate-500">प्लॉट</th>
                                        <th className="px-3 py-2 border border-slate-200 text-left font-black text-slate-500">मालकाचे नाव</th>
                                        <th className="px-3 py-2 border border-slate-200 text-right font-black text-indigo-600">एकूण मागणी</th>
                                        <th className="px-3 py-2 border border-slate-200 text-right font-black text-rose-500">थकबाकी</th>
                                        <th className="px-3 py-2 border border-slate-200 text-right font-black text-emerald-600">भरणा</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importPreviewData.map((r, i) => (
                                        <tr key={i} className="hover:bg-indigo-50/50 transition-colors">
                                            <td className="px-3 py-2 border border-slate-100 text-center font-bold text-slate-400">{MN(r.srNo)}</td>
                                            <td className="px-3 py-2 border border-slate-100 font-bold text-slate-700 uppercase">{r.wastiName}</td>
                                            <td className="px-3 py-2 border border-slate-100 font-bold text-slate-700">{MN(r.plotNo)}</td>
                                            <td className="px-3 py-2 border border-slate-100 font-black text-slate-900 uppercase">{r.ownerName}</td>
                                            <td className="px-3 py-2 border border-slate-100 text-right font-black text-indigo-600">₹{MN(r.totalTaxAmount)}</td>
                                            <td className="px-3 py-2 border border-slate-100 text-right font-black text-rose-600">₹{MN(r.arrearsAmount)}</td>
                                            <td className="px-3 py-2 border border-slate-100 text-right font-black text-emerald-600">₹{MN(r.paidAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
