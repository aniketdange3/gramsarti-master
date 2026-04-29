import { API_BASE_URL } from '@/utils/config';
import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Eye, Filter, CheckCircle2, AlertTriangle, Clock, Plus, Edit2, RotateCcw, X } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES, DEFAULT_SECTION } from '../types';
import { PANCHAYAT_CONFIG } from '../utils/panchayatConfig';
import NamunaTable9 from '../components/NamunaTable9';

import PropertyForm from '../components/PropertyForm';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import Namuna9PrintFormat from '../components/Namuna9PrintFormat';
import { hasModulePermission } from '../utils/permissions';
import { CustomDropdown } from '../components/CustomDropdown';
import { FileCheck } from 'lucide-react';
import MaganiBillDocument from '../components/MaganiBillDocument';

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

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
    const [printPageSize, setPrintPageSize] = useState<number>(2);

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
                        * {
                            box-shadow: none !important;
                            overflow: visible !important;
                        }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm sticky top-0 z-50">
                    <button onClick={() => setPrintRecords(null)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> विंडो बंद करा
                    </button>

                    <div className="flex-1 flex justify-center">
                        <div className="text-[12px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            लीगल साईझ प्रिंट (Legal Size Print)
                        </div>
                    </div>

                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 px-6 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Printer className="w-4 h-4" /> प्रिंट करा
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex justify-center no-print-bg print-parent">
                    <div className="w-full">
                        <Namuna9PrintFormat records={printRecords} pageSize={printPageSize} />
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
                        <ArrowLeft className="w-4 h-4" /> विंडो बंद करा
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-black text-white bg-indigo-600 px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Printer className="w-4 h-4" /> प्रिंट (लँडस्केप)
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-8 pt-4 flex justify-center no-print-bg">
                    <MaganiBillDocument record={activeBillRecord} onClose={() => setActiveBillRecord(null)} />
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
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
            {/* Top Action Bar */}
            <header className="no-print shrink-0 bg-white border-b border-slate-100 px-4 py-2">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <FileCheck className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">नमुना ९</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">कर मागणी व वसुली नोंदवही</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canAdd && (
                            <button
                                onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-all text-[9px] active:scale-95"
                            >
                                <Plus size={12} /> नवीन नोंद
                            </button>
                        )}
                        <button onClick={fetchRecords} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all active:scale-95">
                            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col px-2 py-2 gap-2">
                {/* Unified Search & Filter Bar */}
                <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl no-print flex-wrap lg:flex-nowrap shrink-0 shadow-sm">
                    {/* Search Component */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 z-10" />
                        <TransliterationInput
                            placeholder="शोधा..."
                            className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-rose-50 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                            </button>
                        )}
                    </div>

                    {/* Filters Group */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
                        <CustomDropdown
                            value={filterWasti}
                            onChange={handleWastiChange}
                            placeholder="वस्ती निवडा"
                            options={uniqueWastis.map(w => ({ value: w, label: w }))}
                        />
                        <CustomDropdown
                            value={filterLayout}
                            onChange={handleLayoutChange}
                            placeholder="लेआउट निवडा"
                            options={uniqueLayouts.map(l => ({ value: l, label: l }))}
                        />
                        <CustomDropdown
                            value={filterKhasra}
                            onChange={handleKhasraChange}
                            placeholder="खसरा निवडा"
                            options={uniqueKhasras.map(k => ({ value: k, label: k }))}
                        />
                        <CustomDropdown
                            value={filterPlotNo}
                            onChange={setFilterPlotNo}
                            placeholder="प्लॉट निवडा"
                            options={uniquePlots.map(p => ({ value: p, label: p }))}
                        />

                        {(filterWasti || filterLayout || filterKhasra || filterPlotNo || filterPropertyType || searchTerm) && (
                            <button
                                onClick={() => { setFilterWasti(''); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); setFilterPropertyType(''); setSearchTerm(''); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-all flex-shrink-0"
                            >
                                <RotateCcw className="w-3 h-3" /> रीसेट
                            </button>
                        )}

                        {/* Stats Counter */}
                        <div className="hidden lg:flex items-center gap-1.5 bg-indigo-50/50 px-3 py-2 rounded-lg border border-indigo-100 shrink-0">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tight whitespace-nowrap">
                                नोंदी: <span className="text-indigo-600 font-black ml-1">{MN(filteredRecords.length)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-100">
                    <NamunaTable9
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={canEdit ? handleEdit : undefined}
                        onDelete={canDelete ? handleDelete : undefined}
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
