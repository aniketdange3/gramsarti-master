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
}

export const TaxMaster = ({ onClose }: { onClose: () => void }) => {
    const [rates, setRates] = useState<TaxRate[]>([]);
    const [rrRates, setRrRates] = useState<ReadyReckonerRate[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<TaxRate>>({});
    
    // RR States
    const [editingRrId, setEditingRrId] = useState<number | null>(null);
    const [rrEditForm, setRrEditForm] = useState<Partial<ReadyReckonerRate>>({});
    const [showAddRr, setShowAddRr] = useState(false);
    const [newRr, setNewRr] = useState<Partial<ReadyReckonerRate>>({ 
        year_range: '', item_name_mr: '', valuation_rate: 0, tax_rate: 0, unit_mr: 'चौ. मी.' 
    });

    const [loading, setLoading] = useState(true);

    const API_URL = `${API_BASE_URL}/api/tax-rates`;
    const RR_API_URL = `${API_BASE_URL}/api/master/ready-reckoner`;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [taxRes, rrRes] = await Promise.all([
                fetch(API_URL),
                fetch(RR_API_URL)
            ]);
            setRates(await taxRes.json());
            setRrRates(await rrRes.json());
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
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
                <h2 className="text-2xl font-bold text-gray-800">कर दर प्रणाली (Tax Master)</h2>
                <p className="text-sm text-gray-500">मालमत्ता कर दर आणि रेडीरेकणर दर व्यवस्थापित करा</p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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
                                                        {editingRrId === rate.id ? <input type="text" className="w-full border p-1 rounded" value={rrEditForm.item_name_mr} onChange={e => setRrEditForm({...rrEditForm, item_name_mr: e.target.value})} /> : rate.item_name_mr}
                                                    </td>
                                                    <td className="px-4 py-2 text-indigo-600 font-bold">
                                                        {editingRrId === rate.id ? <input type="number" className="w-20 border p-1 rounded" value={rrEditForm.valuation_rate} onChange={e => setRrEditForm({...rrEditForm, valuation_rate: Number(e.target.value)})} /> : `₹${rate.valuation_rate}`}
                                                    </td>
                                                    <td className="px-4 py-2 text-emerald-600 font-bold">
                                                        {editingRrId === rate.id ? <input type="number" step="0.01" className="w-16 border p-1 rounded" value={rrEditForm.tax_rate} onChange={e => setRrEditForm({...rrEditForm, tax_rate: Number(e.target.value)})} /> : rate.tax_rate}
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
                </div>

                {/* Editable Tax Rates Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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
                                                    <input type="number" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.buildingRate} onChange={e => handleChange('buildingRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.buildingRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" step="0.01" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.buildingTaxRate} onChange={e => handleChange('buildingTaxRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.buildingTaxRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.landRate} onChange={e => handleChange('landRate', Number(e.target.value))} />
                                                ) : (
                                                    <span className="font-medium">{rate.landRate}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {editingId === rate.id ? (
                                                    <input type="number" step="0.01" className="w-28 border-2 border-indigo-200 rounded-lg p-1.5 text-sm" value={editForm.openSpaceTaxRate} onChange={e => handleChange('openSpaceTaxRate', Number(e.target.value))} />
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
                </div>
            </div>
        </div>
    );
};
