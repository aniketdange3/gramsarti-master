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
import { Plus, FileSpreadsheet, Search, Edit2, Trash2, X, ChevronRight, ChevronLeft, FileDown, Printer, FileUp, FileText, Receipt, Eye, TrendingUp, Users, IndianRupee, AlertTriangle, CheckCircle2, Filter, RotateCcw, Shield, ChevronDown, LayoutDashboard, BookOpen } from 'lucide-react';

import { PropertyRecord, PropertySection, DEFAULT_SECTION, FLOOR_NAMES, PROPERTY_TYPES, WASTI_NAMES } from '../types';
import { ROLES } from './Login';
import { EXCEL_HEADERS, PLACEHOLDERS } from '../utils/constants';
import { LABELS } from "../types";
import * as XLSX from 'xlsx';
import { matchesSearch, normalizeForSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import PropertyForm from '../components/PropertyForm';
import { generateMaganiBillPDF } from '../utils/pdfGenerator';
import MaganiBillDocument from '../components/MaganiBillDocument';
import { ArrowLeft } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';
import { hasModulePermission } from '../utils/permissions';
import UserManagement from '../components/UserManagement';
import { exportToExcel } from '../utils/exportUtils';



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
const MN = (v: number | string | undefined) => {
    if (v === undefined || v === null) return '०';
    const rounded = typeof v === 'number' ? Math.round(v) : v;
    const s = typeof rounded === 'number' ? rounded.toLocaleString('en-IN') : String(rounded);
    return s.replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
};

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
    const [visibleFloorCount, setVisibleFloorCount] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWasti, setFilterWasti] = useState('');
    const [filterLayout, setFilterLayout] = useState('');
    const [filterKhasra, setFilterKhasra] = useState('');
    const [filterPlotNo, setFilterPlotNo] = useState('');
    const [filterPropertyType, setFilterPropertyType] = useState('');
    const [filterNamuna, setFilterNamuna] = useState<'' | 'namuna8' | 'namuna9'>('');
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
                const token = localStorage.getItem('gp_token');
                const headers = { 'Authorization': `Bearer ${token}` };
                const [wRes, pRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/master/items/WASTI`, { headers }),
                    fetch(`${API_BASE_URL}/api/master/items/PROPERTY_TYPE`, { headers })
                ]);

                if (wRes.status === 401 || pRes.status === 401) {
                    onAuthError?.();
                    return;
                }

                const wastis = await wRes.json();
                const types = await pRes.json();

                if (Array.isArray(wastis)) {
                    setDynamicWastis(wastis.map((i: any) => i.item_value_mr));
                }
                if (Array.isArray(types)) {
                    setDynamicPropertyTypes(types.map((i: any) => i.item_value_mr));
                }
            } catch (err) { console.error(err); }
        };
        loadMasters();
    }, [onAuthError]);


    const API_URL = `${API_BASE_URL}/api/properties`;

    // Cascading filter: each dropdown only shows values from records matching parent filters
    const wastiFiltered = useMemo(() => filterWasti ? records.filter(r => r.wastiName === filterWasti) : records, [records, filterWasti]);
    const layoutFiltered = useMemo(() => filterLayout ? wastiFiltered.filter(r => r.layoutName === filterLayout) : wastiFiltered, [wastiFiltered, filterLayout]);
    const khasraFiltered = useMemo(() => filterKhasra ? layoutFiltered.filter(r => r.khasraNo === filterKhasra) : layoutFiltered, [layoutFiltered, filterKhasra]);

    const uniqueWastis = useMemo(() => Array.from(new Set(records.map(r => r.wastiName).filter(Boolean))).sort(), [records]);
    const uniqueLayouts = useMemo(() => Array.from(new Set(wastiFiltered.map(r => r.layoutName).filter(Boolean))).sort(), [wastiFiltered]);
    const uniqueKhasras = useMemo(() => Array.from(new Set(layoutFiltered.map(r => r.khasraNo).filter(Boolean))).sort(sortKhasra), [layoutFiltered]);
    const uniquePlots = useMemo(() => Array.from(new Set(khasraFiltered.map(r => r.plotNo).filter(Boolean))).sort(sortKhasra), [khasraFiltered]);
    const hasActiveFilters = filterWasti || filterLayout || filterKhasra || filterPlotNo || filterPropertyType || filterNamuna;

    // Reset child filters when parent changes
    const handleWastiChange = (v: string) => { setFilterWasti(v); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); };
    const handleLayoutChange = (v: string) => { setFilterLayout(v); setFilterKhasra(''); setFilterPlotNo(''); };
    const handleKhasraChange = (v: string) => { setFilterKhasra(v); setFilterPlotNo(''); };

    const filteredRecords = useMemo(() => {
        let res = records;
        if (filterWasti) res = res.filter(r => r.wastiName === filterWasti);
        if (filterLayout) res = res.filter(r => r.layoutName === filterLayout);
        if (filterKhasra) {
            const normalizedKhasra = normalizeForSearch(filterKhasra);
            res = res.filter(r => normalizeForSearch(r.khasraNo) === normalizedKhasra);
        }
        if (filterPlotNo) {
            const normalizedPlot = normalizeForSearch(filterPlotNo);
            res = res.filter(r => normalizeForSearch(r.plotNo) === normalizedPlot);
        }
        if (filterPropertyType) {
            res = res.filter(r => r.sections.some(s => s.propertyType === filterPropertyType));
        }
        // Namuna 8: properties with construction (sections with area > 0)
        if (filterNamuna === 'namuna8') {
            res = res.filter(r => r.hasConstruction || r.sections?.some(s => s.propertyType && (s.areaSqFt || 0) > 0));
        }
        // Namuna 9: properties with any tax demand (milled for recovery)
        if (filterNamuna === 'namuna9') {
            res = res.filter(r => (Number(r.totalTaxAmount) || 0) > 0);
        }
        if (searchTerm.trim()) res = res.filter(r => matchesSearch(r, searchTerm));
        return [...res].sort((a, b) => {
            if (filterLayout || filterKhasra) {
                const plotCompare = sortKhasra(a.plotNo || '', b.plotNo || '');
                if (plotCompare !== 0) return plotCompare;
            }
            const aNum = Number(a.srNo) || 0;
            const bNum = Number(b.srNo) || 0;
            if (aNum !== bNum) return aNum - bNum;
            return String(a.srNo || '').localeCompare(String(b.srNo || ''), undefined, { numeric: true });
        });
    }, [records, searchTerm, filterWasti, filterLayout, filterKhasra, filterPlotNo, filterPropertyType, filterNamuna]);

    // Reset page on filter/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterWasti, filterLayout, filterKhasra, filterPlotNo, filterPropertyType, filterNamuna]);


    // Highlight duplicate records (same Khasra, Wasti, and Owner Name)
    const duplicateMap = useMemo(() => {
        const counts = new Map<string, number>();

        records.forEach(r => {
            const key = `${normalizeForSearch(r.khasraNo)}|${normalizeForSearch(r.wastiName)}|${normalizeForSearch(r.ownerName)}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return counts;
    }, [records]);



    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
    const paginatedRecords = useMemo(() => {
        if (showAll || filterLayout || filterKhasra || filterPlotNo) return filteredRecords;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredRecords, currentPage, showAll, filterLayout, filterKhasra, filterPlotNo]);

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
        // Duplicate check: wastiName, khasraNo, plotNo and ownerName same check
        const isDuplicate = records.some(r =>
            r.id !== record.id &&
            String(r.wastiName || '').trim().toLowerCase() === String(record.wastiName || '').trim().toLowerCase() &&
            String(r.khasraNo || '').trim().toLowerCase() === String(record.khasraNo || '').trim().toLowerCase() &&
            String(r.plotNo || '').trim().toLowerCase() === String(record.plotNo || '').trim().toLowerCase() &&
            String(r.ownerName || '').trim().toLowerCase() === String(record.ownerName || '').trim().toLowerCase()
        );

        if (isDuplicate) {
            addToast("त्रुटी: या वस्ती, खसरा क्र., प्लॉट क्र. आणि मालकाच्या नावासह आधीच एक मालमत्ता नोंदणीकृत आहे!", "error");
            return;
        }

        setSaving(true);
        const isNew = !editingRecord;

        const maxSrNo = records.reduce((max, r) => Math.max(max, Number(r.srNo) || 0), 0);
        const finalRecord = isNew ? {
            ...record,
            srNo: maxSrNo + 1,
            id: record.id && record.id !== '' ? record.id : 'prop_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
            isNewTemp: true
        } : record;

        try {
            const token = localStorage.getItem('gp_token');
            const response = await fetch(
                isNew ? API_URL : `${API_URL}/${record.id}`,
                {
                    method: isNew ? 'POST' : 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(finalRecord)
                }
            );
            if (response.status === 401) {
                onAuthError?.();
                return;
            }
            if (response.ok) {
                onUpdateLocalRecord(finalRecord);
                setShowForm(false);
                setEditingRecord(null);
                addToast(isNew ? 'नवीन नोंद यशस्वीरित्या जतन केली!' : 'नोंद यशस्वीरित्या सुधारली!', 'success');
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
            const token = localStorage.getItem('gp_token');
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                onAuthError?.();
                return;
            }
            if (response.ok) {
                onRemoveLocalRecord(id);
                addToast('नोंद हटवली गेली.', 'info');
            }
        } catch (error) {
            addToast('हटवताना त्रुटी आली.', 'error');
        }
    };

    const handleExport = () => {
        exportToExcel(filteredRecords, 'GramSarthi_All_Data');
        addToast('Excel फाईल यशस्वीरित्या डाउनलोड झाली!', 'success');
    };


    const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const importedFiles = JSON.parse(localStorage.getItem('gp_imported_files') || '[]');
        if (importedFiles.includes(file.name)) {
            alert(`'${file.name}' ही फाईल आधीच आयात केली आहे! कृपया दुसरी फाईल निवडा.`);
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
                        wastiName: String(row[EXCEL_HEADERS[1]] ?? ''),
                        wardNo: String(row[EXCEL_HEADERS[2]] ?? ''),
                        khasraNo: String(row[EXCEL_HEADERS[3]] ?? row["خसरा नंबर"] ?? ''),
                        layoutName: String(row[EXCEL_HEADERS[4]] ?? ''),
                        plotNo: String(row[EXCEL_HEADERS[5]] ?? row["प्लॉट क्रमांक"] ?? row["प्लॉट क्र."] ?? row["प्लॉट नं."] ?? row["प्लॉट नं"] ?? row["Plot No"] ?? row["Plot No."] ?? ''),
                        propertyId: String(row[EXCEL_HEADERS[5]] ?? row["मालमत्ता क्र."] ?? row["मालमत्ता क्रमांक"] ?? row["मालमत्ता नं."] ?? row["Property No"] ?? row["Property ID"] ?? row["प्लॉट क्रमांक"] ?? ''),
                        occupantName: String(row[EXCEL_HEADERS[6]] ?? ''),
                        ownerName: String(row[EXCEL_HEADERS[7]] ?? ''),
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

                // --- Chunked Batch Import: handles 100MB+ files ---
                const CHUNK_SIZE = 500;
                const totalChunks = Math.ceil(mappedRecords.length / CHUNK_SIZE);
                const token = localStorage.getItem('gp_token');
                let totalImported = 0;

                addToast(`${mappedRecords.length} नोंदी आढळल्या. आयात सुरू आहे... (${totalChunks} batch)`, 'info');

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = mappedRecords.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    let response: Response;
                    try {
                        response = await fetch(`${API_URL}/import`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(chunk)
                        });
                    } catch (networkErr) {
                        addToast(`Batch ${i + 1}/${totalChunks}: सर्व्हरशी संपर्क होउ शकला नाही. सर्व्हर सुरू आहे का ते तपासा.`, 'error');
                        return;
                    }
                    if (response.status === 401) { onAuthError?.(); return; }
                    if (response.status === 403) {
                        addToast('परवानगी नाही: डेटा आयात करण्याचा अधिकार नाही. अडमिनशी संपर्क साधा.', 'error');
                        return;
                    }
                    if (!response.ok) {
                        let errMsg = 'Unknown error';
                        try { const e2 = await response.json(); errMsg = e2.error || errMsg; } catch (_) { }
                        addToast(`Batch ${i + 1} आयात त्रुटी: ${errMsg}`, 'error');
                        return;
                    }
                    totalImported += chunk.length;
                    if (totalChunks > 1) {
                        addToast(`Batch ${i + 1}/${totalChunks} पूर्ण (${totalImported}/${mappedRecords.length} नोंदी)`, 'info');
                    }
                }

                importedFiles.push(file.name);
                localStorage.setItem('gp_imported_files', JSON.stringify(importedFiles));
                fetchRecords();
                addToast(`✅ ${totalImported} नोंदी यशस्वीरित्या आयात केल्या!`, 'success');
            } catch (error) {
                addToast('फाइल प्रक्रियेत त्रुटी आली. फाइल योग्य Excel format मध्ये आहे का ते तपासा.', 'error');
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
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
            <header className="no-print shrink-0 bg-white border-b border-slate-100 px-4 py-2">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">मालमत्ता व्यवस्थापन</span>
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
                            <button
                                onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-all text-[9px] active:scale-95"
                            >
                                <Plus size={12} /> नवीन नोंद
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden space-y-2 bg-white flex flex-col px-2 py-2">
                {activeTab === 'user_requests' ? (
                    <UserManagement onAuthError={onAuthError} addToast={addToast} />
                ) : (
                    <>
                        {/* Search & Filter Bar — Namuna 8 Style */}
                        <div className="flex items-center gap-2  no-print flex-wrap lg:flex-nowrap shrink-0 shadow-sm text-Marathi">
                            {/* Search */}
                            <div className="relative w-[500px] shrink-0">
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
                                <CustomDropdown
                                    value={filterPropertyType}
                                    onChange={setFilterPropertyType}
                                    placeholder="प्रकार निवडा"
                                    options={dynamicPropertyTypes.map(p => ({ value: p, label: p }))}
                                />

                                {(hasActiveFilters || searchTerm) && (
                                    <button
                                        onClick={() => { setFilterWasti(''); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); setFilterPropertyType(''); setSearchTerm(''); }}
                                        className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-all flex-shrink-0"
                                    >
                                        <RotateCcw className="w-3 h-3" /> रीसेट
                                    </button>
                                )}

                                {/* Count Badge */}
                                <div className="hidden lg:flex items-center gap-1.5 bg-indigo-50/50 px-3 py-2 rounded-lg border border-indigo-100 shrink-0">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-tight whitespace-nowrap">
                                        नोंदी: <span className="text-indigo-600 font-black ml-1">{MN(filteredRecords.length)}</span>
                                        {(hasActiveFilters || searchTerm) && <span className="text-slate-400 font-bold"> / {MN(records.length)}</span>}
                                    </span>
                                </div>
                            </div>
                        </div>


                        {/* Records Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm text-Marathi">
                            <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between bg-white shrink-0 relative z-10">
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">मालमत्ता सूची</h3>
                                <div className="flex items-center gap-4">
                                    {searchTerm && (
                                        <p className="text-xs font-bold text-slate-400">
                                            "{searchTerm}" : {filteredRecords.length} परिणाम सापडले
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className="sticky top-0 z-50 bg-white text-Marathi">
                                        <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[60px] text-center">अ.क्र.</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[120px]">वस्ती</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px] text-center">खसरा</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px] text-center">मालमत्ता/प्लॉट</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[180px]">मालकाचे नाव</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[140px] text-center">प्रकार/क्षेत्रफळ</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-amber-700 bg-amber-50/50 border-r border-slate-100/60 uppercase tracking-widest w-[100px] text-right">थकबाकी</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-blue-700 bg-blue-50/50 border-r border-slate-100/60 uppercase tracking-widest w-[100px] text-right">मागणी</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-emerald-700 bg-emerald-50/50 border-r border-slate-100/60 uppercase tracking-widest w-[100px] text-right">वसूल</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-purple-700 bg-purple-50/50 border-r border-slate-100/60 uppercase tracking-widest w-[80px] text-right">सूट</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-rose-700 bg-rose-50/50 uppercase tracking-widest w-[100px] text-right">बाकी</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[120px] text-center">कृती</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedRecords.length > 0 ? paginatedRecords.map((record, idx) => {
                                            const dKey = `${normalizeForSearch(record.khasraNo)}|${normalizeForSearch(record.wastiName)}|${normalizeForSearch(record.ownerName)}`;
                                            const isDuplicate = (duplicateMap.get(dKey) || 0) > 1;

                                            return (
                                                <tr key={record.id} className={`hover:bg-slate-50 transition-colors group ${isDuplicate ? 'bg-red-50/50' : ''}`}>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-xs font-bold text-slate-500">
                                                                {MN(((showAll || filterLayout || filterKhasra || filterPlotNo) ? 0 : (currentPage - 1) * ITEMS_PER_PAGE) + idx + 1)}
                                                            </span>
                                                            {record.isNewTemp && (
                                                                <span className="text-[7.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-wider leading-none text-center">
                                                                    NEW
                                                                </span>
                                                            )}
                                                        </div>
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
                                                        {record.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => {
                                                            const hasDim = s.lengthFt && s.widthFt && Number(s.lengthFt) > 0 && Number(s.widthFt) > 0;
                                                            const calculatedArea = hasDim ? Number(s.lengthFt) * Number(s.widthFt) : Number(s.areaSqFt) || 0;
                                                            return (
                                                                <div key={si} className="text-[10px] text-slate-500 font-medium">
                                                                    {s.propertyType} • {hasDim ? `${MN(s.lengthFt)} × ${MN(s.widthFt)} = ` : ''}{MN(calculatedArea)}चौ.फु
                                                                </div>
                                                            );
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right bg-amber-50/20 border-r border-slate-100/50">
                                                        <span className="inline-block text-right min-w-[75px] px-2 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-700 border border-amber-100/60 font-sans">
                                                            {MN(Math.round(Number(record.arrearsAmount || 0)))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right bg-blue-50/20 border-r border-slate-100/50">
                                                        <span className="inline-block text-right min-w-[75px] px-2 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-100/60 font-sans">
                                                            {MN(Math.round(Number(record.totalTaxAmount || 0)))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right bg-emerald-50/20 border-r border-slate-100/50">
                                                        <span className="inline-block text-right min-w-[75px] px-2 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100/60 font-sans">
                                                            {MN(Math.round(Number(record.paidAmount || 0)))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right bg-purple-50/20 border-r border-slate-100/50">
                                                        {(() => {
                                                            const base = (Number(record.propertyTax) || 0) + (Number(record.openSpaceTax) || 0);
                                                            const discount = Math.round(Number(record.discountAmount || (base * 0.05)));
                                                            return (
                                                                <span className="inline-block text-right min-w-[75px] px-2 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-100/60 font-sans">
                                                                    {MN(discount)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right bg-rose-50/20">
                                                        {(() => {
                                                            const curr = Number(record.totalTaxAmount || 0);
                                                            const arr = Number(record.arrearsAmount || 0);
                                                            const baseCurr = (Number(record.propertyTax) || 0) + (Number(record.openSpaceTax) || 0);
                                                            const disc = Number(record.discountAmount || (baseCurr * 0.05));

                                                            const prevBase = (Number(record.prev_breakdown?.propertyTax) || 0) + (Number(record.prev_breakdown?.openSpaceTax) || 0);
                                                            const baseForPenalty = prevBase > 0 ? prevBase : arr;
                                                            const pen = Number(record.penaltyAmount || (baseForPenalty * 0.05));

                                                            const paid = Number(record.paidAmount || 0);
                                                            const balance = Math.round(curr + arr + pen - paid - disc);

                                                            const bgClass = balance > 0 ? 'bg-rose-50 text-rose-700 border-rose-100/60' : 'bg-slate-50 text-slate-400 border-slate-100/60';
                                                            return (
                                                                <span className={`inline-block text-right min-w-[75px] px-2 py-1 rounded-lg text-xs font-black border font-sans ${bgClass}`}>
                                                                    {MN(balance)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-1.5">

                                                            {canEdit && (
                                                                <button onClick={() => {
                                                                    const count = record.sections.filter(s => s.propertyType && s.propertyType !== 'निवडा').length;
                                                                    setVisibleFloorCount(count > 0 ? count : 1);
                                                                    setEditingRecord(record); setShowForm(true);
                                                                }} className="w-7 h-7 flex items-center justify-center text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100" title="संपादित">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => setActiveBillRecord(record)} className="w-7 h-7 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100" title="मागणी बिल">
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </button>
                                                            {/* Namuna 8 & 9 quick-view buttons */}
                                                            <button
                                                                onClick={() => onViewRecord(record.id, 'namuna8')}
                                                                className="w-7 h-7 flex items-center justify-center text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-600 hover:text-white transition-all shadow-sm border border-violet-100 text-[8px] font-black"
                                                                title="नमुना ८ पहा"
                                                            >न८</button>
                                                            <button
                                                                onClick={() => onViewRecord(record.id, 'namuna9')}
                                                                className="w-7 h-7 flex items-center justify-center text-orange-500 bg-orange-50 rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-orange-100 text-[8px] font-black"
                                                                title="नमुना ९ पहा"
                                                            >न९</button>
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
                                                <td colSpan={12} className="py-20 text-center text-Marathi">
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
                            {totalPages > 1 && !showAll && !filterLayout && !filterKhasra && !filterPlotNo && (
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
        </div>
    );
}
