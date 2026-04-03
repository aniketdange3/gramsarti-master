import { API_BASE_URL } from '@/config';
import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Eye, Filter, CheckCircle2, AlertTriangle, Clock, Plus, Edit2, RotateCcw, X } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES, DEFAULT_SECTION } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import NamunaTable9 from '../components/NamunaTable9';

import PropertyForm from '../components/PropertyForm';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import Namuna9PrintFormat from '../components/Namuna9PrintFormat';
import { hasModulePermission } from '../utils/permissions';
import { CustomDropdown } from '../components/CustomDropdown';
import * as XLSX from 'xlsx';
import { EXCEL_HEADERS } from '../constants';
import { FileUp, FileSpreadsheet } from 'lucide-react';
import MaganiBillDocument from '../components/MaganiBillDocument';

interface Namuna9Props {
    records: PropertyRecord[];
    selectedId: string | null;
    fetchRecords: () => void;
    onUpdateLocalRecord: (r: any) => void;
    onRemoveLocalRecord: (id: string) => void;
    taxRates: any[];
    onAuthError: () => void;
}

export default function Namuna9({ records, selectedId, fetchRecords, onUpdateLocalRecord, onRemoveLocalRecord, taxRates, onAuthError }: Namuna9Props) {
    const [viewId, setViewId] = useState<string | null>(selectedId);
    const [filterWasti, setFilterWasti] = useState('');
    const [filterLayout, setFilterLayout] = useState('');
    const [filterKhasra, setFilterKhasra] = useState('');
    const [filterPlotNo, setFilterPlotNo] = useState('');
    const [filterPropertyType, setFilterPropertyType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showRegister, setShowRegister] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null);
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [saving, setSaving] = useState(false);
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);
    const [dynamicPropertyTypes, setDynamicPropertyTypes] = useState<string[]>([]);
    const [printRecords, setPrintRecords] = useState<PropertyRecord[] | null>(null);
    const [activeBillRecord, setActiveBillRecord] = useState<PropertyRecord | null>(null);

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv' || currentUser.role === 'gram_sevak';
    const canAdd = hasModulePermission(currentUser, 'namuna9', 'add');
    const canEdit = hasModulePermission(currentUser, 'namuna9', 'edit');
    const canDelete = hasModulePermission(currentUser, 'namuna9', 'delete');
    const canFilter = hasModulePermission(currentUser, 'namuna9', 'filter');

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

    // Sort Khasra Logic
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
        XLSX.utils.book_append_sheet(wb, ws, "Namuna 9 Records");
        XLSX.writeFile(wb, `Namuna_9_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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

    const handleSave = async (record: PropertyRecord) => {
        setSaving(true);
        const isNew = !editingRecord;
        const maxSrNo = records.reduce((max, r) => Math.max(max, Number(r.srNo) || 0), 0);
        const finalRecord = isNew ? { ...record, srNo: maxSrNo + 1, id: `temp-${Date.now()}` } : record;

        // Optimistic UI Update: लगेच UI मध्ये बदल करा (Update UI instantly)
        if (typeof onUpdateLocalRecord === 'function') {
            onUpdateLocalRecord(finalRecord);
        }
        setShowForm(false);
        setEditingRecord(null);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalRecord)
            });
            if (!response.ok) {
                // त्रुटी असल्यास डेटाबेसवरून पुन्हा फेच करा (Rollback on error)
                console.error('Save failed, rolling back UI');
                fetchRecords();
            } else {
                // यशस्विरीत्या सेव्ह झाल्यावर अचूक आयडी मिळवण्यासाठी फेच करा
                fetchRecords();
            }
        } catch (error) {
            console.error('Error saving record:', error);
            fetchRecords(); // Rollback
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('आपली खात्री आहे का की आपण ही नोंद हटवू इच्छिता?')) return;

        // Optimistic UI Delete: लगेच UI मधून हटवा (Remove from UI instantly)
        if (typeof onRemoveLocalRecord === 'function') {
            onRemoveLocalRecord(id);
        }

        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                // त्रुटी असल्यास रोलबॅक करा (Rollback on error)
                fetchRecords();
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            fetchRecords(); // Rollback
        }
    };

    const handleEdit = (record: PropertyRecord) => {
        const count = record.sections.filter(s => s.propertyType && s.propertyType !== 'निवडा').length;
        setVisibleFloorCount(count > 0 ? count : 1);
        setEditingRecord(record);
        setShowForm(true);
    };

    const existingLayouts = useMemo(() => {
        return Array.from(new Set(records.map(r => r.layoutName).filter(Boolean)));
    }, [records]);

    const existingKhasras = useMemo(() => {
        return Array.from(new Set(records.map(r => r.khasraNo).filter(Boolean)));
    }, [records]);

    // ─── PRINT SELECTED RECORDS VIEW ──────────────────────────────────────────
    if (printRecords && printRecords.length > 0) {
        return (
            <div className="flex flex-col h-full bg-gray-100 no-print-bg">
                <style>{`
                    @media print {
                        body, html {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm sticky top-0 z-50">
                    <button onClick={() => setPrintRecords(null)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark transition-all">
                        <Printer className="w-4 h-4" /> प्रिंट करा
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex justify-center no-print-bg print-parent">
                    <div className="w-full">
                        <Namuna9PrintFormat records={printRecords} />
                    </div>
                </div>
            </div>
        );
    }

    if (viewId && selectedRecord) {
        // ... (existing detail view logic, though the user might prefer the bill view now)
    }

    if (activeBillRecord) {
        return (
            <div className="flex flex-col h-full bg-slate-100 no-print-bg">
                <style>{`
                    @media print {
                        body, html { margin: 0 !important; padding: 0 !important; background: white !important; }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 no-print shadow-sm sticky top-0 z-50">
                    <button onClick={() => setActiveBillRecord(null)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-black text-white bg-indigo-600 px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Printer className="w-4 h-4" /> प्रिंट (लँडस्केप)
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-8 pt-4 flex justify-center no-print-bg">
                    <MaganiBillDocument record={activeBillRecord} />
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

    const handlePrint = (id: string) => {
        const record = records.find(r => r.id === id);
        if (record) setPrintRecords([record]);
    };

    const handlePrintMultiple = (selectedRecords: PropertyRecord[]) => {
        if (selectedRecords.length > 0) {
            setPrintRecords(selectedRecords);
        }
    };

    const handlePrintBill = (id: string) => {
        const record = records.find(r => r.id === id);
        if (record) setActiveBillRecord(record);
    };

    // ─── LIST VIEW (High-Fidelity Overhaul) ──────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* ── TOP HEADER ── */}
            <div className="bg-white border-b border-gray-100 px-4 py-2.5 shadow-sm no-print shrink-0 relative z-20">
                <div className="flex items-end justify-between">
                    {/* Title & Info (left) */}
                    <div className="text-start">
                        <h2 className=" bg-indigo-700 text-white px-2 py-1 text-xl  font-bold rounded-lg mt-1 w-fit">नमुना ९ </h2>
                        <p className="text-md font-black text-gray-800 leading-none">कर मागणी व वसुली नोंदवही</p>

                    </div>
                    {/* Action Button (Left)
                    <div className="flex items-center gap-2">
                        {canAdd && (
                            <button onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
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
                    </div> */}
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


                </div>
            </div>


            <div className="flex-1 overflow-hidden p-2 pb-0 flex flex-col">
                <div className="bg-white rounded-t-2xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col">
                    <NamunaTable9
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={canEdit ? handleEdit : undefined}
                        onDelete={canDelete ? handleDelete : undefined}
                        // onView={setViewId}
                        onPrint={handlePrint}
                        onPrintBill={handlePrintBill}
                        onPrintMultiple={handlePrintMultiple}
                        showActions={true}
                    />
                </div>
            </div>

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
