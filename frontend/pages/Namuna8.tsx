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
import { Calculator, ClipboardList } from 'lucide-react';

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);


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
                        <ArrowLeft className="w-4 h-4" /> विंडो बंद करा
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

    // if (viewId && selectedRecord) {
    //     return (
    //         <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
    //             <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm shrink-0">
    //                 <button onClick={() => { setViewId(null); onClearSelected(); }}
    //                     className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
    //                     <ArrowLeft className="w-4 h-4" /> यादीकडे परत
    //                 </button>
    //                 <div className="h-6 w-px bg-gray-200 mx-2" />
    //                 <h2 className="text-sm font-black text-gray-800 hidden md:block">
    //                     {selectedRecord.ownerName} • अ.क्र. {selectedRecord.srNo}
    //                 </h2>
    //                 <div className="flex-1" />
    //                 {canEdit && (
    //                     <button onClick={() => handleEdit(selectedRecord)}
    //                         className="flex items-center gap-2 text-sm font-bold text-amber-600 border border-amber-200 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-all">
    //                         <Edit2 className="w-4 h-4" /> सुधारा
    //                     </button>
    //                 )}
    //                 <button onClick={() => window.print()}
    //                     className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark transition-all">
    //                     <Printer className="w-4 h-4" /> पीडीएफ प्रिंट काढा
    //                 </button>
    //             </div>

    //             <style>{`
    //                 @media print {
    //                     .no-print { display: none !important; }
    //                     body, html { 
    //                         background: white !important; 
    //                         margin: 0 !important; 
    //                         padding: 0 !important;
    //                         -webkit-print-color-adjust: exact !important;
    //                         print-color-adjust: exact !important;
    //                     }
    //                     .print-only { display: block !important; }
    //                     table { border-collapse: collapse !important; width: 100% !important; }
    //                     th, td { border: 1px solid black !important; color: black !important; }
    //                     th { background: #f0f0f0 !important; font-weight: bold !important; }
    //                 }
    //                 @page { 
    //                     size: A4 landscape; 
    //                     margin: 8mm 5mm 8mm 5mm; 
    //                 }
    //             `}</style>

    //             <div className="overflow-auto flex-1 p-4 bg-gray-100 no-print-bg">
    //                 <div className="w-full flex justify-center">
    //                     <Namuna8PrintFormat records={[selectedRecord]} />
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }

    // if (viewId && !selectedRecord) {
    //     return (
    //         <div className="p-10 text-center text-gray-400">
    //             <p>नोंद सापडली नाही.</p>
    //             <button onClick={() => setViewId(null)} className="mt-3 text-primary font-bold hover:underline flex items-center gap-1 mx-auto transition-all">
    //                 <ArrowLeft className="w-4 h-4" /> यादीकडे परत
    //             </button>
    //         </div>
    //     );
    // }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
            {/* Top Action Bar */}
            <header className="no-print shrink-0">
                <div className="gp-action-bar">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <ClipboardList className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="gp-section-title">नमुना ८</h2>
                            <p className="gp-section-subtitle">मालमत्ता आकारणी नोंदवही</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canAdd && (
                            <>

                                <button
                                    onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                    className="gp-btn-primary"
                                >
                                    <Plus className="w-3.5 h-3.5" /> नवीन नोंद
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col px-3 py-3 gap-3">
                {/* Unified Search & Filter Bar */}
                <div className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl no-print flex-wrap lg:flex-nowrap shrink-0">
                    {/* Search Component */}
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 z-10" />
                        <TransliterationInput
                            placeholder="नाव, प्लॉट शोधा..."
                            className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                                <X className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                            </button>
                        )}
                    </div>

                    {/* Filters Group */}
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
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
                                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all flex-shrink-0"
                            >
                                <RotateCcw className="w-3 h-3" /> रीसेट
                            </button>
                        )}
                    </div>

                    {/* Stats Counter */}
                    <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shrink-0">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight whitespace-nowrap">
                            नोंदी: <span className="text-indigo-600 font-black">{MN(filteredRecords.length)}</span>
                        </span>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-gray-100">
                    <NamunaTable8
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={canEdit ? handleEdit : undefined}
                        onDelete={canDelete ? handleDelete : undefined}
                        onPrint={handlePrint}
                        onCalculate={(r) => setCalculationProperty(r)}
                        showActions={true}
                    />
                </div>
            </div>

            {/* Modals */}
            {calculationProperty && (
                <CalculationGuide
                    property={calculationProperty}
                    onClose={() => setCalculationProperty(null)}
                />
            )}

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
