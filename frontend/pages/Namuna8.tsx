import { API_BASE_URL } from '@/config';
import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Eye, Filter, Plus, Edit2, Trash2, RotateCcw, X } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES, DEFAULT_SECTION } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import NamunaTable8 from '../components/NamunaTable8';

import PropertyForm from '../components/PropertyForm';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import Namuna8PrintFormat from '../components/Namuna8PrintFormat';
import { hasModulePermission } from '../utils/permissions';
import CalculationGuide from '../components/CalculationGuide';
import { CustomDropdown } from '../components/CustomDropdown';
import * as XLSX from 'xlsx';
import { EXCEL_HEADERS } from '../constants';
import { FileUp, FileSpreadsheet, Calculator } from 'lucide-react';

interface Namuna8Props {
    records: PropertyRecord[];
    selectedId: string | null;
    onClearSelected: () => void;
    fetchRecords: () => void;
    onUpdateLocalRecord: (r: any) => void;
    onRemoveLocalRecord: (id: string) => void;
    taxRates: any[];
    onAuthError?: () => void;
}

export default function Namuna8({ records, selectedId, onClearSelected, fetchRecords, onUpdateLocalRecord, onRemoveLocalRecord, taxRates, onAuthError }: Namuna8Props) {
    const [viewId, setViewId] = useState<string | null>(selectedId);
    const [filterWasti, setFilterWasti] = useState('');
    const [filterLayout, setFilterLayout] = useState('');
    const [filterKhasra, setFilterKhasra] = useState('');
    const [filterPlotNo, setFilterPlotNo] = useState('');
    const [filterPropertyType, setFilterPropertyType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);
    const [dynamicPropertyTypes, setDynamicPropertyTypes] = useState<string[]>([]);
    const [printRecord, setPrintRecord] = useState<PropertyRecord | null>(null);
    const [calculationProperty, setCalculationProperty] = useState<PropertyRecord | null>(null);

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv' || currentUser.role === 'gram_sevak';
    const canAdd = hasModulePermission(currentUser, 'namuna8', 'add');
    const canEdit = hasModulePermission(currentUser, 'namuna8', 'edit');
    const canDelete = hasModulePermission(currentUser, 'namuna8', 'delete');
    const canFilter = hasModulePermission(currentUser, 'namuna8', 'filter');

    React.useEffect(() => {
        const loadMasters = async () => {
            try {
                const [wRes, pRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/master/items/WASTI`),
                    fetch(`${API_BASE_URL}/api/master/items/PROPERTY_TYPE`)
                ]);
                const wastis = await wRes.json();
                const types = await pRes.json();
                setDynamicWastis(wastis.map((i: any) => i.item_value_mr));
                setDynamicPropertyTypes(types.map((i: any) => i.item_value_mr));
            } catch (err) { console.error(err); }
        };
        loadMasters();
    }, []);

    const API_URL = `${API_BASE_URL}/api/properties`;

    // Cascading Filter Logic
    const wastiFiltered = useMemo(() => filterWasti ? records.filter(r => r.wastiName === filterWasti) : records, [records, filterWasti]);
    const layoutFiltered = useMemo(() => filterLayout ? wastiFiltered.filter(r => r.layoutName === filterLayout) : wastiFiltered, [wastiFiltered, filterLayout]);
    const khasraFiltered = useMemo(() => filterKhasra ? layoutFiltered.filter(r => r.khasraNo === filterKhasra) : layoutFiltered, [layoutFiltered, filterKhasra]);

    const uniqueWastis = useMemo(() => Array.from(new Set(records.map(r => r.wastiName).filter(Boolean))).sort(), [records]);
    const uniqueLayouts = useMemo(() => Array.from(new Set(wastiFiltered.map(r => r.layoutName).filter(Boolean))).sort(), [wastiFiltered]);

    // Sort Khasra Logic (reused helper)
    const sortKhasra = (a: string, b: string) => {
        const aStr = String(a || '');
        const bStr = String(b || '');
        const aEng = aStr.replace(/[०-९]/g, (d: string) => '0123456789'['०१२३४५६७८९'.indexOf(d)] || d);
        const bEng = bStr.replace(/[०-९]/g, (d: string) => '0123456789'['०१२३४५६७८९'.indexOf(d)] || d);
        return aEng.localeCompare(bEng, undefined, { numeric: true, sensitivity: 'base' });
    };

    const uniqueKhasras = useMemo(() => Array.from(new Set(layoutFiltered.map(r => r.khasraNo).filter(Boolean))).sort(sortKhasra), [layoutFiltered]);
    const uniquePlots = useMemo(() => Array.from(new Set(khasraFiltered.map(r => r.plotNo).filter(Boolean))).sort(sortKhasra), [khasraFiltered]);

    const handleWastiChange = (v: string) => { setFilterWasti(v); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); };
    const handleLayoutChange = (v: string) => { setFilterLayout(v); setFilterKhasra(''); setFilterPlotNo(''); };
    const handleKhasraChange = (v: string) => { setFilterKhasra(v); setFilterPlotNo(''); };

    const filteredRecords = useMemo(() => {
        let res = records;
        if (filterWasti) res = res.filter(r => r.wastiName === filterWasti);
        if (filterLayout) res = res.filter(r => r.layoutName === filterLayout);
        if (filterKhasra) res = res.filter(r => r.khasraNo === filterKhasra);
        if (filterPlotNo) res = res.filter(r => r.plotNo === filterPlotNo);
        if (filterPropertyType) {
            res = res.filter(r => r.sections.some(s => s.propertyType === filterPropertyType));
        }
        if (searchTerm.trim()) {
            res = res.filter(r => matchesSearch(r, searchTerm));
        }
        return res;
    }, [records, filterWasti, filterLayout, filterKhasra, filterPlotNo, filterPropertyType, searchTerm]);

    const selectedRecord = useMemo(() => records.find(r => r.id === viewId), [records, viewId]);

    const handleSave = async (updatedRecord: PropertyRecord) => {
        // Optimistic UI Update (लगेच UI मध्ये बदल)
        if (typeof onUpdateLocalRecord === 'function') {
            onUpdateLocalRecord(updatedRecord);
        }
        setShowForm(false);
        setEditingRecord(null);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRecord)
            });
            if (!res.ok) {
                fetchRecords(); // Rollback on error
            } else {
                fetchRecords(); // Get reliable ID
            }
        } catch (err) {
            console.error(err);
            fetchRecords(); // Rollback
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('ही नोंद कायमची हटवायची आहे का?')) return;

        // Optimistic UI Delete (लगेच UI मधून हटवा)
        if (typeof onRemoveLocalRecord === 'function') {
            onRemoveLocalRecord(id);
        }

        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchRecords();
                if (viewId === id) {
                    setViewId(null);
                    onClearSelected();
                }
            } else {
                fetchRecords(); // Rollback
            }
        } catch (err) {
            console.error(err);
            fetchRecords(); // Rollback
        }
    };

    const exportToExcel = () => {
        const wsData = records.map((r) => {
            const row: any[] = [
                r.srNo, r.wastiName || '', r.wardNo, r.khasraNo, r.layoutName,
                r.plotNo, r.occupantName, r.ownerName,
                r.hasConstruction ? 'हो' : 'नाही', r.openSpace
            ];
            for (let i = 0; i < 5; i++) {
                const s = r.sections[i] || { ...DEFAULT_SECTION };
                row.push(
                    s.propertyType || '', s.lengthFt || 0, s.widthFt || 0,
                    s.areaSqFt || 0, s.areaSqMt || 0, s.buildingTaxRate || 0,
                    s.openSpaceTaxRate || 0, s.landRate || 0, s.buildingRate || 0,
                    s.depreciationRate || 0, s.weightage || 0, s.buildingValue || 0,
                    s.openSpaceValue || 0
                );
            }
            row.push(r.propertyTax, r.openSpaceTax, r.streetLightTax, r.healthTax,
                r.generalWaterTax, r.specialWaterTax, r.receiptNo || '', r.receiptBook || '', r.paymentDate || '',
                r.totalTaxAmount, r.arrearsAmount || 0, r.paidAmount || 0);
            return row;
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...wsData]);
        XLSX.utils.book_append_sheet(wb, ws, "Namuna 8 Records");
        XLSX.writeFile(wb, `Namuna_8_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                        id: '', srNo: Number(row[EXCEL_HEADERS[0]]) || 0,
                        wastiName: row[EXCEL_HEADERS[1]] || '', wardNo: row[EXCEL_HEADERS[2]] || '',
                        khasraNo: row[EXCEL_HEADERS[3]] || '', layoutName: row[EXCEL_HEADERS[4]] || '',
                        plotNo: row[EXCEL_HEADERS[5]] || '', occupantName: row[EXCEL_HEADERS[6]] || '',
                        ownerName: row[EXCEL_HEADERS[7]] || '',
                        hasConstruction: (row[EXCEL_HEADERS[8]] || '').toString().includes('हो'),
                        openSpace: Number(row[EXCEL_HEADERS[9]]) || 0, sections,
                        propertyTax: Number(row[EXCEL_HEADERS[lastIdx]]) || 0,
                        openSpaceTax: Number(row[EXCEL_HEADERS[lastIdx + 1]]) || 0,
                        streetLightTax: Number(row[EXCEL_HEADERS[lastIdx + 2]]) || 0,
                        healthTax: Number(row[EXCEL_HEADERS[lastIdx + 3]]) || 0,
                        generalWaterTax: Number(row[EXCEL_HEADERS[lastIdx + 4]]) || 0,
                        specialWaterTax: Number(row[EXCEL_HEADERS[lastIdx + 5]]) || 0,
                        receiptNo: row[EXCEL_HEADERS[lastIdx + 6]] || '',
                        receiptBook: row[EXCEL_HEADERS[lastIdx + 7]] || '',
                        paymentDate: row[EXCEL_HEADERS[lastIdx + 8]] || '',
                        totalTaxAmount: Number(row[EXCEL_HEADERS[lastIdx + 9]]) || 0,
                        arrearsAmount: Number(row[EXCEL_HEADERS[lastIdx + 10]]) || 0,
                        paidAmount: Number(row[EXCEL_HEADERS[lastIdx + 11]]) || 0,
                        createdAt: new Date().toISOString()
                    };
                });
                const response = await fetch(`${API_URL}/import`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mappedRecords)
                });
                if (response.ok) { fetchRecords(); }
            } catch (error) { console.error(error); }
        };
        reader.readAsBinaryString(file);
    };

    const handleEdit = (record: PropertyRecord) => {
        const count = record.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').length || 1;
        setVisibleFloorCount(count);
        setEditingRecord(record);
        setShowForm(true);
    };


    const handlePrint = (id: string) => {
        const record = records.find(r => r.id === id);
        if (record) setPrintRecord(record);
    };


    const existingLayouts = useMemo(() => Array.from(new Set(records.map(r => r.layoutName).filter(Boolean))), [records]);
    const existingKhasras = useMemo(() => Array.from(new Set(records.map(r => r.khasraNo).filter(Boolean))), [records]);

    if (printRecord) {
        return (
            <div className="flex flex-col h-full bg-gray-100 no-print-bg">
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm sticky top-0 z-50">
                    <button onClick={() => setPrintRecord(null)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark transition-all">
                        <Printer className="w-4 h-4" /> प्रिंट करा
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex justify-center no-print-bg">
                    <div className="w-full">
                        <Namuna8PrintFormat records={[printRecord]} />
                    </div>
                </div>
            </div>
        );
    }

    if (viewId && selectedRecord) {
        return (
            <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm shrink-0">
                    <button onClick={() => { setViewId(null); onClearSelected(); }}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-2" />
                    <h2 className="text-sm font-black text-gray-800 hidden md:block">
                        {selectedRecord.ownerName} • अ.क्र. {selectedRecord.srNo}
                    </h2>
                    <div className="flex-1" />
                    {canEdit && (
                        <button onClick={() => handleEdit(selectedRecord)}
                            className="flex items-center gap-2 text-sm font-bold text-amber-600 border border-amber-200 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-all">
                            <Edit2 className="w-4 h-4" /> सुधारा
                        </button>
                    )}
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark transition-all">
                        <Printer className="w-4 h-4" /> पीडीएफ / प्रिंट काढा
                    </button>
                </div>

                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body, html { 
                            background: white !important; 
                            margin: 0 !important; 
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-only { display: block !important; }
                        table { border-collapse: collapse !important; width: 100% !important; }
                        th, td { border: 1px solid black !important; color: black !important; }
                        th { background: #f0f0f0 !important; font-weight: bold !important; }
                    }
                    @page { 
                        size: A4 landscape; 
                        margin: 8mm 5mm 8mm 5mm; 
                    }
                `}</style>

                <div className="overflow-auto flex-1 p-4 bg-gray-100 no-print-bg">
                    <div className="w-full flex justify-center">
                        <Namuna8PrintFormat records={[selectedRecord]} />
                    </div>
                </div>
            </div>
        );
    }

    if (viewId && !selectedRecord) {
        return (
            <div className="p-10 text-center text-gray-400">
                <p>नोंद सापडली नाही.</p>
                <button onClick={() => setViewId(null)} className="mt-3 text-primary font-bold hover:underline flex items-center gap-1 mx-auto transition-all">
                    <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* ── TOP HEADER ── */}
            <div className="bg-white border-b border-gray-100 px-4 py-2.5 shadow-sm no-print shrink-0 relative z-20">
                <div className="flex items-center justify-between">
                    {/* Action Button (Left) */}
                    <div className="flex items-center gap-2">
                        {canAdd && (
                            <button onClick={() => { setEditingRecord(null); setShowForm(true); setVisibleFloorCount(1); }}
                                className="flex items-center gap-2 text-sm font-black text-white bg-primary px-4 py-2 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95">
                                <Plus className="w-4 h-4" /> नवीन नोंद
                            </button>
                        )}
                        <label className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-200 transition-all cursor-pointer text-xs font-bold border border-slate-200">
                            <FileUp className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">आयात</span>
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={importFromExcel} />
                        </label>
                        <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all text-xs font-bold shadow-sm">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                            <span className="hidden sm:inline">एक्सपोर्ट</span>
                        </button>
                        <button 
                            onClick={() => {
                                if (records.length > 0) setCalculationProperty(records[0]);
                                else alert('गणना पाहण्यासाठी किमान एक नोंद असणे आवश्यक आहे.');
                            }}
                            className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-all text-xs font-bold shadow-sm"
                        >
                            <Calculator className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">गणना सूत्र मार्गदर्शक</span>
                        </button>
                    </div>

                    {/* Title & Info (Right) */}
                    <div className="text-right">
                        <h2 className="text-xl font-black text-gray-800 flex items-center justify-end gap-2 leading-none whitespace-nowrap">
                            <span className="text-[10px] font-bold bg-primary/5 text-primary px-2 py-1 rounded-lg border border-primary/20 tracking-tighter uppercase">Official Format</span>
                            नमुना ८ — मालमत्ता आकारणी नोंदवही
                        </h2>
                        <div className="flex items-center justify-end gap-3 mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                            <span>{PANCHAYAT_CONFIG.financialYear}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{filteredRecords.length} नोंदी</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── FILTER BAR (Like Dashboard UI) ── */}
            <div className="px-2 py-1.5 no-print shrink-0">
                <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    {/* Search Field */}
                    <div className="relative group w-56 lg:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 z-10 group-focus-within:text-primary transition-colors" />
                        <TransliterationInput 
                            placeholder="नाव, प्लॉट शोधा..." 
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            className="w-full pl-9 pr-10 py-1.5 bg-slate-50 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>

                    <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

                    {/* Advanced Filters */}
                    {(canFilter || isAdmin) && (
                        <div className="flex items-center gap-1">
                            <CustomDropdown 
                                value={filterWasti} 
                                onChange={handleWastiChange}
                                placeholder="वस्ती - सर्व"
                                options={uniqueWastis.map(w => ({ value: w, label: w }))}
                            />
                            <CustomDropdown 
                                value={filterLayout} 
                                onChange={handleLayoutChange}
                                placeholder="लेआउट - सर्व"
                                options={uniqueLayouts.map(l => ({ value: l, label: l }))}
                            />
                            <CustomDropdown 
                                value={filterKhasra} 
                                onChange={handleKhasraChange}
                                placeholder="खसरा - सर्व"
                                options={uniqueKhasras.map(k => ({ value: k, label: k }))}
                            />
                            <CustomDropdown 
                                value={filterPlotNo} 
                                onChange={setFilterPlotNo}
                                placeholder="प्लॉट - सर्व"
                                options={uniquePlots.map(p => ({ value: p, label: p }))}
                            />
                            <CustomDropdown 
                                value={filterPropertyType} 
                                onChange={setFilterPropertyType}
                                placeholder="प्रकार - सर्व"
                                options={dynamicPropertyTypes.map(p => ({ value: p, label: p }))}
                            />
                            {(filterWasti || filterLayout || filterKhasra || filterPlotNo || filterPropertyType) && (
                                <button 
                                    onClick={() => { setFilterWasti(''); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); setFilterPropertyType(''); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-all flex-shrink-0"
                                >
                                    <RotateCcw className="w-3 h-3" /> सर्व रद्द
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible min-w-fit">
                    <NamunaTable8
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={canEdit ? handleEdit : undefined}
                        onDelete={canDelete ? handleDelete : undefined}
                        onView={setViewId}
                        onPrint={handlePrint}
                        onCalculate={(r) => setCalculationProperty(r)}
                        showActions={true}
                    />
                </div>
            </div>

            {/* Calculation Guide Modal */}
            {calculationProperty && (
                <CalculationGuide
                    property={calculationProperty}
                    onClose={() => setCalculationProperty(null)}
                />
            )}

            {/* Property Form Modal */}
            {showForm && (
                <PropertyForm
                    initialData={editingRecord || undefined}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditingRecord(null); }}
                    visibleFloorCount={visibleFloorCount}
                    setVisibleFloorCount={setVisibleFloorCount}
                    existingLayouts={existingLayouts}
                    existingKhasras={existingKhasras}
                    taxRates={taxRates}
                />
            )}
        </div>
    );
}
