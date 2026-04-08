import { API_BASE_URL } from '@/config';

import React, { useState, useEffect } from 'react';
import { Plus, X, Building2, Info, Save, ChevronDown, ChevronUp, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PropertyRecord, PropertySection, DEFAULT_SECTION, FLOOR_NAMES, PROPERTY_TYPES, WASTI_NAMES, LABELS } from '../types';
import { PLACEHOLDERS } from '../constants';
import { TransliterationInput } from './TransliterationInput';
import { ComboTransliterationInput } from './ComboTransliterationInput';
import { calculateTax, TaxRateMaster, DepreciationMaster, BuildingUsageMaster } from '../taxUtils';

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

const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

// Hindi/Marathi digits to English digits
const h2e = (str: string) => str.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d).toString());

const FieldLabel = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <label className={`block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ${className}`}>{children}</label>
);

const INPUT_CLASSES = "w-full border border-border rounded-xl px-3 py-2.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-surface text-text disabled:bg-surface-hover/50 disabled:text-text-muted";

const FormInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`${INPUT_CLASSES} ${className}`}
    />
);

const FormSelect = ({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
        {...props}
        className={`${INPUT_CLASSES} ${className}`}
    >
        {children}
    </select>
);

const FLOOR_COLORS = [
    { bg: 'bg-blue-50/50', border: 'border-blue-200', header: 'bg-blue-600', text: 'text-blue-700', icon: 'bg-blue-100 text-blue-600' },
    { bg: 'bg-purple-50/50', border: 'border-purple-200', header: 'bg-purple-600', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600' },
    { bg: 'bg-amber-50/50', border: 'border-amber-200', header: 'bg-amber-600', text: 'text-amber-700', icon: 'bg-amber-100 text-amber-600' },
    { bg: 'bg-emerald-50/50', border: 'border-emerald-200', header: 'bg-emerald-600', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600' },
    { bg: 'bg-rose-50/50', border: 'border-rose-200', header: 'bg-rose-600', text: 'text-rose-700', icon: 'bg-rose-100 text-rose-600' },
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
            buildingUsage: 'निवास',
            createdAt: new Date().toISOString()
        };
    });
    const [collapsedFloors, setCollapsedFloors] = useState<boolean[]>([false, false, false, false, false]);
    const [saving, setSaving] = useState(false);
    const [dynamicMasters, setDynamicMasters] = useState<{ [key: string]: any[] }>({
        WASTI: [],
        PROPERTY_TYPE: [],
        WARD: [],
        BUILDING_USAGE: [],
        LAYOUT: []
    });
    const [depreciationRates, setDepreciationRates] = useState<DepreciationMaster[]>([]);
    const [buildingUsageRates, setBuildingUsageRates] = useState<BuildingUsageMaster[]>([]);
    const [masterTaxRates, setMasterTaxRates] = useState<TaxRateMaster[]>([]);

    const [remarksObj, setRemarksObj] = useState({
        date: '', subject: '', ferfar: '', pan: '', anu: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData?.remarksNotes) {
            const str = initialData.remarksNotes;
            if (str.includes('मासिक सभा')) {
                setRemarksObj({
                    date: str.match(/(?:दिनांक:)\s*(.*?)(?=[,\n]\s*विषय:|$)/)?.[1]?.trim() || '',
                    subject: str.match(/विषय:\s*(.*?)(?=[,\n]\s*फेरफार बुक क्र:|$)/)?.[1]?.trim() || '',
                    ferfar: str.match(/फेरफार बुक  क्र:\s*(.*?)(?=[,\n]\s*पान क्र:|$)/)?.[1]?.trim() || '',
                    pan: str.match(/पान क्र:\s*(.*?)(?=[,\n]\s*अनु क्र:|$)/)?.[1]?.trim() || '',
                    anu: str.match(/अनु क्र:\s*(.*)$/)?.[1]?.trim() || '',
                });
            } else {
                setRemarksObj({ date: '', subject: str, ferfar: '', pan: '', anu: '' });
            }
        }
    }, [initialData]);

    const updateRemark = (field: keyof typeof remarksObj, value: string) => {
        const newObj = { ...remarksObj, [field]: value };
        setRemarksObj(newObj);

        const hasData = Object.values(newObj).some(v => typeof v === 'string' && v.trim() !== '');
        if (hasData) {
            const combined = `मासिक सभा\nदिनांक: ${newObj.date}\nविषय: ${newObj.subject}\nफेरफार बुक क्र: ${newObj.ferfar}\nपान क्र: ${newObj.pan}\nअनु क्र: ${newObj.anu}`;
            setFormData(f => ({ ...f, remarksNotes: combined }));
        } else {
            setFormData(f => ({ ...f, remarksNotes: '' }));
        }
    };

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
            const [wastis, types, wards, buDrops, layouts, buRates, deps, tRates] = await Promise.all([
                fetchMaster('WASTI'),
                fetchMaster('PROPERTY_TYPE'),
                fetchMaster('WARD'),
                fetchMaster('BUILDING_USAGE'),
                fetchMaster('LAYOUT'),
                fetch(`${API_BASE_URL}/api/master/building-usage`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE_URL}/api/master/depreciation`, { headers }).then(async r => {
                    if (r.status === 401 && onAuthError) onAuthError();
                    return r.json();
                }).catch(() => []),
                fetch(`${API_BASE_URL}/api/tax-rates`, { headers }).then(r => r.json()).catch(() => [])
            ]);
            setDynamicMasters({
                WASTI: wastis,
                PROPERTY_TYPE: types,
                WARD: wards,
                BUILDING_USAGE: buDrops,
                LAYOUT: layouts
            });
            setBuildingUsageRates(buRates);
            setDepreciationRates(deps);
            setMasterTaxRates(tRates);
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

    useEffect(() => {
        // Find usage rate from dedicated master table
        const usageRate = buildingUsageRates.find(r => r.usage_type_mr === formData.buildingUsage);
        if (!usageRate) return;

        const weight = Number(usageRate.weightage);
        const newSections = formData.sections.map(s => {
            // ONLY apply usage weightage if property type is RCC (आर.सी.सी)
            if (s.propertyType === 'आर.सी.सी' && s.weightage !== weight) {
                return { ...s, weightage: weight };
            }
            // If not RCC, ensure weightage stays 1.0 (or whatever default)
            if (s.propertyType !== 'आर.सी.सी' && s.propertyType !== 'निवडा' && s.weightage !== 1.0) {
                return { ...s, weightage: 1.0 };
            }
            return s;
        });

        // Trigger update only if something changed
        const hasChange = newSections.some((s, idx) => s.weightage !== formData.sections[idx].weightage);
        if (hasChange) {
            setFormData(prev => ({ ...prev, sections: newSections }));
        }
    }, [formData.buildingUsage, buildingUsageRates, formData.sections]);

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


    // Auto-sync section taxes to main summary
    // Removed to prevent overriding propertyTax and openSpaceTax on edit load
    // useEffect(() => {
    //     const totalPropTax = formData.sections.reduce((sum, s) => sum + (Number(s.buildingFinalValue) || 0), 0);
    //     const totalOpenTax = formData.sections.reduce((sum, s) => sum + (Number(s.openSpaceFinalValue) || 0), 0);

    //     if (totalPropTax !== formData.propertyTax || totalOpenTax !== formData.openSpaceTax) {
    //         setFormData(prev => ({
    //             ...prev,
    //             propertyTax: Math.round(totalPropTax),
    //             openSpaceTax: Math.round(totalOpenTax)
    //         }));
    //     }
    // }, [formData.sections]);

    useEffect(() => {
        setFormData(prev => {
            const newTotal = calculateTotalTax(prev);
            if (newTotal !== prev.totalTaxAmount) {
                return { ...prev, totalTaxAmount: newTotal };
            }
            return prev;
        });
    }, [
        formData.propertyTax, formData.openSpaceTax, formData.streetLightTax,
        formData.healthTax, formData.generalWaterTax, formData.specialWaterTax,
        formData.wasteCollectionTax
    ]);

    const calculateTotalTax = (data: PropertyRecord) =>
        Math.round(
            Number(data.propertyTax || 0) + Number(data.openSpaceTax || 0) +
            Number(data.streetLightTax || 0) + Number(data.healthTax || 0) +
            Number(data.generalWaterTax || 0) + Number(data.specialWaterTax || 0) +
            Number(data.wasteCollectionTax || 0)
        );

    const recalculateAll = (updatedFormData: PropertyRecord) => {
        const { wastiName, buildingUsage, openSpace, sections } = updatedFormData;

        // Find usage weightage
        const usageRate = buildingUsageRates.find(r => r.usage_type_mr === buildingUsage);
        const weight = usageRate ? Number(usageRate.weightage) : 1.0;

        const updatedSections = sections.map((s, idx) => {
            if (!s.propertyType || s.propertyType === 'निवडा') return s;

            const matchingRate = masterTaxRates.find(r =>
                r.propertyType === s.propertyType && (r.wastiName === 'All' || r.wastiName === wastiName)
            );

            let buildingRate = Number(s.buildingRate || 0);
            let bTaxRate = Number(s.buildingTaxRate || 0);
            let landRate = Number(s.landRate || 0);
            let oTaxRate = Number(s.openSpaceTaxRate || 0);

            if (matchingRate) {
                buildingRate = Number(matchingRate.buildingRate);
                bTaxRate = Number(matchingRate.buildingTaxRate);
                landRate = Number(matchingRate.landRate);
                oTaxRate = Number(matchingRate.openSpaceTaxRate);
            }

            let valueMultiplier = 1.0;
            if (s.propertyType === 'आर.सी.सी') {
                const age = Number(s.propertyAge) || 0;
                const depMatch = depreciationRates.find(r => age >= r.min_age && age <= r.max_age);
                if (depMatch) valueMultiplier = Number(depMatch.percentage) / 100;
            }

            const area = Number(s.areaSqMt || 0);
            const bRes = calculateTax({
                areaSqMt: area,
                rate: buildingRate,
                taxRate: bTaxRate,
                weightage: weight,
                valueMultiplier
            });

            const lRes = calculateTax({
                areaSqMt: area,
                rate: landRate,
                taxRate: oTaxRate,
                weightage: 1.0,
                valueMultiplier: 1.0
            });

            return {
                ...s,
                weightage: weight,
                depreciationRate: Number(valueMultiplier.toFixed(2)),
                buildingRate, buildingTaxRate: bTaxRate,
                landRate, openSpaceTaxRate: oTaxRate,
                buildingValue: bRes.valuation,
                buildingFinalValue: bRes.finalTax,
                openSpaceValue: lRes.valuation,
                openSpaceFinalValue: lRes.finalTax
            };
        });

        // Calculate top-level open space tax
        let topOpenSpaceTax = 0;
        const matchingLandRate = masterTaxRates.find(r =>
            r.propertyType === 'खाली जागा' && (r.wastiName === 'All' || r.wastiName === wastiName)
        );
        if (matchingLandRate && Number(openSpace) > 0) {
            const res = calculateTax({
                areaSqMt: Number(openSpace) / 10.7639,
                rate: Number(matchingLandRate.landRate || 0),
                taxRate: Number(matchingLandRate.openSpaceTaxRate || 0),
                weightage: 1.0,
                valueMultiplier: 1.0
            });
            topOpenSpaceTax = res.finalTax;
        }

        const totalPropTax = updatedSections.reduce((sum, s) => sum + (Number(s.buildingFinalValue) || 0), 0);
        const totalOpenTax = updatedSections.reduce((sum, s) => sum + (Number(s.openSpaceFinalValue) || 0), 0) + topOpenSpaceTax;

        const finalData = {
            ...updatedFormData,
            sections: updatedSections,
            propertyTax: Math.round(totalPropTax),
            openSpaceTax: Math.round(totalOpenTax)
        };
        finalData.totalTaxAmount = calculateTotalTax(finalData);
        return finalData;
    };

    const handleSectionChange = (index: number, field: keyof PropertySection, value: any) => {
        const newSections = [...formData.sections];
        newSections[index] = { ...newSections[index], [field]: value };

        // Auto-Square Footage
        if (field === 'lengthFt' || field === 'widthFt') {
            const l = Number(newSections[index].lengthFt) || 0;
            const w = Number(newSections[index].widthFt) || 0;
            if (l > 0 && w > 0) {
                const sqFt = Number((l * w).toFixed(2));
                newSections[index].areaSqFt = sqFt;
                newSections[index].areaSqMt = Number((sqFt / 10.7639).toFixed(2));
            }
        }
        if (field === 'areaSqFt') {
            const val = Number(value) || 0;
            newSections[index].areaSqMt = Number((val / 10.7639).toFixed(2));
        }
        if (field === 'areaSqMt') {
            const val = Number(value) || 0;
            newSections[index].areaSqFt = Number((val * 10.7639).toFixed(2));
        }

        // Age logic
        if (field === 'constructionYear') {
            const yearStr = String(value || '');
            const currentYear = new Date().getFullYear();
            const year = parseInt(yearStr.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d).toString()));
            if (year > 1900 && year <= currentYear) newSections[index].propertyAge = currentYear - year;
        }

        setFormData(prev => recalculateAll({ ...prev, sections: newSections }));
    };

    const handleTotalAreaChange = (field: keyof PropertyRecord, value: number) => {
        let updates: Partial<PropertyRecord> = { [field]: value };

        if (field === 'propertyLength' || field === 'propertyWidth') {
            const l = field === 'propertyLength' ? value : (formData.propertyLength || 0);
            const w = field === 'propertyWidth' ? value : (formData.propertyWidth || 0);
            if (l > 0 && w > 0) {
                const sqFt = l * w;
                updates.totalAreaSqFt = Number(sqFt.toFixed(2));
                updates.totalAreaSqMt = Number((sqFt / 10.7639).toFixed(2));
            }
        } else if (field === 'totalAreaSqFt') {
            updates.totalAreaSqMt = Number((value / 10.7639).toFixed(2));
        } else if (field === 'totalAreaSqMt') {
            updates.totalAreaSqFt = Number((value * 10.7639).toFixed(2));
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleTaxChange = (field: keyof PropertyRecord, value: number) => {
        const updatedData = { ...formData, [field]: value };
        setFormData({ ...updatedData, totalTaxAmount: calculateTotalTax(updatedData) });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // 1. Name Validations (Strictly no numbers as per user request)
        const hasNumber = /\d/;
        if (hasNumber.test(formData.ownerName)) {
            newErrors.ownerName = "नावामध्ये अंक असू नयेत (Numbers not allowed in names)";
        }
        if (formData.occupantName && hasNumber.test(formData.occupantName)) {
            newErrors.occupantName = "नावामध्ये अंक असू नयेत (Numbers not allowed in names)";
        }

        // 2. Required Fields
        if (!formData.wastiName || formData.wastiName === 'निवडा') newErrors.wastiName = "वस्ती निवडणे आवश्यक आहे";
        if (!formData.wardNo) newErrors.wardNo = "वॉर्ड क्रमांक आवश्यक आहे";
        if (!formData.plotNo) newErrors.plotNo = "प्लॉट क्रमांक आवश्यक आहे";
        if (!formData.ownerName.trim()) newErrors.ownerName = "मालकाचे नाव आवश्यक आहे";

        // 3. Contact Number (10 digits)
        if (formData.contactNo && formData.contactNo.length !== 10) {
            newErrors.contactNo = "संपर्क क्रमांक १० अंकी असावा (Contact must be 10 digits)";
        }

        // 4. Overpayment Validation (User Request: Cannot pay more than total demand)
        const totalDemand = (Number(formData.arrearsAmount) || 0) + (Number(formData.totalTaxAmount) || 0);
        if ((Number(formData.paidAmount) || 0) > totalDemand) {
            newErrors.paidAmount = `भरलेली रक्कम एकूण मागणीपेक्षा (₹${totalDemand}) जास्त असू शकत नाही.`;
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Toast or scroll to the first error
            const firstErrorField = Object.keys(newErrors)[0];
            const element = document.getElementsByName(firstErrorField)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

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
                const refreshed = recalculateAll({ ...prev });
                return {
                    ...refreshed,
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
            <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-border">
                {/* Modal Header */}
                <div className="px-7 py-5 flex justify-between items-center shrink-0 shadow-lg relative z-10"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <Building2 className="w-6 h-6" />
                            {initialData ? 'नोंद सुधारा' : 'नवीन मालमत्ता नोंद'}
                        </h2>
                        <p className="text-white/70 text-xs mt-0.5 font-black uppercase tracking-widest">
                            {initialData ? `अ.क्र. ${MN(initialData.srNo)} • ${initialData.ownerName}` : 'नवीन नोंदणी'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">

                        <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white no-print text-[11px] font-black uppercase tracking-widest border border-white/20">
                            <X className="w-5 h-5" />
                            विंडो बंद करा
                        </button>
                    </div>
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
                        <div className="bg-surface-hover/50 rounded-2xl p-5 border border-border">
                            <h3 className="text-sm font-black text-text uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-black">१</div>
                                स्थान व ओळख (Location & ID)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div>
                                    <FieldLabel>{LABELS.wastiName}</FieldLabel>
                                    <FormSelect
                                        name="wastiName"
                                        value={formData.wastiName}
                                        onChange={e => {
                                            const newWasti = e.target.value;
                                            setFormData(prev => recalculateAll({ ...prev, wastiName: newWasti }));
                                            if (errors.wastiName) setErrors(prev => { const n = { ...prev }; delete n.wastiName; return n; });
                                        }}
                                        className={errors.wastiName ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                                    >
                                        <option value="">निवडा</option>
                                        {dynamicMasters.WASTI.map(item => (
                                            <option key={item.id} value={item.item_value_mr}>{item.item_value_mr}</option>
                                        ))}
                                    </FormSelect>
                                    {errors.wastiName && <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1">{errors.wastiName}</p>}
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.wardNo}</FieldLabel>
                                    <datalist id="wardNumbers" >
                                        {dynamicMasters.WARD.map(item => <option key={item.id} value={item.item_value_mr} />)}
                                    </datalist>
                                    <TransliterationInput
                                        name="wardNo"
                                        list="wardNumbers"
                                        placeholder={PLACEHOLDERS.wardNo}
                                        className={`${INPUT_CLASSES} ${errors.wardNo ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                                        value={formData.wardNo}
                                        onChangeText={val => {
                                            setFormData({ ...formData, wardNo: val });
                                            if (errors.wardNo) setErrors(prev => { const n = { ...prev }; delete n.wardNo; return n; });
                                        }}
                                        required
                                    />
                                    {errors.wardNo && <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1">{errors.wardNo}</p>}
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.khasraNo}</FieldLabel>
                                    <ComboTransliterationInput
                                        value={formData.khasraNo}
                                        onChangeText={val => setFormData({ ...formData, khasraNo: val })}
                                        placeholder={PLACEHOLDERS.khasraNo}
                                        options={existingKhasras.map(k => ({ value: k, label: k }))}
                                        className={INPUT_CLASSES}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.plotNo}</FieldLabel>
                                    <TransliterationInput
                                        name="plotNo"
                                        placeholder={PLACEHOLDERS.plotNo}
                                        className={`${INPUT_CLASSES} ${errors.plotNo ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                                        value={formData.plotNo}
                                        onChangeText={val => {
                                            setFormData({ ...formData, plotNo: val });
                                            if (errors.plotNo) setErrors(prev => { const n = { ...prev }; delete n.plotNo; return n; });
                                        }}
                                        required
                                    />
                                    {errors.plotNo && <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1">{errors.plotNo}</p>}
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.layoutName}</FieldLabel>
                                    <ComboTransliterationInput
                                        value={formData.layoutName}
                                        onChangeText={val => setFormData({ ...formData, layoutName: val })}
                                        placeholder={PLACEHOLDERS.layoutName}
                                        options={Array.from(new Set([
                                            ...existingLayouts,
                                            ...dynamicMasters.LAYOUT.map(l => l.item_value_mr)
                                        ])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'mr')).map(l => ({ value: l, label: l }))}
                                        className={INPUT_CLASSES}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Ownership Details */}
                        <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
                            <h3 className="text-sm font-black text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary text-xs font-black">२</div>
                                मालकाचा तपशील (Ownership)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <FieldLabel>{LABELS.ownerName}</FieldLabel>
                                    <TransliterationInput
                                        name="ownerName"
                                        placeholder={PLACEHOLDERS.ownerName}
                                        className={`${INPUT_CLASSES} ${errors.ownerName ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-primary/30'} font-black text-base`}
                                        value={formData.ownerName}
                                        onChangeText={val => {
                                            setFormData({ ...formData, ownerName: val });
                                            if (errors.ownerName) setErrors(prev => { const n = { ...prev }; delete n.ownerName; return n; });
                                        }}
                                        required
                                    />
                                    {errors.ownerName && <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1">{errors.ownerName}</p>}
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.contactNo || 'संपर्क क्र.'}</FieldLabel>
                                    <FormInput
                                        name="contactNo"
                                        type="text"
                                        placeholder="संपर्क क्रमांक"
                                        className={`${INPUT_CLASSES} ${errors.contactNo ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                                        value={MN(formData.contactNo || '')}
                                        onChange={e => {
                                            const val = h2e(e.target.value).replace(/\D/g, '');
                                            setFormData({ ...formData, contactNo: val });
                                            if (errors.contactNo) setErrors(prev => { const n = { ...prev }; delete n.contactNo; return n; });
                                        }}
                                        maxLength={10}
                                    />
                                    {errors.contactNo && <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1">{errors.contactNo}</p>}
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.occupantName}</FieldLabel>
                                    <TransliterationInput
                                        name="occupantName"
                                        placeholder={PLACEHOLDERS.occupantName}
                                        className={`${INPUT_CLASSES} ${errors.occupantName ? 'border-rose-500 ring-2 ring-rose-500/20' : ''}`}
                                        value={formData.occupantName}
                                        onChangeText={val => {
                                            setFormData({ ...formData, occupantName: val });
                                            if (errors.occupantName) setErrors(prev => { const n = { ...prev }; delete n.occupantName; return n; });
                                        }}
                                    />
                                    {errors.occupantName && <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1">{errors.occupantName}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                                <div>
                                    <FieldLabel>{LABELS.lengthFt} (एकूण)</FieldLabel>
                                    <FormInput type="number" placeholder={PLACEHOLDERS.length}
                                        value={formData.propertyLength || ''}
                                        onChange={e => handleTotalAreaChange('propertyLength', Number(e.target.value))} />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.widthFt} (एकूण)</FieldLabel>
                                    <FormInput type="number" placeholder={PLACEHOLDERS.width}
                                        value={formData.propertyWidth || ''}
                                        onChange={e => handleTotalAreaChange('propertyWidth', Number(e.target.value))} />
                                    {Number(formData.propertyLength) > 0 && Number(formData.propertyWidth) > 0 && (
                                        <p className="text-[10px] text-blue-600 font-bold mt-1 animate-pulse">
                                            = {Number(formData.propertyLength) * Number(formData.propertyWidth)} चौ.फु.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <FieldLabel>एकूण {LABELS.areaSqFt}</FieldLabel>
                                    <FormInput type="number" placeholder={PLACEHOLDERS.area}
                                        value={formData.totalAreaSqFt || ''}
                                        onChange={e => handleTotalAreaChange('totalAreaSqFt', Number(e.target.value))} />
                                </div>
                                <div>
                                    <FieldLabel>एकूण {LABELS.areaSqMt}</FieldLabel>
                                    <FormInput type="number" placeholder={PLACEHOLDERS.area}
                                        value={formData.totalAreaSqMt || ''}
                                        onChange={e => handleTotalAreaChange('totalAreaSqMt', Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Construction & Dimensions */}
                        {/* <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 text-xs font-black">३</div>
                                अतिरिक्त मोजमाप (Additional Land)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <FieldLabel>{LABELS.openSpace} (क्षेत्रफळ)</FieldLabel>
                                    <FormInput type="number" placeholder="चौ.फु."
                                        value={formData.openSpace || ''}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setFormData(prev => recalculateAll({ ...prev, openSpace: val }));
                                        }} />
                                    {Number(formData.openSpace) > 0 && (
                                        <p className="text-[10px] text-indigo-600 font-bold mt-1">
                                            मुल्यांकन: ₹{MN(Math.round(Number(formData.openSpaceTax || 0) * 1000 / 1.5).toLocaleString())}
                                        </p>
                                    )}
                                </div>
                                {Number(formData.openSpace) > 0 && (
                                    <div className="col-span-1">
                                        <FieldLabel>जागा कर (Tax)</FieldLabel>
                                        <div className={`${INPUT_CLASSES} bg-white flex items-center`}>
                                            <span className="font-black text-indigo-600">₹{MN(formData.openSpaceTax || 0)}</span>
                                        </div>
                                    </div>
                                )}
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
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg text-white ${col.header}`}>{name}</span>
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
                                                            <FormSelect
                                                                value={formData.sections[idx].propertyType}
                                                                onChange={e => handleSectionChange(idx, 'propertyType', e.target.value)}
                                                            >
                                                                <option value="">निवडा</option>
                                                                {dynamicMasters.PROPERTY_TYPE.map(item => (
                                                                    <option key={item.id} value={item.item_value_mr}>{item.item_value_mr}</option>
                                                                ))}
                                                            </FormSelect>
                                                        </div>
                                                        {section.propertyType === 'आर.सी.सी' && (
                                                            <div className="col-span-2">
                                                                <FieldLabel>इमारतीचा वापर</FieldLabel>
                                                                <FormSelect
                                                                    value={formData.buildingUsage || ''}
                                                                    onChange={e => setFormData(prev => recalculateAll({ ...prev, buildingUsage: e.target.value }))}
                                                                >
                                                                    <option value="">निवडा (Select)</option>
                                                                    {buildingUsageRates.map(opt => (
                                                                        <option key={opt.id} value={opt.usage_type_mr}>{opt.usage_type_mr}</option>
                                                                    ))}
                                                                </FormSelect>
                                                            </div>
                                                        )}
                                                        {isActive && (
                                                            <>
                                                                {section.propertyType === 'आर.सी.सी' && (
                                                                    <>
                                                                        <div>
                                                                            <FieldLabel>{LABELS.constructionYear}</FieldLabel>
                                                                            <FormInput type="text" placeholder="२०१०-११"
                                                                                value={section.constructionYear || ''}
                                                                                onChange={e => handleSectionChange(idx, 'constructionYear', e.target.value)} />
                                                                        </div>
                                                                        <div>
                                                                            <FieldLabel>{LABELS.propertyAge}</FieldLabel>
                                                                            <FormInput type="text" placeholder="वय"
                                                                                value={MN(section.propertyAge || '')}
                                                                                onChange={e => handleSectionChange(idx, 'propertyAge', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                                                        </div>
                                                                    </>
                                                                )}
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
                                                            <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full">
                                                                {[
                                                                    { lbl: LABELS.landRate, field: 'landRate', ph: PLACEHOLDERS.rate, category: 'OPEN_SPACE' },
                                                                    { lbl: LABELS.buildingRate, field: 'buildingRate', ph: PLACEHOLDERS.rate, category: 'CONSTRUCTION' },
                                                                    { lbl: LABELS.depreciationRate, field: 'depreciationRate', ph: PLACEHOLDERS.depreciation, category: 'CONSTRUCTION' },
                                                                    { lbl: LABELS.weightage, field: 'weightage', ph: PLACEHOLDERS.weightage, category: 'CONSTRUCTION' },
                                                                    { lbl: LABELS.buildingValue, field: 'buildingValue', ph: PLACEHOLDERS.value, category: 'CONSTRUCTION' },
                                                                    { lbl: LABELS.openSpaceValue, field: 'openSpaceValue', ph: PLACEHOLDERS.value, category: 'OPEN_SPACE' },
                                                                    { lbl: LABELS.buildingTaxRate, field: 'buildingTaxRate', ph: PLACEHOLDERS.taxRate, category: 'CONSTRUCTION' },
                                                                    { lbl: LABELS.openSpaceTaxRate, field: 'openSpaceTaxRate', ph: PLACEHOLDERS.taxRate, category: 'OPEN_SPACE' },
                                                                ].filter(f => {
                                                                    const isOS = section.propertyType === 'खाली जागा';
                                                                    return isOS ? f.category === 'OPEN_SPACE' : f.category === 'CONSTRUCTION';
                                                                }).map(({ lbl, field, ph }) => (
                                                                    <div key={field} className="flex-1 min-w-[100px]">
                                                                        <FieldLabel>{lbl}</FieldLabel>
                                                                        <FormInput type="text" placeholder={ph}
                                                                            value={MN(['depreciationRate', 'weightage', 'buildingTaxRate', 'openSpaceTaxRate'].includes(field)
                                                                                ? Number((formData.sections[idx] as any)[field] || 0).toFixed(2)
                                                                                : (formData.sections[idx] as any)[field] || '')}
                                                                            onChange={e => handleSectionChange(idx, field as keyof PropertySection, Number(h2e(e.target.value).replace(/[^\d.]/g, '')))} />
                                                                    </div>
                                                                ))}
                                                                {section.propertyType !== 'आर.सी.सी' && section.propertyType !== 'खाली जागा' && (
                                                                    <div className="flex-grow text-[10px] text-text-muted italic bg-surface p-2 rounded-lg border border-border">
                                                                        * या मालमत्ता प्रकारासाठी घसारा लागू नाही. (Depreciation not applicable)
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(section.buildingValue > 0 || section.openSpaceValue > 0) && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    <div className={`flex items-center gap-2 text-xs font-bold ${col.text} bg-white/70 rounded-xl px-4 py-2.5 border border-white`}>
                                                                        <Calculator className="w-4 h-4" />
                                                                        मूल्यांकन: ₹{Number(section.propertyType === 'खाली जागा' ? section.openSpaceValue : section.buildingValue).toLocaleString()}
                                                                    </div>
                                                                    <div className={`flex items-center gap-2 text-xs font-black text-white bg-primary rounded-xl px-4 py-2.5 shadow-sm`}>
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                        कर: ₹{Number(section.propertyType === 'खाली जागा' ? section.openSpaceFinalValue : section.buildingFinalValue).toLocaleString()}
                                                                    </div>
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

                        {/* Section 4: Individual Taxes */}
                        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-5 h-5 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-black">४</div>
                                    कराचा तपशील (Tax Details)
                                </h3>
                                <button
                                    type="button"
                                    onClick={applyDefaultRates}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-[11px] font-black uppercase tracking-widest border border-indigo-100"
                                >
                                    <Plus className="w-3.5 h-3.5" /> मास्टर दर लागू करा (Apply Defaults)
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                <div>
                                    <FieldLabel>मालमत्ता कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.propertyTax || 0)}
                                        onChange={e => handleTaxChange('propertyTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                                <div>
                                    <FieldLabel>जागा कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.openSpaceTax || 0)}
                                        onChange={e => handleTaxChange('openSpaceTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                                <div>
                                    <FieldLabel>दिवाबत्ती कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.streetLightTax || 0)}
                                        onChange={e => handleTaxChange('streetLightTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                                <div>
                                    <FieldLabel>आरोग्य कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.healthTax || 0)}
                                        onChange={e => handleTaxChange('healthTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                                <div>
                                    <FieldLabel>सामान्य पाणी कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.generalWaterTax || 0)}
                                        onChange={e => handleTaxChange('generalWaterTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                                <div>
                                    <FieldLabel>विशेष पाणी कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.specialWaterTax || 0)}
                                        onChange={e => handleTaxChange('specialWaterTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                                <div>
                                    <FieldLabel>कचरागाडी कर</FieldLabel>
                                    <FormInput type="text" value={MN(formData.wasteCollectionTax || 0)}
                                        onChange={e => handleTaxChange('wasteCollectionTax', Number(h2e(e.target.value).replace(/\D/g, '')))} />
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Property Remarks & Notes */}
                        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                            <h3 className="text-sm font-black text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-black">५</div>
                                मासिक सभा व टिप्पणी (Remarks/Notes)
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <FieldLabel>दिनांक</FieldLabel>
                                    <FormInput type="date" value={remarksObj.date} onChange={e => updateRemark('date', e.target.value)} />
                                </div>
                                <div>
                                    <FieldLabel>विषय</FieldLabel>
                                    <TransliterationInput
                                        placeholder="विषय"
                                        className={INPUT_CLASSES}
                                        value={remarksObj.subject}
                                        onChangeText={v => updateRemark('subject', v)}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>फेरफार</FieldLabel>
                                    <TransliterationInput
                                        placeholder="फेरफार"
                                        className={INPUT_CLASSES}
                                        value={remarksObj.ferfar}
                                        onChangeText={v => updateRemark('ferfar', v)}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>पान </FieldLabel>
                                    <TransliterationInput
                                        placeholder="पान"
                                        className={INPUT_CLASSES}
                                        value={remarksObj.pan}
                                        onChangeText={v => updateRemark('pan', v)}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>अनु.</FieldLabel>
                                    <TransliterationInput
                                        placeholder="अनु."
                                        className={INPUT_CLASSES}
                                        value={remarksObj.anu}
                                        onChangeText={v => updateRemark('anu', v)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Financial Tracking */}
                        <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100/50">
                            <h3 className="text-[11px] font-black text-rose-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Calculator className="w-3.5 h-3.5" /> आर्थिक माहिती (Financials)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div>
                                    <FieldLabel className="text-rose-600">मागील थकबाकी</FieldLabel>
                                    <FormInput
                                        type="text"
                                        className={`${INPUT_CLASSES} !text-lg !font-black !text-rose-600`}
                                        placeholder="०"
                                        value={MN(formData.arrearsAmount || 0)}
                                        onChange={e => setFormData({ ...formData, arrearsAmount: Number(h2e(e.target.value).replace(/\D/g, '')) })}
                                    />
                                    <p className="text-[9px] text-rose-400 font-bold mt-1">मागील वर्षाची थकबाकी</p>
                                </div>

                                <div>
                                    <FieldLabel className="text-slate-500">चालू मागणी</FieldLabel>
                                    <div className={`${INPUT_CLASSES} bg-slate-50 flex items-center !h-[42px]`}>
                                        <span className="text-lg font-black text-slate-700">₹{MN(formData.totalTaxAmount || 0)}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">या वर्षाची कर मागणी</p>
                                </div>

                                <div>
                                    <FieldLabel className="text-primary-dark">एकूण मागणी</FieldLabel>
                                    <div className={`${INPUT_CLASSES} bg-primary/5 flex items-center !h-[42px]`}>
                                        <span className="text-lg font-black text-primary-dark">₹{MN((Number(formData.arrearsAmount) + Number(formData.totalTaxAmount)) || 0)}</span>
                                    </div>
                                    <p className="text-[9px] text-primary/40 font-bold mt-1">मागील + चालू</p>
                                </div>

                                <div>
                                    <FieldLabel className="text-success-dark">भरलेली रक्कम</FieldLabel>
                                    <FormInput
                                        type="text"
                                        className={`${INPUT_CLASSES} !text-lg !font-black !text-success-dark ${((Number(formData.paidAmount) || 0) > ((Number(formData.arrearsAmount) || 0) + (Number(formData.totalTaxAmount) || 0))) ? 'border-rose-500 ring-rose-500' : ''}`}
                                        placeholder="०"
                                        value={MN(formData.paidAmount || 0)}
                                        onChange={e => setFormData({ ...formData, paidAmount: Number(h2e(e.target.value).replace(/\D/g, '')) })}
                                    />
                                    {((Number(formData.paidAmount) || 0) > ((Number(formData.arrearsAmount) || 0) + (Number(formData.totalTaxAmount) || 0))) ? (
                                        <p className="text-[9px] text-rose-600 font-bold mt-1 animate-pulse">एकूण मागणी रक्कमे पेक्षा जास्त भरू शकत नाही </p>
                                    ) : (
                                        <p className="text-[9px] text-success/50 font-bold mt-1">आता जमा केलेली रक्कम</p>
                                    )}
                                </div>

                                <div>
                                    <FieldLabel className="text-slate-500">एकूण बाकी</FieldLabel>
                                    <div className={`${INPUT_CLASSES} flex items-center !h-[42px] ${((Number(formData.arrearsAmount) + Number(formData.totalTaxAmount)) - Number(formData.paidAmount)) > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                        <span className={`text-lg font-black ${((Number(formData.arrearsAmount) + Number(formData.totalTaxAmount)) - Number(formData.paidAmount)) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            ₹{MN(Math.max(0, (Number(formData.arrearsAmount) + Number(formData.totalTaxAmount)) - Number(formData.paidAmount)) || 0)}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">शिल्लक राहणारी रक्कम</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 7 removed */}

                        {/* Section 8: Receipt Information */}
                        <div className="rounded-2xl p-5 border border-emerald-100 bg-emerald-50/30">
                            <h3 className="text-sm font-black text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 text-xs font-black">६</div>
                                पावती माहिती (Receipt Info)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <FieldLabel>{LABELS.receiptBook}</FieldLabel>
                                    <TransliterationInput
                                        placeholder="उदा. ५"
                                        className={INPUT_CLASSES}
                                        value={formData.receiptBook || ''}
                                        onChangeText={val => setFormData({ ...formData, receiptBook: val })}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.receiptNo}</FieldLabel>
                                    <TransliterationInput
                                        placeholder="उदा. ७८"
                                        className={INPUT_CLASSES}
                                        value={formData.receiptNo || ''}
                                        onChangeText={val => setFormData({ ...formData, receiptNo: val })}
                                    />
                                </div>
                                <div>
                                    <FieldLabel>{LABELS.paymentDate}</FieldLabel>
                                    <FormInput
                                        type="date"
                                        className={INPUT_CLASSES}
                                        value={formData.paymentDate || new Date().toISOString().split('T')[0]}
                                        onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-border bg-surface flex justify-between items-center shrink-0">
                        <div className="text-xs text-text-muted font-black uppercase tracking-widest">
                            {formData.wastiName && <span className="bg-primary/5 text-primary px-2 py-1 rounded-lg">{formData.wastiName}</span>}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onCancel}
                                className="px-5 py-2.5 text-text-muted hover:bg-surface-hover rounded-xl font-black transition-all text-sm uppercase tracking-widest flex items-center gap-2">
                                <X className="w-4 h-4" />
                                विंडो बंद करा
                            </button>
                            <button type="submit" disabled={saving}
                                className="px-8 py-2.5 bg-primary text-white rounded-xl font-black hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-sm flex items-center gap-2 disabled:opacity-70 uppercase tracking-widest">
                                {saving ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> जतन होत आहे...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> जतन करा (Save)</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PropertyForm;
