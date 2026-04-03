import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';

interface TaxRate {
    id: number;
    propertyType: string;
    wastiName: string;
    buildingRate: number;
    buildingTaxRate: number;
    landRate: number;
    openSpaceTaxRate: number;
}

interface ReadyReckonerRate {
    id: number;
    year_range: string;
    item_name_mr: string;
    valuation_rate: number;
    tax_rate: number;
    unit_mr: string;
    created_at: string;
}

interface DepreciationRate {
    id: number;
    min_age: number;
    max_age: number;
    percentage: number;
}

interface BuildingUsage {
    id: number;
    usage_type_mr: string;
    usage_type_en: string;
    weightage: number;
}

interface MasterCategory {
    id: number;
    name_mr: string;
    code: string;
}

interface MasterItem {
    id: number;
    category_id: number;
    item_value_mr: string;
    item_value_en?: string;
    item_code?: string;
    sort_order: number;
}

export const TaxMaster = ({ onClose }: { onClose: () => void }) => {
    const [rates, setRates] = useState<TaxRate[]>([]);
    const [rrRates, setRrRates] = useState<ReadyReckonerRate[]>([]);
    const [depRates, setDepRates] = useState<DepreciationRate[]>([]);
    const [buRates, setBuRates] = useState<BuildingUsage[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<TaxRate>>({});
    
    // RR States
    const [editingRrId, setEditingRrId] = useState<number | null>(null);
    const [rrEditForm, setRrEditForm] = useState<Partial<ReadyReckonerRate>>({});
    const [showAddRr, setShowAddRr] = useState(false);
    const [newRr, setNewRr] = useState<Partial<ReadyReckonerRate>>({ 
        year_range: '', item_name_mr: '', valuation_rate: 0, tax_rate: 0, unit_mr: 'चौ. मी.' 
    });

    // Depreciation States
    const [editingDepId, setEditingDepId] = useState<number | null>(null);
    const [depEditForm, setDepEditForm] = useState<Partial<DepreciationRate>>({});
    const [showAddDep, setShowAddDep] = useState(false);
    const [newDep, setNewDep] = useState<Partial<DepreciationRate>>({ 
        min_age: 0, max_age: 2, percentage: 100 
    });

    // Building Usage States
    const [editingBuId, setEditingBuId] = useState<number | null>(null);
    const [buEditForm, setBuEditForm] = useState<Partial<BuildingUsage>>({});
    const [showAddBu, setShowAddBu] = useState(false);
    const [newBu, setNewBu] = useState<Partial<BuildingUsage>>({ 
        usage_type_mr: '', usage_type_en: '', weightage: 1.00 
    });

    const [loading, setLoading] = useState(true);
    
    // Sub-Master States
    const [categories, setCategories] = useState<MasterCategory[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
    const [subItems, setSubItems] = useState<MasterItem[]>([]);
    const [editingSubId, setEditingSubId] = useState<number | null>(null);
    const [subEditForm, setSubEditForm] = useState<Partial<MasterItem>>({});
    const [showAddSub, setShowAddSub] = useState(false);
    const [newSub, setNewSub] = useState<Partial<MasterItem>>({ 
        item_value_mr: '', item_value_en: '', item_code: '', sort_order: 0 
    });
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'rr' | 'tax' | 'general' | 'depreciation' | 'bu'>('rr');

    const API_URL = `${API_BASE_URL}/api/tax-rates`;
    const RR_API_URL = `${API_BASE_URL}/api/master/ready-reckoner`;
    const DEP_API_URL = `${API_BASE_URL}/api/master/depreciation`;
    const BU_API_URL = `${API_BASE_URL}/api/master/building-usage`;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [taxRes, rrRes, catRes, depRes, buRes] = await Promise.all([
                fetch(API_URL),
                fetch(RR_API_URL),
                fetch(`${API_BASE_URL}/api/master/categories`),
                fetch(DEP_API_URL),
                fetch(BU_API_URL)
            ]);
            setRates(await taxRes.json());
            setRrRates(await rrRes.json());
            setCategories(await catRes.json());
            setDepRates(await depRes.json());
            setBuRates(await buRes.json());
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCatId) fetchSubItems(selectedCatId);
    }, [selectedCatId]);

    const fetchSubItems = async (catId: number) => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items/${cat.code}`);
            setSubItems(await res.json());
        } catch (err) {
            console.error('Error fetching sub items:', err);
        }
    };

    const handleSubSave = async () => {
        if (!editingSubId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items/${editingSubId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subEditForm),
            });
            if (res.ok) {
                setEditingSubId(null);
                if (selectedCatId) fetchSubItems(selectedCatId);
            }
        } catch (err) { console.error(err); }
    };

    const handleAddSub = async () => {
        if (!selectedCatId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newSub, category_id: selectedCatId }),
            });
            if (res.ok) {
                setShowAddSub(false);
                setNewSub({ item_value_mr: '', item_value_en: '', item_code: '', sort_order: 0 });
                fetchSubItems(selectedCatId);
            }
        } catch (err) { console.error(err); }
    };

    const handleSubDelete = async (id: number) => {
        if (!window.confirm('हे रेकॉर्ड हटवायचे आहे का?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items/${id}`, { method: 'DELETE' });
            if (res.ok && selectedCatId) fetchSubItems(selectedCatId);
        } catch (err) { console.error(err); }
    };

    const handleEdit = (rate: TaxRate) => {
        setEditingId(rate.id);
        setEditForm(rate);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            const res = await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                setEditingId(null);
                setEditForm({});
                fetchData();
            } else {
                alert('Failed to update rate');
            }
        } catch (err) {
            console.error('Error updating rate:', err);
            alert('Error updating rate');
        }
    };

    const handleRrSave = async () => {
        if (!editingRrId) return;
        try {
            const res = await fetch(`${RR_API_URL}/${editingRrId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rrEditForm),
            });
            if (res.ok) {
                setEditingRrId(null);
                setRrEditForm({});
                fetchData();
            }
        } catch (err) {
            console.error('Error updating RR rate:', err);
        }
    };

    const handleAddRr = async () => {
        try {
            const res = await fetch(RR_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRr),
            });
            if (res.ok) {
                setShowAddRr(false);
                setNewRr({ year_range: '', item_name_mr: '', valuation_rate: 0, tax_rate: 0, unit_mr: 'चौ. मी.' });
                fetchData();
            }
        } catch (err) {
            console.error('Error adding RR rate:', err);
        }
    };

    const handleRrDelete = async (id: number) => {
        if (!window.confirm('हे दर हटवायचे आहेत का?')) return;
        try {
            const res = await fetch(`${RR_API_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Error deleting RR rate:', err);
        }
    };

    const handleDepSave = async () => {
        if (!editingDepId) return;
        try {
            const res = await fetch(`${DEP_API_URL}/${editingDepId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(depEditForm),
            });
            if (res.ok) {
                setEditingDepId(null);
                setDepEditForm({});
                fetchData();
            }
        } catch (err) { console.error('Error updating depreciation rate:', err); }
    };

    const handleAddDep = async () => {
        try {
            const res = await fetch(DEP_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDep),
            });
            if (res.ok) {
                setShowAddDep(false);
                setNewDep({ min_age: 0, max_age: 2, percentage: 100 });
                fetchData();
            }
        } catch (err) { console.error('Error adding depreciation rate:', err); }
    };

    const handleDepDelete = async (id: number) => {
        if (!window.confirm('हे दर हटवायचे आहेत का?')) return;
        try {
            const res = await fetch(`${DEP_API_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (err) { console.error('Error deleting depreciation rate:', err); }
    };

    const handleBUSave = async () => {
        if (!editingBuId) return;
        try {
            const res = await fetch(`${BU_API_URL}/${editingBuId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buEditForm),
            });
            if (res.ok) {
                setEditingBuId(null);
                setBuEditForm({});
                fetchData();
            }
        } catch (err) { console.error('Error updating usage type:', err); }
    };

    const handleAddBU = async () => {
        try {
            const res = await fetch(BU_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBu),
            });
            if (res.ok) {
                setShowAddBu(false);
                setNewBu({ usage_type_mr: '', usage_type_en: '', weightage: 1.00 });
                fetchData();
            }
        } catch (err) { console.error('Error adding usage type:', err); }
    };

    const handleBUDelete = async (id: number) => {
        if (!window.confirm('हे दर हटवायचे आहेत का?')) return;
        try {
            const res = await fetch(`${BU_API_URL}/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (err) { console.error('Error deleting usage type:', err); }
    };

    const handleChange = (field: keyof TaxRate, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRrChange = (field: keyof ReadyReckonerRate, value: any) => {
        setRrEditForm(prev => ({ ...prev, [field]: value }));
    };

    // Grouping for display
    const groupedRr = rrRates.reduce((acc: any, rate) => {
        if (!acc[rate.year_range]) acc[rate.year_range] = [];
        acc[rate.year_range].push(rate);
        return acc;
    }, {});

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-6 bg-white border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">कर दर प्रणाली (Tax Master)</h2>
                        <p className="text-sm text-gray-500">मालमत्ता कर दर आणि रेडीरेकणर दर व्यवस्थापित करा</p>
                    </div>
                </div>
                
                {/* Tab Switcher */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
                    {[
                        { id: 'rr', label: '📋 रेडीरेकणर', sub: 'Ready Reckoner', color: 'text-amber-600', activeBg: 'bg-amber-600 text-white' },
                        { id: 'tax', label: '⚙️ कर दर', sub: 'Tax Rates', color: 'text-indigo-600', activeBg: 'bg-indigo-600 text-white' },
                        { id: 'depreciation', label: '📉 घसारा दर', sub: 'Ghasara Tax', color: 'text-rose-600', activeBg: 'bg-rose-600 text-white' },
                        { id: 'bu', label: '🏢 इमारतीचा वापर', sub: 'Building Usage', color: 'text-teal-600', activeBg: 'bg-teal-600 text-white' },
                        { id: 'general', label: '🛠️ इतर मास्टर', sub: 'General Masters', color: 'text-slate-600', activeBg: 'bg-slate-800 text-white' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-2.5 rounded-xl transition-all duration-300 flex flex-col items-center gap-0.5 ${
                                activeTab === tab.id 
                                    ? `${tab.activeBg} shadow-lg shadow-black/10 scale-105` 
                                    : `text-slate-500 hover:text-slate-800 hover:bg-slate-200`
                            }`}
                        >
                            <span className="text-xs font-black uppercase tracking-tight">{tab.label}</span>
                            <span className={`text-[9px] font-bold opacity-70 uppercase`}>{tab.sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-slate-50/50">
                {activeTab === 'rr' && (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-amber-800">📋 रेडीरेकणर दर (Ready Reckoner Rates)</h3>
                            <p className="text-xs text-amber-600 mt-1">शासन प्रमाणित वार्षिक दर प्रणाली</p>
                        </div>
                        <button 
                            onClick={() => setShowAddRr(!showAddRr)} 
                            className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> नवीन दर जोडा
                        </button>
                    </div>

                    {showAddRr && (
                        <div className="p-4 bg-amber-50/30 border-b border-amber-100 animate-in slide-in-from-top duration-200">
                             <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <input type="text" placeholder="कालावधी (उदा. २०२२-२३)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newRr.year_range} onChange={e => setNewRr({...newRr, year_range: e.target.value})} />
                                <input type="text" placeholder="क्षेत्र / वस्ती" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newRr.item_name_mr} onChange={e => setNewRr({...newRr, item_name_mr: e.target.value})} />
                                <input type="number" placeholder="मूल्यांकन दर" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newRr.valuation_rate} onChange={e => setNewRr({...newRr, valuation_rate: Number(e.target.value)})} />
                                <input type="number" step="0.01" placeholder="कर दर" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newRr.tax_rate} onChange={e => setNewRr({...newRr, tax_rate: Number(e.target.value)})} />
                                <div className="flex gap-2">
                                    <select className="border rounded-lg px-2 py-1.5 text-xs font-bold flex-1" value={newRr.unit_mr} onChange={e => setNewRr({...newRr, unit_mr: e.target.value})}>
                                        <option value="चौ. मी.">चौ. मी.</option>
                                        <option value="चौ. फूट">चौ. फूट</option>
                                    </select>
                                    <button onClick={handleAddRr} className="bg-green-600 text-white p-1.5 rounded-lg hover:bg-green-700"><Plus className="w-4 h-4"/></button>
                                </div>
                             </div>
                        </div>
                    )}

                    <div className="p-4 space-y-4">
                        {Object.entries(groupedRr).map(([year, rates]: [string, any], pIdx) => (
                            <div key={pIdx} className="rounded-lg border overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 font-bold text-sm text-gray-700 border-b flex justify-between">
                                    <span>{year}</span>
                                </div>
                                <div className="divide-y overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter w-1/3">क्षेत्र / वर्णन</th>
                                                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">मूल्यांकन (रु.)</th>
                                                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">कर दर (पैसे)</th>
                                                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">एकक</th>
                                                <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter text-right">क्रिया</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {rates.map((rate: ReadyReckonerRate) => (
                                                <tr key={rate.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-2 font-bold text-slate-700 uppercase">
                                                        {editingRrId === rate.id ? <input type="text" className="w-full border p-1 rounded" value={rrEditForm.item_name_mr || ''} onChange={e => setRrEditForm({...rrEditForm, item_name_mr: e.target.value})} /> : rate.item_name_mr}
                                                    </td>
                                                    <td className="px-4 py-2 text-indigo-600 font-bold">
                                                        {editingRrId === rate.id ? <input type="number" className="w-20 border p-1 rounded" value={rrEditForm.valuation_rate || 0} onChange={e => setRrEditForm({...rrEditForm, valuation_rate: Number(e.target.value)})} /> : `₹${rate.valuation_rate}`}
                                                    </td>
                                                    <td className="px-4 py-2 text-emerald-600 font-bold">
                                                        {editingRrId === rate.id ? <input type="number" step="0.01" className="w-16 border p-1 rounded" value={rrEditForm.tax_rate || 0} onChange={e => setRrEditForm({...rrEditForm, tax_rate: Number(e.target.value)})} /> : rate.tax_rate}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-500 font-medium">
                                                        {editingRrId === rate.id ? (
                                                            <select className="border p-1 rounded" value={rrEditForm.unit_mr} onChange={e => setRrEditForm({...rrEditForm, unit_mr: e.target.value})}>
                                                                <option value="चौ. मी.">चौ. मी.</option>
                                                                <option value="चौ. फूट">चौ. फूट</option>
                                                            </select>
                                                        ) : rate.unit_mr}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            {editingRrId === rate.id ? (
                                                                <>
                                                                    <button onClick={handleRrSave} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save className="w-3.5 h-3.5" /></button>
                                                                    <button onClick={() => setEditingRrId(null)} className="text-slate-400 hover:bg-slate-50 p-1 rounded"><X className="w-3.5 h-3.5" /></button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button onClick={() => { setEditingRrId(rate.id); setRrEditForm(rate); }} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                    <button onClick={() => handleRrDelete(rate.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
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
                        ))}
                    </div>
                )}
                
                {activeTab === 'depreciation' && (
                    /* Depreciation Rates Management */
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-rose-800">📉 घसारा दर (Depreciation Rates)</h3>
                                <p className="text-xs text-rose-600 mt-1">इमारतीच्या वयानुसार घसारा आणि मूल्यांकनाचे दर</p>
                            </div>
                            <button 
                                onClick={() => setShowAddDep(!showAddDep)} 
                                className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-rose-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> नवीन जोडा
                            </button>
                        </div>

                        {showAddDep && (
                            <div className="p-4 bg-rose-50/30 border-b border-rose-100 animate-in slide-in-from-top duration-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <input type="number" placeholder="किमान वय" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newDep.min_age} onChange={e => setNewDep({...newDep, min_age: Number(e.target.value)})} />
                                    <input type="number" placeholder="कमाल वय" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newDep.max_age} onChange={e => setNewDep({...newDep, max_age: Number(e.target.value)})} />
                                    <input type="number" placeholder="टक्केवारी (%)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newDep.percentage} onChange={e => setNewDep({...newDep, percentage: Number(e.target.value)})} />
                                    <button onClick={handleAddDep} className="bg-rose-600 text-white p-1.5 rounded-lg hover:bg-rose-700 font-bold text-xs">जतन करा</button>
                                </div>
                            </div>
                        )}

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-rose-500 uppercase bg-rose-50/50">
                                    <tr>
                                        <th className="px-5 py-3 font-black tracking-tight">बांधकामाचे वय (Age Range)</th>
                                        <th className="px-5 py-3 font-black tracking-tight">घसारा टक्केवारी (%)</th>
                                        <th className="px-5 py-3 font-black tracking-tight text-right w-32">क्रिया</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-rose-100">
                                    {depRates.map(rate => (
                                        <tr key={rate.id} className="hover:bg-rose-50/30 transition-colors group">
                                            <td className="px-5 py-3 font-bold text-slate-700">
                                                {editingDepId === rate.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" className="w-20 border p-1 rounded text-xs" value={depEditForm.min_age} onChange={e => setDepEditForm({...depEditForm, min_age: Number(e.target.value)})} />
                                                        <span>-</span>
                                                        <input type="number" className="w-20 border p-1 rounded text-xs" value={depEditForm.max_age} onChange={e => setDepEditForm({...depEditForm, max_age: Number(e.target.value)})} />
                                                    </div>
                                                ) : (
                                                    `${rate.min_age} ते ${rate.max_age} वर्षे`
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingDepId === rate.id ? (
                                                    <input type="number" className="w-24 border p-1 rounded text-xs" value={depEditForm.percentage} onChange={e => setDepEditForm({...depEditForm, percentage: Number(e.target.value)})} />
                                                ) : (
                                                    <span className="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs font-black">
                                                        {rate.percentage}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editingDepId === rate.id ? (
                                                        <>
                                                            <button onClick={handleDepSave} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><Save className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingDepId(null)} className="text-slate-400 hover:bg-slate-50 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => { setEditingDepId(rate.id); setDepEditForm(rate); }} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDepDelete(rate.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
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
                    /* Building Usage Master Management */
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-4 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-teal-800">🏢 इमारतीचा वापर (Building Usage Master)</h3>
                                <p className="text-xs text-teal-600 mt-1">इमारतीचा प्रकार आणि गुणक (निवास: १.००, वाणिज्य: १.२५ इ.)</p>
                            </div>
                            <button 
                                onClick={() => setShowAddBu(!showAddBu)} 
                                className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-teal-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> नवीन जोडा
                            </button>
                        </div>

                        {showAddBu && (
                            <div className="p-4 bg-teal-50/30 border-b border-teal-100 animate-in slide-in-from-top duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <input type="text" placeholder="वापराचा प्रकार (MR)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newBu.usage_type_mr} onChange={e => setNewBu({...newBu, usage_type_mr: e.target.value})} />
                                    <input type="text" placeholder="Usage Type (EN)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newBu.usage_type_en} onChange={e => setNewBu({...newBu, usage_type_en: e.target.value})} />
                                    <input type="number" placeholder="गुणक (Weightage)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newBu.weightage} onChange={e => setNewBu({...newBu, weightage: Number(e.target.value)})} step="0.01" />
                                    <button onClick={handleAddBU} className="bg-teal-600 text-white p-1.5 rounded-lg hover:bg-teal-700 font-bold text-xs uppercase tracking-widest">जतन करा</button>
                                </div>
                            </div>
                        )}

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-teal-500 uppercase bg-teal-50/50">
                                    <tr>
                                        <th className="px-5 py-3 font-black tracking-tight">वापराचा प्रकार (Usage Type)</th>
                                        <th className="px-5 py-3 font-black tracking-tight">इंग्रजी (English)</th>
                                        <th className="px-5 py-3 font-black tracking-tight text-center">गुणक (Weightage)</th>
                                        <th className="px-5 py-3 font-black tracking-tight text-right w-32">क्रिया</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-teal-100">
                                    {buRates.map(rate => (
                                        <tr key={rate.id} className="hover:bg-teal-50/30 transition-colors group">
                                            <td className="px-5 py-3 font-bold text-slate-700">
                                                {editingBuId === rate.id ? (
                                                    <input type="text" className="w-full border p-1 rounded text-xs font-bold" value={buEditForm.usage_type_mr} onChange={e => setBuEditForm({...buEditForm, usage_type_mr: e.target.value})} />
                                                ) : (
                                                    rate.usage_type_mr
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 font-bold">
                                                {editingBuId === rate.id ? (
                                                    <input type="text" className="w-full border p-1 rounded text-xs font-bold" value={buEditForm.usage_type_en} onChange={e => setBuEditForm({...buEditForm, usage_type_en: e.target.value})} />
                                                ) : (
                                                    rate.usage_type_en
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {editingBuId === rate.id ? (
                                                    <input type="number" className="w-24 border p-1 rounded text-xs font-bold" value={buEditForm.weightage} onChange={e => setBuEditForm({...buEditForm, weightage: Number(e.target.value)})} step="0.01" />
                                                ) : (
                                                    <span className="font-mono text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-xs font-black ring-1 ring-teal-200 shadow-sm">
                                                        {rate.weightage.toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editingBuId === rate.id ? (
                                                        <>
                                                            <button onClick={handleBUSave} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-transform active:scale-90"><Save className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingBuId(null)} className="text-slate-400 hover:bg-slate-50 p-1.5 rounded-lg transition-transform active:scale-90"><X className="w-4 h-4" /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => { setEditingBuId(rate.id); setBuEditForm(rate); }} className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleBUDelete(rate.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>
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

                {activeTab === 'tax' && (
                    /* Editable Tax Rates Table */
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-800">⚙️ कर दर सेटिंग्ज (Editable Rates)</h3>
                        <p className="text-xs text-indigo-600 mt-1">खालील दर संपादित करता येतात — मालमत्ता प्रकार आणि वस्तीनुसार लागू</p>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        {loading ? (
                            <p className="p-8 text-center text-gray-500">माहिती लोड होत आहे...</p>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                    <tr>
                                        <th className="px-5 py-3 font-bold">मालमत्तेचा प्रकार</th>
                                        <th className="px-5 py-3 font-bold">वस्तीचे नाव</th>
                                        <th className="px-5 py-3 font-bold">इमारत दर (रु/चौ.मी.)</th>
                                        <th className="px-5 py-3 font-bold">इमारत कर दर (पैसे)</th>
                                        <th className="px-5 py-3 font-bold">जमीन दर (रु/चौ.मी.)</th>
                                        <th className="px-5 py-3 font-bold">खाली जागा कर दर (पैसे)</th>
                                        <th className="px-5 py-3 font-bold">क्रिया</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rates.map(rate => (
                                        <tr key={rate.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 font-medium">{rate.propertyType}</td>
                                            <td className="px-5 py-3">{rate.wastiName}</td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.buildingRate || 0} onChange={e => handleChange('buildingRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.buildingRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" step="0.01" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.buildingTaxRate || 0} onChange={e => handleChange('buildingTaxRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.buildingTaxRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.landRate || 0} onChange={e => handleChange('landRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.landRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" step="0.01" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.openSpaceTaxRate || 0} onChange={e => handleChange('openSpaceTaxRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.openSpaceTaxRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={handleSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="जतन करा">
                                                            <Save className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={handleCancel} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="रद्द करा">
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleEdit(rate)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="संपादित करा">
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
                
                {activeTab === 'general' && (
                    /* Sub-Master Management */
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">🛠️ इतर मास्टर डेटा व्यवस्थापन (General Masters)</h3>
                            <p className="text-xs text-slate-500 mt-1">वस्ती, वॉर्ड आणि वापराचे प्रकार व्यवस्थापित करा</p>
                        </div>
                        <div className="flex gap-2">
                            <select 
                                className="border rounded-lg px-3 py-1.5 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-primary/20"
                                value={selectedCatId || ''} 
                                onChange={e => setSelectedCatId(Number(e.target.value))}
                            >
                                <option value="">कॅटेगरी निवडा (Select Category)</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name_mr}</option>
                                ))}
                            </select>
                            {selectedCatId && (
                                <button 
                                    onClick={() => setShowAddSub(!showAddSub)} 
                                    className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-primary-dark transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> नवीन जोडा
                                </button>
                            )}
                        </div>
                    </div>

                    {showAddSub && selectedCatId && (
                        <div className="p-4 bg-primary/5 border-b border-primary/10 animate-in slide-in-from-top duration-200">
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <input type="text" placeholder="मराठी नाव (उदा. वेळाहरी)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newSub.item_value_mr} onChange={e => setNewSub({...newSub, item_value_mr: e.target.value})} />
                                <input type="text" placeholder="English Name" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newSub.item_value_en} onChange={e => setNewSub({...newSub, item_value_en: e.target.value})} />
                                <input type="text" placeholder="कोड / मूल्य (Weightage)" className="border rounded-lg px-2 py-1.5 text-xs font-bold" value={newSub.item_code} onChange={e => setNewSub({...newSub, item_code: e.target.value})} />
                                <button onClick={handleAddSub} className="bg-primary text-white p-1.5 rounded-lg hover:bg-primary-dark flex items-center justify-center font-bold text-xs">जतन करा</button>
                             </div>
                        </div>
                    )}

                    <div className="p-0 overflow-x-auto">
                        {!selectedCatId ? (
                            <div className="p-12 text-center text-slate-400">
                                <Plus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm font-medium">कृपया वरील ड्रॉपडाउन मधून एक कॅटेगरी निवडा (Please select a category)</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                    <tr>
                                        <th className="px-5 py-3 font-black tracking-tight">मराठी नाव (Display Name)</th>
                                        <th className="px-5 py-3 font-black tracking-tight">इंग्रजी नाव (Literal)</th>
                                        <th className="px-5 py-3 font-black tracking-tight">कोड / मूल्य (Code/Value)</th>
                                        <th className="px-5 py-3 font-black tracking-tight text-right w-32">क्रिया</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subItems.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-5 py-3 font-bold text-slate-700">
                                                {editingSubId === item.id ? <input type="text" className="w-full border p-1.5 rounded-lg text-sm" value={subEditForm.item_value_mr || ''} onChange={e => setSubEditForm({...subEditForm, item_value_mr: e.target.value})} /> : item.item_value_mr}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 font-medium">
                                                {editingSubId === item.id ? <input type="text" className="w-full border p-1.5 rounded-lg text-sm" value={subEditForm.item_value_en || ''} onChange={e => setSubEditForm({...subEditForm, item_value_en: e.target.value})} /> : item.item_value_en}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs font-black">
                                                    {editingSubId === item.id ? <input type="text" className="w-24 border p-1.5 rounded-lg text-sm" value={subEditForm.item_code || ''} onChange={e => setSubEditForm({...subEditForm, item_code: e.target.value})} /> : item.item_code || '-'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editingSubId === item.id ? (
                                                        <>
                                                            <button onClick={handleSubSave} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><Save className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingSubId(null)} className="text-slate-400 hover:bg-slate-50 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => { setEditingSubId(item.id); setSubEditForm(item); }} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleSubDelete(item.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
