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

export const TaxMaster = ({ onClose }: { onClose: () => void }) => {
    const [rates, setRates] = useState<TaxRate[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<TaxRate>>({});
    const [loading, setLoading] = useState(true);

    const API_URL = `${API_BASE_URL}/api/tax-rates`;

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            setRates(data);
        } catch (err) {
            console.error('Error fetching rates:', err);
            alert('Error fetching rates');
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
                fetchRates();
            } else {
                alert('Failed to update rate');
            }
        } catch (err) {
            console.error('Error updating rate:', err);
            alert('Error updating rate');
        }
    };

    const handleChange = (field: keyof TaxRate, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    // Ready Reckoner Rate card data (static reference from the image)
    const readyReckoner = [
        {
            period: 'सन 2015-16 पर्यंत',
            rates: [
                { label: 'सर्व', value: '(.20 पैसे) / चौ फुट' }
            ]
        },
        {
            period: 'सन 2016-17 ते 2021-22 पर्यंत',
            rates: [
                { label: 'बांधकाम', value: '14000 / (1.20 पैसे) / चौ मी.' },
                { label: 'शंकरपूर वार्ड क्र. 1', value: '7800 / (1.50 पैसे) / चौ मी.' },
                { label: 'गोटाळपांजरी वार्ड क्र 2', value: '5000 / (1.50 पैसे) / चौ मी.' },
                { label: 'वेळा (हरिश्चंद्र) वार्ड क्र 3', value: '6000 / (1.50 पैसे) / चौ मी.' },
            ]
        },
        {
            period: 'सन 2022-23 पासून',
            rates: [
                { label: 'बांधकाम', value: '21296 / (1.20 पैसे) / चौ मी.' },
                { label: 'शंकरपूर वार्ड क्र. 1', value: '7800 / (1.50 पैसे) / चौ मी.' },
                { label: 'गोटाळपांजरी वार्ड क्र 2', value: '5450 / (1.50 पैसे) / चौ मी.' },
                { label: 'वेळा (हरिश्चंद्र) वार्ड क्र 3', value: '6200 / (1.50 पैसे) / चौ मी.' },
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-6 bg-white border-b">
                <h2 className="text-2xl font-bold text-gray-800">कर दर प्रणाली (Tax Master)</h2>
                <p className="text-sm text-gray-500">मालमत्ता कर दर आणि रेडीरेकणर दर व्यवस्थापित करा</p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Ready Reckoner Rate Card */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-amber-50 border-b border-amber-100">
                        <h3 className="text-lg font-bold text-amber-800">📋 रेडीरेकणर दर (Ready Reckoner Rates)</h3>
                        <p className="text-xs text-amber-600 mt-1">संदर्भासाठी — सध्याचे आणि मागील दर</p>
                    </div>
                    <div className="p-4 space-y-4">
                        {readyReckoner.map((period, pIdx) => (
                            <div key={pIdx} className="rounded-lg border overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 font-bold text-sm text-gray-700 border-b">
                                    {period.period}
                                </div>
                                <div className="divide-y">
                                    {period.rates.map((rate, rIdx) => (
                                        <div key={rIdx} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                                            <span className="text-sm font-medium text-gray-700">{rate.label}</span>
                                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                                                = {rate.value}
                                            </span>
                                        </div>
                                    ))}
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
