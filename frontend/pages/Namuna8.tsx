import { API_BASE_URL } from '@/config';
import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Eye, Filter, FileDown, Plus, Edit2, Trash2 } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES, DEFAULT_SECTION } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import NamunaTable8 from '../components/NamunaTable8';
import { generateNamuna8PDF } from '../utils/pdfGenerator';
import PropertyForm from '../components/PropertyForm';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';

interface Namuna8Props {
    records: PropertyRecord[];
    selectedId: string | null;
    onClearSelected: () => void;
    fetchRecords: () => void;
    taxRates: any[];
    onAuthError?: () => void;
}

export default function Namuna8({ records, selectedId, onClearSelected, fetchRecords, taxRates, onAuthError }: Namuna8Props) {
    const [viewId, setViewId] = useState<string | null>(selectedId);
    const [filterWasti, setFilterWasti] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);

    React.useEffect(() => {
        const fetchWastis = async () => {
            try {
                const token = localStorage.getItem('gp_token');
                const res = await fetch(`${API_BASE_URL}/api/master/items/WASTI`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 && onAuthError) onAuthError();
                const data = await res.json();
                setDynamicWastis(data.map((i: any) => i.item_value_mr));
            } catch (err) { console.error(err); }
        };
        fetchWastis();
    }, []);

    const API_URL = `${API_BASE_URL}/api/properties`;

    const filteredRecords = useMemo(() => {
        let res = records;
        if (filterWasti) res = res.filter(r => r.wastiName === filterWasti);
        if (searchTerm.trim()) {
            res = res.filter(r => matchesSearch(r, searchTerm));
        }
        return res;
    }, [records, filterWasti, searchTerm]);

    const selectedRecord = useMemo(() => records.find(r => r.id === viewId), [records, viewId]);

    const handleSave = async (updatedRecord: PropertyRecord) => {
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedRecord)
            });
            if (res.status === 401 && onAuthError) onAuthError();
            if (res.ok) {
                fetchRecords();
                setShowForm(false);
                setEditingRecord(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('ही नोंद कायमची हटवायची आहे का?')) return;
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_URL}/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) onAuthError();
            if (res.ok) {
                fetchRecords();
                if (viewId === id) {
                    setViewId(null);
                    onClearSelected();
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (record: PropertyRecord) => {
        const count = record.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').length || 1;
        setVisibleFloorCount(count);
        setEditingRecord(record);
        setShowForm(true);
    };

    const existingLayouts = useMemo(() => Array.from(new Set(records.map(r => r.layoutName).filter(Boolean))), [records]);
    const existingKhasras = useMemo(() => Array.from(new Set(records.map(r => r.khasraNo).filter(Boolean))), [records]);

    // ─── SINGLE RECORD DETAIL VIEW ─────────────────────────────────────────
    if (viewId && selectedRecord) {
        return (
            <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
                {/* Toolbar — hidden on print */}
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
                    <button onClick={() => handleEdit(selectedRecord)}
                        className="flex items-center gap-2 text-sm font-bold text-amber-600 border border-amber-200 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-all">
                        <Edit2 className="w-4 h-4" /> सुधारा
                    </button>
                    <button onClick={async () => await generateNamuna8PDF([selectedRecord], selectedRecord.wastiName || '')}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-gray-800 px-5 py-2 rounded-xl hover:bg-black transition-all">
                        <FileDown className="w-4 h-4" /> PDF डाउनलोड
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

                <div className="overflow-auto flex-1 p-4 bg-white">
                    <NamunaTable8 records={[selectedRecord]} filterWasti={selectedRecord.wastiName} />
                </div>

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
                        onAuthError={onAuthError}
                    />
                )}
            </div>
        );
    }


    // ─── MAIN LIST VIEW (High-Fidelity Register) ──────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="bg-white border-b border-slate-200 px-4 xl:px-6 py-3 xl:py-4 shadow-sm no-print shrink-0 relative z-10">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            नमुना ८ — मालमत्ता आकारणी नोंदवही
                            <span className="text-xs font-bold bg-primary/5 text-primary px-2 py-1 rounded-lg border border-primary/20">Official Format</span>
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-medium">
                            <span>{PANCHAYAT_CONFIG.financialYear}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
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
                        <button onClick={() => { setEditingRecord(null); setShowForm(true); setVisibleFloorCount(1); }}
                            className="flex items-center gap-2 text-sm font-black text-white bg-primary px-4 py-2 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95">
                            <Plus className="w-4 h-4" /> नवीन नोंद
                        </button>
                        <button onClick={async () => await generateNamuna8PDF(filteredRecords, filterWasti)}
                            className="flex items-center gap-2 text-sm font-black text-white bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 rounded-xl shadow-lg shadow-rose-100 hover:from-rose-700 hover:to-pink-700 transition-all active:scale-95">
                            <FileDown className="w-4 h-4" /> रजिस्टर PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 xl:p-6 pb-0 xl:pb-0 flex flex-col">
                <div className="bg-white rounded-t-2xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col">
                    <NamunaTable8
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={setViewId}
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
                    onAuthError={onAuthError}
                />
            )}
        </div>
    );
}
