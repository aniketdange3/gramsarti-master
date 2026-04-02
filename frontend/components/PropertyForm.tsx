import { API_BASE_URL } from '@/config';

import React, { useState, useEffect } from 'react';
import { Plus, X, Building2, Info, Save, ChevronDown, ChevronUp, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PropertyRecord, PropertySection, DEFAULT_SECTION, FLOOR_NAMES, PROPERTY_TYPES, WASTI_NAMES, LABELS } from '../types';
import { PLACEHOLDERS } from '../constants';
import { TransliterationInput } from './TransliterationInput';
import { ComboTransliterationInput } from './ComboTransliterationInput';
import { getApplicableRates } from '../taxUtils';


interface PropertyFormProps {
    initialData?: PropertyRecord;
    onSave: (data: PropertyRecord) => void;
    onCancel: () => void;
    visibleFloorCount: number;
    setVisibleFloorCount: React.Dispatch<React.SetStateAction<number>>;
    existingLayouts: string[];
    existingKhasras: string[];
    taxRates: any[];
    onAuthError?: () => void;
    records?: PropertyRecord[];
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>
);

const FormInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white ${className}`}
    />
);

const FLOOR_COLORS = [
    { bg: 'bg-primary/5', border: 'border-primary/20', badge: 'bg-primary', text: 'text-primary-dark', icon: 'bg-primary/10 text-primary' },
    { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', text: 'text-blue-700', icon: 'bg-blue-100 text-blue-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-600', text: 'text-indigo-700', icon: 'bg-indigo-100 text-indigo-600' },
    { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-600', text: 'text-violet-700', icon: 'bg-violet-100 text-violet-600' },
    { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-600', text: 'text-slate-700', icon: 'bg-slate-100 text-slate-600' },
];

const PropertyForm = ({
    initialData, onSave, onCancel, visibleFloorCount,
    setVisibleFloorCount, existingLayouts, existingKhasras, taxRates, onAuthError,
    records = []
}: PropertyFormProps) => {
    const [formData, setFormData] = useState<PropertyRecord>(() => {
        if (initialData) {
            const sections = [...initialData.sections];
            while (sections.length < 5) sections.push({ ...DEFAULT_SECTION });
            return { ...initialData, sections };
        }
        return {
            id: Math.random().toString(36).substr(2, 9),
            srNo: 1, wardNo: '', khasraNo: '', layoutName: '', wastiName: '',
            plotNo: '', occupantName: 'स्वतः', ownerName: '', hasConstruction: true,
            openSpace: 0,
            sections: Array(5).fill(null).map(() => ({ ...DEFAULT_SECTION })),
            propertyTax: 0, openSpaceTax: 0, streetLightTax: 0,
            healthTax: 0, generalWaterTax: 0, specialWaterTax: 0,
            totalTaxAmount: 0, arrearsAmount: 0, paidAmount: 0,
            //             citySurveyNo: '', 
            propertyId: '', constructionYear: '', propertyAge: 0,
            readyReckonerLand: 0, readyReckonerBuilding: 0, readyReckonerComposite: 0,
            //             surchargeEducation: 0, surchargeHealth: 0, surchargeRoad: 0, surchargeEmployment: 0, surchargeTotal: 0,
            remarksNotes: '',
            billNo: '', lastBillDate: '',
            receiptNo: '', receiptBook: '', paymentDate: '',
            createdAt: new Date().toISOString()
        };
    });
    const [collapsedFloors, setCollapsedFloors] = useState<boolean[]>([false, false, false, false, false]);
    const [saving, setSaving] = useState(false);
    const [dynamicMasters, setDynamicMasters] = useState<{ [key: string]: any[] }>({
        WASTI: [],
        PROPERTY_TYPE: [],
        WARD: []
    });
    const [depreciationRates, setDepreciationRates] = useState<any[]>([]);

    const isDuplicate = React.useMemo(() => {
        if (!formData.ownerName || !formData.khasraNo || !formData.wastiName) return false;
        const currentKey = `${String(formData.khasraNo).trim()}|${String(formData.wastiName).trim()}|${String(formData.ownerName).trim()}`.toLowerCase();
        
        return records.some(r => {
            if (initialData && r.id === initialData.id) return false;
            const key = `${String(r.khasraNo).trim()}|${String(r.wastiName).trim()}|${String(r.ownerName).trim()}`.toLowerCase();
            return key === currentKey;
        });
    }, [formData.ownerName, formData.khasraNo, formData.wastiName, records, initialData]);

    useEffect(() => {
        const fetchMaster = async (code: string) => {
            try {
                const token = localStorage.getItem('gp_token');
                const res = await fetch(`${API_BASE_URL}/api/master/items/${code}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 && onAuthError) onAuthError();
                return await res.json();
            } catch (err) { return []; }
        };

        const loadAll = async () => {
            const token = localStorage.getItem('gp_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [wastis, types, wards, deps] = await Promise.all([
                fetchMaster('WASTI'),
                fetchMaster('PROPERTY_TYPE'),
                fetchMaster('WARD'),
                fetch(`${API_BASE_URL}/api/master/depreciation`, { headers }).then(async r => {
                    if (r.status === 401 && onAuthError) onAuthError();
                    return r.json();
                }).catch(() => [])
            ]);
            setDynamicMasters({ WASTI: wastis, PROPERTY_TYPE: types, WARD: wards });
            setDepreciationRates(deps);
        };
        loadAll();
    }, []);

    useEffect(() => {
        // Prevent overwriting existing data when editing a record, 
        // unless the user is explicitly changing the wastiName to something new.
        if (initialData && formData.wastiName === initialData.wastiName) {
            return;
        }

        let updates: Partial<PropertyRecord> = {};
        if (formData.wastiName === 'शंकरपुर') updates = { khasraNo: '', layoutName: '', wardNo: '1' };
        else if (formData.wastiName === 'गोटाळ पांजरी') updates = { wardNo: '2' };
        else if (formData.wastiName === 'वेळाहरी') updates = { wardNo: '3', khasraNo: '' };
        if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
    }, [formData.wastiName, initialData]);

    //     useEffect(() => {
    //         const sEducation = Number(formData.surchargeEducation) || 0;
    //         const sHealth = Number(formData.surchargeHealth) || 0;
    //         const sRoad = Number(formData.surchargeRoad) || 0;
    //         const sEmployment = Number(formData.surchargeEmployment) || 0;
    //         const newSurchargeTotal = sEducation + sHealth + sRoad + sEmployment;

    //         if (newSurchargeTotal !== formData.surchargeTotal) {
    //             setFormData(prev => ({ ...prev, surchargeTotal: newSurchargeTotal }));
    //         }
    //     }, [formData.surchargeEducation, formData.surchargeHealth, formData.surchargeRoad, formData.surchargeEmployment]);

    useEffect(() => {
        if (!formData.constructionYear) return;
        const currentYear = new Date().getFullYear();
        let buildYear = 0;
        const match = formData.constructionYear.match(/\d{4}/);
        if (match) buildYear = parseInt(match[0]);
        if (buildYear > 0) {
            const age = Math.max(0, currentYear - buildYear);
            if (age !== formData.propertyAge) {
                setFormData(prev => ({ ...prev, propertyAge: age }));
            }
        }
    }, [formData.constructionYear]);

    useEffect(() => {
        if (depreciationRates.length === 0) return;
        const age = Number(formData.propertyAge) || 0;
        const rateObj = depreciationRates.find(r => age >= r.min_age && age <= r.max_age);
        if (rateObj) {
            const rate = Number(rateObj.percentage) / 100;
            const newSections = formData.sections.map(s => {
                if (s.propertyType && s.propertyType !== 'निवडा' && s.depreciationRate !== rate) {
                    return { ...s, depreciationRate: rate };
                }
                return s;
            });
            // Check if any change occurred to avoid loop
            const hasChange = newSections.some((s, i) => s.depreciationRate !== formData.sections[i].depreciationRate);
            if (hasChange) {
                setFormData(prev => ({ ...prev, sections: newSections }));
            }
        }
    }, [formData.propertyAge, depreciationRates]);

    useEffect(() => {
        const newTotal = calculateTotalTax(formData);
        if (newTotal !== formData.totalTaxAmount) {
            setFormData(prev => ({ ...prev, totalTaxAmount: newTotal }));
        }
    }, [
        formData.propertyTax, formData.openSpaceTax, formData.streetLightTax,
        formData.healthTax, formData.generalWaterTax, formData.specialWaterTax,
        formData.wasteCollectionTax
    ]);

    const calculateTotalTax = (data: PropertyRecord) =>
        Number(data.propertyTax || 0) + Number(data.openSpaceTax || 0) +
        Number(data.streetLightTax || 0) + Number(data.healthTax || 0) +
        Number(data.generalWaterTax || 0) + Number(data.specialWaterTax || 0) +
        Number(data.wasteCollectionTax || 0);

    const handleSectionChange = (index: number, field: keyof PropertySection, value: any) => {
        const newSections = [...formData.sections];
        newSections[index] = { ...newSections[index], [field]: value };

        if (field === 'lengthFt' || field === 'widthFt') {
            const length = field === 'lengthFt' ? value : newSections[index].lengthFt || 0;
            const width = field === 'widthFt' ? value : newSections[index].widthFt || 0;
            if (length > 0 && width > 0) {
                const areaFt = length * width;
                newSections[index].areaSqFt = areaFt;
                newSections[index].areaSqMt = Number((areaFt / 10.764).toFixed(2));
            }
        }
        if (field === 'areaSqFt') newSections[index].areaSqMt = Number((Number(value) / 10.764).toFixed(2));
        if (field === 'areaSqMt') newSections[index].areaSqFt = Number((Number(value) * 10.764).toFixed(2));

        if (field === 'propertyType') {
            if (value && value !== 'निवडा') {
                const matchingRate = taxRates.find(r =>
                    r.propertyType === value && (r.wastiName === 'All' || r.wastiName === formData.wastiName)
                );
                if (matchingRate) {
                    newSections[index].buildingRate = Number(matchingRate.buildingRate);
                    newSections[index].buildingTaxRate = Number(matchingRate.buildingTaxRate);
                    newSections[index].landRate = Number(matchingRate.landRate);
                    newSections[index].openSpaceTaxRate = Number(matchingRate.openSpaceTaxRate);
                } else {
                    const rates = getApplicableRates(value, formData.wastiName);
                    newSections[index].buildingRate = rates.buildingRate || 0;
                    newSections[index].buildingTaxRate = rates.buildingTaxRate || 0;
                    newSections[index].landRate = rates.landRate || 0;
                    newSections[index].openSpaceTaxRate = rates.openSpaceTaxRate || 0;
                }
                newSections[index].depreciationRate = 0;
                newSections[index].weightage = 1.00;
            } else {
                newSections[index].depreciationRate = 0; newSections[index].weightage = 0;
                newSections[index].buildingTaxRate = 0; newSections[index].buildingRate = 0;
                newSections[index].landRate = 0; newSections[index].openSpaceTaxRate = 0;
            }
        }

        const s = newSections[index];
        if (['areaSqFt', 'areaSqMt', 'buildingRate', 'lengthFt', 'widthFt', 'propertyType'].includes(field as string)) {
            const bValue = Number(s.areaSqMt || 0) * Number(s.buildingRate || 0);
            newSections[index].buildingValue = Math.round(bValue);
        }
        const bDep = Number(newSections[index].depreciationRate) || 0;
        const bWeight = Number(newSections[index].weightage) || 0;
        newSections[index].buildingFinalValue = Math.round(Number(newSections[index].buildingValue) * bDep * bWeight);

        setFormData({ ...formData, sections: newSections });
    };

    const handleTaxChange = (field: keyof PropertyRecord, value: number) => {
        const updatedData = { ...formData, [field]: value };
        setFormData({ ...updatedData, totalTaxAmount: calculateTotalTax(updatedData) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(formData); } finally { setSaving(false); }
    };

    const toggleFloor = (idx: number) => {
        setCollapsedFloors(prev => { const n = [...prev]; n[idx] = !n[idx]; return n; });
    };

    const applyDefaultRates = async () => {
        try {
            const token = localStorage.getItem('gp_token');
            const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

            const [configRes, ratesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/system-config`, { headers }),
                fetch(`${API_BASE_URL}/api/tax-rates`, { headers })
            ]);

            if (configRes.status === 401 && onAuthError) onAuthError();
            if (ratesRes.status === 401 && onAuthError) onAuthError();

            const config = await configRes.json();
            const masterRates = await ratesRes.json();

            setFormData(prev => {
                const updatedSections = prev.sections.map(section => {
                    // Match master rate based on Type and Wasti
                    // Fallback to 'All' wasti if specific wasti not found
                    const matchedRate = masterRates.find((r: any) =>
                        r.propertyType === section.propertyType &&
                        (r.wastiName === prev.wastiName || r.wastiName === 'All')
                    );

                    if (matchedRate) {
                        return {
                            ...section,
                            buildingTaxRate: Number(matchedRate.buildingTaxRate) || section.buildingTaxRate,
                            openSpaceTaxRate: Number(matchedRate.openSpaceTaxRate) || section.openSpaceTaxRate,
                            landRate: Number(matchedRate.landRate) || section.landRate,
                            buildingRate: Number(matchedRate.buildingRate) || section.buildingRate,
                        };
                    }
                    return section;
                });

                return {
                    ...prev,
                    sections: updatedSections,
                    streetLightTax: Number(config.street_light_default) || prev.streetLightTax,
                    wasteCollectionTax: Number(config.waste_collection_default) || prev.wasteCollectionTax,
                    healthTax: Number(config.health_tax_default) || prev.healthTax,
                    generalWaterTax: Number(config.general_water_default) || prev.generalWaterTax,
                    specialWaterTax: Number(config.special_water_default) || prev.specialWaterTax,
                };
            });
        } catch (err) {
            console.error('Failed to apply default rates:', err);
            alert('मास्टर डेटा प्राप्त करण्यात त्रुटी आली');
        }
    };

    const taxBreakdown = [
        { label: 'घरपट्टी', value: formData.propertyTax, field: 'propertyTax' as keyof PropertyRecord },
        { label: 'घरपट्टी (जागा)', value: formData.openSpaceTax, field: 'openSpaceTax' as keyof PropertyRecord },
        { label: 'विज / दिवाबत्ती कर', value: formData.streetLightTax, field: 'streetLightTax' as keyof PropertyRecord },
        { label: 'आरोग्य रक्षण कर', value: formData.healthTax, field: 'healthTax' as keyof PropertyRecord },
        { label: 'सामान्य पाणी कर', value: formData.generalWaterTax, field: 'generalWaterTax' as keyof PropertyRecord },
        { label: 'विशेष पाणी कर', value: formData.specialWaterTax, field: 'specialWaterTax' as keyof PropertyRecord },
        { label: 'कचरा गाडी कर', value: formData.wasteCollectionTax, field: 'wasteCollectionTax' as keyof PropertyRecord },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="px-7 py-5 flex justify-between items-center shrink-0 shadow-lg relative z-10"
                    style={{ background: 'linear-gradient(135deg, #544CE6, #302C80)' }}>
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <Building2 className="w-6 h-6" />
                            {initialData ? 'नोंद सुधारा' : 'नवीन मालमत्ता नोंद'}
                        </h2>
                        <p className="text-primary-light text-xs mt-0.5 font-medium">
                            {initialData ? `अ.क्र. ${initialData.srNo} • ${initialData.ownerName}` : 'नवीन नोंदणी'}
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white no-print">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {isDuplicate && (
                    <div className="bg-rose-50 border-b border-rose-100 px-7 py-3 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                        <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                        <div className="flex-1">
                            <p className="text-xs font-black text-rose-700 uppercase tracking-wider">डुप्लिकेट डेटा आढळला! (Duplicate Record Detected)</p>
                            <p className="text-[10px] text-rose-500 font-bold mt-0.5">या खसरा, वस्ती आणि मालकाच्या नावाची नोंद आधीच अस्तित्वात आहे. (A record with this Khasra, Wasti, and Owner already exists.)</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Section 1: Location & Identification */}
                        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                            <h3 className="text-sm font-black text-primary-dark uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-black">१</div>
                                स्थान व ओळख (Location & ID)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <FieldLabel>मालमत्ता क्र.</FieldLabel>
                                    <TransliterationInput placeholder="उदा. १२७"
                                        className="w-full border-2 border-primary/10 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.propertyId || ''} onChangeText={val => setFormData({ ...formData, propertyId: val })} />
                                </div>
                                {/* 
                                <div>
                                    <FieldLabel>{LABELS.citySurveyNo}</FieldLabel>
                                    <TransliterationInput placeholder="सी.टी.एस. नंबर"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={(formData as any).citySurveyNo || ''} onChangeText={val => setFormData({ ...formData, citySurveyNo: val })} />
                                </div> 
*/}
                                <div className="col-span-2 md:col-span-1">
                                    <FieldLabel>{LABELS.wastiName}</FieldLabel>
                                    <select 
                                        value={formData.wastiName}
                                        onChange={e => setFormData({ ...formData, wastiName: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white font-bold"
                                    >
                                        <option value="">निवडा</option>
                                        {dynamicMasters.WASTI.map(item => (
                                            <option key={item.id} value={item.item_value_mr}>{item.item_value_mr}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.wardNo}</FieldLabel>
                                    <datalist id="wardNumbers">
                                        {dynamicMasters.WARD.map(item => <option key={item.id} value={item.item_value_mr} />)}
                                    </datalist>
                                    <TransliterationInput list="wardNumbers" placeholder={PLACEHOLDERS.wardNo}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.wardNo} onChangeText={val => setFormData({ ...formData, wardNo: val })} required />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.khasraNo}</FieldLabel>
                                    <ComboTransliterationInput 
                                        value={formData.khasraNo}
                                        onChangeText={val => setFormData({ ...formData, khasraNo: val })}
                                        placeholder={PLACEHOLDERS.khasraNo}
                                        options={existingKhasras.map(k => ({ value: k, label: k }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white font-bold"
                                    />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.plotNo}</FieldLabel>
                                    <TransliterationInput placeholder={PLACEHOLDERS.plotNo}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.plotNo} onChangeText={val => setFormData({ ...formData, plotNo: val })} required />
                                </div>
                                <div className="col-span-2">
                                    <FieldLabel>{LABELS.layoutName}</FieldLabel>
                                    <datalist id="layoutNames">
                                        {existingLayouts.map(l => <option key={l} value={l} />)}
                                    </datalist>
                                    <TransliterationInput list="layoutNames" placeholder={PLACEHOLDERS.layoutName}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.layoutName} onChangeText={val => setFormData({ ...formData, layoutName: val })} />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Ownership Details */}
                        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                            <h3 className="text-sm font-black text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs font-black">२</div>
                                मालकाचा तपशील (Ownership)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>{LABELS.ownerName}</FieldLabel>
                                    <TransliterationInput placeholder={PLACEHOLDERS.ownerName}
                                        className="w-full border-2 border-blue-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={formData.ownerName} onChangeText={val => setFormData({ ...formData, ownerName: val })} required />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.occupantName}</FieldLabel>
                                    <TransliterationInput placeholder={PLACEHOLDERS.occupantName}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={formData.occupantName} onChangeText={val => setFormData({ ...formData, occupantName: val })} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Construction & Dimensions */}
                        <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100">
                            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-xs font-black">३</div>
                                बांधकाम व क्षेत्रफळ (Dimensions)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <FieldLabel>{LABELS.hasConstruction}</FieldLabel>
                                    <div className="flex bg-white border border-gray-200 rounded-xl p-1">
                                        <button type="button" onClick={() => setFormData({ ...formData, hasConstruction: true })}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.hasConstruction ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                            हो (Yes)
                                        </button>
                                        <button type="button" onClick={() => setFormData({ ...formData, hasConstruction: false })}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.hasConstruction ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                            नाही (No)
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.openSpace}</FieldLabel>
                                    <FormInput type="number" placeholder="चौ.फु."
                                        value={formData.openSpace || ''}
                                        onChange={e => setFormData({ ...formData, openSpace: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.constructionYear}</FieldLabel>
                                    <FormInput type="text" placeholder="२०१०-११"
                                        value={formData.constructionYear || ''}
                                        onChange={e => setFormData({ ...formData, constructionYear: e.target.value })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.propertyAge}</FieldLabel>
                                    <FormInput type="number" placeholder="१५"
                                        value={formData.propertyAge || ''}
                                        onChange={e => setFormData({ ...formData, propertyAge: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Floor Details & Valuation */}
                        <div>
                            <h3 className="text-sm font-black text-primary-dark uppercase tracking-wider mb-3 flex items-center gap-2">
                                <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-black">४</div>
                                मोजमाप व कर मूल्य (Valuation)
                            </h3>
                            <div className="space-y-3">
                                {formData.sections.slice(0, visibleFloorCount).map((section, idx) => {
                                    const name = FLOOR_NAMES[idx];
                                    const col = FLOOR_COLORS[idx];
                                    const isActive = section.propertyType && section.propertyType !== 'निवडा';
                                    const isCollapsed = collapsedFloors[idx];
                                    return (
                                        <div key={idx} className={`rounded-2xl border-2 overflow-hidden transition-all ${col.border} ${col.bg}`}>
                                            <div
                                                className="flex items-center gap-3 p-4 cursor-pointer"
                                                onClick={() => isActive && toggleFloor(idx)}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${col.icon}`}>
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg text-white ${col.badge}`}>{name}</span>
                                                {isActive && (
                                                    <span className={`text-xs font-bold ${col.text}`}>{section.propertyType}</span>
                                                )}
                                                <div className="ml-auto flex items-center gap-2">
                                                    {isActive && (
                                                        <span className={`text-xs font-bold ${col.text}`}>
                                                            {section.areaSqFt > 0 ? `${section.areaSqFt} चौ.फु` : ''}
                                                        </span>
                                                    )}
                                                    {isActive && (isCollapsed ? <ChevronDown className={`w-4 h-4 ${col.text}`} /> : <ChevronUp className={`w-4 h-4 ${col.text}`} />)}
                                                </div>
                                            </div>

                                            {!isCollapsed && (
                                                <div className="px-4 pb-4 space-y-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                        <div className="col-span-2">
                                                            <FieldLabel>{LABELS.propertyType}</FieldLabel>
                                                            <select 
                                                                value={formData.sections[idx].propertyType}
                                                                onChange={e => handleSectionChange(idx, 'propertyType', e.target.value)}
                                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white font-bold"
                                                            >
                                                                <option value="">निवडा</option>
                                                                {dynamicMasters.PROPERTY_TYPE.map(item => (
                                                                    <option key={item.id} value={item.item_value_mr}>{item.item_value_mr}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {isActive && (
                                                            <>
                                                                <div>
                                                                    <FieldLabel>{LABELS.lengthFt}</FieldLabel>
                                                                    <FormInput type="number" placeholder={PLACEHOLDERS.length}
                                                                        value={formData.sections[idx].lengthFt || ''}
                                                                        onChange={e => handleSectionChange(idx, 'lengthFt', Number(e.target.value))} />
                                                                </div>
                                                                <div>
                                                                    <FieldLabel>{LABELS.widthFt}</FieldLabel>
                                                                    <FormInput type="number" placeholder={PLACEHOLDERS.width}
                                                                        value={formData.sections[idx].widthFt || ''}
                                                                        onChange={e => handleSectionChange(idx, 'widthFt', Number(e.target.value))} />
                                                                    {formData.sections[idx].lengthFt > 0 && formData.sections[idx].widthFt > 0 && (
                                                                        <p className="text-[10px] text-primary font-bold mt-1 animate-pulse">
                                                                            = {formData.sections[idx].lengthFt * formData.sections[idx].widthFt} चौ.फु.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <FieldLabel>{LABELS.areaSqFt}</FieldLabel>
                                                                    <FormInput type="number" placeholder={PLACEHOLDERS.area}
                                                                        value={formData.sections[idx].areaSqFt || ''}
                                                                        onChange={e => handleSectionChange(idx, 'areaSqFt', Number(e.target.value))} />
                                                                </div>
                                                                <div>
                                                                    <FieldLabel>{LABELS.areaSqMt}</FieldLabel>
                                                                    <FormInput type="number" placeholder={PLACEHOLDERS.area}
                                                                        value={formData.sections[idx].areaSqMt || ''}
                                                                        onChange={e => handleSectionChange(idx, 'areaSqMt', Number(e.target.value))} />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {isActive && (
                                                        <>
                                                            <div className="flex items-center gap-3 py-2">
                                                                <div className="h-px flex-1 bg-white/70" />
                                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${col.text} bg-white/60 px-3 py-1.5 rounded-full border border-white`}>
                                                                    <Info className="w-3.5 h-3.5" />{LABELS.redKarSection}
                                                                </div>
                                                                <div className="h-px flex-1 bg-white/70" />
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
                                                                {[
                                                                    { lbl: LABELS.landRate, field: 'landRate', ph: PLACEHOLDERS.rate },
                                                                    { lbl: LABELS.buildingRate, field: 'buildingRate', ph: PLACEHOLDERS.rate },
                                                                    { lbl: LABELS.depreciationRate, field: 'depreciationRate', ph: PLACEHOLDERS.depreciation },
                                                                    { lbl: LABELS.weightage, field: 'weightage', ph: PLACEHOLDERS.weightage },
                                                                    { lbl: LABELS.buildingValue, field: 'buildingValue', ph: PLACEHOLDERS.value },
                                                                    { lbl: LABELS.openSpaceValue, field: 'openSpaceValue', ph: PLACEHOLDERS.value },
                                                                    { lbl: LABELS.buildingTaxRate, field: 'buildingTaxRate', ph: PLACEHOLDERS.taxRate },
                                                                    { lbl: LABELS.openSpaceTaxRate, field: 'openSpaceTaxRate', ph: PLACEHOLDERS.taxRate },
                                                                ].map(({ lbl, field, ph }) => (
                                                                    <div key={field}>
                                                                        <FieldLabel>{lbl}</FieldLabel>
                                                                        <FormInput type="number" placeholder={ph}
                                                                            value={(formData.sections[idx] as any)[field] || ''}
                                                                            onChange={e => handleSectionChange(idx, field as keyof PropertySection, Number(e.target.value))} />
                                                                    </div>
                                                                ))}
                                                                <div>
                                                                    <FieldLabel>{LABELS.constructionYear}</FieldLabel>
                                                                    <FormInput type="text" placeholder="२०१०-११"
                                                                        value={formData.constructionYear || ''}
                                                                        onChange={e => setFormData({ ...formData, constructionYear: e.target.value })} />
                                                                </div>
                                                                <div>
                                                                    <FieldLabel>{LABELS.propertyAge}</FieldLabel>
                                                                    <FormInput type="number" placeholder="१५"
                                                                        value={formData.propertyAge || ''}
                                                                        onChange={e => setFormData({ ...formData, propertyAge: Number(e.target.value) })} />
                                                                </div>
                                                            </div>
                                                            {section.buildingValue > 0 && (
                                                                <div className={`flex items-center gap-2 text-xs font-bold ${col.text} bg-white/70 rounded-xl px-4 py-2.5`}>
                                                                    <Calculator className="w-4 h-4" />
                                                                    भांडवली मूल्य: ₹{section.buildingValue.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {visibleFloorCount < 5 && (
                                    <button type="button" onClick={() => setVisibleFloorCount(prev => Math.min(prev + 1, 5))}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary/5 text-primary font-bold rounded-2xl border-2 border-dashed border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all text-sm">
                                        <Plus className="w-4 h-4" /> पुढील मजला जोडा
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Section 5: Tax Summary */}
                        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                            <h3 className="text-sm font-black text-primary-dark uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-black">५</div>
                                <Calculator className="w-4 h-4" />
                                कराचा तपशील (Tax Summary)
                                <button
                                    type="button"
                                    onClick={applyDefaultRates}
                                    className="ml-4 text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-lg border border-green-200 hover:bg-green-200 transition-colors flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-3 h-3" /> कराचे दर लागू करा (Apply All)
                                </button>
                                {(() => {
                                    const totalCap = formData.sections.reduce((sum, s) =>
                                        sum + (s.propertyType && s.propertyType !== 'निवडा' ? (Number(s.buildingValue) || 0) + (Number(s.openSpaceValue) || 0) : 0), 0
                                    );
                                    return totalCap > 0 ? (
                                        <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-lg border border-primary/20">
                                            एकूण भांडवली मूल्य: ₹{totalCap.toLocaleString()}
                                        </span>
                                    ) : null;
                                })()}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                                {taxBreakdown.map(({ label, value, field }) => (
                                    <div key={field}>
                                        <FieldLabel>{label}</FieldLabel>
                                        <FormInput type="number" placeholder="0"
                                            className="font-semibold text-primary"
                                            value={value || ''}
                                            onChange={e => handleTaxChange(field, Number(e.target.value))} />
                                    </div>
                                ))}
                            </div>

                            {/* New: Surcharge Section (Rule 32(1) specific) */}
                            {/* 
                            <div className="flex items-center gap-3 py-3 mb-1">
                                <div className="h-px flex-1 bg-primary/10" />
                                <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{LABELS.redKarSection} (अधिभार)</span>
                                <div className="h-px flex-1 bg-primary/10" />
                            </div> 
*/}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                                {/* 
                                <div>
                                    <FieldLabel>{LABELS.surchargeEducation}</FieldLabel>
                                    <FormInput type="number" value={(formData as any).surchargeEducation || ''}
                                        onChange={e => setFormData({ ...formData, surchargeEducation: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.surchargeHealth}</FieldLabel>
                                    <FormInput type="number" value={(formData as any).surchargeHealth || ''}
                                        onChange={e => setFormData({ ...formData, surchargeHealth: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.surchargeRoad}</FieldLabel>
                                    <FormInput type="number" value={(formData as any).surchargeRoad || ''}
                                        onChange={e => setFormData({ ...formData, surchargeRoad: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.surchargeEmployment}</FieldLabel>
                                    <FormInput type="number" value={(formData as any).surchargeEmployment || ''}
                                        onChange={e => setFormData({ ...formData, surchargeEmployment: Number(e.target.value) })} />
                                </div> 
*/}
                                <div>
                                    <FieldLabel>{LABELS.remarksNotes}</FieldLabel>
                                    <TransliterationInput 
                                        placeholder="टिपणी..."
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.remarksNotes || ''}
                                        onChangeText={val => setFormData({ ...formData, remarksNotes: val })} 
                                    />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border-2 border-primary/20 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-primary uppercase tracking-wider">{LABELS.totalTax}</p>
                                    <p className="text-2xl font-black text-primary-dark mt-0.5">₹{Number(formData.totalTaxAmount || 0).toLocaleString()}</p>
                                </div>
                                <input type="number"
                                    className="w-40 border-2 border-primary/20 rounded-xl px-3 py-2 text-lg font-black text-primary-dark text-right focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={formData.totalTaxAmount || ''}
                                    onChange={e => setFormData({ ...formData, totalTaxAmount: Number(e.target.value) })} />
                            </div>
                        </div>

                        {/* Section 4: Financial Tracking */}
                        <div className="rounded-2xl p-5 border border-rose-100 bg-rose-50/30">
                            <h3 className="text-sm font-black text-rose-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 text-xs font-black">६</div>
                                आर्थिक माहिती (Financials)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl p-4 border-2 border-rose-100">
                                    <FieldLabel>मागील थकबाकी (Arrears)</FieldLabel>
                                    <FormInput type="number" className="font-bold text-lg text-rose-700 border-2 border-rose-200"
                                        value={formData.arrearsAmount || ''}
                                        onChange={e => setFormData({ ...formData, arrearsAmount: Number(e.target.value) })} />
                                    <p className="text-[10px] text-rose-500 mt-1.5 font-medium">* मागील वर्षाची शिल्लक थकबाकी</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border-2 border-success/10">
                                    <FieldLabel>भरलेली रक्कम (Paid)</FieldLabel>
                                    <FormInput type="number" className="font-bold text-lg text-success border-2 border-success/20"
                                        value={formData.paidAmount || ''}
                                        onChange={e => setFormData({ ...formData, paidAmount: Number(e.target.value) })} />
                                    <p className="text-[10px] text-success mt-1.5 font-medium">* यावर्षी जमा केलेली एकूण रक्कम</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 7 removed */}

                        {/* Section 8: Receipt Information */}
                        <div className="rounded-2xl p-5 border border-emerald-100 bg-emerald-50/30">
                            <h3 className="text-sm font-black text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 text-xs font-black">८</div>
                                पावती माहिती (Receipt Info)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <FieldLabel>{LABELS.receiptBook}</FieldLabel>
                                    <TransliterationInput placeholder="उदा. ५"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.receiptBook || ''}
                                        onChangeText={val => setFormData({ ...formData, receiptBook: val })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.receiptNo}</FieldLabel>
                                    <TransliterationInput placeholder="उदा. ७८"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                                        value={formData.receiptNo || ''}
                                        onChangeText={val => setFormData({ ...formData, receiptNo: val })} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.paymentDate}</FieldLabel>
                                    <FormInput type="date"
                                        value={formData.paymentDate || new Date().toISOString().split('T')[0]}
                                        onChange={e => setFormData({ ...formData, paymentDate: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
                        <div className="text-xs text-gray-400 font-medium">
                            {formData.wastiName && <span className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-lg">{formData.wastiName}</span>}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onCancel}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors text-sm">
                                रद्द करा
                            </button>
                            <button type="submit" disabled={saving}
                                className="px-8 py-2.5 bg-primary text-white rounded-xl font-black hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-sm flex items-center gap-2 disabled:opacity-70">
                                {saving ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> जतन होत आहे...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> जतन करा</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default PropertyForm;
