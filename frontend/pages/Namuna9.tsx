import { API_BASE_URL } from '@/config';
import React, { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Eye, Filter, CheckCircle2, AlertTriangle, Clock, FileDown, Plus, Edit2, Receipt } from 'lucide-react';
import { PropertyRecord, WASTI_NAMES, DEFAULT_SECTION } from '../types';
import { PANCHAYAT_CONFIG } from '../panchayatConfig';
import NamunaTable9 from '../components/NamunaTable9';
import { generateNamuna9PDF } from '../utils/pdfGenerator';
import PropertyForm from '../components/PropertyForm';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

interface Namuna9Props {
    records: PropertyRecord[];
    selectedId: string | null;
    fetchRecords: () => void;
    taxRates: any[];
    onAuthError?: () => void;
}

export default function Namuna9({ records, selectedId, fetchRecords, taxRates, onAuthError }: Namuna9Props) {
    const [viewId, setViewId] = useState<string | null>(selectedId);
    const [filterWasti, setFilterWasti] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showRegister, setShowRegister] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null);
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [saving, setSaving] = useState(false);
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    const toggleSelectAll = (ids: string[]) => {
        const allSelected = ids.every(id => selectedIds.has(id));
        const newSelected = new Set(selectedIds);
        if (allSelected) {
            ids.forEach(id => newSelected.delete(id));
        } else {
            ids.forEach(id => newSelected.add(id));
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleBulkNamuna9 = async () => {
        const selectedRecords = records.filter(r => selectedIds.has(r.id));
        await generateNamuna9PDF(selectedRecords, filterWasti);
        setSelectedIds(new Set());
    };

    React.useEffect(() => {
        setSelectedIds(new Set());
    }, [filterWasti, searchTerm]);

    const selectedRecord = useMemo(() => records.find(r => r.id === viewId), [records, viewId]);

    const handleSave = async (record: PropertyRecord) => {
        setSaving(true);
        const isNew = !editingRecord;
        const maxSrNo = records.reduce((max, r) => Math.max(max, Number(r.srNo) || 0), 0);
        const finalRecord = isNew ? { ...record, srNo: maxSrNo + 1 } : record;
        try {
            const token = localStorage.getItem('gp_token');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(finalRecord)
            });
            if (response.status === 401 && onAuthError) onAuthError();
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
            const token = localStorage.getItem('gp_token');
            const response = await fetch(`${API_URL}/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 && onAuthError) onAuthError();
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

    const existingLayouts = useMemo(() => Array.from(new Set(records.map(r => r.layoutName).filter(Boolean))), [records]);
    const existingKhasras = useMemo(() => Array.from(new Set(records.map(r => r.khasraNo).filter(Boolean))), [records]);

    // ─── REGISTER PRINT VIEW ──────────────────────────────────────────────────
    if (showRegister) {
        return (
            <div className="flex flex-col h-full bg-gray-100">
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm">
                    <button onClick={() => setShowRegister(false)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={async () => await generateNamuna9PDF(filteredRecords, filterWasti)}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-gray-800 px-5 py-2 rounded-xl hover:bg-black">
                        <FileDown className="w-4 h-4" /> PDF डाउनलोड
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark">
                        <Printer className="w-4 h-4" /> प्रिंट
                    </button>
                </div>
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
                <div className="overflow-auto flex-1 p-4">
                    <NamunaTable9 records={filteredRecords} filterWasti={filterWasti} />
                </div>
            </div>
        );
    }

    // ─── SINGLE RECORD DETAIL VIEW ───────────────────────────────────────────
    if (viewId && selectedRecord) {
        return (
            <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
                <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 no-print shadow-sm">
                    <button onClick={() => setViewId(null)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200">
                        <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => handleEdit(selectedRecord)}
                        className="flex items-center gap-2 text-sm font-bold text-amber-600 border border-amber-200 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100">
                        <Edit2 className="w-4 h-4" /> संपादित करा
                    </button>
                    <button onClick={async () => await generateNamuna9PDF([selectedRecord], selectedRecord.wastiName || '')}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-gray-800 px-5 py-2 rounded-xl hover:bg-black transition-all">
                        <FileDown className="w-4 h-4" /> PDF डाउनलोड
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-primary px-5 py-2 rounded-xl hover:bg-primary-dark">
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
                    <NamunaTable9 records={[selectedRecord]} filterWasti={selectedRecord.wastiName} />
                </div>
            </div>
        );
    }

    if (viewId && !selectedRecord) {
        return (
            <div className="p-10 text-center text-gray-400">
                <p>नोंद सापडली नाही.</p>
                <button onClick={() => setViewId(null)} className="mt-3 text-primary font-bold hover:underline flex items-center gap-1 mx-auto">
                    <ArrowLeft className="w-4 h-4" /> यादीकडे परत
                </button>
            </div>
        );
    }

    // ─── LIST VIEW (High-Fidelity Overhaul) ──────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 py-3 xl:px-6 shadow-sm no-print flex-none">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100/50">
                            <span className="text-indigo-600 font-black text-lg">९</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-tight">नमुना ९ — मागणी व वसुली</h2>
                            <p className="text-[11px] text-slate-500 font-bold mt-0.5">{MN(filteredRecords.length)} नोंदी उपलब्ध</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10 group-focus-within:text-indigo-500 transition-colors" />
                            <TransliterationInput placeholder="नाव किंवा प्लॉट शोधा..." value={searchTerm}
                                onChangeText={setSearchTerm}
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full sm:w-56 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 hover:border-slate-300" />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:border-slate-300 transition-colors">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select className="text-sm bg-transparent outline-none text-slate-700 font-bold cursor-pointer"
                                value={filterWasti} onChange={e => setFilterWasti(e.target.value)}>
                                <option value="">सर्व वस्त्या</option>
                                {dynamicWastis.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 ml-auto xl:ml-0">
                            <button onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95">
                                <Plus className="w-4 h-4" /> नवीन नोंद
                            </button>
                            <button onClick={() => setShowRegister(true)}
                                className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95">
                                <Printer className="w-4 h-4" /> प्रिंट / PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-3 xl:p-6 pb-0 xl:pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                    <NamunaTable9
                        records={filteredRecords}
                        filterWasti={filterWasti}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={setViewId}
                        showActions={true}
                        selectedIds={selectedIds}
                        toggleSelectOne={toggleSelectOne}
                        toggleSelectAll={toggleSelectAll}
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

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-10 fade-in duration-300 no-print">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-8 min-w-[400px]">
                        <div className="flex flex-col">
                            <span className="text-white text-lg font-black leading-none">{MN(selectedIds.size)}</span>
                            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">निवडलेल्या नोंदी</span>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBulkNamuna9}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                            >
                                <Receipt className="w-4 h-4" /> नमुना ९ डाऊनलोड करा
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="px-4 py-2.5 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-2xl font-black text-xs transition-all active:scale-95"
                            >
                                रद्द करा
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
