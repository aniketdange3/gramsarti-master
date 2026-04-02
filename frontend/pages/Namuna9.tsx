import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Eye, Filter, CheckCircle2, AlertTriangle, Clock, Plus, Edit2 } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES, DEFAULT_SECTION } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import NamunaTable9 from '../components/NamunaTable9';

import PropertyForm from '../components/PropertyForm';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import Namuna9PrintFormat from '../components/Namuna9PrintFormat';
import { hasModulePermission } from '../utils/permissions';

interface Namuna9Props {
    records: PropertyRecord[];
    selectedId: string | null;
    fetchRecords: () => void;
    taxRates: any[];
}

export default function Namuna9({ records, selectedId, fetchRecords, taxRates }: Namuna9Props) {
    const [viewId, setViewId] = useState<string | null>(selectedId);
    const [filterWasti, setFilterWasti] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showRegister, setShowRegister] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null);
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [saving, setSaving] = useState(false);
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);
    const [printRecord, setPrintRecord] = useState<PropertyRecord | null>(null);

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const canAdd = hasModulePermission(currentUser, 'namuna9', 'add');
    const canEdit = hasModulePermission(currentUser, 'namuna9', 'edit');
    const canDelete = hasModulePermission(currentUser, 'namuna9', 'delete');

    React.useEffect(() => {
        const fetchWastis = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:5000/api/master/items/WASTI`);
                const data = await res.json();
                setDynamicWastis(data.map((i: any) => i.item_value_mr));
            } catch (err) { console.error(err); }
        };
        fetchWastis();
    }, []);

    const API_URL = `http://${window.location.hostname}:5000/api/properties`;

    const filteredRecords = useMemo(() => {
        let res = records;
        if (filterWasti) res = res.filter(r => r.wastiName === filterWasti);
        if (searchTerm.trim()) {
            res = res.filter(r => matchesSearch(r, searchTerm));
        }
        return res;
    }, [records, filterWasti, searchTerm]);

    const selectedRecord = useMemo(() => records.find(r => r.id === viewId), [records, viewId]);

    const handleSave = async (record: PropertyRecord) => {
        setSaving(true);
        const isNew = !editingRecord;
        const maxSrNo = records.reduce((max, r) => Math.max(max, Number(r.srNo) || 0), 0);
        const finalRecord = isNew ? { ...record, srNo: maxSrNo + 1 } : record;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalRecord)
            });
            if (response.ok) {
                fetchRecords();
                setShowForm(false);
                setEditingRecord(null);
            }
        } catch (error) {
            console.error('Error saving record:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('आपली खात्री आहे का की आपण ही नोंद हटवू इच्छिता?')) return;
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchRecords();
            }
        } catch (error) {
            console.error('Error deleting record:', error);
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



    // ─── PRINT SELECTED RECORD VIEW ──────────────────────────────────────────
    if (printRecord) {
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
                <div className="flex-1 overflow-auto p-4 flex justify-center no-print-bg print-parent">
                    <div className="w-full">
                         <Namuna9PrintFormat records={[printRecord]} />
                    </div>
                </div>
            </div>
        );
    }

    // ─── SINGLE RECORD DETAIL VIEW ───────────────────────────────────────────
    if (viewId && selectedRecord) {
        return (
            <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm shrink-0">
                    <button onClick={() => setViewId(null)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    {canEdit && (
                        <button onClick={() => handleEdit(selectedRecord)}
                            className="flex items-center gap-2 text-sm font-bold text-amber-600 border border-amber-200 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-all">
                            <Edit2 className="w-4 h-4" /> संपादित करा
                        </button>
                    )}
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-gray-800 px-5 py-2 rounded-xl hover:bg-black transition-all">
                        <Printer className="w-4 h-4" /> PDF / प्रिंट
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark transition-all">
                        <Printer className="w-4 h-4" /> प्रिंट
                    </button>
                </div>

                {/* Print styles — A4 landscape, black & white */}
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body, html { background: white !important; }
                        * { color: black !important; background: transparent !important;
                            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background: #1e1e1e !important; color: white !important; }
                        tr:nth-child(even) td { background: #f5f5f5 !important; }
                    }
                    @page { size: A4 landscape; margin: 10mm; }
                `}</style>

                <div className="overflow-auto flex-1 p-4 bg-gray-100 no-print-bg">
                    <div className="w-full flex justify-center">
                        <Namuna9PrintFormat records={[selectedRecord]} />
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

    const handlePrint = (id: string) => {
        const record = records.find(r => r.id === id);
        if (record) setPrintRecord(record);
    };

    // ─── LIST VIEW (High-Fidelity Overhaul) ──────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm no-print shrink-0 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-gray-800">नमुना ९ — कर मागणी व वसुली नोंदवही</h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-medium">
                            <span>{filteredRecords.length} नोंदी</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                            <TransliterationInput placeholder="नाव, प्लॉट शोधा... (English मध्ये टाइप करा)" value={searchTerm}
                                onChangeText={setSearchTerm}
                                className="pl-9 pr-12 py-2 border border-gray-200 rounded-xl text-sm w-48 lg:w-64 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select className="text-sm bg-transparent outline-none text-gray-700 font-bold"
                                value={filterWasti} onChange={e => setFilterWasti(e.target.value)}>
                                <option value="">सर्व वस्त्या</option>
                                {dynamicWastis.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canAdd && (
                            <button onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                className="flex items-center gap-2 text-sm font-black text-white bg-primary px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95">
                                    <Plus className="w-4 h-4" /> नवीन नोंद
                            </button>
                        )}
                        {/* <button onClick={() => setShowRegister(true)}
                            className="flex items-center gap-2 text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-100 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95">
                            <Printer className="w-4 h-4" /> प्रिंट / PDF यादी
                        </button> */}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 xl:p-6 pb-0 xl:pb-0 flex flex-col">
                <div className="bg-white rounded-t-2xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col">
                    <NamunaTable9
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={canEdit ? handleEdit : undefined}
                        onDelete={canDelete ? handleDelete : undefined}
                        onView={setViewId}
                        onPrint={handlePrint}
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
