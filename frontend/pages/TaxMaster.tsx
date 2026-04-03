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
    super_admin: 'à¤¸à¥à¤ªà¤° à¤…â€à¥…à¤¡à¤®à¤¿à¤¨',
    gram_sevak: 'à¤—à¥à¤°à¤¾à¤®à¤¸à¥‡à¤µà¤•',
    operator: 'à¤‘à¤ªà¤°à¥‡à¤Ÿà¤°',
    collection_officer: 'à¤µà¤¸à¥à¤²à¥€ à¤…à¤§à¤¿à¤•à¤¾à¤°à¥€',
    sarpanch: 'à¤¸à¤°à¤ªà¤‚à¤š',
    auditor: 'à¤²à¥‡à¤–à¤¾à¤ªà¤°à¥€à¤•à¥à¤·à¤•',
    gram_sachiv: 'à¤—à¥à¤°à¤¾à¤® à¤¸à¤šà¤¿à¤µ',
    clerk: 'à¤²à¤¿à¤ªà¥€à¤•',
    bill_operator: 'à¤¬à¤¿à¤² à¤‘à¤ªà¤°à¥‡à¤Ÿà¤°',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
    super_admin: ['à¤¸à¤‚à¤ªà¥‚à¤°à¥à¤£ à¤¸à¤¿à¤¸à¥à¤Ÿà¥€à¤® à¤…â€à¥…à¤•à¥à¤¸à¥‡à¤¸', 'à¤µà¤¾à¤ªà¤°à¤•à¤°à¥à¤¤à¤¾ à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¾à¤ªà¤¨', 'à¤ªà¥à¤°à¤£à¤¾à¤²à¥€ à¤¸à¤‚à¤°à¤šà¤¨à¤¾ (Settings)', 'à¤¸à¤°à¥à¤µ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤ªà¤¾à¤¹à¤£à¥‡ à¤†à¤£à¤¿ à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ à¤•à¤°à¤£à¥‡'],
    gram_sevak: ['à¤ªà¥à¤°à¤¶à¤¾à¤¸à¤•à¥€à¤¯ à¤…à¤§à¤¿à¤•à¤¾à¤°', 'à¤®à¤¾à¤²à¤®à¤¤à¥à¤¤à¤¾ à¤¨à¥‹à¤‚à¤¦à¤£à¥€ à¤†à¤£à¤¿ à¤«à¥‡à¤°à¤«à¤¾à¤°', 'à¤¸à¤°à¥à¤µ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤ªà¤¾à¤¹à¤£à¥‡', 'à¤µà¤¸à¥à¤²à¥€à¤šà¥‡ à¤¨à¤¿à¤¯à¤®à¤¨'],
    gram_sachiv: ['à¤ªà¥à¤°à¤¶à¤¾à¤¸à¤•à¥€à¤¯ à¤…à¤§à¤¿à¤•à¤¾à¤°', 'à¤®à¤¾à¤²à¤®à¤¤à¥à¤¤à¤¾ à¤¨à¥‹à¤‚à¤¦à¤£à¥€', 'à¤¸à¤°à¥à¤µ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤ªà¤¾à¤¹à¤£à¥‡', 'à¤–à¤°à¥à¤š à¤†à¤£à¤¿ à¤œà¤®à¤¾ à¤¨à¥‹à¤‚à¤¦à¤µà¤£à¥‡'],
    operator: ['à¤®à¤¾à¤²à¤®à¤¤à¥à¤¤à¤¾ à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤­à¤°à¤£à¥‡ (Data Entry)', 'à¤®à¤¾à¤—à¤£à¥€ à¤¬à¤¿à¤² à¤•à¤¾à¤¢à¤£à¥‡', 'à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤ªà¤¾à¤¹à¤£à¥‡'],
    collection_officer: ['à¤•à¤° à¤µà¤¸à¥à¤²à¥€ (Tax Collection)', 'à¤ªà¤¾à¤µà¤¤à¥€ à¤«à¤¾à¤¡à¤£à¥‡', 'à¤¦à¥ˆà¤¨à¤‚à¤¦à¤¿à¤¨ à¤µà¤¸à¥à¤²à¥€ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ'],
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

    // Data states
    const [wastiItems, setWastiItems] = useState<MasterItem[]>([]);
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [depreciationRates, setDepreciationRates] = useState<DepreciationRate[]>([]);
    const [readyReckonerRates, setReadyReckonerRates] = useState<ReadyReckonerRate[]>([]);
    const [buildingUsageRates, setBuildingUsageRates] = useState<BuildingUsageRate[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [newItem, setNewItem] = useState<any>({});

    // Form states
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);
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

            const [wRes, tRes, dRes, rRes, buRes] = await Promise.all([
                fetchWithAuth(`${API_BASE_URL}/api/master/items/WASTI`),
                fetchWithAuth(`${API_BASE_URL}/api/tax-rates`),
                fetchWithAuth(`${API_BASE_URL}/api/master/depreciation`),
                fetchWithAuth(`${API_BASE_URL}/api/master/ready-reckoner`),
                fetchWithAuth(`${API_BASE_URL}/api/master/building-usage`),
            ]);
            
            const cRes = await fetchWithAuth(`${API_BASE_URL}/api/master/categories`);
            const configRes = await fetchWithAuth(`${API_BASE_URL}/api/system-config`);

            if (['super_admin', 'gram_sevak', 'gram_sachiv'].includes(JSON.parse(localStorage.getItem('gp_user') || '{}').role)) {
                const uRes = await fetch(`${API_BASE_URL}/api/auth/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (uRes.status === 401 && onAuthError) onAuthError();
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
            showMsg('error', 'à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤®à¤¿à¤³à¤µà¤¤à¤¾à¤¨à¤¾ à¤¤à¥à¤°à¥à¤Ÿà¥€ à¤†à¤²à¥€.');
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(systemConfig)
            });
            if (res.status === 401 && onAuthError) onAuthError();
            if (res.ok) showMsg('success', 'à¤¸à¤‚à¤°à¤šà¤¨à¤¾ à¤¯à¤¶à¤¸à¥à¤µà¥€à¤°à¥€à¤¤à¥à¤¯à¤¾ à¤œà¤¤à¤¨ à¤à¤¾à¤²à¥€.');
        } catch (err) {
            showMsg('error', 'à¤œà¤¤à¤¨ à¤•à¤°à¤¤à¤¾à¤¨à¤¾ à¤¤à¥à¤°à¥à¤Ÿà¥€ à¤†à¤²à¥€.');
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
                employee_id: formData.get('employee_id'),
                mobile: formData.get('mobile')
            };
            endpoint = 'api/auth/users';
        }

        try {
            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: editingItem ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(data)
            });

            if (res.status === 401 && onAuthError) onAuthError();

            if (res.ok) {
                showMsg('success', 'à¤¯à¤¶à¤¸à¥à¤µà¥€à¤°à¥€à¤¤à¥à¤¯à¤¾ à¤œà¤¤à¤¨ à¤à¤¾à¤²à¥‡.');
                setIsAdding(false);
                setEditingItem(null);
                fetchInitialData();
            }
        } catch (err) {
            showMsg('error', 'à¤œà¤¤à¤¨ à¤•à¤°à¤¤à¤¾à¤¨à¤¾ à¤¤à¥à¤°à¥à¤Ÿà¥€ à¤†à¤²à¥€.');
        }
    };

    const deleteItem = async (type: string, id: number) => {
        if (!confirm('à¤†à¤ªà¤£ à¤–à¤¾à¤¤à¥à¤°à¥€à¤¨à¥‡ à¤¹à¤Ÿà¤µà¥‚ à¤‡à¤šà¥à¤›à¤¿à¤¤à¤¾?')) return;
        try {
            let endpoint = '';
            if (type === 'wasti') endpoint = `api/master/items/${id}`;
            if (type === 'tax') endpoint = `api/tax-rates/${id}`;
            if (type === 'rr') endpoint = `api/master/ready-reckoner/${id}`;
            if (type === 'depreciation') endpoint = `api/master/depreciation/${id}`;
            if (type === 'building_usage') endpoint = `api/master/building-usage/${id}`;

            const token = localStorage.getItem('gp_token');
            const res = await fetch(`${API_BASE_URL}/${endpoint}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 && onAuthError) onAuthError();
            if (res.ok) {
                showMsg('success', 'à¤¨à¥‹à¤‚à¤¦ à¤¯à¤¶à¤¸à¥à¤µà¥€à¤°à¥€à¤¤à¥à¤¯à¤¾ à¤¹à¤Ÿà¤µà¤²à¥€.');
                fetchInitialData();
            }
        } catch (err) {
            showMsg('error', 'à¤¹à¤Ÿà¤µà¤¤à¤¾à¤¨à¤¾ à¤¤à¥à¤°à¥à¤Ÿà¥€ à¤†à¤²à¥€.');
        }
    };

    const tabs = [
        { id: 'general', label: 'à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤¸à¥‡à¤Ÿà¤¿à¤‚à¤—à¥à¤œ', icon: <Settings className="w-4 h-4" /> },
        { id: 'tax_defaults', label: 'à¤•à¤°à¤¾à¤šà¤¾ à¤¤à¤ªà¤¶à¥€à¤²', icon: <Database className="w-4 h-4" /> },
        { id: 'wasti', label: 'à¤µà¤¸à¥à¤¤à¥€ à¤µ à¤µà¥‰à¤°à¥à¤¡', icon: <Map className="w-4 h-4" /> },
        { id: 'tax', label: 'à¤•à¤° à¤†à¤•à¤¾à¤°à¤£à¥€ à¤¦à¤°', icon: <Percent className="w-4 h-4" /> },
        { id: 'rr', label: 'à¤°à¥‡à¤¡à¥€ à¤°à¥‡à¤•à¤¨à¤°', icon: <Database className="w-4 h-4" /> },
        { id: 'depreciation', label: 'à¤˜à¤¸à¤¾à¤°à¤¾ à¤¦à¤°', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'building_usage', label: 'ðŸ¢ à¤‡à¤®à¤¾à¤°à¤¤à¥€à¤šà¤¾ à¤µà¤¾à¤ªà¤°', icon: <Database className="w-4 h-4" /> },
        ...(['super_admin', 'gram_sevak', 'gram_sachiv'].includes(JSON.parse(localStorage.getItem('gp_user') || '{}').role)
            ? [{ id: 'users', label: 'à¤µà¤¾à¤ªà¤°à¤•à¤°à¥à¤¤à¤¾ à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¾à¤ªà¤¨', icon: <Activity className="w-4 h-4" /> }]
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
                            à¤ªà¥à¤°à¤£à¤¾à¤²à¥€ à¤¸à¤‚à¤šà¤²à¤¨ à¤•à¥‡à¤‚à¤¦à¥à¤° â€” Tax Master
                        </h2>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1 ml-13">à¤®à¤¾à¤¸à¥à¤Ÿà¤° à¤¡à¥‡à¤Ÿà¤¾ à¤†à¤£à¤¿ à¤ªà¥à¤°à¤£à¤¾à¤²à¥€ à¤¸à¤‚à¤°à¤šà¤¨à¤¾</p>
                    </div>
                    {message && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
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
                                    <TrendingUp className="w-5 h-5 text-indigo-600" /> à¤µà¤¿à¤¤à¥à¤¤à¥€à¤¯ à¤¸à¤‚à¤°à¤šà¤¨à¤¾
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤šà¤¾à¤²à¥‚ à¤†à¤°à¥à¤¥à¤¿à¤• à¤µà¤°à¥à¤·</label>
                                        <select
                                            value={systemConfig.financial_year}
                                            onChange={(e) => setSystemConfig({ ...systemConfig, financial_year: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                                            <option>à¥¨à¥¦à¥¨à¥«-à¥¨à¥¬</option>
                                            <option>à¥¨à¥¦à¥¨à¥ª-à¥¨à¥«</option>
                                            <option>à¥¨à¥¦à¥¨à¥©-à¥¨à¥ª</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤µà¥à¤¯à¤¾à¤œ à¤¦à¤° (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={systemConfig.interest_rate}
                                                onChange={(e) => setSystemConfig({ ...systemConfig, interest_rate: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤¦à¤‚à¤¡ à¤¦à¤° (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={systemConfig.penalty_rate}
                                                onChange={(e) => setSystemConfig({ ...systemConfig, penalty_rate: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift" style={{ marginTop: '2rem' }}>
                                            à¤¬à¤¦à¤² à¤œà¤¤à¤¨ à¤•à¤°à¤¾
                                        </button>
                                    )}
                                </div>
                            </form>

                            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                            <Info className="w-6 h-6 text-indigo-200" />
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight mb-4">à¤¸à¥‚à¤šà¤¨à¤¾ à¤†à¤£à¤¿ à¤¸à¤¹à¤¾à¤¯à¥à¤¯</h3>
                                        <p className="text-indigo-200/80 text-sm leading-relaxed font-bold">
                                            à¤¯à¥‡à¤¥à¥€à¤² à¤¬à¤¦à¤² à¤¸à¤‚à¤ªà¥‚à¤°à¥à¤£ à¤ªà¥à¤°à¤£à¤¾à¤²à¥€à¤µà¤° à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤•à¤°à¤¤à¤¾à¤¤. à¤¨à¤µà¥€à¤¨ à¤†à¤°à¥à¤¥à¤¿à¤• à¤µà¤°à¥à¤· à¤¸à¥à¤°à¥‚ à¤•à¤°à¤¤à¤¾à¤¨à¤¾ à¤œà¥à¤¨à¥€ à¤¥à¤•à¤¬à¤¾à¤•à¥€ à¤¸à¥à¤µà¤¯à¤‚à¤šà¤²à¤¿à¤¤à¤ªà¤£à¥‡ à¤µà¤°à¥à¤— à¤•à¤°à¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ "à¤µà¤°à¥à¤·à¤¾à¤‚à¤¤ à¤ªà¥à¤°à¤•à¥à¤°à¤¿à¤¯à¤¾" à¤µà¤¾à¤ªà¤°à¤¾.
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">à¤…à¤‚à¤¤à¤¿à¤® à¤…à¤¦à¥à¤¯à¤¤à¤¨</p>
                                        <p className="text-xs font-bold">{new Date().toLocaleDateString('mr-IN')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tax Defaults Tab */}
                    {activeTab === 'tax_defaults' && (
                        <div className="space-y-6">
                            {/* Sub Tabs */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                {[
                                    { id: 'street_light', label: 'à¤µà¤¿à¤œ / à¤¦à¤¿à¤µà¤¾à¤¬à¤¤à¥à¤¤à¥€', icon: <Lightbulb className="w-3.5 h-3.5" /> },
                                    { id: 'waste', label: 'à¤•à¤šà¤°à¤¾ à¤—à¤¾à¤¡à¥€', icon: <Trash2 className="w-3.5 h-3.5" /> },
                                    { id: 'health', label: 'à¤†à¤°à¥‹à¤—à¥à¤¯ à¤•à¤°', icon: <Activity className="w-3.5 h-3.5" /> },
                                    { id: 'water', label: 'à¤ªà¤¾à¤£à¥€ à¤•à¤°', icon: <Droplets className="w-3.5 h-3.5" /> },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => setActiveSubTab(st.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === st.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {st.icon} {st.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <form onSubmit={handleSaveConfig} className="bg-white rounded-[2.5rem] premium-shadow-blue border border-indigo-50/50 p-8">
                                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                        {activeSubTab === 'street_light' && <><Lightbulb className="w-5 h-5 text-indigo-600" /> à¤µà¤¿à¤œ / à¤¦à¤¿à¤µà¤¾à¤¬à¤¤à¥à¤¤à¥€ à¤•à¤° à¤¸à¤‚à¤°à¤šà¤¨à¤¾</>}
                                        {activeSubTab === 'waste' && <><Trash2 className="w-5 h-5 text-indigo-600" /> à¤•à¤šà¤°à¤¾ à¤—à¤¾à¤¡à¥€ à¤•à¤° à¤¸à¤‚à¤°à¤šà¤¨à¤¾</>}
                                        {activeSubTab === 'health' && <><Activity className="w-5 h-5 text-indigo-600" /> à¤†à¤°à¥‹à¤—à¥à¤¯ à¤•à¤° à¤¸à¤‚à¤°à¤šà¤¨à¤¾</>}
                                        {activeSubTab === 'water' && <><Droplets className="w-5 h-5 text-indigo-600" /> à¤ªà¤¾à¤£à¥€ à¤•à¤° à¤¸à¤‚à¤°à¤šà¤¨à¤¾</>}
                                    </h3>

                                    <div className="space-y-6">
                                        {activeSubTab === 'street_light' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤¡à¥€à¤«à¥‰à¤²à¥à¤Ÿ à¤µà¤¿à¤œ / à¤¦à¤¿à¤µà¤¾à¤¬à¤¤à¥à¤¤à¥€ à¤¶à¥à¤²à¥à¤• (â‚¹)</label>
                                                <input type="number" value={systemConfig.street_light_default}
                                                    onChange={e => setSystemConfig({ ...systemConfig, street_light_default: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                            </div>
                                        )}
                                        {activeSubTab === 'waste' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤¡à¥€à¤«à¥‰à¤²à¥à¤Ÿ à¤•à¤šà¤°à¤¾ à¤—à¤¾à¤¡à¥€ à¤¶à¥à¤²à¥à¤• (â‚¹)</label>
                                                <input type="number" value={systemConfig.waste_collection_default}
                                                    onChange={e => setSystemConfig({ ...systemConfig, waste_collection_default: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                            </div>
                                        )}
                                        {activeSubTab === 'health' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤¡à¥€à¤«à¥‰à¤²à¥à¤Ÿ à¤†à¤°à¥‹à¤—à¥à¤¯ à¤•à¤° à¤¶à¥à¤²à¥à¤• (â‚¹)</label>
                                                <input type="number" value={systemConfig.health_tax_default}
                                                    onChange={e => setSystemConfig({ ...systemConfig, health_tax_default: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                            </div>
                                        )}
                                        {activeSubTab === 'water' && (
                                            <div className="grid grid-cols-1 gap-6">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤ªà¤¾à¤£à¥€ à¤•à¤° à¤¶à¥à¤²à¥à¤• (â‚¹)</label>
                                                    <input type="number" value={systemConfig.general_water_default}
                                                        onChange={e => setSystemConfig({ ...systemConfig, general_water_default: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">à¤µà¤¿à¤¶à¥‡à¤· à¤ªà¤¾à¤£à¥€ à¤•à¤° à¤¶à¥à¤²à¥à¤• (â‚¹)</label>
                                                    <input type="number" value={systemConfig.special_water_default}
                                                        onChange={e => setSystemConfig({ ...systemConfig, special_water_default: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                                </div>
                                            </div>
                                        )}

                                        {canEdit && (
                                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                                à¤¬à¤¦à¤² à¤œà¤¤à¤¨ à¤•à¤°à¤¾
                                            </button>
                                        )}
                                    </div>
                                </form>

                                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                                <Info className="w-6 h-6 text-indigo-200" />
                                            </div>
                                            <h3 className="text-xl font-black tracking-tight mb-4">
                                                {activeSubTab === 'street_light' && 'à¤¦à¤¿à¤µà¤¾à¤¬à¤¤à¥à¤¤à¥€ à¤•à¤° à¤®à¤¾à¤¹à¤¿à¤¤à¥€'}
                                                {activeSubTab === 'waste' && 'à¤•à¤šà¤°à¤¾ à¤—à¤¾à¤¡à¥€ à¤•à¤° à¤®à¤¾à¤¹à¤¿à¤¤à¥€'}
                                                {activeSubTab === 'health' && 'à¤†à¤°à¥‹à¤—à¥à¤¯ à¤•à¤° à¤®à¤¾à¤¹à¤¿à¤¤à¥€'}
                                                {activeSubTab === 'water' && 'à¤ªà¤¾à¤£à¥€ à¤•à¤° à¤®à¤¾à¤¹à¤¿à¤¤à¥€'}
                                            </h3>
                                            <p className="text-indigo-200/80 text-sm leading-relaxed font-bold">
                                                {activeSubTab === 'street_light' && 'à¤—à¤¾à¤µà¤¾à¤¤à¥€à¤² à¤¦à¤¿à¤µà¤¾à¤¬à¤¤à¥à¤¤à¥€ à¤¸à¥à¤µà¤¿à¤§à¥‡à¤¸à¤¾à¤ à¥€ à¤†à¤•à¤¾à¤°à¤²à¤¾ à¤œà¤¾à¤£à¤¾à¤°à¤¾ à¤¹à¤¾ à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤•à¤° à¤†à¤¹à¥‡. à¤¨à¤µà¥€à¤¨ à¤®à¤¾à¤²à¤®à¤¤à¥à¤¤à¤¾ à¤¨à¥‹à¤‚à¤¦à¤µà¤¤à¤¾à¤¨à¤¾ à¤¹à¤¾ à¤¦à¤° à¤¸à¥à¤µà¤¯à¤‚à¤šà¤²à¤¿à¤¤à¤ªà¤£à¥‡ à¤²à¤¾à¤—à¥‚ à¤¹à¥‹à¤¤à¥‹.'}
                                                {activeSubTab === 'waste' && 'à¤¸à¥à¤µà¤šà¥à¤›à¤¤à¤¾ à¤†à¤£à¤¿ à¤•à¤šà¤°à¤¾ à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¾à¤ªà¤¨à¤¾à¤¸à¤¾à¤ à¥€ à¤†à¤•à¤¾à¤°à¤²à¤¾ à¤œà¤¾à¤£à¤¾à¤°à¤¾ à¤¹à¤¾ à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤•à¤° à¤†à¤¹à¥‡. à¤—à¥à¤°à¤¾à¤®à¤ªà¤‚à¤šà¤¾à¤¯à¤¤ à¤¨à¤¿à¤°à¥à¤£à¤¯à¤¾à¤¨à¥à¤¸à¤¾à¤° à¤¯à¤¾à¤¤ à¤¬à¤¦à¤² à¤•à¤°à¤¤à¤¾ à¤¯à¥‡à¤¤à¥‹.'}
                                                {activeSubTab === 'health' && 'à¤†à¤°à¥‹à¤—à¥à¤¯ à¤†à¤£à¤¿ à¤«à¤µà¤¾à¤°à¤£à¥€ à¤¸à¥‡à¤µà¤¾à¤‚à¤¸à¤¾à¤ à¥€ à¤†à¤•à¤¾à¤°à¤²à¤¾ à¤œà¤¾à¤£à¤¾à¤°à¤¾ à¤¹à¤¾ à¤¨à¤¾à¤®à¤®à¤¾à¤¤à¥à¤° à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤•à¤° à¤†à¤¹à¥‡.'}
                                                {activeSubTab === 'water' && 'à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤†à¤£à¤¿ à¤µà¤¿à¤¶à¥‡à¤· à¤ªà¤¾à¤£à¥€ à¤œà¥‹à¤¡à¤£à¥€à¤¸à¤¾à¤ à¥€ à¤†à¤•à¤¾à¤°à¤²à¥‡ à¤œà¤¾à¤£à¤¾à¤°à¥‡ à¤¹à¥‡ à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤¶à¥à¤²à¥à¤• à¤†à¤¹à¥‡à¤¤. à¤¨à¤³ à¤œà¥‹à¤¡à¤£à¥€ à¤ªà¥à¤°à¤•à¤¾à¤°à¤¾à¤¨à¥à¤¸à¤¾à¤° à¤¯à¤¾à¤¤ à¤¬à¤¦à¤² à¤•à¤°à¤¾à¤µà¤¾.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Wasti & Wards Tab */}
                    {activeTab === 'wasti' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">à¤µà¤¸à¥à¤¤à¥€ à¤µ à¤µà¥‰à¤°à¥à¤¡ à¤¸à¥‚à¤šà¥€</h3>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">à¤ªà¥à¤°à¤£à¤¾à¤²à¥€à¤®à¤§à¥€à¤² à¤¸à¤°à¥à¤µ à¤¨à¥‹à¤‚à¤¦à¤£à¥€à¤•à¥ƒà¤¤ à¤µà¤¸à¥à¤¤à¥à¤¯à¤¾</p>
                                </div>
                                {canAdd && (
                                    <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                        <Plus className="w-4 h-4" /> à¤¨à¤µà¥€à¤¨ à¤µà¤¸à¥à¤¤à¥€ à¤œà¥‹à¤¡à¤¾
                                    </button>
                                )}
                            </div>

                            <div className="bg-white rounded-[2.5rem] premium-shadow-blue border border-indigo-50/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-indigo-50/30">
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤….à¤•à¥à¤°.</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤µà¤¸à¥à¤¤à¥€à¤šà¥‡ à¤¨à¤¾à¤µ</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤•à¥à¤°à¤®</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤¸à¥à¤¥à¤¿à¤¤à¥€</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">à¤•à¥ƒà¤¤à¥€</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50/50">
                                        {wastiItems.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors group">
                                                <td className="px-8 py-5 text-sm font-black text-slate-300">{idx + 1}</td>
                                                <td className="px-6 py-5 font-black text-slate-800 text-sm tracking-tight">{item.item_value_mr}</td>
                                                <td className="px-6 py-5 text-sm font-bold text-slate-500">{item.sort_order}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                        {item.is_active ? 'à¤¸à¥à¤°à¥‚' : 'à¤¬à¤‚à¤¦'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        {canEdit && (
                                                            <button onClick={() => { setEditingItem(item); setIsAdding(true); }} className="w-8 h-8 flex items-center justify-center text-amber-600 bg-white border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button onClick={() => deleteItem('wasti', item.id)} className="w-8 h-8 flex items-center justify-center text-rose-600 bg-white border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
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

                    {/* Tax Rates Tab */}
                    {activeTab === 'tax' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">à¤•à¤° à¤†à¤•à¤¾à¤°à¤£à¥€ à¤¦à¤° à¤ªà¤¤à¥à¤°à¤•</h3>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">à¤ªà¥à¤°à¤•à¤¾à¤° à¤†à¤£à¤¿ à¤µà¤¸à¥à¤¤à¥€à¤¨à¤¿à¤¹à¤¾à¤¯ à¤¦à¤° à¤°à¤šà¤¨à¤¾</p>
                                </div>
                                {canAdd && (
                                    <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black upperc                    {/* Ready Reckoner Tab */}
                    {activeTab === 'rr' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">📋 रेडी रेकनर दर (Ready Reckoner Rates)</h3>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">शासन प्रमाणित वार्षिक मूल्यांकन दर प्रणाली</p>
                                </div>
                                {canAdd && (
                                    <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                        <Plus className="w-4 h-4" /> नवीन रेडी रेकनर दर जोडा
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {Object.entries(groupedRr).map(([year, rates]: [string, any], pIdx) => (
                                    <div key={pIdx} className="bg-white rounded-[2rem] premium-shadow-blue border border-indigo-50/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-indigo-50/50 px-8 py-4 border-b border-indigo-100 flex justify-between items-center">
                                            <h4 className="text-sm font-black text-indigo-900 tracking-tight flex items-center gap-2">
                                                <History className="w-4 h-4" /> कालावधी: {year}
                                            </h4>
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                                                {rates.length} नोंदी
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                        <th className="px-8 py-4">तपशील</th>
                                                        <th className="px-6 py-4 text-right">मूल्यांकन दर</th>
                                                        <th className="px-6 py-4 text-right">कर दर %</th>
                                                        <th className="px-6 py-4">युनिट</th>
                                                        <th className="px-8 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {rates.map((rr: any) => (
                                                        <tr key={rr.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-8 py-4 font-bold text-slate-700 text-sm">{rr.item_name_mr}</td>
                                                            <td className="px-6 py-4 text-right font-black text-indigo-600">₹{Number(rr.valuation_rate).toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-800">{rr.tax_rate}%</td>
                                                            <td className="px-6 py-4 text-xs text-slate-400 font-bold uppercase tracking-wider">{rr.unit_mr}</td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                    {canEdit && (
                                                                        <button onClick={() => { setEditingItem(rr); setIsAdding(true); }} className="w-8 h-8 flex items-center justify-center text-amber-600 bg-white border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                    {canDelete && (
                                                                        <button onClick={() => deleteItem('rr', rr.id)} className="w-8 h-8 flex items-center justify-center text-rose-600 bg-white border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">à¤°à¥‡à¤¡à¥€ à¤°à¥‡à¤•à¤¨à¤° à¤¦à¤° (à¤¶à¤¾à¤¸à¤¨ à¤ªà¥à¤°à¤®à¤¾à¤£à¤¿à¤¤)</h3>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">à¤µà¤°à¥à¤·à¤¨à¤¿à¤¹à¤¾à¤¯ à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤¦à¤° à¤°à¤šà¤¨à¤¾</p>
                                </div>
                                {canAdd && (
                                    <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                        <Plus className="w-4 h-4" /> à¤¨à¤µà¥€à¤¨ à¤°à¥‡à¤¡à¥€ à¤°à¥‡à¤•à¤¨à¤° à¤¦à¤° à¤œà¥‹à¤¡à¤¾
                                    </button>
                                )}
                            </div>
                            <div className="bg-white rounded-[2.5rem] premium-shadow-blue border border-indigo-50/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-indigo-50/30">
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤•à¤¾à¤²à¤¾à¤µà¤§à¥€</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤¤à¤ªà¤¶à¥€à¤²</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">à¤®à¥‚à¤²à¥à¤¯à¤¾à¤‚à¤•à¤¨ à¤¦à¤°</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">à¤•à¤° à¤¦à¤° %</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤¯à¥à¤¨à¤¿à¤Ÿ</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">à¤•à¥ƒà¤¤à¥€</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50/50">
                                        {readyReckonerRates.map((rr) => (
                                            <tr key={rr.id} className="hover:bg-indigo-50/20 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-black text-slate-800 whitespace-nowrap">{rr.year_range}</span>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-slate-600 text-xs">{rr.item_name_mr}</td>
                                                <td className="px-6 py-5 text-right font-black text-indigo-600">â‚¹{rr.valuation_rate.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-right font-black text-slate-800">{rr.tax_rate}%</td>
                                                <td className="px-6 py-5 text-xs text-slate-400 font-bold uppercase tracking-wider">{rr.unit_mr}</td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        {canEdit && (
                                                            <button onClick={() => { setEditingItem(rr); setIsAdding(true); }} className="w-8 h-8 flex items-center justify-center text-amber-600 bg-white border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button onClick={() => deleteItem('rr', rr.id)} className="w-8 h-8 flex items-center justify-center text-rose-600 bg-white border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
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

                    {/* Depreciation Tab */}
                    {activeTab === 'depreciation' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">à¤˜à¤¸à¤¾à¤°à¤¾ (Depreciation) à¤¦à¤° à¤¤à¤¾à¤²à¤¿à¤•à¤¾</h3>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">à¤‡à¤®à¤¾à¤°à¤¤à¥€à¤šà¥‡ à¤µà¥ˆà¤¯ à¤†à¤£à¤¿ à¤˜à¤¸à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤®à¤¾à¤£</p>
                                </div>
                                {canAdd && (
                                    <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                        <Plus className="w-4 h-4" /> à¤¨à¤µà¥€à¤¨ à¤˜à¤¸à¤¾à¤°à¤¾ à¤¦à¤° à¤œà¥‹à¤¡à¤¾
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {depreciationRates.map((d) => (
                                    <div key={d.id} className="bg-white rounded-[2rem] p-6 premium-shadow-blue border border-indigo-50/50 hover-lift group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110" />
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {canEdit && (
                                                <button onClick={() => { setEditingItem(d); setIsAdding(true); }} className="w-8 h-8 flex items-center justify-center text-amber-600 bg-white/80 backdrop-blur border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => deleteItem('depreciation', d.id)} className="w-8 h-8 flex items-center justify-center text-rose-600 bg-white/80 backdrop-blur border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10">à¤µà¤¯à¥‹à¤—à¤Ÿ (Years)</p>
                                        <div className="flex items-end gap-3 mb-6 relative z-10">
                                            <h4 className="text-3xl font-black text-indigo-600 tracking-tight">{d.min_age} - {d.max_age}</h4>
                                            <span className="text-xs font-bold text-slate-400 mb-1">à¤µà¤°à¥à¤·à¥‡</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-200">à¤˜à¤¸à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤®à¤¾à¤£</span>
                                            <span className="text-lg font-black text-slate-700 group-hover:text-white">{d.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Building Usage Tab */}
                    {activeTab === 'building_usage' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">ðŸ¢ à¤‡à¤®à¤¾à¤°à¤¤à¥€à¤šà¤¾ à¤µà¤¾à¤ªà¤° (Building Usage Master)</h3>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">à¤‡à¤®à¤¾à¤°à¤¤à¥€à¤šà¤¾ à¤ªà¥à¤°à¤•à¤¾à¤° à¤†à¤£à¤¿ à¤­à¤¾à¤°à¤¾à¤‚à¤• (Weightage)</p>
                                </div>
                                {canAdd && (
                                    <button onClick={() => { setIsAdding(true); setEditingItem(null); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                        <Plus className="w-4 h-4" /> à¤¨à¤µà¥€à¤¨ à¤µà¤¾à¤ªà¤°à¤¾à¤šà¤¾ à¤ªà¥à¤°à¤•à¤¾à¤° à¤œà¥‹à¤¡à¤¾
                                    </button>
                                )}
                            </div>

                            <div className="bg-white rounded-[2.5rem] premium-shadow-blue border border-indigo-50/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-indigo-50/30">
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤µà¤¾à¤ªà¤°à¤¾à¤šà¤¾ à¤ªà¥à¤°à¤•à¤¾à¤°</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤‡à¤‚à¤—à¥à¤°à¤œà¥€ à¤¨à¤¾à¤µ</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">à¤­à¤¾à¤°à¤¾à¤‚à¤• (Multiplier)</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right">à¤•à¥ƒà¤¤à¥€</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50/50">
                                        {buildingUsageRates.map((bu) => (
                                            <tr key={bu.id} className="hover:bg-indigo-50/20 transition-colors group">
                                                <td className="px-8 py-5 font-black text-slate-800 text-sm tracking-tight">{bu.usage_type_mr}</td>
                                                <td className="px-6 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider">{bu.usage_type_en}</td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs ring-1 ring-indigo-200">
                                                        {Number(bu.weightage).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        {canEdit && (
                                                            <button onClick={() => { setEditingItem(bu); setIsAdding(true); }} className="w-8 h-8 flex items-center justify-center text-amber-600 bg-white border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button onClick={() => deleteItem('building_usage', bu.id)} className="w-8 h-8 flex items-center justify-center text-rose-600 bg-white border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
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

                    {/* Users Management Tab */}
                    {activeTab === 'users' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-800 tracking-tight">à¤µà¤¾à¤ªà¤°à¤•à¤°à¥à¤¤à¤¾ à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¾à¤ªà¤¨ (User Management)</h3>
                                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">à¤ªà¥à¤°à¤£à¤¾à¤²à¥€ à¤µà¤¾à¤ªà¤°à¤•à¤°à¥à¤¤à¥‡ à¤†à¤£à¤¿ à¤¤à¥à¤¯à¤¾à¤‚à¤šà¥à¤¯à¤¾ à¤­à¥‚à¤®à¤¿à¤•à¤¾</p>
                                            </div>
                                            {canAdd && (
                                                <button onClick={() => { setIsAdding(true); setEditingItem(null); setNewItem({ role: 'operator' }); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift">
                                                    <Plus className="w-4 h-4" /> à¤¨à¤µà¥€à¤¨ à¤µà¤¾à¤ªà¤°à¤•à¤°à¥à¤¤à¤¾ à¤œà¥‹à¤¡à¤¾
                                                </button>
                                            )}
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] premium-shadow-blue border border-indigo-50/50 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-indigo-50/30">
                                                        <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤….à¤•à¥à¤°.</th>
                                                        <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">à¤µà¤¾à¤ªà¤°à¤•à¤°à¥à¤¤à¥à¤¯à¤¾à¤šà¥‡ à¤¨à¤¾à¤µ</th>
                                                                                   </table>
                                        </div>
                                    </div>
                                )}
                </div>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <form onSubmit={handleFormSubmit} className="bg-white rounded-[2.5rem] max-w-lg w-full overflow-hidden premium-shadow-lg border border-white/20 my-8">
                        <div className="p-8 pb-6 flex justify-between items-start bg-indigo-900 text-white relative">
                            <div>
                                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 leading-none">व्यवस्थापन — {tabs.find(t => t.id === activeTab)?.label}</h2>
                                <h3 className="text-xl font-black tracking-tight">{editingItem ? 'माहिती सुधारित करा' : 'नवीन नोंद जोडा'}</h3>
                            </div>
                            <button type="button" onClick={() => setIsAdding(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            {activeTab === 'wasti' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">वस्तीचे नाव (मराठी)</label>
                                        <input name="item_value_mr" defaultValue={editingItem?.item_value_mr} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">क्रम (Sort Order)</label>
                                        <input name="sort_order" type="number" defaultValue={editingItem?.sort_order || 0} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </>
                            )}

                            {activeTab === 'tax' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">मालमत्तेचा प्रकार</label>
                                        <select name="propertyType" defaultValue={editingItem?.propertyType} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                                            {["आर.सी.सी.", "खाली जागा", "विटा सिमेंट", "विटा माती", "माती"].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">वस्तीचे नाव</label>
                                        <select name="wastiName" defaultValue={editingItem?.wastiName} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                                            <option value="All">All</option>
                                            {wastiItems.map(w => <option key={w.id} value={w.item_value_mr}>{w.item_value_mr}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">इमारत दर</label>
                                        <input name="buildingRate" type="number" defaultValue={editingItem?.buildingRate} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">इमारत कर दर %</label>
                                        <input name="buildingTaxRate" type="number" step="0.01" defaultValue={editingItem?.buildingTaxRate} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">जमीन दर</label>
                                        <input name="landRate" type="number" defaultValue={editingItem?.landRate} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">खाली जागा कर %</label>
                                        <input name="openSpaceTaxRate" type="number" step="0.01" defaultValue={editingItem?.openSpaceTaxRate} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'rr' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">कालावधी (उदा. सन २०२४-२५)</label>
                                        <input name="year_range" defaultValue={editingItem?.year_range} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">तपशील</label>
                                        <input name="item_name_mr" defaultValue={editingItem?.item_name_mr} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">मूल्यांकन दर</label>
                                        <input name="valuation_rate" type="number" defaultValue={editingItem?.valuation_rate} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">कर दर %</label>
                                        <input name="tax_rate" type="number" step="0.01" defaultValue={editingItem?.tax_rate} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">युनिट (उदा. चौ. मी.)</label>
                                        <input name="unit_mr" defaultValue={editingItem?.unit_mr || 'चौ. मी.'} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'depreciation' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">किमान वय (Min Age)</label>
                                        <input name="min_age" type="number" defaultValue={editingItem?.min_age} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">कमाल वय (Max Age)</label>
                                        <input name="max_age" type="number" defaultValue={editingItem?.max_age} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">घसारा प्रमाण %</label>
                                        <input name="percentage" type="number" step="0.01" defaultValue={editingItem?.percentage} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'building_usage' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">वापराचा प्रकार (उदा. निवास, वाणिज्य)</label>
                                        <input name="usage_type_mr" defaultValue={editingItem?.usage_type_mr} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Usage Type (English)</label>
                                        <input name="usage_type_en" defaultValue={editingItem?.usage_type_en} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">भारांक (Multiplier / Weightage)</label>
                                        <input name="weightage" type="number" step="0.01" defaultValue={editingItem?.weightage || 1.00} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">पूर्ण नाव (Full Name)</label>
                                        <input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">वापरकर्तानाव (Username)</label>
                                        <input name="username" defaultValue={editingItem?.username} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">पासवर्ड (Password)</label>
                                        <input name="password" type="password" required={!editingItem} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" placeholder={editingItem ? 'बदलायचा असल्यास भरा' : ''} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">भूमिका (Role)</label>
                                        <select name="role" defaultValue={editingItem?.role || 'operator'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                                            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">कर्मचारी आयडी (Employee ID)</label>
                                        <input name="employee_id" defaultValue={editingItem?.employee_id} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">मोबाईल क्रमांक (Contact)</label>
                                        <input name="mobile" defaultValue={editingItem?.mobile} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {editingItem ? 'बदल जतन करा' : 'नवीन नोंद जोडा'}
                                </button>
                                <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
                                    रद्द
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {selectedUserForPerms && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] max-w-md w-full overflow-hidden premium-shadow-lg border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-6 bg-indigo-900 text-white relative">
                            <button onClick={() => setSelectedUserForPerms(null)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 leading-none">भूमिका आणि अधिकार (Permissions)</h2>
                            <h3 className="text-xl font-black tracking-tight">{ROLE_LABELS[selectedUserForPerms.role] || selectedUserForPerms.role}</h3>
                        </div>
                        <div className="p-8">
                            <div className="space-y-4">
                                {(ROLE_PERMISSIONS[selectedUserForPerms.role] || ['कॉमन अ‍ॅक्सेस']).map((perm, pi) => (
                                    <div key={pi} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mt-0.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-snug">{perm}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setSelectedUserForPerms(null)} className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
                                बंद करा
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
<label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">à¤­à¥‚à¤®à¤¿à¤•à¤¾ (Role)</label>
                                        <select name="role" defaultValue="operator" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all">
                                            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">à¤•à¤°à¥à¤®à¤šà¤¾à¤°à¥€ à¤†à¤¯à¤¡à¥€ (Employee ID)</label>
                                        <input name="employee_id" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">à¤®à¥‹à¤¬à¤¾à¤ˆà¤² à¤•à¥à¤°à¤®à¤¾à¤‚à¤• (Contact)</label>
                                        <input name="mobile" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'building_usage' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">à¤µà¤¾à¤ªà¤°à¤¾à¤šà¤¾ à¤ªà¥à¤°à¤•à¤¾à¤° (à¤‰à¤¦à¤¾. à¤¨à¤¿à¤µà¤¾à¤¸, à¤µà¤¾à¤£à¤¿à¤œà¥à¤¯)</label>
                                        <input name="usage_type_mr" defaultValue={editingItem?.usage_type_mr} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Usage Type (English)</label>
                                        <input name="usage_type_en" defaultValue={editingItem?.usage_type_en} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">à¤­à¤¾à¤°à¤¾à¤‚à¤• (Multiplier / Weightage)</label>
                                        <input name="weightage" type="number" step="0.01" defaultValue={editingItem?.weightage || 1.00} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover-lift flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {editingItem ? 'à¤¬à¤¦à¤² à¤œà¤¤à¤¨ à¤•à¤°à¤¾' : 'à¤¨à¤µà¥€à¤¨ à¤¨à¥‹à¤‚à¤¦ à¤œà¥‹à¤¡à¤¾'}
                                </button>
                                <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
                                    à¤°à¤¦à¥à¤¦
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {selectedUserForPerms && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] max-w-md w-full overflow-hidden premium-shadow-lg border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-6 bg-indigo-900 text-white relative">
                            <button onClick={() => setSelectedUserForPerms(null)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 leading-none">à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤†à¤£à¤¿ à¤…à¤§à¤¿à¤•à¤¾à¤° (Permissions)</h2>
                            <h3 className="text-xl font-black tracking-tight">{ROLE_LABELS[selectedUserForPerms.role] || selectedUserForPerms.role}</h3>
                        </div>
                        <div className="p-8">
                            <div className="space-y-4">
                                {(ROLE_PERMISSIONS[selectedUserForPerms.role] || ['à¤•à¥‰à¤®à¤¨ à¤…â€à¥…à¤•à¥à¤¸à¥‡à¤¸']).map((perm, pi) => (
                                    <div key={pi} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mt-0.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-snug">{perm}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setSelectedUserForPerms(null)} className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
                                à¤¬à¤‚à¤¦ à¤•à¤°à¤¾
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

