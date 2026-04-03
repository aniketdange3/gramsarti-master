import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from 'react';
import {
    Settings, Map, Percent, Database, History,
    Plus, Edit2, Trash2, Save, X, ChevronRight,
    TrendingUp, Info, AlertCircle, CheckCircle2,
    Lightbulb, Activity, Droplets
} from 'lucide-react';
import { hasModulePermission } from '../utils/permissions';

interface MasterItem {
    id: number;
    category_id: number;
    item_value_mr: string;
    item_value_en?: string;
    item_code?: string;
    is_active: boolean;
    sort_order: number;
    category_code?: string;
}

interface TaxRate {
    id: number;
    propertyType: string;
    wastiName: string;
    buildingRate: number;
    buildingTaxRate: number;
    landRate: number;
    openSpaceTaxRate: number;
    interest_rate: number;
    penalty_rate: number;
    financial_year: string;
}

interface DepreciationRate {
    id: number;
    min_age: number;
    max_age: number;
    percentage: number;
}

interface ReadyReckonerRate {
    id: number;
    year_range: string;
    item_name_mr: string;
    valuation_rate: number;
    tax_rate: number;
    unit_mr: string;
}

interface BuildingUsageRate {
    id: number;
    usage_type_mr: string;
    usage_type_en: string;
    weightage: number;
}

interface UserRecord {
    id: number;
    name: string;
    username: string;
    role: string;
    email: string | null;
    mobile: string | null;
    employee_id: string | null;
    gp_code: string;
    is_active: boolean;
    created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'सुपर अ‍ॅडमिन',
    gram_sevak: 'ग्रामसेवक',
    operator: 'ऑपरेटर',
    collection_officer: 'वसुली अधिकारी',
    sarpanch: 'सरपंच',
    auditor: 'लेखापरीक्षक',
    gram_sachiv: 'ग्राम सचिव',
    clerk: 'लिपीक',
    bill_operator: 'बिल ऑपरेटर',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
    super_admin: ['संपूर्ण सिस्टीम अ‍ॅक्सेस', 'वापरकर्ता व्यवस्थापन', 'प्रणाली संरचना (Settings)', 'सर्व रिपोर्ट पाहणे आणि डाउनलोड करणे'],
    gram_sevak: ['प्रशासकीय अधिकार', 'मालमत्ता नोंदणी आणि फेरफार', 'सर्व रिपोर्ट पाहणे', 'वसुलीचे नियमन'],
    gram_sachiv: ['प्रशासकीय अधिकार', 'मालमत्ता नोंदणी', 'सर्व रिपोर्ट पाहणे', 'खर्च आणि जमा नोंदवणे'],
    operator: ['मालमत्ता माहिती भरणे (Data Entry)', 'मागणी बिल काढणे', 'रिपोर्ट पाहणे'],
    collection_officer: ['कर वसुली (Tax Collection)', 'पावती फाडणे', 'दैनिक वसुली रिपोर्ट'],
};

interface TaxMasterProps {
    onAuthError?: () => void;
}

export default function TaxMaster({ onAuthError }: TaxMasterProps) {
    const [activeTab, setActiveTab] = useState('general');
    const [activeSubTab, setActiveSubTab] = useState('street_light');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [systemConfig, setSystemConfig] = useState<any>({
        financial_year: '2025-26',
        interest_rate: '1.5',
        penalty_rate: '5.0',
        street_light_default: '25',
        waste_collection_default: '200',
        health_tax_default: '25',
        general_water_default: '25',
        special_water_default: '750'
    });

    const [wastiItems, setWastiItems] = useState<MasterItem[]>([]);
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [depreciationRates, setDepreciationRates] = useState<DepreciationRate[]>([]);
    const [readyReckonerRates, setReadyReckonerRates] = useState<ReadyReckonerRate[]>([]);
    const [buildingUsageRates, setBuildingUsageRates] = useState<BuildingUsageRate[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserRecord | null>(null);

    const currentUser = React.useMemo(() => JSON.parse(localStorage.getItem('gp_user') || '{}'), []);
    const canAdd = hasModulePermission(currentUser, 'taxMaster', 'add');
    const canEdit = hasModulePermission(currentUser, 'taxMaster', 'edit');
    const canDelete = hasModulePermission(currentUser, 'taxMaster', 'delete');

    const groupedRr = React.useMemo(() => {
        return readyReckonerRates.reduce((acc: any, rate) => {
            if (!acc[rate.year_range]) acc[rate.year_range] = [];
            acc[rate.year_range].push(rate);
            return acc;
        }, {});
    }, [readyReckonerRates]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('gp_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const fetchWithAuth = async (url: string) => {
                const r = await fetch(url, { headers });
                if (r.status === 401 && onAuthError) onAuthError();
                return r;
            };

            const [wRes, tRes, dRes, rRes, buRes, cRes, configRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/api/master/items/WASTI`),
                fetchWithAuth(`${API_BASE_URL}/api/tax-rates`),
                fetchWithAuth(`${API_BASE_URL}/api/master/depreciation`),
                fetchWithAuth(`${API_BASE_URL}/api/master/ready-reckoner`),
                fetchWithAuth(`${API_BASE_URL}/api/master/building-usage`),
                fetchWithAuth(`${API_BASE_URL}/api/master/categories`),
                fetchWithAuth(`${API_BASE_URL}/api/system-config`),
            ]);

            if (['super_admin', 'gram_sevak', 'gram_sachiv'].includes(currentUser.role)) {
                const uRes = await fetch(`${API_BASE_URL}/api/auth/users`, { headers });
                if (uRes.ok) setUsers(await uRes.json());
            }

            if (wRes.ok) setWastiItems(await wRes.json());
            if (tRes.ok) setTaxRates(await tRes.json());
            if (dRes.ok) setDepreciationRates(await dRes.json());
            if (rRes.ok) setReadyReckonerRates(await rRes.json());
            if (buRes.ok) setBuildingUsageRates(await buRes.json());
            if (cRes.ok) setCategories(await cRes.json());
            if (configRes.ok) setSystemConfig(await configRes.json());
        } catch (err) {
            showMsg('error', 'माहिती मिळवताना त्रुटी आली.');
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/api/system-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(systemConfig)
            });
            if (res.ok) showMsg('success', 'संरचना यशस्वीरीत्या जतन झाली.');
        } catch (err) {
            showMsg('error', 'जतन करताना त्रुटी आली.');
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        let data: any = {};
        let endpoint = '';

        if (activeTab === 'wasti') {
            data = {
                category_id: categories.find(c => c.code === 'WASTI')?.id,
                item_value_mr: formData.get('item_value_mr'),
                sort_order: parseInt(formData.get('sort_order') as string || '0'),
                is_active: true
            };
            endpoint = editingItem ? `api/master/items/${editingItem.id}` : 'api/master/items';
        } else if (activeTab === 'tax') {
            data = {
                propertyType: formData.get('propertyType'),
                wastiName: formData.get('wastiName'),
                buildingRate: parseFloat(formData.get('buildingRate') as string),
                buildingTaxRate: parseFloat(formData.get('buildingTaxRate') as string),
                landRate: parseFloat(formData.get('landRate') as string),
                openSpaceTaxRate: parseFloat(formData.get('openSpaceTaxRate') as string)
            };
            endpoint = editingItem ? `api/tax-rates/${editingItem.id}` : 'api/tax-rates';
        } else if (activeTab === 'rr') {
            data = {
                year_range: formData.get('year_range'),
                item_name_mr: formData.get('item_name_mr'),
                valuation_rate: parseFloat(formData.get('valuation_rate') as string),
                tax_rate: parseFloat(formData.get('tax_rate') as string),
                unit_mr: formData.get('unit_mr')
            };
            endpoint = editingItem ? `api/master/ready-reckoner/${editingItem.id}` : 'api/master/ready-reckoner';
        } else if (activeTab === 'depreciation') {
            data = {
                min_age: parseInt(formData.get('min_age') as string),
                max_age: parseInt(formData.get('max_age') as string),
                percentage: parseFloat(formData.get('percentage') as string)
            };
            endpoint = editingItem ? `api/master/depreciation/${editingItem.id}` : 'api/master/depreciation';
        } else if (activeTab === 'building_usage') {
            data = {
                usage_type_mr: formData.get('usage_type_mr'),
                usage_type_en: formData.get('usage_type_en'),
                weightage: parseFloat(formData.get('weightage') as string)
            };
            endpoint = editingItem ? `api/master/building-usage/${editingItem.id}` : 'api/master/building-usage';
        } else if (activeTab === 'users') {
            data = {
                name: formData.get('name'),
                username: formData.get('username'),
                password: formData.get('password'),
                role: formData.get('role'),
                mobile: formData.get('mobile')
            };
            endpoint = editingItem ? `api/auth/users/${editingItem.id}` : 'api/auth/users';
        }

        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: editingItem ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showMsg('success', 'यशस्वीरीत्या जतन झाले.');
                setIsAdding(false);
                setEditingItem(null);
                fetchInitialData();
            }
        } catch (err) {
            showMsg('error', 'जतन करताना त्रुटी आली.');
        }
    };

    const deleteItem = async (type: string, id: number) => {
        if (!confirm('आपण खात्रीने हटवू इच्छिता?')) return;
        try {
            const endpoint = {
                wasti: `api/master/items/${id}`,
                tax: `api/tax-rates/${id}`,
                rr: `api/master/ready-reckoner/${id}`,
                depreciation: `api/master/depreciation/${id}`,
                building_usage: `api/master/building-usage/${id}`,
                users: `api/auth/users/${id}`
            }[type];

            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showMsg('success', 'नोंद यशस्वीरीत्या हटवली.');
                fetchInitialData();
            }
        } catch (err) {
            showMsg('error', 'हटवताना त्रुटी आली.');
        }
    };

    const tabs = [
        { id: 'general', label: 'सामान्य सेटिंग्स', icon: <Settings className="w-4 h-4" /> },
        { id: 'tax_defaults', label: 'कराचा तपशील', icon: <Database className="w-4 h-4" /> },
        { id: 'wasti', label: 'वस्ती व वॉर्ड', icon: <Map className="w-4 h-4" /> },
        { id: 'tax', label: 'कर आकारणी दर', icon: <Percent className="w-4 h-4" /> },
        { id: 'rr', label: 'रेडी रेकनर', icon: <Database className="w-4 h-4" /> },
        { id: 'depreciation', label: 'घसारा दर', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'building_usage', label: 'इमारत वापर', icon: <Database className="w-4 h-4" /> },
        ...(['super_admin', 'gram_sevak', 'gram_sachiv'].includes(currentUser.role)
            ? [{ id: 'users', label: 'वापरकर्ता व्यवस्थापन', icon: <Activity className="w-4 h-4" /> }]
            : [])
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-6 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <Settings className="w-5 h-5" />
                            </div>
                            प्रणाली संचालन केंद्र — Tax Master
                        </h2>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1 ml-13">मास्टर डेटा आणि प्रणाली संरचना</p>
                    </div>
                    {message && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white/50 backdrop-blur-sm border-b border-slate-200 px-8 gap-4 overflow-x-auto hide-scrollbar sticky top-[89px] z-10">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeTab === t.id ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto">
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <form onSubmit={handleSaveConfig} className="bg-white rounded-[2.5rem] premium-shadow-blue border border-indigo-50/50 p-8">
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" /> वित्तीय संरचना
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">चालू आर्थिक वर्ष</label>
                                        <select value={systemConfig.financial_year} onChange={e => setSystemConfig({ ...systemConfig, financial_year: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                                            <option value="2025-26">२०२५-२६</option>
                                            <option value="2024-25">२०२४-२५</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">व्याज दर (%)</label>
                                            <input type="number" step="0.01" value={systemConfig.interest_rate} onChange={e => setSystemConfig({ ...systemConfig, interest_rate: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">दंड दर (%)</label>
                                            <input type="number" step="0.01" value={systemConfig.penalty_rate} onChange={e => setSystemConfig({ ...systemConfig, penalty_rate: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">जतन करा</button>
                                </div>
                            </form>
                            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white">
                                <Info className="w-12 h-12 text-indigo-200 mb-6" />
                                <h3 className="text-xl font-black mb-4">सूचना</h3>
                                <p className="text-indigo-200/80 text-sm leading-relaxed">येथील बदल संपूर्ण प्रणालीवर परिणाम करतात. आर्थिक वर्ष बदलताना सावधगिरी बाळगा.</p>
                            </div>
                        </div>
                    )}

                    {/* Tax Defaults Tab */}
                    {activeTab === 'tax_defaults' && (
                        <div className="space-y-6">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                {['street_light', 'waste', 'health', 'water'].map(st => (
                                    <button key={st} onClick={() => setActiveSubTab(st)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === st ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{st === 'street_light' ? 'दिवाबत्ती' : st === 'waste' ? 'कचरा' : st === 'health' ? 'आरोग्य' : 'पाणी'}</button>
                                ))}
                            </div>
                            <form onSubmit={handleSaveConfig} className="bg-white rounded-[2.5rem] p-8 border border-indigo-50/50">
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">डीफॉल्ट शुल्क (₹)</label>
                                    <input type="number" value={systemConfig[`${activeSubTab}_default`]} onChange={e => setSystemConfig({ ...systemConfig, [`${activeSubTab}_default`]: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px]">जतन करा</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Wasti Tab */}
                    {activeTab === 'wasti' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-800">वस्ती व वॉर्ड सूची</h3>
                                <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">नवीन वस्ती जोडा</button>
                            </div>
                            <div className="bg-white rounded-[2.5rem] border border-indigo-50/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-indigo-50/30">
                                            <th className="px-8 py-5 text-[10px] uppercase font-black">वस्तीचे नाव</th>
                                            <th className="px-6 py-5 text-right font-black uppercase">कृती</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50/50">
                                        {wastiItems.map(item => (
                                            <tr key={item.id} className="hover:bg-indigo-50/20 group">
                                                <td className="px-8 py-5 font-black text-slate-800">{item.item_value_mr}</td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => { setEditingItem(item); setIsAdding(true); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit2 size={14}/></button>
                                                        <button onClick={() => deleteItem('wasti', item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tax Rates Tab */}
                    {activeTab === 'tax' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-800">कर आकारणी दर पत्रक</h3>
                                <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">नवीन कर दर जोडा</button>
                            </div>
                            <div className="bg-white rounded-[2.5rem] border border-indigo-50/50 overflow-hidden">
                                <table className="w-full text-left font-black">
                                    <thead>
                                        <tr className="bg-indigo-50/30 text-[10px] text-indigo-400">
                                            <th className="px-8 py-5">मालमत्ता प्रकार</th>
                                            <th className="px-6 py-5">वस्ती</th>
                                            <th className="px-6 py-5 text-right">इमारत दर</th>
                                            <th className="px-6 py-5 text-right">कर %</th>
                                            <th className="px-8 py-5 text-right">कृती</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50/50">
                                        {taxRates.map(tr => (
                                            <tr key={tr.id} className="hover:bg-indigo-50/20 group text-sm">
                                                <td className="px-8 py-5 text-slate-800">{tr.propertyType}</td>
                                                <td className="px-6 py-5 text-slate-500">{tr.wastiName}</td>
                                                <td className="px-6 py-5 text-right text-indigo-600">₹{tr.buildingRate}</td>
                                                <td className="px-6 py-5 text-right text-slate-800">{tr.buildingTaxRate}%</td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => { setEditingItem(tr); setIsAdding(true); }} className="p-2 text-amber-600"><Edit2 size={14}/></button>
                                                        <button onClick={() => deleteItem('tax', tr.id)} className="p-2 text-rose-600"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* RR Tab */}
                    {activeTab === 'rr' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-800">रेडी रेकनर दर</h3>
                                <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">नवीन RR दर जोडा</button>
                            </div>
                            <div className="space-y-6">
                                {Object.entries(groupedRr).map(([year, rates]: [string, any]) => (
                                    <div key={year} className="bg-white rounded-[2rem] border border-indigo-100 overflow-hidden shadow-sm">
                                        <div className="bg-indigo-50/50 px-8 py-4 border-b border-indigo-100 font-black text-indigo-800 text-sm">वर्ष: {year}</div>
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                                    <th className="px-8 py-4">तपशील</th>
                                                    <th className="px-6 py-4 text-right">मूल्यांकन</th>
                                                    <th className="px-6 py-4 text-right">कर %</th>
                                                    <th className="px-8 py-4 text-right">कृती</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {rates.map((rr: any) => (
                                                    <tr key={rr.id} className="hover:bg-slate-50 text-sm group">
                                                        <td className="px-8 py-4 font-bold text-slate-700">{rr.item_name_mr}</td>
                                                        <td className="px-6 py-4 text-right font-black text-indigo-600">₹{rr.valuation_rate}</td>
                                                        <td className="px-6 py-4 text-right font-black text-slate-800">{rr.tax_rate}%</td>
                                                        <td className="px-8 py-4 text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button onClick={() => { setEditingItem(rr); setIsAdding(true); }} className="p-2 text-amber-600"><Edit2 size={12}/></button>
                                                                <button onClick={() => deleteItem('rr', rr.id)} className="p-2 text-rose-600"><Trash2 size={12}/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Depreciation, Usage, Users... */}
                    {['depreciation', 'building_usage', 'users'].includes(activeTab) && (
                         <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight capitalize">{tabs.find(t=>t.id===activeTab)?.label}</h3>
                                <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">नवीन नोंद जोडा</button>
                            </div>
                            <div className="bg-white rounded-[2.5rem] border border-indigo-50/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-indigo-50/50">
                                        {(activeTab === 'depreciation' ? depreciationRates : activeTab === 'building_usage' ? buildingUsageRates : users).map((item: any) => (
                                            <tr key={item.id} className="hover:bg-indigo-50/20 group">
                                                <td className="px-8 py-5 font-black text-slate-800 text-sm">
                                                    {activeTab === 'depreciation' ? `${item.min_age} - ${item.max_age} वर्षें (${item.percentage}%)` : 
                                                     activeTab === 'building_usage' ? `${item.usage_type_mr} (Weightage: ${item.weightage})` : 
                                                     `${item.name} (@${item.username})`}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => { setEditingItem(item); setIsAdding(true); }} className="p-2 text-amber-600"><Edit2 size={14}/></button>
                                                        <button onClick={() => deleteItem(activeTab, item.id)} className="p-2 text-rose-600"><Trash2 size={14}/></button>
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

            {/* Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleFormSubmit} className="bg-white rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl border border-white/20">
                        <div className="p-8 pb-6 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black">{editingItem ? 'बदल करा' : 'नवीन नोंद'}</h3>
                            <button type="button" onClick={() => setIsAdding(false)}><X/></button>
                        </div>
                        <div className="p-8 space-y-4">
                            {/* Generic form fields based on activeTab */}
                            {activeTab === 'wasti' && (
                                <input name="item_value_mr" defaultValue={editingItem?.item_value_mr} placeholder="वस्तीचे नाव" className="w-full bg-slate-50 border p-3 rounded-xl font-bold" required />
                            )}
                            {activeTab === 'tax' && (
                                <div className="space-y-4">
                                    <select name="propertyType" defaultValue={editingItem?.propertyType} className="w-full bg-slate-100 p-3 rounded-xl font-bold">
                                        {["आर.सी.सी.", "खाली जागा", "विटा सिमेंट", "विटा माती", "माती"].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select name="wastiName" defaultValue={editingItem?.wastiName || 'All'} className="w-full bg-slate-100 p-3 rounded-xl font-bold">
                                        <option value="All">All</option>
                                        {wastiItems.map(w => <option key={w.id} value={w.item_value_mr}>{w.item_value_mr}</option>)}
                                    </select>
                                    <input name="buildingRate" type="number" step="0.01" defaultValue={editingItem?.buildingRate} placeholder="इमारत दर" className="w-full bg-slate-50 border p-3 rounded-xl" />
                                    <input name="buildingTaxRate" type="number" step="0.001" defaultValue={editingItem?.buildingTaxRate} placeholder="कर %" className="w-full bg-slate-50 border p-3 rounded-xl" />
                                </div>
                            )}
                            {activeTab === 'rr' && (
                                <div className="space-y-4">
                                    <input name="year_range" defaultValue={editingItem?.year_range} placeholder="वर्ष (उदा. २०२४-२५)" className="w-full bg-slate-50 border p-3 rounded-xl" required />
                                    <input name="item_name_mr" defaultValue={editingItem?.item_name_mr} placeholder="तपशील" className="w-full bg-slate-50 border p-3 rounded-xl" required />
                                    <input name="valuation_rate" type="number" defaultValue={editingItem?.valuation_rate} placeholder="मूल्यांकन दर" className="w-full bg-slate-50 border p-3 rounded-xl" />
                                    <input name="tax_rate" type="number" step="0.01" defaultValue={editingItem?.tax_rate} placeholder="कर %" className="w-full bg-slate-50 border p-3 rounded-xl" />
                                </div>
                            )}
                            {activeTab === 'users' && (
                                <div className="space-y-4">
                                    <input name="name" defaultValue={editingItem?.name} placeholder="नाव" className="w-full bg-slate-50 border p-3 rounded-xl" required />
                                    <input name="username" defaultValue={editingItem?.username} placeholder="वापरकर्तानाव" className="w-full bg-slate-50 border p-3 rounded-xl" required />
                                    <input name="password" type="password" placeholder="पासवर्ड" className="w-full bg-slate-50 border p-3 rounded-xl" />
                                    <select name="role" defaultValue={editingItem?.role || 'operator'} className="w-full bg-slate-100 p-3 rounded-xl">
                                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">जतन करा</button>
                                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 bg-slate-100 rounded-xl font-black uppercase text-[10px]">रद्द</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
