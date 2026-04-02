import { API_BASE_URL } from '@/config';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, FileSpreadsheet, Search, Edit2, Trash2, X, ChevronRight, ChevronLeft, FileDown, Printer, FileUp, FileText, Receipt, Eye, TrendingUp, Users, IndianRupee, AlertTriangle, CheckCircle2, Filter, RotateCcw, Shield } from 'lucide-react';
import { PropertyRecord, PropertySection, DEFAULT_SECTION, FLOOR_NAMES, PROPERTY_TYPES, WASTI_NAMES } from '../types';
import { ROLES } from './Login';
import { EXCEL_HEADERS, PLACEHOLDERS } from '../constants';
import { LABELS } from "../types";
import * as XLSX from 'xlsx';
import { matchesSearch } from '../utils/transliterate';
import { TransliterationInput } from '../components/TransliterationInput';
import PropertyForm from '../components/PropertyForm';
import { generateMaganiBillPDF } from '../utils/pdfGenerator';
import { CustomDropdown } from '../components/CustomDropdown';
import { hasModulePermission } from '../utils/permissions';


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

// --- Toast Notification ---
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);
    return { toasts, addToast };
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
    <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group flex items-center gap-3">
        <div className={`w-[30px] h-[30px] shrink-0 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1 truncate">{title}</p>
            <p className={`text-sm font-black ${textColor} leading-none tracking-tight`}>{value}</p>
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
    const ITEMS_PER_PAGE = 50;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'user_requests'>(initialTab || 'dashboard');
    const [userRequests, setUserRequests] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [fetchingRequests, setFetchingRequests] = useState(false);
    const [userMasterTab, setUserMasterTab] = useState<'pending' | 'list'>('list');
    const [editingManagedUser, setEditingManagedUser] = useState<any | null>(null);
    const { toasts, addToast } = useToast();

    const currentUser = useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'gram_sachiv' || currentUser.role === 'gram_sevak';
    const canView = hasModulePermission(currentUser, 'dashboard', 'view');
    const canEdit = hasModulePermission(currentUser, 'dashboard', 'edit');
    const canDelete = hasModulePermission(currentUser, 'dashboard', 'delete');

    const fetchUserRequests = useCallback(async () => {
        if (!isAdmin) return;
        setFetchingRequests(true);
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setUserRequests(data);
            }
        } catch (err) {
            console.error('Error fetching user requests:', err);
        } finally {
            setFetchingRequests(false);
        }
    }, [isAdmin]);

    const fetchAllUsers = useCallback(async () => {
        if (!isAdmin) return;
        setFetchingRequests(true);
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setAllUsers(data);
            }
        } catch (err) {
            console.error('Error fetching all users:', err);
        } finally {
            setFetchingRequests(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (activeTab === 'user_requests') {
            if (userMasterTab === 'pending') fetchUserRequests();
            else fetchAllUsers();
        }
    }, [activeTab, userMasterTab, fetchUserRequests, fetchAllUsers]);

    const handleUserAction = async (userId: number, action: 'approve' | 'reject') => {
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/action`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast(`वापरकर्ता ${action === 'approve' ? 'मंजूर' : 'अस्वीकार'} केला!`, 'success');
                if (userMasterTab === 'pending') fetchUserRequests();
                else fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('तुम्हाला खात्री आहे की तुम्ही हा वापरकर्ता हटवू इच्छिता?')) return;
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                addToast('वापरकर्ता यशस्वीरित्या हटविला गेला.', 'success');
                fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${editingManagedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingManagedUser)
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }

            if (res.ok) {
                addToast('वापरकर्ता यशस्वीरित्या अद्यतनित केला गेला!', 'success');
                setEditingManagedUser(null);
                fetchAllUsers();
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

    const handleTogglePermission = async (userId: number, field: 'can_view' | 'can_edit' | 'can_delete', newValue: boolean) => {
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: newValue })
            });

            if (res.status === 401 && onAuthError) {
                onAuthError();
                return;
            }
            if (res.ok) {
                setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: newValue } : u));
                const labels: Record<string, string> = { can_view: 'पहा', can_edit: 'संपादन', can_delete: 'हटवा' };
                addToast(`${labels[field]} परवानगी ${newValue ? 'सक्रिय' : 'निष्क्रिय'} केली!`, 'success');
            } else {
                const data = await res.json();
                addToast(`त्रुटी: ${data.error}`, 'error');
            }
        } catch (err) {
            addToast('सर्व्हरशी कनेक्ट होऊ शकत नाही', 'error');
        }
    };

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
        const currentTax = records.reduce((sum, r) => sum + (Number(r.totalTaxAmount) || 0), 0);
        const totalArrears = records.reduce((sum, r) => sum + (Number(r.arrearsAmount) || 0), 0);
        const totalPaid = records.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
        const totalDemand = currentTax + totalArrears;
        const totalBalance = totalDemand - totalPaid;
        const recoveryRate = totalDemand > 0 ? (totalPaid / totalDemand) * 100 : 0;

        return { currentTax, totalArrears, totalPaid, totalDemand, totalBalance, recoveryRate, count: records.length };
    }, [records]);

    // Animated counters
    const animCount = useCountUp(stats.count);
    const animDemand = useCountUp(Math.round(stats.totalDemand / 100));
    const animPaid = useCountUp(Math.round(stats.totalPaid / 100));
    const animBalance = useCountUp(Math.round(stats.totalBalance / 100));
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

    return (
        <>
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold backdrop-blur-sm pointer-events-auto transition-all duration-300 animate-in slide-in-from-right ${t.type === 'success' ? 'bg-success/95' :
                        t.type === 'error' ? 'bg-rose-600/95' : 'bg-primary/95'
                        }`}>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <header className="bg-white border-b border-gray-100 shrink-0 shadow-sm no-print">
                <div className="flex items-center justify-between px-4 py-2 gap-3">
                    {/* Search Bar on the Left */}
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <div className="relative w-full max-w-[280px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                            <TransliterationInput
                                placeholder="नाव, वॉर्ड, वस्ती शोधा..."
                                className="w-full pl-10 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent outline-none transition-all"
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-10 top-1/2 -translate-y-1/2 z-10">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons on the Right */}
                    <div className="flex gap-2 shrink-0">
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab(activeTab === 'dashboard' ? 'user_requests' : 'dashboard')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-bold shadow-sm ${activeTab === 'user_requests'
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                                <span className="hidden sm:inline">{activeTab === 'user_requests' ? 'डॅशबोर्ड' : 'रोल अ‍ॅक्सेस'}</span>
                            </button>
                        )}
                        {/* Only users with edit permission can Import / Export / Add */}
                        {(canEdit || isAdmin) && (
                            <>
                                <label className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl hover:bg-primary-dark transition-all cursor-pointer text-sm font-bold shadow-sm">
                                    <FileUp className="w-4 h-4" />
                                    <span className="hidden sm:inline">आयात</span>
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={importFromExcel} />
                                </label>
                                <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all text-sm font-bold shadow-sm">
                                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                                    <span className="hidden sm:inline">एक्सपोर्ट</span>
                                </button>
                                <button
                                    onClick={() => { setEditingRecord(null); setVisibleFloorCount(1); setShowForm(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/20 transition-all text-sm btn-hover btn-active"
                                >
                                    <Plus className="w-4 h-4" /> नवीन नोंद
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {/* Filter Bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-50 bg-slate-50/50 flex-wrap">
                    <Filter className="w-4 h-4 text-gray-400 shrink-0" />
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
                    {hasActiveFilters && (
                        <button onClick={() => { setFilterWasti(''); setFilterLayout(''); setFilterKhasra(''); setFilterPlotNo(''); setFilterPropertyType(''); }}
                            className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg hover:bg-rose-100 transition-all btn-hover btn-active">
                            <RotateCcw className="w-3 h-3" /> सर्व रद्द
                        </button>
                    )}
                    <span className="ml-auto text-xs text-gray-400 font-medium">{filteredRecords.length} / {records.length} नोंदी</span>
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-4 xl:p-6 space-y-6 bg-slate-50/50 pb-0 flex flex-col">
                {activeTab === 'user_requests' ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                        <div className="px-5 xl:px-8 py-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">मास्टर / वापरकर्ता व्यवस्थापन</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1">येथे तुम्ही वापरकर्ता नोंदणी विनंत्या आणि सर्व वापरकर्त्यांचे व्यवस्थापन करू शकता.</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setUserMasterTab('list')}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        मास्टर
                                    </button>
                                    <button
                                        onClick={() => setUserMasterTab('pending')}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${userMasterTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        विनंती
                                    </button>
                                </div>
                            </div>
                            <button onClick={userMasterTab === 'pending' ? fetchUserRequests : fetchAllUsers} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                <RotateCcw className={`w-5 h-5 text-slate-400 ${fetchingRequests ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {userMasterTab === 'pending' ? (
                                userRequests.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
                                            <Users className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">कोणतीही प्रलंबित विनंती नाही</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {userRequests.map((req) => (
                                            <div key={req.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100 transition-colors" />
                                                <div className="flex items-start gap-4 mb-6 relative z-10">
                                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                                        {req.name?.charAt(0) || req.username?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black text-slate-800 text-base truncate">{req.name}</h4>
                                                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">@{req.username}</p>
                                                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                                            {ROLES.find(r => r.value === req.role)?.label || req.role}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 mb-8 relative z-10">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">कर्मचारी आयडी</span>
                                                        <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded italic">{req.employee_id}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">संपर्क क्रमांक</span>
                                                        <span className="text-xs font-bold text-slate-700">{MN(req.mobile)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">वय</span>
                                                        <span className="text-xs font-bold text-slate-700">{MN(req.age)} वर्षांचा</span>
                                                    </div>
                                                    <div className="pt-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">पत्ता</span>
                                                        <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2">{req.address}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 relative z-10">
                                                    <button onClick={() => handleUserAction(req.id, 'approve')} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" /> मंजूर करा
                                                    </button>
                                                    <button onClick={() => handleUserAction(req.id, 'reject')} className="flex-1 py-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl font-black text-xs hover:bg-rose-500 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2">
                                                        <X className="w-4 h-4" /> नाकारा
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[1100px]">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">नाव</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">वापरकर्तानाव</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">ईमेल / संपर्क</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">भूमिका</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">कर्मचारी आयडी</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">स्थिती</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">कृती</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {allUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                                                        {user.address && <div className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-[160px] truncate" title={user.address}>{user.address}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-indigo-500 font-bold text-xs">@{user.username}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-slate-700">{user.email || '-'}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{user.mobile || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                                                            {ROLES.find(r => r.value === user.role)?.label || user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold text-slate-500 italic">{user.employee_id}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${user.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                user.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                            }`}>
                                                            {user.status === 'APPROVED' ? 'मंजूर' : user.status === 'PENDING' ? 'प्रलंबित' : 'नाकारलेले'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                onClick={() => setEditingManagedUser(user)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                                title="Delete"
                                                                disabled={user.username === 'admin'}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stat Cards Container */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
                    <StatCard title="एकूण मालमत्ता" value={animCount} icon={<Users />} gradient="from-primary to-primary-dark" textColor="text-primary-dark" />
                    <StatCard title="एकूण मागणी" value={`₹${(animDemand / 10).toFixed(1)}K`} icon={<IndianRupee />} gradient="from-blue-500 to-indigo-600" textColor="text-blue-700" />
                    <StatCard title="एकूण वसुली" value={`₹${(animPaid / 10).toFixed(1)}K`} icon={<CheckCircle2 />} gradient="from-success to-primary" textColor="text-success" />
                    <StatCard title="एकूण बाकी" value={`₹${(animBalance / 10).toFixed(1)}K`} icon={<AlertTriangle />} gradient="from-rose-500 to-red-600" textColor="text-rose-600" />
                    <StatCard title="वसुली %" value={`${(animRecovery / 10).toFixed(1)}%`} icon={<TrendingUp />} gradient="from-amber-500 to-orange-500" textColor="text-amber-600" />
                </div>

                {/* Records Table */}
                <div className="bg-white rounded-t-3xl shadow-sm border border-slate-200 border-b-0 overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="px-5 xl:px-8 py-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-white shrink-0 relative z-10">
                        <h3 className="text-[15px] font-black text-slate-800 tracking-tight">मालमत्ता नोंदींची सूची</h3>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowAll(!showAll)}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${showAll
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                            >
                                {showAll ? 'पृष्ठानुसार पहा' : 'सर्व नोंदी पहा'}
                            </button>
                            <p className="text-[11px] font-bold tracking-wide text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                                {searchTerm ? `"${searchTerm}" : ${filteredRecords.length} परिणाम सापडले` : `एकूण ${filteredRecords.length} नोंदणीकृत मालमत्ता`}
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 text-slate-600 border-b-2 border-slate-200 backdrop-blur-sm bg-white/90">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-[50px] text-center">अ.क्र.</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest w-[110px]">वस्ती</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest w-[80px] text-center">खसरा</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest w-[80px]">मालमत्ता क्र/प्लॉट क्रमांक</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest min-w-[180px]">मालकाचे नाव व पत्ता</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest w-[140px]">प्रकार व क्षेत्रफळ</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest text-right w-[110px]">एकूण कर</th>
                                    <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest text-right w-[110px]">एकूण बाकी</th>
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-center w-[130px]">कृती</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedRecords.length > 0 ? paginatedRecords.map((record, idx) => {
                                    const dKey = `${String(record.khasraNo || '').trim()}|${String(record.wastiName || '').trim()}|${String(record.ownerName || '').trim()}`.toLowerCase();
                                    const isDuplicate = (duplicateMap.get(dKey) || 0) > 1;
                                    
                                    return (
                                    <tr key={record.id} className={`hover:bg-blue-50/50 transition-colors group ${
                                        isDuplicate 
                                            ? 'bg-red-50 hover:bg-red-100/80 transition-all border-l-4 border-l-red-500' 
                                            : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60')
                                    }`}>
                                        <td className="px-4 py-4 text-center relative">
                                            {isDuplicate && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center group/alert">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse cursor-help" />
                                                    <div className="absolute left-6 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded hidden group-hover/alert:block whitespace-nowrap z-50">
                                                        डुप्लिकेट डेटा (Duplicate Data)
                                                    </div>
                                                </div>
                                            )}
                                            <span className={`text-xs font-bold ${isDuplicate ? 'text-red-700' : 'text-slate-400'}`}>{MN(record.srNo)}</span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="inline-flex flex-col">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase leading-none">
                                                    {record.wastiName || '-'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold italic mt-1">वॉर्ड {MN(record.wardNo)}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            <div className="text-[11px] text-indigo-700 font-black uppercase tracking-tight bg-indigo-50 px-2 py-1 rounded inline-block whitespace-nowrap">{MN(record.khasraNo) || '-'}</div>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="text-xs font-bold text-slate-700 tracking-tight">{MN(record.plotNo) || '-'}</div>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="font-extrabold text-slate-900 text-[13px] tracking-tight leading-tight uppercase">{record.ownerName}</div>
                                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">({record.occupantName || 'स्वतः'})</div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-bold">Property ID: {record.propertyId || record.srNo}</div>
                                        </td>
                                        <td className="px-3 py-4">
                                            {record.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा').map((s, si) => (
                                                <div key={si} className="mb-1.5 last:mb-0 pb-1.5 border-b border-slate-100 last:border-0">
                                                    <div className="text-[10px] font-black text-slate-700 uppercase leading-none mb-1">{s.propertyType}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 leading-none">
                                                        <span className="text-blue-600 font-black">{MN(s.areaSqFt)}</span> sq.ft
                                                    </div>
                                                </div>
                                            )) || (
                                                <div className="text-[10px] text-slate-400 italic">माहिती उपलब्ध नाही</div>
                                            )}
                                        </td>
                                        <td className="px-3 py-4 text-right">
                                            <div className="font-black text-indigo-700 text-[14px] leading-none">₹{Number(record.totalTaxAmount || 0).toLocaleString()}</div>
                                            {(Number(record.arrearsAmount) > 0 || Number(record.penaltyAmount) > 0) && (
                                                <div className="text-[9px] text-rose-500 font-black uppercase mt-1.5 tracking-wider leading-none">
                                                    +₹{MN((Number(record.arrearsAmount) || 0) + (Number(record.penaltyAmount) || 0))} थकीत
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-4 text-right">
                                            <div className="font-black text-rose-600 text-[14px] leading-none">
                                                ₹{Number(Number(record.totalTaxAmount || 0) + Number(record.arrearsAmount || 0) + Number(record.penaltyAmount || 0) - Number(record.paidAmount || 0) - Number(record.discountAmount || 0)).toLocaleString()}
                                            </div>
                                            {Number(record.paidAmount) > 0 && (
                                                <div className="text-[9px] text-emerald-600 font-black uppercase mt-1.5 tracking-wider leading-none">
                                                    (₹{MN(record.paidAmount)} वसूल)
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <button onClick={() => setViewingRecord(record)} className={`w-8 h-8 flex items-center justify-center text-indigo-500 bg-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 ${!canView ? 'hidden' : ''}`} title="तपशील">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {canEdit && !record.remarksNotes && (
                                                    <button onClick={() => {
                                                        const count = record.sections.filter(s => s.propertyType && s.propertyType !== 'निवडा').length;
                                                        setVisibleFloorCount(count > 0 ? count : 1);
                                                        setEditingRecord(record); setShowForm(true);
                                                    }} className="w-8 h-8 flex items-center justify-center text-amber-500 bg-amber-50 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100" title="संपादित">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => generateMaganiBillPDF(record)} className="w-8 h-8 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100" title="मागणी बिल">
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                {canDelete && !record.remarksNotes && (
                                                    <button onClick={() => deleteRecord(record.id)} className="w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100" title="हटवा">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={9} className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-indigo-50/50 rounded-[2rem] flex items-center justify-center border border-indigo-100/50">
                                                    <Search className="w-8 h-8 text-indigo-200" />
                                                </div>
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                                                    {searchTerm ? `"${searchTerm}" - कोणतीही नोंद सापडली नाही` : 'अद्याप कोणतीही नोंद नाही'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && !showAll && (
                        <div className="px-4 xl:px-6 py-3 border-t border-slate-200 bg-slate-50/80 backdrop-blur-[2px] flex items-center justify-between shrink-0 relative z-10 w-full">
                            <div className="text-[12px] font-bold text-slate-500 tracking-wide hidden sm:block">
                                पृष्ठ <span className="text-slate-800">{currentPage}</span> पैकी <span className="text-slate-800">{totalPages}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:ml-auto w-full sm:w-auto justify-center">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    &#171;
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <span className="leading-none text-lg -mt-0.5">‹</span>
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all shadow-sm border ${pageNum === currentPage
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <span className="leading-none text-lg -mt-0.5">›</span>
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    &#187;
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] max-w-xl w-full overflow-hidden premium-shadow-lg border border-white/20 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 pb-6 flex justify-between items-start bg-gradient-to-br from-indigo-900 to-indigo-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                            <div className="relative z-10">
                                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 leading-none">मालमत्ता तपशील कार्ड</h2>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{viewingRecord.ownerName}</h3>
                                <p className="text-indigo-200 text-xs font-bold mt-1.5 opacity-80 flex items-center gap-2">
                                    <span className="bg-indigo-400/20 px-2 py-0.5 rounded-md">ID: {viewingRecord.srNo}</span>
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
                                    <p className="font-black text-indigo-700 text-lg leading-none text-center">₹{Number(viewingRecord.totalTaxAmount).toLocaleString()}</p>
                                </div>
                                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/50">
                                    <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-1.5 leading-none text-center">थकबाकी</p>
                                    <p className="font-black text-rose-700 text-lg leading-none text-center">₹{Number(viewingRecord.arrearsAmount || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1.5 leading-none text-center">भरलेले</p>
                                    <p className="font-black text-emerald-700 text-lg leading-none text-center">₹{Number(viewingRecord.paidAmount || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {[
                                    { label: 'वस्ती / वॉर्ड', value: `${viewingRecord.wastiName} (वॉर्ड ${viewingRecord.wardNo})` },
                                    { label: 'प्लॉट क्र.', value: viewingRecord.plotNo },
                                    { label: 'खसरा क्र.', value: viewingRecord.khasraNo },
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
                            <button onClick={async () => await generateMaganiBillPDF(viewingRecord!)} className="flex-1 flex items-center justify-center gap-3 py-4 bg-rose-600 text-white rounded-[1.5rem] font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 active:scale-95 transition-all text-sm">
                                <FileText className="w-4 h-4" /> मागणी बिल
                            </button>
                            <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-3 py-4 bg-indigo-800 text-white rounded-[1.5rem] font-bold hover:bg-indigo-900 active:scale-95 transition-all text-sm">
                                <Printer className="w-4 h-4" /> प्रिंट
                            </button>
                            <button onClick={() => setViewingRecord(null)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-100 active:scale-95 transition-all text-sm">
                                बंद करा
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {editingManagedUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 xl:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
                        <div className="px-8 xl:px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">वापरकर्ता संपादित करा</h3>
                                <p className="text-xs font-bold text-slate-500 mt-1">वापरकर्त्याचे तपशील आणि परवानग्या अद्यतनित करा.</p>
                            </div>
                            <button onClick={() => setEditingManagedUser(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-8 xl:p-10 flex flex-col gap-10">
                                {/* Top Section: Personal Info */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-base font-black text-slate-800 tracking-tight">वैयक्तिक माहिती (Personal Info)</h4>
                                        <p className="text-xs font-bold text-slate-400 mt-1">वापरकर्त्याची मूलभूत माहिती अद्यतनित करा.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">पूर्ण नाव</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={editingManagedUser.name}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">वापरकर्तानाव</label>
                                    <input
                                        type="text"
                                        disabled
                                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed"
                                        value={editingManagedUser.username}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ईमेल</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={editingManagedUser.email || ''}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">भूमिका</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={editingManagedUser.role}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, role: e.target.value })}
                                    >
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">कर्मचारी आयडी</label>
                                    <input
                                        type="text"
                                        disabled
                                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 italic cursor-not-allowed"
                                        value={editingManagedUser.employee_id || ''}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">संपर्क क्रमांक</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={editingManagedUser.mobile || ''}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, mobile: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">वय</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={editingManagedUser.age || ''}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, age: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">स्थिती</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        value={editingManagedUser.status}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, status: e.target.value })}
                                    >
                                        <option value="APPROVED">मंजूर</option>
                                        <option value="PENDING">प्रलंबित</option>
                                        <option value="REJECTED">नाकारलेले</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">पत्ता</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                                        value={editingManagedUser.address || ''}
                                        onChange={e => setEditingManagedUser({ ...editingManagedUser, address: e.target.value })}
                                    />
                                </div>
                                    
                                {/* Permission Checkboxes - Hidden as we use module level now */}
                                <div className="hidden">
                                    {([['can_view', 'पहा (View)', 'bg-blue-500'], ['can_edit', 'संपादन (Edit)', 'bg-amber-500'], ['can_delete', 'हटवा (Delete)', 'bg-rose-500']] as [string, string, string][]).map(([field, label, color]) => (
                                        <input key={field} type="checkbox" checked={editingManagedUser[field]} onChange={() => setEditingManagedUser({ ...editingManagedUser, [field]: !editingManagedUser[field] })} />
                                    ))}
                                </div>
                            </div>
                            </div>

                            {/* Bottom Section: Module Permissions */}
                            <div className="space-y-6 flex flex-col min-w-0">
                            <div>
                                <h4 className="text-base font-black text-slate-800 tracking-tight">परवानग्या (Module Permissions)</h4>
                                <p className="text-xs font-bold text-slate-400 mt-1">प्रत्येक मॉड्यूलसाठी View, Edit आणि Delete अधिकार सेट करा.</p>
                            </div>
                            
                            <div className="bg-slate-50/70 rounded-[2rem] p-6 border border-slate-100 flex-1 overflow-y-auto">
                                <div className="space-y-3.5">
                                    {([
                                        ['dashboard', 'डैशबोर्ड (Dashboard)', 'from-violet-500 to-indigo-600'],
                                        ['namuna8', 'नमुना ८ (Namuna 8)', 'from-sky-500 to-blue-600'],
                                        ['namuna9', 'नमुना ९ (Namuna 9)', 'from-emerald-500 to-green-600'],
                                        ['payments', 'कर वसुली (Payments)', 'from-teal-500 to-cyan-600'],
                                        ['magani', 'मागणी बिल (Magani)', 'from-rose-500 to-red-600'],
                                        ['reports', 'अहवाल (Reports)', 'from-purple-500 to-fuchsia-600'],
                                        ['taxMaster', 'सेटिंग्ज (Settings)', 'from-amber-500 to-orange-500'],
                                    ] as [string, string, string][]).map(([moduleId, label, gradient]) => {
                                        let permsObj: Record<string, any> = {};
                                        try {
                                            if (editingManagedUser.allowed_modules?.startsWith('{')) {
                                                permsObj = JSON.parse(editingManagedUser.allowed_modules);
                                            } else {
                                                const legacyMods = (editingManagedUser.allowed_modules || '').split(',');
                                                legacyMods.forEach((m: string) => {
                                                    permsObj[m] = { view: true, add: false, edit: !!editingManagedUser.can_edit, delete: !!editingManagedUser.can_delete };
                                                });
                                            }
                                        } catch (e) { permsObj = {}; }

                                        const modPerms = permsObj[moduleId] || { view: false, add: false, edit: false, delete: false };

                                        const updateModulePerm = (action: 'view'|'add'|'edit'|'delete', value: boolean) => {
                                            const newPerms = { ...permsObj };
                                            if (!newPerms[moduleId]) newPerms[moduleId] = { view: false, add: false, edit: false, delete: false };
                                            newPerms[moduleId][action] = value;
                                            
                                            // Handle implicit logic
                                            if (value && (action === 'add' || action === 'edit' || action === 'delete')) newPerms[moduleId].view = true;
                                            
                                            setEditingManagedUser({ ...editingManagedUser, allowed_modules: JSON.stringify(newPerms) });
                                        };

                                        const isAllSelected = modPerms.view && modPerms.add && modPerms.edit && modPerms.delete;
                                        
                                        const toggleAll = (checked: boolean) => {
                                            const newPerms = { ...permsObj };
                                            newPerms[moduleId] = { view: checked, add: checked, edit: checked, delete: checked };
                                            setEditingManagedUser({ ...editingManagedUser, allowed_modules: JSON.stringify(newPerms) });
                                        };

                                        return (
                                            <div key={moduleId} className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                                        <span className="text-white text-base font-black">{label.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-black text-slate-800 block">{label}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 block uppercase tracking-widest">{moduleId} ACCESS</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-5 bg-slate-50/80 px-5 py-3 rounded-[1.25rem] border border-slate-100">
                                                    {/* Select All */}
                                                    <label className="flex items-center gap-2 cursor-pointer group/chk pr-5 border-r border-slate-200">
                                                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border-2 transition-all ${isAllSelected ? 'bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-white border-slate-300 group-hover/chk:border-indigo-400'}`}>
                                                            {isAllSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={isAllSelected} onChange={e => toggleAll(e.target.checked)} />
                                                        <span className="text-xs font-black text-slate-800">सर्व (All)</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer group/chk">
                                                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border-2 transition-all ${modPerms.view ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/20' : 'bg-white border-slate-300 group-hover/chk:border-blue-400'}`}>
                                                            {modPerms.view && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={modPerms.view} onChange={e => updateModulePerm('view', e.target.checked)} />
                                                        <span className="text-xs font-black text-slate-600">View</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer group/chk">
                                                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border-2 transition-all ${modPerms.add ? 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-white border-slate-300 group-hover/chk:border-emerald-400'}`}>
                                                            {modPerms.add && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={modPerms.add} onChange={e => updateModulePerm('add', e.target.checked)} />
                                                        <span className="text-xs font-black text-slate-600">Add</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer group/chk">
                                                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border-2 transition-all ${modPerms.edit ? 'bg-amber-500 border-amber-500 shadow-md shadow-amber-500/20' : 'bg-white border-slate-300 group-hover/chk:border-amber-400'}`}>
                                                            {modPerms.edit && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={modPerms.edit} onChange={e => updateModulePerm('edit', e.target.checked)} />
                                                        <span className="text-xs font-black text-slate-600">Edit</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer group/chk">
                                                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border-2 transition-all ${modPerms.delete ? 'bg-rose-500 border-rose-500 shadow-md shadow-rose-500/20' : 'bg-white border-slate-300 group-hover/chk:border-rose-400'}`}>
                                                            {modPerms.delete && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={modPerms.delete} onChange={e => updateModulePerm('delete', e.target.checked)} />
                                                        <span className="text-xs font-black text-slate-600">Delete</span>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 xl:px-10 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
                        <button type="button" onClick={() => setEditingManagedUser(null)} className="px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <X className="w-5 h-5" /> रद्द करा
                        </button>
                        <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> बदल जतन करा
                        </button>
                    </div>
                </form>
                    </div>
                </div>
            )}
        </>
    );
}
