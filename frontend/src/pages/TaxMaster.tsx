import { API_BASE_URL } from '@/utils/config';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Settings, FileText, TrendingDown, Briefcase,
    Users, Save, X, Plus, Trash2, Edit2,
    Activity, Shield, CheckCircle2, AlertTriangle,
    ArrowLeft, RotateCcw, Search, Filter,
    FileSpreadsheet, TrendingUp, IndianRupee, Landmark
} from 'lucide-react';
import { useUI } from '../components/UIProvider';
import FYMigrationWizard from '../components/FYMigrationWizard';

// --- Interfaces ---
interface TaxRate { id: number; propertyType: string; wastiName: string; buildingRate: number; buildingTaxRate: number; landRate: number; openSpaceTaxRate: number; }
interface ReadyReckonerRate { id: number; year_range: string; item_name_mr: string; valuation_rate: number; tax_rate: number; unit_mr: string; }
interface DepreciationRate { id: number; min_age: number; max_age: number; percentage: number; }
interface BuildingUsage { id: number; usage_type_mr: string; usage_type_en: string; weightage: number; }
interface MasterCategory { id: number; name_mr: string; code: string; }
interface MasterItem { id: number; category_id: number; item_value_mr: string; item_value_en?: string; item_code?: string; sort_order: number; is_active?: boolean; }
interface User { id: number; name: string; username: string; role: string; email: string; mobile: string; status: string; is_active: boolean; employee_id: string; }
interface SystemConfig { [key: string]: string; }

// --- Marathi Numerals Helper ---
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

// --- Animated Counter Hook ---
const useCountUp = (end: number, duration: number = 1000) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (end === 0) { setValue(0); return; }
        let startTime: number;
        let animationFrame: number;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setValue(Math.floor(progress * end));
            if (progress < 1) animationFrame = requestAnimationFrame(step);
        };
        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);
    return value;
};

const StatCard = ({ title, value, icon, gradient, textColor }: any) => (
    <div className="bg-white rounded-xl px-4 py-3 border border-slate-200 hover:border-indigo-300 transition-all duration-300 group flex items-center gap-4 shadow-sm hover:shadow-md">
        <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {React.cloneElement(icon, { className: 'w-5 h-5' })}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">{title}</p>
            <p className={`text-base font-black ${textColor} leading-none tracking-tight`}>{MN(value)}</p>
        </div>
    </div>
);

export default function TaxMaster({ onAuthError, onNavigate }: { onAuthError?: () => void; onNavigate?: (view: string) => void }) {
    const { addToast } = useUI();
    const [rates, setRates] = useState<TaxRate[]>([]);
    const [depRates, setDepRates] = useState<DepreciationRate[]>([]);
    const [buRates, setBuRates] = useState<BuildingUsage[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<MasterCategory[]>([]);
    const [subItems, setSubItems] = useState<MasterItem[]>([]);
    const [rrRates, setRrRates] = useState<ReadyReckonerRate[]>([]);
    const [config, setConfig] = useState<SystemConfig>({});

    const [activeTab, setActiveTab] = useState<string>('tax');
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newForm, setNewForm] = useState<any>({});

    // --- FY Migration Modal State ---
    const [showFYModal, setShowFYModal] = useState(false);

    // --- Bulk Update State ---
    const [bulkForm, setBulkForm] = useState({
        propertyType: 'सर्व',
        layoutName: 'सर्व',
        selectedKhasras: [] as string[],
        enabledFields: [] as string[],
        taxes: {
            streetLightTax: '' as any,
            healthTax: '' as any,
            wasteCollectionTax: '' as any,
            generalWaterTax: '' as any,
            specialWaterTax: '' as any
        }
    });

    const [layouts, setLayouts] = useState<MasterItem[]>([]);
    const [propertyTypes, setPropertyTypes] = useState<MasterItem[]>([]);
    const [allKhasras, setAllKhasras] = useState<string[]>([]);

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gp_token')}`
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [taxRes, catRes, depRes, buRes, rrRes, userRes, configRes, layRes, typeRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/tax-rates`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/categories`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/depreciation`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/building-usage`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/ready-reckoner`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/auth/users`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/config`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/properties/unique-layouts`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/items/PROPERTY_TYPE`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/properties/khasras`, { headers: authHeaders() })
            ]);

            if (taxRes.status === 401 || catRes.status === 401 || depRes.status === 401 || buRes.status === 401 || rrRes.status === 401 || userRes.status === 401 || configRes.status === 401) {
                onAuthError?.();
                return;
            }
            if (taxRes.ok) setRates(await taxRes.json());
            if (catRes.ok) setCategories(await catRes.json());
            if (depRes.ok) setDepRates(await depRes.json());
            if (buRes.ok) setBuRates(await buRes.json());
            if (rrRes.ok) setRrRates(await rrRes.json());
            if (userRes.ok) setUsers(await userRes.json());
            if (configRes.ok) setConfig(await configRes.json());
            if (layRes.ok) setLayouts(await layRes.json());
            if (typeRes.ok) setPropertyTypes(await typeRes.json());
            if (typeRes.status === 200) {
                const khasras = await (await fetch(`${API_BASE_URL}/api/properties/khasras`, { headers: authHeaders() })).json();
                setAllKhasras(khasras);
            }

        } catch (err) {
            console.error(err);
            addToast('डेटा लोड करण्यात त्रुटी आली.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Remove redundant metadata fetcher


    const filteredCategories = useMemo(() => {
        const specializedCodes = ['BUILDING_USAGE', 'WARD'];
        return categories.filter(c => !specializedCodes.includes(c.code));
    }, [categories]);

    const selectedCategory = useMemo(() => {
        return filteredCategories.find(c => c.code === activeTab);
    }, [filteredCategories, activeTab]);

    const fetchSubItems = useCallback(async (catCode: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items/${catCode}`, { headers: authHeaders() });
            if (res.status === 401) {
                onAuthError?.();
                return;
            }
            if (res.ok) setSubItems(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchSubItems(selectedCategory.code);
        }
    }, [selectedCategory, fetchSubItems]);

    const handleSave = async (type: string, id: number | string | null, data: any) => {
        let url = `${API_BASE_URL}/api/${type === 'tax' ? 'tax-rates' : type === 'dep' ? 'master/depreciation' : type === 'bu' ? 'master/building-usage' : type === 'rr' ? 'master/ready-reckoner' : type === 'config' ? 'master/config' : 'master/items'}`;
        if (id && type !== 'config') url += `/${id}`;

        try {
            const res = await fetch(url, {
                method: (id && type !== 'config') ? 'PUT' : 'POST',
                headers: authHeaders(),
                body: JSON.stringify(data)
            });

            if (res.status === 401) {
                onAuthError?.();
                return;
            }
            if (res.ok) {
                setEditingId(null);
                setShowAddForm(false);
                fetchData();
                if (selectedCategory) fetchSubItems(selectedCategory.code);
                addToast('नोंद यशस्वीरित्या जतन केली!', 'success');
            } else {
                const err = await res.json();
                addToast(err.error || 'त्रुटी आढळली', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('सर्व्हरशी संपर्क होऊ शकला नाही.', 'error');
        }
    };

    const handleDelete = async (type: string, id: number) => {
        if (!window.confirm('हे रेकॉर्ड हटवायचे आहे का?')) return;
        let url = `${API_BASE_URL}/api/${type === 'tax' ? 'tax-rates' : type === 'dep' ? 'master/depreciation' : type === 'bu' ? 'master/building-usage' : type === 'rr' ? 'master/ready-reckoner' : 'master/items'}/${id}`;
        try {
            const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
            if (res.status === 401) {
                onAuthError?.();
                return;
            }
            if (res.ok) {
                fetchData();
                if (selectedCategory) fetchSubItems(selectedCategory.code);
                addToast('नोंद यशस्वीरित्या हटवली!', 'info');
            }
        } catch (err) { console.error(err); }
    };

    const handleBulkUpdate = async () => {
        const filteredTaxes: any = {};
        bulkUpdateFields.forEach(field => {
            const val = (bulkForm.taxes as any)[field.key];
            // Only include if user has entered a value (not empty string)
            if (val !== undefined && val !== null && val !== '') {
                filteredTaxes[field.key] = Number(val);
            }
        });

        if (Object.keys(filteredTaxes).length === 0) {
            addToast('कृपया किमान एका कराची रक्कम प्रविष्ट करा.', 'warning');
            return;
        }

        if (!window.confirm(`${bulkForm.layoutName} मधील मालमत्तांचे कर अपडेट करायचे आहेत का?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/properties/bulk-tax-update`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({
                    propertyType: bulkForm.propertyType,
                    layoutName: bulkForm.layoutName,
                    taxes: filteredTaxes
                })
            });


            if (res.status === 401) {
                onAuthError?.();
                return;
            }

            const result = await res.json();
            if (res.ok) {
                addToast(result.message, 'success');
                fetchData();
            } else {
                addToast(result.error || 'अपडेट करताना त्रुटी आली', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('सर्व्हरशी संपर्क होऊ शकला नाही.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openFYModal = () => setShowFYModal(true);

    const renderTabButton = (id: string, label: string, icon: any) => (
        <button
            key={id}
            onClick={() => { setActiveTab(id); setEditingId(null); setShowAddForm(false); }}
            className={`flex flex-col items-center gap-1.5 px-4 py-3 transition-all relative group shrink-0 ${activeTab === id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}

        >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTab === id ? 'bg-indigo-50 shadow-sm' : 'bg-transparent'}`}>
                {React.cloneElement(icon, { size: 18, className: activeTab === id ? 'text-indigo-600' : 'text-slate-400 group-hover:scale-110 transition-transform' })}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeTab === id ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
            {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
            )}
        </button>
    );

    const commonTaxFields = [
        { key: 'street_light_default', label: 'विज / दिवाबत्ती कर (Street Light Tax)' },
        { key: 'health_tax_default', label: 'आरोग्य रक्षण कर (Health Tax)' },
        { key: 'general_water_default', label: 'सामान्य पाणी कर (General Water Tax)' },
        { key: 'special_water_default', label: 'विशेष पाणी कर (Special Water Tax)' },
        { key: 'waste_collection_default', label: 'कचरा गाडी कर (Waste Collection Tax)' }
    ];

    const bulkUpdateFields = [
        { key: 'streetLightTax', label: 'विज / दिवाबत्ती कर (Street Light Tax)' },
        { key: 'healthTax', label: 'आरोग्य रक्षण कर (Health Tax)' },
        { key: 'wasteCollectionTax', label: 'कचरा गाडी कर (Waste Collection Tax)' },
        { key: 'generalWaterTax', label: 'सामान्य पाणी कर (General Water Tax)' },
        { key: 'specialWaterTax', label: 'विशेष पाणी कर (Special Water Tax)' },

    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
            {/* Header Action Bar */}
            <header className="no-print shrink-0 bg-white border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                            <Settings className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">प्रणाली संचलन</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">System Administration Master</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={openFYModal}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-black uppercase tracking-wider hover:bg-amber-600 hover:text-white transition-all text-[10px] active:scale-95 group shadow-sm"
                            title="आर्थिक वर्ष बदला - विश्लेषण व पुष्टी"
                        >
                            <IndianRupee className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" /> आर्थिक वर्ष बदला
                        </button>

                        {activeTab !== 'users' && activeTab !== 'common' && activeTab !== 'import' && (
                            <button
                                onClick={() => {
                                    setShowAddForm(!showAddForm);
                                    if (activeTab === 'rr') setNewForm({ year_range: '', item_name_mr: '', valuation_rate: 0, tax_rate: 0, unit_mr: 'चौ. मी.' });
                                    else if (activeTab === 'dep') setNewForm({ min_age: 0, max_age: 0, percentage: 100 });
                                    else if (activeTab === 'bu') setNewForm({ usage_type_mr: '', usage_type_en: '', weightage: 1.0 });
                                    else if (selectedCategory) setNewForm({ item_value_mr: '', item_value_en: '', item_code: '', sort_order: 0, category_id: selectedCategory.id });
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-all text-[11px] active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> नवीन नोंद जोडा
                            </button>
                        )}
                        <button onClick={fetchData} className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all active:scale-95">
                            <RotateCcw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 p-6">

                {/* Main Content Area */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className="px-6 bg-white border-b border-slate-100 flex items-center justify-start shrink-0 overflow-x-auto hide-scrollbar">
                        {renderTabButton('tax', 'कर दर', <TrendingDown />)}
                        {renderTabButton('dep', 'घसारा', <Activity />)}
                        {renderTabButton('bu', 'वापर प्रकार', <Briefcase />)}
                        {renderTabButton('rr', 'रेडी रेकनर', <FileSpreadsheet />)}

                        {/* Dynamic Category Tabs */}
                        {filteredCategories.map(cat => (
                            renderTabButton(cat.code, cat.code === 'WASTI' ? 'वस्ती (वॉर्डसह)' : cat.name_mr, <Filter />)
                        ))}

                        {renderTabButton('common', 'सामान्य कर ', <Landmark />)}
                        {renderTabButton('bulk-tax', 'एकत्रित कर बदल', <IndianRupee />)}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-6 py-20 grayscale opacity-50">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                                <div className="text-center">
                                    <p className="font-black text-slate-800 uppercase tracking-widest text-sm">डेटा लोड होत आहे</p>
                                    <p className="text-xs text-slate-400 mt-2">कृपया काही क्षण प्रतीक्षा करा...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-500">
                                {activeTab === 'tax' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">⚙️ मालमत्ता कर दर (Property Tax Rates)</h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">Building and Land Tax Configuration per Wasti</p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th className="px-6 py-4">प्रकार</th>
                                                        <th className="px-6 py-4">वस्ती / वॉर्ड</th>
                                                        <th className="px-6 py-4 text-center">इमारत दर (₹)</th>
                                                        <th className="px-6 py-4 text-center">इमारत कर (पैसे)</th>
                                                        <th className="px-6 py-4 text-center">जमीन दर (₹)</th>
                                                        <th className="px-6 py-4 text-center">जमीन कर (पैसे)</th>
                                                        <th className="px-6 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {rates.map(r => (
                                                        <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                            <td className="px-6 py-4 font-bold text-slate-800 uppercase text-xs">{r.propertyType}</td>
                                                            <td className="px-6 py-4 text-slate-500 font-bold">{r.wastiName}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? <input className="w-20 bg-white border-slate-200 rounded p-1 text-center" type="number" value={editForm.buildingRate} onChange={e => setEditForm({ ...editForm, buildingRate: Number(e.target.value) })} /> : <span className="font-extrabold text-blue-600">{MN(r.buildingRate)}</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? <input className="w-20 bg-white border-slate-200 rounded p-1 text-center" type="number" step="0.01" value={editForm.buildingTaxRate} onChange={e => setEditForm({ ...editForm, buildingTaxRate: Number(e.target.value) })} /> : <span className="font-extrabold text-indigo-700">{MN(r.buildingTaxRate)}</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? <input className="w-20 bg-white border-slate-200 rounded p-1 text-center" type="number" value={editForm.landRate} onChange={e => setEditForm({ ...editForm, landRate: Number(e.target.value) })} /> : <span className="font-extrabold text-amber-600">{MN(r.landRate)}</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? <input className="w-20 bg-white border-slate-200 rounded p-1 text-center" type="number" step="0.01" value={editForm.openSpaceTaxRate} onChange={e => setEditForm({ ...editForm, openSpaceTaxRate: Number(e.target.value) })} /> : <span className="font-extrabold text-orange-600">{MN(r.openSpaceTaxRate)}</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {editingId === r.id ? (
                                                                    <div className="flex justify-end gap-1">
                                                                        <button onClick={() => handleSave('tax', r.id, editForm)} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Save className="w-4 h-4" /></button>
                                                                        <button onClick={() => setEditingId(null)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><X className="w-4 h-4" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => { setEditingId(r.id); setEditForm(r); }} className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm mx-auto">
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'dep' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">📉 घसारा दर (Depreciation Rates)</h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">Building Age-based Valuation Depreciation</p>
                                            </div>
                                        </div>
                                        {showAddForm && (
                                            <div className="bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 flex gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold flex-1" type="number" placeholder="किमान वय" value={newForm.min_age} onChange={e => setNewForm({ ...newForm, min_age: Number(e.target.value) })} />
                                                <input className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold flex-1" type="number" placeholder="कमाल वय" value={newForm.max_age} onChange={e => setNewForm({ ...newForm, max_age: Number(e.target.value) })} />
                                                <input className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold flex-1" type="number" placeholder="घसारा टक्केवारी (%)" value={newForm.percentage} onChange={e => setNewForm({ ...newForm, percentage: Number(e.target.value) })} />
                                                <button onClick={() => handleSave('dep', null, newForm)} className="bg-indigo-600 text-white px-8 rounded-xl font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">जतन करा</button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th className="px-8 py-4">इमारतीचे वय (वर्षे)</th>
                                                        <th className="px-8 py-4 text-center">उर्वरित मूल्य टक्केवारी (%)</th>
                                                        <th className="px-8 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {depRates.map(r => (
                                                        <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                            <td className="px-8 py-4 font-bold text-slate-700">
                                                                {editingId === r.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input className="w-16 border rounded p-1" type="number" value={editForm.min_age} onChange={e => setEditForm({ ...editForm, min_age: Number(e.target.value) })} />
                                                                        <span className="text-slate-400">ते</span>
                                                                        <input className="w-16 border rounded p-1" type="number" value={editForm.max_age} onChange={e => setEditForm({ ...editForm, max_age: Number(e.target.value) })} />
                                                                    </div>
                                                                ) : <span className="flex items-center gap-2 tabular-nums">{MN(r.min_age || 0)} <span className="text-slate-300">ते</span> {MN(r.max_age || 0)} वर्षे</span>}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? <input className="w-20 border rounded p-1 text-center" type="number" value={editForm.percentage} onChange={e => setEditForm({ ...editForm, percentage: Number(e.target.value) })} /> : <span className="font-extrabold text-rose-600 tabular-nums">{MN(r.percentage)}%</span>}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === r.id ? (
                                                                        <>
                                                                            <button onClick={() => handleSave('dep', r.id, editForm)} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Save className="w-4 h-4" /></button>
                                                                            <button onClick={() => setEditingId(null)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><X className="w-4 h-4" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button onClick={() => { setEditingId(r.id); setEditForm(r); }} className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                            <button onClick={() => handleDelete('dep', r.id)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bu' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">🏢 इमारत वापर प्रकार (Building Usage Types)</h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">Weightage multipliers based on building purpose</p>
                                            </div>
                                        </div>
                                        {showAddForm && (
                                            <div className="bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 grid grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="वापर (मराठी)" value={newForm.usage_type_mr} onChange={e => setNewForm({ ...newForm, usage_type_mr: e.target.value })} />
                                                <input className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Usage (English)" value={newForm.usage_type_en} onChange={e => setNewForm({ ...newForm, usage_type_en: e.target.value })} />
                                                <input className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold" type="number" step="0.01" placeholder="गुणक (Weightage)" value={newForm.weightage} onChange={e => setNewForm({ ...newForm, weightage: Number(e.target.value) })} />
                                                <button onClick={() => handleSave('bu', null, newForm)} className="bg-indigo-600 text-white rounded-xl font-black uppercase text-[11px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10">जतन करा</button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-3xl mx-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th className="px-8 py-4">वापर प्रकार (मराठी / English)</th>
                                                        <th className="px-8 py-4 text-center">गुणक (Weightage)</th>
                                                        <th className="px-8 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {buRates.map(r => (
                                                        <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                            <td className="px-8 py-4">
                                                                {editingId === r.id ? (
                                                                    <div className="flex gap-2">
                                                                        <input className="bg-white border border-slate-200 rounded p-1 flex-1 font-bold text-sm" value={editForm.usage_type_mr} onChange={e => setEditForm({ ...editForm, usage_type_mr: e.target.value })} />
                                                                        <input className="bg-white border border-slate-200 rounded p-1 flex-1 font-bold text-sm opacity-60" value={editForm.usage_type_en} onChange={e => setEditForm({ ...editForm, usage_type_en: e.target.value })} />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span className="font-black text-slate-800 text-sm block">{r.usage_type_mr}</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.usage_type_en || '-'}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? <input className="w-20 border rounded p-1 font-bold text-center" type="number" step="0.01" value={editForm.weightage} onChange={e => setEditForm({ ...editForm, weightage: Number(e.target.value) })} /> : <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-lg font-black font-mono shadow-sm border border-teal-100">{Number(r.weightage ?? 1.0).toFixed(2)}</span>}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === r.id ? (
                                                                        <>
                                                                            <button onClick={() => handleSave('bu', r.id, editForm)} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Save className="w-4 h-4" /></button>
                                                                            <button onClick={() => setEditingId(null)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><X className="w-4 h-4" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button onClick={() => { setEditingId(r.id); setEditForm(r); }} className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                            <button onClick={() => handleDelete('bu', r.id)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'rr' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">📜 रेडी रेकनर दर (Ready Reckoner Rates)</h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">Government valuation rates for property calculation</p>
                                            </div>
                                        </div>
                                        {showAddForm && (
                                            <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-indigo-100 grid grid-cols-1 md:grid-cols-5 gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" placeholder="वर्ष (उदा. २०२५-२६)" value={newForm.year_range} onChange={e => setNewForm({ ...newForm, year_range: e.target.value })} />
                                                <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" placeholder="प्रकार (उदा. निवासी)" value={newForm.item_name_mr} onChange={e => setNewForm({ ...newForm, item_name_mr: e.target.value })} />
                                                <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" type="number" placeholder="मूल्यांकन दर" value={newForm.valuation_rate} onChange={e => setNewForm({ ...newForm, valuation_rate: Number(e.target.value) })} />
                                                <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" type="number" step="0.01" placeholder="कर दर (%)" value={newForm.tax_rate} onChange={e => setNewForm({ ...newForm, tax_rate: Number(e.target.value) })} />
                                                <button onClick={() => handleSave('rr', null, newForm)} className="bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all">जतन करा</button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 z-20">
                                                    <tr className="bg-slate-50/90 backdrop-blur-md text-slate-500 border-b border-slate-200 shadow-sm">
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">वर्ष / कालावधी</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">वापर / आयटम नाव</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">मूल्यांकन (₹)</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">कर दर (%)</th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {rrRates.map(r => (
                                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                                                            <td className="px-8 py-4">
                                                                {editingId === r.id ? (
                                                                    <input className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full font-bold text-sm shadow-inner" value={editForm.year_range} onChange={e => setEditForm({ ...editForm, year_range: e.target.value })} />
                                                                ) : (
                                                                    <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-black text-xs border border-amber-100">{MN(r.year_range)}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                {editingId === r.id ? (
                                                                    <input className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full font-bold text-sm shadow-inner" value={editForm.item_name_mr} onChange={e => setEditForm({ ...editForm, item_name_mr: e.target.value })} />
                                                                ) : (
                                                                    <span className="font-extrabold text-slate-800 text-[13px]">{r.item_name_mr}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm shadow-inner text-center" type="number" value={editForm.valuation_rate} onChange={e => setEditForm({ ...editForm, valuation_rate: Number(e.target.value) })} />
                                                                ) : (
                                                                    <span className="font-black text-indigo-600">₹{MN(r.valuation_rate)}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input className="w-20 bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm shadow-inner text-center" type="number" step="0.01" value={editForm.tax_rate} onChange={e => setEditForm({ ...editForm, tax_rate: Number(e.target.value) })} />
                                                                ) : (
                                                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg font-black text-xs border border-emerald-100">{MN(r.tax_rate)}%</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === r.id ? (
                                                                        <>
                                                                            <button onClick={() => handleSave('rr', r.id, editForm)} className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-md"><Save className="w-4 h-4" /></button>
                                                                            <button onClick={() => setEditingId(null)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-md"><X className="w-4 h-4" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button onClick={() => { setEditingId(r.id); setEditForm(r); }} className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                                                            <button onClick={() => handleDelete('rr', r.id)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {selectedCategory && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    📁 {selectedCategory.code === 'WASTI' ? 'वस्ती आणि वॉर्ड व्यवस्थापन' : `${selectedCategory.name_mr} व्यवस्थापन`}
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    {selectedCategory.code === 'WASTI' ? 'येथून तुम्ही वस्ती आणि त्यांच्याशी संबंधित वॉर्ड नंबर व्यवस्थापित करू शकता.' :
                                                        selectedCategory.code === 'PROPERTY_TYPE' ? 'येथून तुम्ही मालमत्तेचे विविध प्रकार (उदा. आर.सी.सी, कच्चा, पक्का) व्यवस्थापित करू शकता.' :
                                                            `येथून तुम्ही ${selectedCategory.name_mr} ची माहिती व्यवस्थापित करू शकता.`}
                                                </p>
                                            </div>
                                            {selectedCategory.code === 'PROPERTY_TYPE' && subItems.length === 0 && (
                                                <button
                                                    onClick={() => fetchData()}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                                                >
                                                    प्रमाणित प्रकार लोड करा (Refresh)
                                                </button>
                                            )}
                                        </div>
                                        {showAddForm && (
                                            <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" placeholder={selectedCategory.code === 'WASTI' ? "वस्तीचे नाव" : "आयटम नाव (मराठी)"} value={newForm.item_value_mr} onChange={e => setNewForm({ ...newForm, item_value_mr: e.target.value })} />
                                                {selectedCategory.code === 'WASTI' ? (
                                                    <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all" placeholder="वॉर्ड क्रमांक" value={newForm.item_code} onChange={e => setNewForm({ ...newForm, item_code: e.target.value })} />
                                                ) : (
                                                    <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" placeholder="Item Name (English)" value={newForm.item_value_en} onChange={e => setNewForm({ ...newForm, item_value_en: e.target.value })} />
                                                )}
                                                {selectedCategory.code !== 'WASTI' && <input className="bg-slate-50 border-transparent rounded-2xl p-3.5 font-mono text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" placeholder="Item Code" value={newForm.item_code} onChange={e => setNewForm({ ...newForm, item_code: e.target.value })} />}
                                                <button onClick={() => handleSave(selectedCategory.code, null, newForm)} className="bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all">जतन करा</button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 z-20">
                                                    <tr className="bg-slate-50/90 backdrop-blur-md text-slate-500 border-b border-slate-200 shadow-sm">
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">
                                                            {selectedCategory.code === 'WASTI' ? 'वस्तीचे नाव' : 'आयटम नाव (मराठी / English)'}
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">
                                                            {selectedCategory.code === 'WASTI' ? 'वॉर्ड क्रमांक' : 'कोड (Code)'}
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">कृती (Action)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {subItems.length > 0 ? subItems.map(i => (
                                                        <tr key={i.id} className="hover:bg-slate-50/80 transition-all group">
                                                            <td className="px-8 py-4">
                                                                {editingId === i.id ? (
                                                                    <div className="flex gap-2">
                                                                        <input className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex-1 font-bold text-sm shadow-inner" value={editForm.item_value_mr} onChange={e => setEditForm({ ...editForm, item_value_mr: e.target.value })} />
                                                                        {selectedCategory.code !== 'WASTI' && <input className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex-1 font-bold text-sm opacity-60 shadow-inner" value={editForm.item_value_en} onChange={e => setEditForm({ ...editForm, item_value_en: e.target.value })} />}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-extrabold text-slate-800 text-[13px]">{i.item_value_mr}</span>
                                                                        {selectedCategory.code !== 'WASTI' && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{i.item_value_en || '-'}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === i.id ? (
                                                                    <input className="w-32 bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm shadow-inner text-center" value={editForm.item_code} onChange={e => setEditForm({ ...editForm, item_code: e.target.value })} />
                                                                ) : (
                                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest font-mono ${selectedCategory.code === 'WASTI' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-400'}`}>
                                                                        {selectedCategory.code === 'WASTI' ? `वॉर्ड ${MN(i.item_code)}` : (i.item_code || '-')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === i.id ? (
                                                                        <>
                                                                            <button onClick={() => handleSave(selectedCategory.code, i.id, editForm)} className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-md"><Save className="w-4 h-4" /></button>
                                                                            <button onClick={() => setEditingId(null)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-md"><X className="w-4 h-4" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button onClick={() => { setEditingId(i.id); setEditForm(i); }} className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                                                            <button onClick={() => handleDelete(selectedCategory.code, i.id)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan={3} className="py-20 text-center grayscale opacity-30">
                                                                <div className="flex flex-col items-center gap-4">
                                                                    <Settings className="w-12 h-12" />
                                                                    <p className="text-xs font-black uppercase tracking-[0.2em]">या श्रेणीत अद्याप कोणतीही माहिती नाही</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bulk-tax' && (
                                    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden">
                                            {/* Selection Section */}
                                            <div className="bg-slate-50/50 border-b border-slate-100 p-8">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                                        <IndianRupee className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">एकत्रित कर बदल (Bulk Tax Update)</h3>
                                                        <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1 tracking-[0.2em]">Select Layout, Type, or Khasra for update</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:w-1/2">
                                                    {/* Layout Selection */}
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">१. लेआउट (Layout)</label>
                                                        <select
                                                            value={bulkForm.layoutName}
                                                            onChange={e => setBulkForm({ ...bulkForm, layoutName: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                        >
                                                            <option value="सर्व">सर्व लेआउट (ALL)</option>
                                                            {layouts.map(l => (
                                                                <option key={l.id} value={l.item_value_mr} className="w-1/2">{l.item_value_mr} ({(l as any).propertyCount || 0})</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Property Type Selection */}
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">२. मालमत्ता प्रकार (Property Type)</label>
                                                        <select
                                                            value={bulkForm.propertyType}
                                                            onChange={e => setBulkForm({ ...bulkForm, propertyType: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                        >
                                                            <option value="सर्व">सर्व मालमत्ता प्रकार (All)</option>
                                                            {propertyTypes.map(t => (
                                                                <option key={t.id} value={t.item_value_mr}>{t.item_value_mr}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tight Tax Grid */}
                                            <div className="p-8 space-y-6">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">३. कर आणि दर प्रविष्ट करा (Insert Tax Values)</h4>
                                                    <button
                                                        onClick={() => {
                                                            setBulkForm(prev => ({
                                                                ...prev,
                                                                taxes: {
                                                                    streetLightTax: '' as any,
                                                                    healthTax: '' as any,
                                                                    wasteCollectionTax: '' as any,
                                                                    generalWaterTax: '' as any,
                                                                    specialWaterTax: '' as any
                                                                }
                                                            }));
                                                        }}
                                                        className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                                                    >
                                                        सर्व साफ करा
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {bulkUpdateFields.map(field => {
                                                        const val = (bulkForm.taxes as any)[field.key];
                                                        const isFilled = val !== undefined && val !== null && val !== '';
                                                        return (
                                                            <div
                                                                key={field.key}
                                                                className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all ${isFilled ? 'border-indigo-600 bg-indigo-50/20 shadow-md' : 'border-slate-100 bg-white'}`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className={`text-[9px] font-black uppercase tracking-tight ${isFilled ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                        {field.label.split('(')[0]}
                                                                    </span>
                                                                </div>
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        value={val === 0 ? '0' : (val || '')}
                                                                        onChange={e => {
                                                                            setBulkForm({
                                                                                ...bulkForm,
                                                                                taxes: { ...bulkForm.taxes, [field.key]: e.target.value }
                                                                            });
                                                                        }}
                                                                        className={`w-full bg-white border-b-2 rounded-lg py-1.5 pl-6 pr-2 font-black text-xs text-slate-700 outline-none transition-all ${isFilled ? 'border-indigo-600' : 'border-slate-100 focus:border-indigo-300'}`}
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="pt-6 border-t border-slate-50 flex flex-col items-center gap-6">
                                                    <button
                                                        onClick={handleBulkUpdate}
                                                        className="w-full md:w-auto px-16 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-xs shadow-xl bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95"
                                                    >
                                                        {bulkForm.layoutName === 'सर्व' ? 'सर्व मालमत्तांवर लागू करा' : 'निवडलेल्या लेआउटवर लागू करा'} (Apply Now)
                                                    </button>

                                                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 max-w-2xl">
                                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] font-bold text-amber-800 leading-tight uppercase">
                                                            टीप: वरील बदल केल्यावर निवडलेल्या {bulkForm.layoutName} मधील {bulkForm.propertyType === 'सर्व' ? 'सर्व' : bulkForm.propertyType} मालमत्तांचे कर अपडेट होतील.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'common' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">🏛️ सामान्य कर  दर (Common/Global Taxes)</h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">Village-wide standard tax amounts</p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto">
                                            <div className="divide-y divide-slate-50">
                                                {commonTaxFields.map(field => (
                                                    <div key={field.key} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors group">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-700">{field.label}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Global Default Value</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {editingId === field.key ? (
                                                                <div className="flex gap-2 items-center">
                                                                    <input
                                                                        className="w-24 bg-white border border-indigo-200 rounded-xl px-4 py-2 font-black text-sm text-center shadow-inner focus:ring-2 focus:ring-indigo-100 outline-none"
                                                                        type="number"
                                                                        value={editForm[field.key] ?? (config[field.key] || '0')}
                                                                        onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                                                                    />
                                                                    <button onClick={() => handleSave('config', field.key, { [field.key]: editForm[field.key] })} className="bg-emerald-500 text-white p-2 rounded-lg shadow-md hover:bg-emerald-600 transition-all"><Save className="w-4 h-4" /></button>
                                                                    <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-400 p-2 rounded-lg hover:bg-slate-200 transition-all"><X className="w-4 h-4" /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-6">
                                                                    <span className="text-lg font-black text-indigo-600 tabular-nums">₹{MN(config[field.key] || '०')}</span>
                                                                    <button onClick={() => { setEditingId(field.key); setEditForm({ [field.key]: config[field.key] }); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 max-w-2xl mx-auto">
                                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                            <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wide">
                                                टीप: सामान्य कर  दरांमध्ये बदल केल्यास, भविष्यात जोडल्या जाणाऱ्या सर्व नवीन मालमत्तांवर हे दर आपोआप लागू होतील. जुन्या मालमत्तांचे दर बदलण्यासाठी "मालमत्ता व्यवस्थापन" मध्ये जावे लागेल.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Status Bar */}
            <footer className="p-4 bg-white border-t border-slate-100 shrink-0 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] no-print">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm">
                        <Activity className="w-3 h-3 animate-pulse" />
                        प्रणाली सक्रीय आहे (System Live)
                    </div>
                    <span className="opacity-40">|</span>
                    <span className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-indigo-400" />
                        सुरक्षित व्यवस्थापन मोड (Safe Admin Mode)
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    GramSarthi v2.0 • Last Sync: {MN(new Date().toLocaleTimeString())}
                </div>
            </footer>

            {/* ====== FY MIGRATION WIZARD ====== */}
            {showFYModal && (
                <FYMigrationWizard
                    currentFY={config['current_fy'] || ''}
                    onClose={() => setShowFYModal(false)}
                    onDone={fetchData}
                    addToast={addToast}
                    onAuthError={onAuthError}
                />
            )}
        </div>
    );
}
