import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Users, Settings, Briefcase, FileText, TrendingDown } from 'lucide-react';

interface TaxRate { id: number; propertyType: string; wastiName: string; buildingRate: number; buildingTaxRate: number; landRate: number; openSpaceTaxRate: number; }
interface ReadyReckonerRate { id: number; year_range: string; item_name_mr: string; valuation_rate: number; tax_rate: number; unit_mr: string; }
interface DepreciationRate { id: number; min_age: number; max_age: number; percentage: number; }
interface BuildingUsage { id: number; usage_type_mr: string; usage_type_en: string; weightage: number; }
interface MasterCategory { id: number; name_mr: string; code: string; }
interface MasterItem { id: number; category_id: number; item_value_mr: string; item_value_en?: string; item_code?: string; sort_order: number; is_active?: boolean; }
interface User { id: number; name: string; username: string; role: string; email: string; mobile: string; status: string; is_active: boolean; employee_id: string; }

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

export const TaxMaster = ({ onClose }: { onClose: () => void }) => {
    const [rates, setRates] = useState<TaxRate[]>([]);
    const [rrRates, setRrRates] = useState<ReadyReckonerRate[]>([]);
    const [depRates, setDepRates] = useState<DepreciationRate[]>([]);
    const [buRates, setBuRates] = useState<BuildingUsage[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<MasterCategory[]>([]);
    const [subItems, setSubItems] = useState<MasterItem[]>([]);
    
    const [activeTab, setActiveTab] = useState<'rr' | 'tax' | 'dep' | 'bu' | 'users' | 'sub'>('rr');
    const [loading, setLoading] = useState(true);
    const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
    
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newForm, setNewForm] = useState<any>({});

    const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gp_token')}` });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [taxRes, rrRes, catRes, depRes, buRes, userRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/tax-rates`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/ready-reckoner`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/categories`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/depreciation`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/building-usage`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/auth/users/all`, { headers: authHeaders() })
            ]);
            if (taxRes.ok) setRates(await taxRes.json());
            if (rrRes.ok) setRrRates(await rrRes.json());
            if (catRes.ok) setCategories(await catRes.json());
            if (depRes.ok) setDepRates(await depRes.json());
            if (buRes.ok) setBuRates(await buRes.json());
            if (userRes.ok) setUsers(await userRes.json());
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { if (selectedCatId) fetchSubItems(selectedCatId); }, [selectedCatId]);

    const fetchSubItems = async (catId: number) => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items/${cat.code}`, { headers: authHeaders() });
            if (res.ok) setSubItems(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSave = async (type: string, id: number | null, data: any) => {
        let url = `${API_BASE_URL}/api/${type === 'tax' ? 'tax-rates' : type === 'rr' ? 'master/ready-reckoner' : type === 'dep' ? 'master/depreciation' : type === 'bu' ? 'master/building-usage' : type === 'sub' ? 'master/items' : 'auth/users'}`;
        if (id) url += `/${id}`;
        try {
            const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(data) });
            if (res.ok) { setEditingId(null); setShowAddForm(false); fetchData(); if (type === 'sub' && selectedCatId) fetchSubItems(selectedCatId); }
            else { alert((await res.json()).error || 'त्रुटी आढळली'); }
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (type: string, id: number) => {
        if (!window.confirm('हे रेकॉर्ड हटवायचे आहे का?')) return;
        let url = `${API_BASE_URL}/api/${type === 'tax' ? 'tax-rates' : type === 'rr' ? 'master/ready-reckoner' : type === 'dep' ? 'master/depreciation' : type === 'bu' ? 'master/building-usage' : type === 'sub' ? 'master/items' : 'auth/users'}/${id}`;
        try {
            const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) { fetchData(); if (type === 'sub' && selectedCatId) fetchSubItems(selectedCatId); }
        } catch (err) { console.error(err); }
    };

    const groupedRr = rrRates.reduce((acc: any, rate) => {
        if (!acc[rate.year_range]) acc[rate.year_range] = [];
        acc[rate.year_range].push(rate);
        return acc;
    }, {});

    const renderTabButton = (id: any, label: string, Icon: any) => (
        <button onClick={() => { setActiveTab(id); setEditingId(null); setShowAddForm(false); }} className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all font-bold text-sm ${activeTab === id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><Settings className="w-6 h-6 text-primary" /> मास्टर डेटा व्यवस्थापन (Tax Master)</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="bg-white border-b flex overflow-x-auto shrink-0">
                    {renderTabButton('rr', 'रेडीरेकणर दर', FileText)} {renderTabButton('tax', 'कर दर', TrendingDown)} {renderTabButton('dep', 'घसारा दर', TrendingDown)} {renderTabButton('bu', 'इमारतीचा वापर', Briefcase)} {renderTabButton('sub', 'इतर मास्टर', Settings)} {renderTabButton('users', 'युजर मॅनेजमेंट', Users)}
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400"><div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" /><p className="font-bold">माहिती लोड होत आहे...</p></div> : 
                    <div className="space-y-6">
                        {activeTab === 'rr' && <div className="space-y-6">
                            <div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800 uppercase">📋 रेडीरेकणर दर</h3><button onClick={() => { setShowAddForm(!showAddForm); setNewForm({ year_range: '', item_name_mr: '', valuation_rate: 0, tax_rate: 0, unit_mr: 'चौ. मी.' }); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> नवीन जोडा</button></div>
                            {showAddForm && <div className="bg-white p-4 rounded-xl border border-primary/20 shadow-lg grid grid-cols-5 gap-3"><input className="border rounded-lg p-2 text-sm" placeholder="कालावधी" value={newForm.year_range} onChange={e => setNewForm({...newForm, year_range: e.target.value})} /><input className="border rounded-lg p-2 text-sm" placeholder="क्षेत्र" value={newForm.item_name_mr} onChange={e => setNewForm({...newForm, item_name_mr: e.target.value})} /><input className="border rounded-lg p-2 text-sm" type="number" placeholder="मूल्यांकन" value={newForm.valuation_rate} onChange={e => setNewForm({...newForm, valuation_rate: Number(e.target.value)})} /><input className="border rounded-lg p-2 text-sm" type="number" step="0.01" placeholder="कर दर" value={newForm.tax_rate} onChange={e => setNewForm({...newForm, tax_rate: Number(e.target.value)})} /><div className="flex gap-2"><select className="border rounded-lg p-2 text-sm flex-1" value={newForm.unit_mr} onChange={e => setNewForm({...newForm, unit_mr: e.target.value})}><option value="चौ. मी.">चौ. मी.</option><option value="चौ. फूट">चौ. फूट</option></select><button onClick={() => handleSave('rr', null, newForm)} className="bg-green-600 text-white p-2 rounded-lg text-xs font-bold">जतन करा</button></div></div>}
                            {Object.entries(groupedRr).map(([year, yrates]: [string, any]) => <div key={year} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b font-black text-slate-700 text-sm">{year}</div>
                                <table className="w-full text-sm text-left"><thead className="bg-slate-100/50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-4 py-2">क्षेत्र / वर्णन</th><th className="px-4 py-2 text-center">मूल्यांकन (₹)</th><th className="px-4 py-2 text-center">कर दर</th><th className="px-4 py-2 text-center">एकक</th><th className="px-4 py-2 text-right">क्रिया</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{yrates.map((r: any) => <tr key={r.id} className="hover:bg-slate-50 group"><td className="px-4 py-2 font-bold">{editingId === r.id ? <input className="w-full border p-1 rounded" value={editForm.item_name_mr || ''} onChange={e => setEditForm({...editForm, item_name_mr: e.target.value})} /> : r.item_name_mr}</td><td className="px-4 py-2 text-center text-indigo-600 font-bold">{editingId === r.id ? <input className="w-20 border p-1" type="number" value={editForm.valuation_rate || 0} onChange={e => setEditForm({...editForm, valuation_rate: Number(e.target.value)})} /> : (r.valuation_rate || 0)}</td><td className="px-4 py-2 text-center text-emerald-600 font-bold">{editingId === r.id ? <input className="w-20 border p-1" type="number" step="0.01" value={editForm.tax_rate || 0} onChange={e => setEditForm({...editForm, tax_rate: Number(e.target.value)})} /> : (r.tax_rate || 0)}</td><td className="px-4 py-2 text-center font-bold text-slate-400">{editingId === r.id ? <select className="border p-1" value={editForm.unit_mr || 'चौ. मी.'} onChange={e => setEditForm({...editForm, unit_mr: e.target.value})}><option value="चौ. मी.">चौ. मी.</option><option value="चौ. फूट">चौ. फूट</option></select> : r.unit_mr}</td><td className="px-4 py-2 text-right"><div className="flex justify-end gap-1">{editingId === r.id ? <><button onClick={() => handleSave('rr', r.id, editForm)} className="text-green-600"><Save className="w-4 h-4"/></button><button onClick={() => setEditingId(null)} className="text-slate-400"><X className="w-4 h-4"/></button></> : <><button onClick={() => { setEditingId(r.id); setEditForm(r); }} className="text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDelete('rr', r.id)} className="text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></>}</div></td></tr>)}</tbody></table>
                            </div>)}
                        </div>}
                        {activeTab === 'tax' && <div className="space-y-4"><h3 className="text-lg font-black text-slate-800 uppercase">⚙️ मालमत्ता कर दर</h3><div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-100/50 text-[10px] font-black uppercase"><tr><th className="px-5 py-3">प्रकार</th><th className="px-5 py-3">वस्ती</th><th className="px-5 py-3 text-center">इमारत दर</th><th className="px-5 py-3 text-center">कर (पैसे)</th><th className="px-5 py-3 text-center">जमीन दर</th><th className="px-5 py-3 text-center">कर (पैसे)</th><th className="px-5 py-3 text-right">क्रिया</th></tr></thead>
                        <tbody className="divide-y">{rates.map(r => <tr key={r.id} className="hover:bg-slate-50 group"><td className="px-5 py-3 font-bold">{r.propertyType}</td><td className="px-5 py-3">{r.wastiName}</td><td className="px-5 py-3 text-center">{editingId === r.id ? <input className="w-20 border" type="number" value={editForm.buildingRate || 0} onChange={e => setEditForm({...editForm, buildingRate: Number(e.target.value)})} /> : (r.buildingRate || 0)}</td><td className="px-5 py-3 text-center">{editingId === r.id ? <input className="w-20 border" type="number" step="0.01" value={editForm.buildingTaxRate || 0} onChange={e => setEditForm({...editForm, buildingTaxRate: Number(e.target.value)})} /> : (r.buildingTaxRate || 0)}</td><td className="px-5 py-3 text-center">{editingId === r.id ? <input className="w-20 border" type="number" value={editForm.landRate || 0} onChange={e => setEditForm({...editForm, landRate: Number(e.target.value)})} /> : (r.landRate || 0)}</td><td className="px-5 py-3 text-center">{editingId === r.id ? <input className="w-20 border" type="number" step="0.01" value={editForm.openSpaceTaxRate || 0} onChange={e => setEditForm({...editForm, openSpaceTaxRate: Number(e.target.value)})} /> : (r.openSpaceTaxRate || 0)}</td><td className="px-5 py-3 text-right">{editingId === r.id ? <><button onClick={() => handleSave('tax', r.id, editForm)} className="text-green-600"><Save className="w-4 h-4"/></button><button onClick={() => setEditingId(null)} className="text-slate-400"><X className="w-4 h-4"/></button></> : <button onClick={() => { setEditingId(r.id); setEditForm(r); }} className="text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4"/></button>}</td></tr>)}</tbody></table></div></div>}
                        {activeTab === 'dep' && <div className="space-y-4"><div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800 uppercase">📉 घसारा दर</h3><button onClick={() => { setShowAddForm(!showAddForm); setNewForm({ min_age: 0, max_age: 0, percentage: 100 }); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> नवीन जोडा</button></div>
                        {showAddForm && <div className="bg-white p-4 rounded-xl border flex gap-3"><input className="border flex-1" type="number" placeholder="किमान" value={newForm.min_age} onChange={e => setNewForm({...newForm, min_age: Number(e.target.value)})} /><input className="border flex-1" type="number" placeholder="कमाल" value={newForm.max_age} onChange={e => setNewForm({...newForm, max_age: Number(e.target.value)})} /><input className="border flex-1" type="number" placeholder="टक्केवारी" value={newForm.percentage} onChange={e => setNewForm({...newForm, percentage: Number(e.target.value)})} /><button onClick={() => handleSave('dep', null, newForm)} className="bg-green-600 text-white px-4">जतन करा</button></div>}
                        <div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-100/50 text-[10px] font-black uppercase"><tr><th className="px-5 py-3">वयोमर्यादा</th><th className="px-5 py-3 text-center">टक्केवारी (%)</th><th className="px-5 py-3 text-right">क्रिया</th></tr></thead>
                        <tbody className="divide-y">{depRates.map(r => <tr key={r.id} className="hover:bg-slate-50 group"><td className="px-5 py-3 font-bold">{editingId === r.id ? <div className="flex gap-1"><input className="w-16" type="number" value={editForm.min_age || 0} onChange={e => setEditForm({...editForm, min_age: Number(e.target.value)})} />-<input className="w-16" type="number" value={editForm.max_age || 0} onChange={e => setEditForm({...editForm, max_age: Number(e.target.value)})} /></div> : `${r.min_age || 0}-${r.max_age || 0} वर्ष`}</td><td className="px-5 py-3 text-center font-black text-rose-600">{editingId === r.id ? <input className="w-16" type="number" value={editForm.percentage || 0} onChange={e => setEditForm({...editForm, percentage: Number(e.target.value)})} /> : `${r.percentage || 0}%`}</td><td className="px-5 py-3 text-right">{editingId === r.id ? <><button onClick={() => handleSave('dep', r.id, editForm)}><Save className="w-4 h-4"/></button><button onClick={() => setEditingId(null)}><X className="w-4 h-4"/></button></> : <><button onClick={() => {setEditingId(r.id); setEditForm(r);}} className="text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDelete('dep', r.id)} className="text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></>}</td></tr>)}</tbody></table></div></div>}
                        {activeTab === 'bu' && <div className="space-y-4"><div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800 uppercase">🏢 इमारतीचा वापर</h3><button onClick={() => { setShowAddForm(!showAddForm); setNewForm({ usage_type_mr: '', usage_type_en: '', weightage: 1.0 }); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> नवीन जोडा</button></div>
                        {showAddForm && <div className="bg-white p-4 rounded-xl border grid grid-cols-4 gap-3"><input className="border" placeholder="मराठी" value={newForm.usage_type_mr} onChange={e => setNewForm({...newForm, usage_type_mr: e.target.value})} /><input className="border" placeholder="English" value={newForm.usage_type_en} onChange={e => setNewForm({...newForm, usage_type_en: e.target.value})} /><input className="border" type="number" step="0.01" value={newForm.weightage} onChange={e => setNewForm({...newForm, weightage: Number(e.target.value)})} /><button onClick={() => handleSave('bu', null, newForm)} className="bg-green-600 text-white">जतन करा</button></div>}
                        <div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-100/50 text-[10px] font-black uppercase"><tr><th className="px-5 py-3">प्रकार</th><th className="px-5 py-3 text-center">गुणक (Weightage)</th><th className="px-5 py-3 text-right">क्रिया</th></tr></thead>
                        <tbody className="divide-y">{buRates.map(r => <tr key={r.id} className="hover:bg-slate-50 group"><td className="px-5 py-3 font-bold">{editingId === r.id ? <input className="w-full" value={editForm.usage_type_mr} onChange={e => setEditForm({...editForm, usage_type_mr: e.target.value})} /> : r.usage_type_mr}</td><td className="px-5 py-3 text-center">{editingId === r.id ? <input className="w-20" type="number" step="0.01" value={editForm.weightage || 0} onChange={e => setEditForm({...editForm, weightage: Number(e.target.value)})} /> : <span className="bg-teal-50 text-teal-600 px-2 font-black font-mono">{Number(r.weightage ?? 1.0).toFixed(2)}</span>}</td><td className="px-5 py-3 text-right">{editingId === r.id ? <><button onClick={() => handleSave('bu', r.id, editForm)}><Save className="w-4 h-4"/></button><button onClick={() => setEditingId(null)}><X className="w-4 h-4"/></button></> : <><button onClick={() => {setEditingId(r.id); setEditForm(r);}} className="text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDelete('bu', r.id)} className="text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></>}</td></tr>)}</tbody></table></div></div>}
                        {activeTab === 'sub' && <div className="space-y-4">
                            <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center"><select className="bg-white/10 text-white rounded px-4 py-2 font-black text-sm" value={selectedCatId || ''} onChange={e => setSelectedCatId(Number(e.target.value))}><option value="" className="text-black">निवडा</option>{categories.map(c => <option key={c.id} value={c.id} className="text-black">{c.name_mr}</option>)}</select>{selectedCatId && <button onClick={() => {setShowAddForm(!showAddForm); setNewForm({ item_value_mr: '', item_value_en: '', item_code: '', sort_order: 0 });}} className="bg-primary text-white px-4 py-2 font-black text-xs uppercase">नवीन जोडा</button>}</div>
                            {showAddForm && selectedCatId && <div className="bg-white p-4 border grid grid-cols-4 gap-2"><input placeholder="मराठी" value={newForm.item_value_mr} onChange={e => setNewForm({...newForm, item_value_mr: e.target.value})} /><input placeholder="English" value={newForm.item_value_en} onChange={e => setNewForm({...newForm, item_value_en: e.target.value})} /><input placeholder="कोड" value={newForm.item_code} onChange={e => setNewForm({...newForm, item_code: e.target.value})} /><button onClick={() => handleSave('sub', null, {...newForm, category_id: selectedCatId})} className="bg-green-600 text-white font-black">जतन करा</button></div>}
                            <div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-100/50 text-[10px] font-black uppercase"><tr><th className="px-5 py-3">नाव</th><th className="px-5 py-3">कोड</th><th className="px-5 py-3 text-right">क्रिया</th></tr></thead><tbody className="divide-y">{subItems.map(i => <tr key={i.id} className="hover:bg-slate-50 group"><td className="px-5 py-3 font-bold">{editingId === i.id ? <input value={editForm.item_value_mr} onChange={e => setEditForm({...editForm, item_value_mr: e.target.value})} /> : i.item_value_mr}</td><td className="px-5 py-3 font-mono text-xs">{editingId === i.id ? <input value={editForm.item_code} onChange={e => setEditForm({...editForm, item_code: e.target.value})} /> : i.item_code}</td><td className="px-5 py-3 text-right">{editingId === i.id ? <><button onClick={() => handleSave('sub', i.id, editForm)}><Save className="w-4 h-4"/></button><button onClick={() => setEditingId(null)}><X className="w-4 h-4"/></button></> : <><button onClick={() => {setEditingId(i.id); setEditForm(i);}} className="text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDelete('sub', i.id)} className="text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></>}</td></tr>)}</tbody></table></div>
                        </div>}
                        {activeTab === 'users' && <div className="space-y-4"><h3 className="text-lg font-black text-slate-800 uppercase">👥 युजर मॅनेजमेंट</h3><div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-100/50 text-[10px] font-black uppercase"><tr><th className="px-5 py-3">नाव/आयडी</th><th className="px-5 py-3">भूमिका</th><th className="px-5 py-3 text-center">स्थिती</th><th className="px-5 py-3 text-right">क्रिया</th></tr></thead>
                        <tbody className="divide-y">{users.map(u => <tr key={u.id} className="hover:bg-slate-50 group"><td className="px-5 py-3"><div className="font-bold">{u.name}</div><div className="text-[10px] font-black text-slate-400">{u.employee_id}</div></td><td className="px-5 py-3">{editingId === u.id ? <select className="text-xs" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>{Object.entries(ROLE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select> : <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">{ROLE_LABELS[u.role] || u.role}</span>}</td><td className="px-5 py-3 text-center">{editingId === u.id ? <select className="text-xs" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}><option value="APPROVED">APPROVED</option><option value="PENDING">PENDING</option><option value="REJECTED">REJECTED</option></select> : <span className={`px-2 py-0.5 rounded text-[10px] font-black ${u.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{u.status}</span>}</td><td className="px-5 py-3 text-right">{editingId === u.id ? <><button onClick={() => handleSave('user', u.id, editForm)}><Save className="w-4 h-4"/></button><button onClick={() => setEditingId(null)}><X className="w-4 h-4"/></button></> : <button onClick={() => {setEditingId(u.id); setEditForm(u);}} className="text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4"/></button>}</td></tr>)}</tbody></table></div></div>}
                    </div>}
                </div>
                <div className="p-4 bg-white border-t shrink-0 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />सिस्टम ऑनलाइन</div><p>GramSarthi v2.0 • Admin Panel</p></div>
            </div>
        </div>
    );
};
