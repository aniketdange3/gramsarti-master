/**
 * DASHBOARD COMPONENT - मालमत्ता व्यवस्थापन केंद्र (Property Management Hub)
 * 
 * हे मॉड्यूल गावातील सर्व मालमत्तांचा (Properties) डेटा शोधण्यासाठी, फिल्टर करण्यासाठी 
 * आणि व्यवस्थापित करण्यासाठी वापरले जाते.
 * 
 * डेटा फ्लो प्रोसेस (STEP-BY-STEP):
 * 1. Initialization: सर्व मालमत्तांची यादी (records) सर्व्हर कडून घेऊन `records` स्टेटमध्ये साठवली जाते.
 * 2. Search & Filter: युजरने टाकलेल्या सर्च टर्म आणि ५ फिल्टर्स (वस्ती, लेआउट इ.) नुसार `filteredRecords` तयार केले जातात.
 * 3. Stats Calculation: फिल्टर केलेल्या डेटावर आधारित एकूण मागणी, वसुली आणि थकबाकीची बेरीज करून वरच्या कार्ड्समध्ये दाखवली जाते.
 * 4. Marathi Numerals (MN): सिस्टिममधील सर्व संख्यात्मक डेटा 'MN' हेल्पर फंक्शन द्वारे मराठी आकड्यांमध्ये रूपांतरित केला जातो.
 */

import { API_BASE_URL } from '@/utils/config';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useUI } from '../components/UIProvider';
import { Plus, FileSpreadsheet, Search, Edit2, Trash2, X, ChevronRight, ChevronLeft, FileDown, Printer, FileUp, FileText, Receipt, Eye, TrendingUp, Users, IndianRupee, AlertTriangle, CheckCircle2, Filter, RotateCcw, Shield, ChevronDown, LayoutDashboard } from 'lucide-react';
import { PropertyRecord, PropertySection, DEFAULT_SECTION, FLOOR_NAMES, PROPERTY_TYPES, WASTI_NAMES } from '../types';
import { ROLES } from './Login';
import { EXCEL_HEADERS, PLACEHOLDERS } from '../utils/constants';
import { LABELS } from "../types";
import * as XLSX from 'xlsx';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import PropertyForm from '../components/PropertyForm';
import { generateMaganiBillPDF } from '../utils/pdfGenerator';
import MaganiBillDocument from '../components/MaganiBillDocument';
import { ArrowLeft } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';
import { hasModulePermission } from '../utils/permissions';
import UserManagement from '../components/UserManagement';


// Custom sorter for Khasra numbers: Marathi first, then English, numeric 1 to end
const sortKhasra = (a: string, b: string) => {
    const aStr = String(a || '');
    const bStr = String(b || '');
    const aIsMarathi = /[०-९]/.test(aStr);
    const bIsMarathi = /[०-९]/.test(bStr);
    if (aIsMarathi && !bIsMarathi) return -1;
    if (!aIsMarathi && bIsMarathi) return 1;

    // Convert Marathi digits to English for numeric comparison
    const aEng = aStr.replace(/[०-९]/g, (d: string) => '0123456789'['०१२३४५६७८९'.indexOf(d)] || d);
    const bEng = bStr.replace(/[०-९]/g, (d: string) => '0123456789'['०१२३४५६७८९'.indexOf(d)] || d);

    return aEng.localeCompare(bEng, undefined, { numeric: true, sensitivity: 'base' });
};

// --- Marathi Numerals ---
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

// --- Animated Counter Hook ---
const useCountUp = (end: number, duration: number = 1200) => {
    const [value, setValue] = useState(0);
    const ref = React.useRef(0);
    useEffect(() => {
        ref.current = 0;
        setValue(0);
        if (end === 0) return;
        const startTime = performance.now();
        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo for smooth deceleration
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = Math.round(eased * end);
            setValue(current);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [end, duration]);
    return value;
};

const StatCard = ({ title, value, icon, gradient, textColor }: {
    title: string; value: string | number;
    icon: React.ReactNode; gradient: string; textColor: string;
}) => (
    <div className="bg-white rounded-[2rem] px-8 py-7 border border-slate-100 hover:border-indigo-200 transition-all duration-500 group flex flex-col gap-5 shadow-sm hover:shadow-xl hover:-translate-y-1">
        <div className={`w-14 h-14 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner`}>
            {React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-end">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-3 truncate">{title}</p>
            <div className="flex items-baseline gap-1">
                <p className={`text-2xl font-black text-slate-900 leading-none tracking-tighter`}>{MN(value)}</p>
            </div>
        </div>
    </div>
);

// --- Main Dashboard ---
interface DashboardProps {
    records: PropertyRecord[];
    fetchRecords: () => void;
    onUpdateLocalRecord: (record: any) => void;
    onRemoveLocalRecord: (id: string) => void;
    taxRates: any[];
    onViewRecord: (id: string, view: 'namuna8' | 'namuna9') => void;
    onAuthError?: () => void;
    initialTab?: 'dashboard' | 'user_requests';
    key?: string;
}

export default function Dashboard({ records, fetchRecords, onUpdateLocalRecord, onRemoveLocalRecord, taxRates, onViewRecord, onAuthError, initialTab }: DashboardProps) {
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PropertyRecord | null>(null);
    const [viewingRecord, setViewingRecord] = useState<PropertyRecord | null>(null);
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWasti, setFilterWasti] = useState('');
    const [filterLayout, setFilterLayout] = useState('');
    const [filterKhasra, setFilterKhasra] = useState('');
    const [filterPlotNo, setFilterPlotNo] = useState('');
    const [filterPropertyType, setFilterPropertyType] = useState('');
    const [saving, setSaving] = useState(false);
    const [dynamicWastis, setDynamicWastis] = useState<string[]>([]);
    const [dynamicPropertyTypes, setDynamicPropertyTypes] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAll, setShowAll] = useState(false);
    const ITEMS_PER_PAGE = 25;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'user_requests'>(initialTab || 'dashboard');
    const [activeBillRecord, setActiveBillRecord] = useState<PropertyRecord | null>(null);
    const { addToast } = useUI();

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv' || currentUser.role === 'gram_sevak';
    const canView = hasModulePermission(currentUser, 'dashboard', 'view');
    const canEdit = hasModulePermission(currentUser, 'dashboard', 'edit');
    const canDelete = hasModulePermission(currentUser, 'dashboard', 'delete');



    useEffect(() => {
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

    // Cascading filter: each dropdown only shows values from records matching parent filters
    const wastiFiltered = useMemo(() => filterWasti ? records.filter(r => r.wastiName === filterWasti) : records, [records, filterWasti]);
    const layoutFiltered = useMemo(() => filterLayout ? wastiFiltered.filter(r => r.layoutName === filterLayout) : wastiFiltered, [wastiFiltered, filterLayout]);
    const khasraFiltered = useMemo(() => filterKhasra ? layoutFiltered.filter(r => r.khasraNo === filterKhasra) : layoutFiltered, [layoutFiltered, filterKhasra]);

    const uniqueWastis = useMemo(() => Array.from(new Set(records.map(r => r.wastiName).filter(Boolean))).sort(), [records]);
    const uniqueLayouts = useMemo(() => Array.from(new Set(wastiFiltered.map(r => r.layoutName).filter(Boolean))).sort(), [wastiFiltered]);
    const uniqueKhasras = useMemo(() => Array.from(new Set(layoutFiltered.map(r => r.khasraNo).filter(Boolean))).sort(sortKhasra), [layoutFiltered]);
    const uniquePlots = useMemo(() => Array.from(new Set(khasraFiltered.map(r => r.plotNo).filter(Boolean))).sort(sortKhasra), [khasraFiltered]);
    const hasActiveFilters = filterWasti || filterLayout || filterKhasra || filterPlotNo || filterPropertyType;

    // Reset child filters when parent changes
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
        if (searchTerm.trim()) res = res.filter(r => matchesSearch(r, searchTerm));
        return res;
    }, [records, searchTerm, filterWasti, filterLayout, filterKhasra, filterPlotNo, filterPropertyType]);

    // Reset page on filter/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterWasti, filterLayout, filterKhasra, filterPlotNo, filterPropertyType]);

    // Highlight duplicate records (same Khasra, Wasti, and Owner Name)
    const duplicateMap = useMemo(() => {
        const counts = new Map<string, number>();
        records.forEach(r => {
            const key = `${String(r.khasraNo || '').trim()}|${String(r.wastiName || '').trim()}|${String(r.ownerName || '').trim()}`.toLowerCase();
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return counts;
    }, [records]);



    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
    const paginatedRecords = useMemo(() => {
        if (showAll) return filteredRecords;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredRecords, currentPage, showAll]);

    const existingLayouts = useMemo(() => {
        return Array.from(new Set(records.map(r => r.layoutName).filter(Boolean))).sort();
    }, [records]);

    const existingKhasras = useMemo(() => {
        return Array.from(new Set(records.map(r => r.khasraNo).filter(Boolean))).sort(sortKhasra);
    }, [records]);

    const stats = useMemo(() => {
        const chaluTax = records.reduce((sum, r) => sum + (Number(r.totalTaxAmount) || 0), 0);
        const magilTax = records.reduce((sum, r) => sum + (Number(r.arrearsAmount) || 0), 0);
        const wasuli = records.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
        const totalDemand = chaluTax + magilTax;
        const baki = totalDemand - wasuli;
        const recoveryRate = totalDemand > 0 ? (wasuli / totalDemand) * 100 : 0;

        return { chaluTax, magilTax, wasuli, totalDemand, baki, recoveryRate, count: records.length };
    }, [records]);

    // Animated counters
    const animCount = useCountUp(stats.count);
    const animMagil = useCountUp(Math.round(stats.magilTax));
    const animChalu = useCountUp(Math.round(stats.chaluTax));
    const animWasuli = useCountUp(Math.round(stats.wasuli));
    const animBaki = useCountUp(Math.round(stats.baki));
    const animRecovery = useCountUp(Math.round(stats.recoveryRate * 10));

    const handleSave = async (record: PropertyRecord) => {
        setSaving(true);
        const isNew = !editingRecord;
        const maxSrNo = records.reduce((max, r) => Math.max(max, Number(r.srNo) || 0), 0);
        const finalRecord = isNew ? {
            ...record,
            srNo: maxSrNo + 1,
            id: record.id && record.id !== '' ? record.id : 'prop_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
        } : record;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalRecord)
            });
            if (response.ok) {
                // If it was a new record, the server might have generated an ID, but 
                // for simplicity and sync, we use the finalRecord we sent as it has our ID.
                onUpdateLocalRecord(finalRecord);
                setShowForm(false);
                setEditingRecord(null);
                addToast(isNew ? 'नवीन नोंद यशस्वीरित्या जतन केली!' : 'नोंद अद्यतनित केली!', 'success');
            } else {
                const errData = await response.json();
                addToast(`त्रुटी: ${errData.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            addToast('सर्व्हरशी संपर्क करता आला नाही.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteRecord = async (id: string) => {
        if (!window.confirm('आपली खात्री आहे का की आपण ही नोंद हटवू इच्छिता?')) return;
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                onRemoveLocalRecord(id);
                addToast('नोंद हटवली गेली.', 'info');
            }
        } catch (error) {
            addToast('हटवताना त्रुटी आली.', 'error');
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
                    s.openSpaceValue || 0, s.constructionYear || '', s.propertyAge || 0
                );
            }
            row.push(r.propertyTax, r.openSpaceTax, r.streetLightTax, r.healthTax,
                r.generalWaterTax, r.specialWaterTax, r.receiptNo || '', r.receiptBook || '', r.paymentDate || '',
                r.totalTaxAmount, r.arrearsAmount || 0, r.paidAmount || 0);
            return row;
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...wsData]);
        XLSX.utils.book_append_sheet(wb, ws, "Property Records");
        XLSX.writeFile(wb, `GramSarthi_Tax_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast('Excel फाइल डाउनलोड झाली!', 'success');
    };

    const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const importedFiles = JSON.parse(localStorage.getItem('gp_imported_files') || '[]');
        if (importedFiles.includes(file.name)) {
            alert(`'${file.name}' ही फाईल आधीच आयात केली आहे! कृपया दुसरी फाईल निवडा. (This file is already imported)`);
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                const mappedRecords: PropertyRecord[] = data.map((row: any) => {
                    const sections: PropertySection[] = [];
                    for (let i = 0; i < 5; i++) {
                        const baseIdx = 10 + (i * 15);
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
                            constructionYear: String(row[EXCEL_HEADERS[baseIdx + 13]] || ''),
                            propertyAge: Number(row[EXCEL_HEADERS[baseIdx + 14]]) || 0,
                        });
                    }
                    const lastIdx = 10 + (5 * 15);
                    return {
                        id: '', srNo: Number(row[EXCEL_HEADERS[0]]) || 0,
                        wastiName: String(row[EXCEL_HEADERS[1]] ?? ''), wardNo: String(row[EXCEL_HEADERS[2]] ?? ''),
                        khasraNo: String(row[EXCEL_HEADERS[3]] ?? row["खसरा नंबर"] ?? ''), layoutName: String(row[EXCEL_HEADERS[4]] ?? ''),
                        plotNo: String(row[EXCEL_HEADERS[5]] ?? row["प्लॉट क्रमांक"] ?? row["प्लॉट क्र."] ?? row["प्लॉट नं."] ?? row["प्लॉट नं"] ?? row["Plot No"] ?? row["Plot No."] ?? ''),
                        propertyId: String(row[EXCEL_HEADERS[5]] ?? row["मालमत्ता क्र."] ?? row["मालमत्ता क्रमांक"] ?? row["मालमत्ता नं."] ?? row["Property No"] ?? row["Property ID"] ?? row["प्लॉट क्रमांक"] ?? ''),
                        occupantName: String(row[EXCEL_HEADERS[6]] ?? ''),
                        ownerName: String(row[EXCEL_HEADERS[7]] ?? ''),
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
                if (response.ok) {
                    importedFiles.push(file.name);
                    localStorage.setItem('gp_imported_files', JSON.stringify(importedFiles));
                    fetchRecords();
                    addToast(`${mappedRecords.length} नोंदी यशस्वीरित्या आयात केल्या!`, 'success');
                } else {
                    const err = await response.json();
                    addToast(`आयात त्रुटी: ${err.error}`, 'error');
                }
            } catch (error) {
                addToast('फाइल प्रक्रियेत त्रुटी आली.', 'error');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    if (activeBillRecord) {
        return (
            <div className="flex flex-col h-full bg-slate-100 no-print-bg">
                <style>{`
                    @media print {
                        body, html { margin: 0 !important; padding: 0 !important; background: white !important; }
                        .no-print { display: none !important; }
                    }
                `}</style>
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center  no-print shadow-sm sticky top-0 z-50">
                    <button onClick={() => setActiveBillRecord(null)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all">
                        <ArrowLeft className="w-4 h-4" /> डॅशबोर्डकडे परत
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 text-sm font-black text-white bg-indigo-600 px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Printer className="w-4 h-4" /> प्रिंट बिल (लँडस्केप)
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-8 pt-4 flex justify-center no-print-bg">
                    <MaganiBillDocument record={activeBillRecord} />
                </div>
            </div>
        );
    }

    return (
        <>
            <header className="no-print shrink-0 bg-white border-b border-slate-100 px-4 py-2">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab(activeTab === 'dashboard' ? 'user_requests' : 'dashboard')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider border ${activeTab === 'user_requests'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/10'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Shield size={12} /> रोल अ‍ॅक्सेस
                            </button>
                        )}
                        {(canEdit || isAdmin) && (
                            <>
                                <label className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider shadow-sm active:scale-95">
                                    <FileUp size={12} /> आयात
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={importFromExcel} />
                                </label>
                                <button
                                    onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-all text-[9px] active:scale-95"
                                >
                                    <Plus size={12} /> नवीन नोंद
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden space-y-2 bg-white flex flex-col px-2 py-2">
                {activeTab === 'user_requests' ? (
                    <UserManagement onAuthError={onAuthError} addToast={addToast} />
                ) : (
                    <>
                        {/* Unified Single-Row Search & Filter Bar */}
                        <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl no-print flex-wrap lg:flex-nowrap shadow-sm text-Marathi">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 z-10" />
                                <TransliterationInput
                                    placeholder="शोधा..."
                                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-transparent rounded-lg text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
                                <CustomDropdown
                                    value={filterWasti}
                                    onChange={handleWastiChange}
                                    placeholder="प्रभाग/वस्ती"
                                    options={uniqueWastis.map(w => ({ value: w, label: w }))}
                                />
                                <CustomDropdown
                                    value={filterLayout}
                                    onChange={handleLayoutChange}
                                    placeholder="लेआउट"
                                    options={uniqueLayouts.map(l => ({ value: l, label: l }))}
                                />
                                <CustomDropdown
                                    value={filterKhasra}
                                    onChange={handleKhasraChange}
                                    placeholder="खसरा"
                                    options={uniqueKhasras.map(k => ({ value: k, label: k }))}
                                />
                                <CustomDropdown
                                    value={filterPlotNo}
                                    onChange={setFilterPlotNo}
                                    placeholder="प्लॉट/घर"
                                    options={uniquePlots.map(p => ({ value: p, label: p }))}
                                />
                                <CustomDropdown
                                    value={filterPropertyType}
                                    onChange={setFilterPropertyType}
                                    placeholder="प्रकार"
                                    options={dynamicPropertyTypes.map(p => ({ value: p, label: p }))}
                                />
                                {hasActiveFilters && (
                                    <button onClick={() => { setFilterWasti(''); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); setFilterPropertyType(''); setSearchTerm(''); }}
                                        className="flex items-center gap-1 text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg hover:bg-rose-100 transition-all active:scale-95 whitespace-nowrap">
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

                        {/* Records Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm text-Marathi">
                            <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between bg-white shrink-0 relative z-10">
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">मालमत्ता सूची</h3>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowAll(!showAll)}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${showAll
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        {showAll ? 'पृष्ठानुसार' : 'सर्व पहा'}
                                    </button>
                                    <p className="text-xs font-bold text-slate-400">
                                        {searchTerm ? `"${searchTerm}" : ${filteredRecords.length} परिणाम सापडले` : `एकूण ${filteredRecords.length} नोंदणीकृत मालमत्ता`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className="sticky top-0 z-20 text-Marathi">
                                        <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[60px] text-center">अ.क्र.</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[120px]">वस्ती</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px] text-center">खसरा</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px] text-center">मालमत्ता/प्लॉट</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[180px]">मालकाचे नाव</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[140px] text-center">प्रकार/क्षेत्रफळ</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[100px] text-right">थकबाकी</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[100px] text-right">मागणी</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[100px] text-right">वसूल</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[100px] text-right">बाकी</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[120px] text-center">कृती</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRecords.length > 0 ? paginatedRecords.map((record, idx) => {
                                            const dKey = `${String(record.khasraNo || '').trim()}|${String(record.wastiName || '').trim()}|${String(record.ownerName || '').trim()}`.toLowerCase();
                                            const isDuplicate = (duplicateMap.get(dKey) || 0) > 1;

                                            return (
                                                <tr key={record.id} className={`hover:bg-slate-50 transition-colors group ${isDuplicate ? 'bg-red-50/50' : ''}`}>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs font-medium text-slate-400">
                                                            {MN((showAll ? 0 : (currentPage - 1) * ITEMS_PER_PAGE) + idx + 1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-slate-900">{record.wastiName || '-'}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">Ward {MN(record.wardNo)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{MN(record.khasraNo) || '-'}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs font-medium text-slate-600">{MN(record.plotNo) || '-'}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-900 uppercase">{record.ownerName}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">{record.occupantName || 'Self'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {record.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                                            <div key={si} className="text-[10px] text-slate-500 font-medium">
                                                                {s.propertyType} • {MN(s.areaSqFt)} ft²
                                                            </div>
                                                        ))}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-slate-600">{MN(Number(record.arrearsAmount || 0))}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-indigo-600">{MN(Number(record.totalTaxAmount || 0))}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-emerald-600">{MN(Number(record.paidAmount || 0))}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-slate-900">
                                                            {MN(Number(record.totalTaxAmount || 0) + Number(record.arrearsAmount || 0) + (Number(record.penaltyAmount) || 0) - Number(record.paidAmount || 0) - (Number(record.discountAmount) || 0))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => setViewingRecord(record)} className="w-7 h-7 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg hover:bg-slate-600 hover:text-white transition-all shadow-sm border border-slate-100" title="तपशील">
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            {canEdit && (
                                                                <button onClick={() => {
                                                                    const count = record.sections.filter(s => s.propertyType && s.propertyType !== 'निवडा').length;
                                                                    setVisibleFloorCount(count > 0 ? count : 1);
                                                                    setEditingRecord(record); setShowForm(true);
                                                                }} className="w-7 h-7 flex items-center justify-center text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100" title="संपादित">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => setActiveBillRecord(record)} className="w-7 h-7 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100 relative group" title="मागणी बिल (Magani Bill)">
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </button>
                                                            {canDelete && !record.remarksNotes && (
                                                                <button onClick={() => deleteRecord(record.id)} className="w-7 h-7 flex items-center justify-center text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100" title="हटवा">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={11} className="py-20 text-center text-Marathi">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                                            <Search className="w-6 h-6 text-slate-200" />
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <p className="text-slate-900 font-bold text-sm">कोणतीही नोंद सापडली नाही</p>
                                                            <p className="text-slate-400 font-medium text-xs mt-1">
                                                                {searchTerm ? `तुमचा शोध "${searchTerm}" साठी तपासा` : 'नवीन मालमत्ता नोंद जोडून सुरुवात करा'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && !showAll && (
                                <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 relative z-10 w-full text-Marathi">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        पृष्ठ <span className="text-slate-900">{MN(currentPage)}</span> पैकी <span className="text-slate-900">{MN(totalPages)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-sm"
                                        >
                                            <ChevronDown className="rotate-90 w-3.5 h-3.5" /> मागील
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum: number;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${currentPage === pageNum
                                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                                                            }`}
                                                    >
                                                        {MN(pageNum)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-sm"
                                        >
                                            पुढील <ChevronDown className="-rotate-90 w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
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
                    records={records}
                />
            )}

            {/* View Record Modal */}
            {viewingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center">
                    <div className="bg-white rounded-[3rem] max-w-xl w-full overflow-hidden premium-shadow-lg border border-white/20 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 pb-6 flex justify-between items-start bg-gradient-to-br from-indigo-900 to-indigo-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                            <div className="relative z-10">
                                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 leading-none">मालमत्ता तपशील कार्ड</h2>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{viewingRecord.ownerName}</h3>
                                <p className="text-indigo-200 text-xs font-bold mt-1.5 opacity-80 flex items-center gap-2">
                                    <span className="bg-indigo-400/20 px-2 py-0.5 rounded-md">ID: {MN(viewingRecord.srNo)}</span>
                                    <span>•</span>
                                    <span>{viewingRecord.wastiName}</span>
                                </p>
                            </div>
                            <button onClick={() => setViewingRecord(null)} className="relative z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                                    <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1.5 leading-none text-center">चालू कर</p>
                                    <p className="font-black text-indigo-700 text-lg leading-none text-center">₹{MN(Math.round(viewingRecord.totalTaxAmount))}</p>
                                </div>
                                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/50">
                                    <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-1.5 leading-none text-center">थकबाकी</p>
                                    <p className="font-black text-rose-700 text-lg leading-none text-center">₹{MN(Math.round(viewingRecord.arrearsAmount || 0))}</p>
                                </div>
                                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1.5 leading-none text-center">भरलेले</p>
                                    <p className="font-black text-emerald-700 text-lg leading-none text-center">₹{MN(Math.round(viewingRecord.paidAmount || 0))}</p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {[
                                    { label: 'वस्ती / वॉर्ड', value: `${viewingRecord.wastiName} (वॉर्ड ${MN(viewingRecord.wardNo)})` },
                                    { label: 'प्लॉट क्र.', value: MN(viewingRecord.plotNo) },
                                    { label: 'खसरा क्र.', value: MN(viewingRecord.khasraNo) },
                                    { label: 'ताबा धारक', value: viewingRecord.occupantName || '-' },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1.5">{label}</p>
                                        <p className="font-black text-slate-700 text-sm tracking-tight">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Actions Area */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">द्रुत अहवाल (Quick Reports)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => { onViewRecord(viewingRecord.id, 'namuna8'); setViewingRecord(null); }}
                                        className="flex items-center gap-4 p-4 bg-white border border-indigo-100 rounded-3xl hover:border-indigo-600 hover:bg-indigo-50 group transition-all"
                                    >
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-800 text-sm leading-tight">नमुना ८</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">आकारणी नोंदवही</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { onViewRecord(viewingRecord.id, 'namuna9'); setViewingRecord(null); }}
                                        className="flex items-center gap-4 p-4 bg-white border border-indigo-100 rounded-3xl hover:border-indigo-600 hover:bg-slate-50 group transition-all"
                                    >
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-800 text-sm leading-tight">नमुना ९</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">मागणी व वसुली</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => { setActiveBillRecord(viewingRecord); setViewingRecord(null); }}
                                className="flex-1 flex items-center justify-center gap-3 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 active:scale-95 transition-all text-sm"
                            >
                                <FileText className="w-4 h-4" /> मागणी बिल प्रिंट
                            </button>
                            <button
                                onClick={() => setViewingRecord(null)}
                                className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 active:scale-95 transition-all text-sm"
                            >
                                बंद करा
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
