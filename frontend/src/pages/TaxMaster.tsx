/**
 * @file TaxMaster.tsx
 * @description प्रणाली प्रशासन मास्टर आणि कर नियंत्रण पॅनेल.
 * प्रशासकांना कर रचना, घसारा दर, रेडी रेकनर दर, वस्ती/वॉर्ड व्यवस्थापन,
 * सामान्य कर Defaults आणि एकत्रित कर बदल (Bulk Tax Update) यांसारख्या
 * विविध प्रणाली-व्यापी घटकांवर नियंत्रण प्रदान करते.
 *
 * समाविष्ट वैशिष्ट्ये:
 * १. वस्तीनुसार (Wasti) इमारत व जमीन कर दरांची रचना.
 * २. इमारतीच्या वयानुसार घसारा दर (Depreciation) निश्चिती.
 * ३. इमारतीच्या वापराच्या प्रकारानुसार (उदा. निवासी, व्यावसायिक) गुणक भार (Weightage).
 * ४. शासकीय रेडी रेकनर (Ready Reckoner) दर पत्रक.
 * ५. वस्ती/वॉर्ड आणि इतर प्रकारांचे डायनॅमिक व्यवस्थापन.
 * ६. नवीन मालमत्तांसाठीचे सामान्य Default कर दर.
 * ७. लेआउट आणि मालमत्ता प्रकारानुसार एकत्रित कर बदल (Bulk Tax Update) सुविधा.
 * ८. आर्थिक वर्ष बदला (Fiscal Year Migration Wizard) प्रक्रियेचे नियंत्रण.
 */

import { API_BASE_URL } from "@/utils/config";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Settings,
    FileText,
    TrendingDown,
    Briefcase,
    Users,
    Save,
    X,
    Plus,
    Trash2,
    Edit2,
    Activity,
    Shield,
    CheckCircle2,
    AlertTriangle,
    ArrowLeft,
    RotateCcw,
    Search,
    Filter,
    FileSpreadsheet,
    TrendingUp,
    IndianRupee,
    Landmark,
    FileUp,
} from "lucide-react";
import { useUI } from "../components/UIProvider";
import FYMigrationWizard from "../components/FYMigrationWizard";
import { CustomDropdown } from "../components/CustomDropdown";
import ExcelActions from "../components/ExcelActions";

import { PropertyRecord } from "../types";

// --- इंटरफेसेस (डेटा मॉडेल्स) ---

/**
 * @interface TaxRate
 * @description वस्तीमधील विशिष्ट मालमत्ता प्रकारासाठी लागू असणारे इमारत व जमीन कर दर.
 * @property {number} id - डेटाबेस मधील अद्वितीय आयडी.
 * @property {string} propertyType - मालमत्तेचा प्रकार (उदा. आर.सी.सी, पत्री, स्लॅब).
 * @property {string} wastiName - वस्तीचे नाव.
 * @property {number} buildingRate - इमारतीसाठी लागू असणारा दर (प्रति चौ. फूट/मी).
 * @property {number} buildingTaxRate - इमारतीसाठीचा कर दर (पैशांमध्ये).
 * @property {number} landRate - जमिनीसाठी लागू असणारा दर.
 * @property {number} openSpaceTaxRate - मोकळ्या जागेचा/जमिनीचा कर दर (पैशांमध्ये).
 */
interface TaxRate {
    id: number;
    propertyType: string;
    wastiName: string;
    buildingRate: number;
    buildingTaxRate: number;
    landRate: number;
    openSpaceTaxRate: number;
}

/**
 * @interface ReadyReckonerRate
 * @description मालमत्ता मूल्यांकनासाठी शासकीय मंजुरीनुसार असणारे रेडी रेकनर दर पत्रक.
 * @property {number} id - रेकॉर्डचा अद्वितीय आयडी.
 * @property {string} year_range - आर्थिक वर्षाचा कालावधी (उदा. २०२५-२६).
 * @property {string} item_name_mr - रेडी रेकनर घटकाचे नाव (मराठीत).
 * @property {number} valuation_rate - प्रति चौ. मी. मूल्यांकन दर (₹).
 * @property {number} tax_rate - कर आकारणीचा दर (टक्केवारी).
 * @property {string} unit_mr - मोजमापाचे एकक (उदा. चौ. मी.).
 */
interface ReadyReckonerRate {
    id: number;
    year_range: string;
    item_name_mr: string;
    valuation_rate: number;
    tax_rate: number;
    unit_mr: string;
}

/**
 * @interface DepreciationRate
 * @description इमारतीच्या वयानुसार घसारा टक्केवारी निश्चित करणारे पत्रक.
 * @property {number} id - रेकॉर्डचा अद्वितीय आयडी.
 * @property {number} min_age - इमारतीचे किमान वय (वर्षे).
 * @property {number} max_age - इमारतीचे कमाल वय (वर्षे).
 * @property {number} percentage - इमारतीचे उर्वरित मूल्य टक्केवारी.
 */
interface DepreciationRate {
    id: number;
    min_age: number;
    max_age: number;
    percentage: number;
}

/**
 * @interface BuildingUsage
 * @description इमारतीच्या वापर प्रकारानुसार (उदा. निवासी, व्यावसायिक, औद्योगिक) कर आकारणीचे गुणक (Weightage).
 * @property {number} id - रेकॉर्डचा अद्वितीय आयडी.
 * @property {string} usage_type_mr - वापराचा प्रकार (मराठीत).
 * @property {string} usage_type_en - वापराचा प्रकार (इंग्रजीत).
 * @property {number} weightage - लागू असणारा गुणक (उदा. १.०, १.५).
 */
interface BuildingUsage {
    id: number;
    usage_type_mr: string;
    usage_type_en: string;
    weightage: number;
}

/**
 * @interface MasterCategory
 * @description प्रणालीमधील श्रेणींची मुख्य सूची.
 * @property {number} id - श्रेणीचा अद्वितीय आयडी.
 * @property {string} name_mr - श्रेणीचे नाव (मराठीत).
 * @property {string} code - श्रेणीचा युनिक कोड (उदा. WASTI, PROPERTY_TYPE).
 */
interface MasterCategory {
    id: number;
    name_mr: string;
    code: string;
}

/**
 * @interface MasterItem
 * @description मुख्य श्रेणीच्या अंतर्गत असणारे उप-घटक/निवड पर्याय सूची.
 * @property {number} id - घटकाचा अद्वितीय आयडी.
 * @property {number} category_id - संबंधित मुख्य श्रेणीचा आयडी.
 * @property {string} item_value_mr - घटकाचे नाव/मूल्य (मराठीत).
 * @property {string} [item_value_en] - घटकाचे नाव/मूल्य (इंग्रजीत).
 * @property {string} [item_code] - उप-कोड किंवा वॉर्ड क्रमांक.
 * @property {number} sort_order - सूचीमधील क्रमवारी क्रमांक.
 * @property {boolean} [is_active] - घटक सक्रिय आहे की नाही.
 */
interface MasterItem {
    id: number;
    category_id: number;
    item_value_mr: string;
    item_value_en?: string;
    item_code?: string;
    sort_order: number;
    is_active?: boolean;
}

/**
 * @interface User
 * @description प्रणाली वापरकर्ते आणि कर्मचाऱ्यांची माहिती.
 */
interface User {
    id: number;
    name: string;
    username: string;
    role: string;
    email: string;
    mobile: string;
    status: string;
    is_active: boolean;
    employee_id: string;
}

/**
 * @interface SystemConfig
 * @description प्रणाली-व्यापी सेटिंग्ज आणि कॉन्फिगरेशन्सची सूची.
 */
interface SystemConfig {
    [key: string]: string;
}

// --- मराठी अंकांमध्ये रूपांतरित करणारा मदतनीस ---

/**
 * @function MN
 * @description इंग्रजी संख्या/अंक मराठी देवनागरी अंकांमध्ये रूपांतरित करतो.
 * @param {number | string | undefined} v - इंग्रजी संख्या किंवा मजकूर.
 * @returns {string} देवनागरी मराठी अंकात परिवर्तित मजकूर.
 */
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[+d]);

// --- ॲनिमेटेड काउंटर हुक ---

/**
 * @function useCountUp
 * @description संख्येला शून्यापासून लक्ष्यित मर्यादेपर्यंत गुळगुळीत ॲनिमेशनद्वारे वाढवणारा हुक.
 * @param {number} end - लक्ष्यित अंतिम संख्या.
 * @param {number} [duration=1000] - ॲनिमेशनचा कालावधी (मिलिसेकंदात).
 * @returns {number} सध्याचा ॲनिमेटेड आकडा.
 */
const useCountUp = (end: number, duration: number = 1000) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (end === 0) {
            setValue(0);
            return;
        }
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

/**
 * @component StatCard
 * @description आकडेवारीचे कार्ड्स सुंदर पद्धतीने दर्शवणारा घटक.
 */
const StatCard = ({ title, value, icon, gradient, textColor }: any) => (
    <div className="bg-white rounded-xl px-4 py-3 border border-slate-200 hover:border-indigo-300 transition-all duration-300 group flex items-center gap-4 shadow-sm hover:shadow-md">
        <div
            className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
            {React.cloneElement(icon, { className: "w-5 h-5" })}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">
                {title}
            </p>
            <p
                className={`text-base font-black ${textColor} leading-none tracking-tight`}
            >
                {MN(value)}
            </p>
        </div>
    </div>
);

/**
 * @component TaxMaster
 * @description मुख्य प्रणाली संचलन आणि व्यवस्थापन घटक.
 */
export default function TaxMaster({
    onAuthError,
    onNavigate,
}: {
    onAuthError?: () => void;
    onNavigate?: (view: string) => void;
}) {
    // --- युझर इंटरफेस टोस्ट मेसेज मदतनीस ---
    const { addToast } = useUI();

    // --- कोर मास्टर डेटा स्टेट्स ---
    const [rates, setRates] = useState<TaxRate[]>([]); // मालमत्ता कर दर
    const [depRates, setDepRates] = useState<DepreciationRate[]>([]); // घसारा दर
    const [buRates, setBuRates] = useState<BuildingUsage[]>([]); // इमारत वापर प्रकार
    const [users, setUsers] = useState<User[]>([]); // वापरकर्ते सूची
    const [categories, setCategories] = useState<MasterCategory[]>([]); // मास्टर श्रेणी
    const [subItems, setSubItems] = useState<MasterItem[]>([]); // मास्टर उप-आयटम्स
    const [rrRates, setRrRates] = useState<ReadyReckonerRate[]>([]); // रेडी रेकनर दर
    const [config, setConfig] = useState<SystemConfig>({}); // सिस्टीम कॉन्फिगरेशन

    // --- युझर इंटरफेस आणि लोड स्टेट्स ---
    const [activeTab, setActiveTab] = useState<string>("tax"); // सध्या सक्रिय टॅब
    const [loading, setLoading] = useState(true); // डेटा लोड होत आहे की नाही

    // --- इनलाइन संपादनासाठी फॉर्म स्टेट्स ---
    const [editingId, setEditingId] = useState<number | string | null>(null); // सध्या संपादन होत असलेल्या रेकॉर्डचा आयडी
    const [editForm, setEditForm] = useState<any>({}); // संपादनाचा फॉर्म डेटा
    const [showAddForm, setShowAddForm] = useState(false); // नवीन नोंद फॉर्म दाखवणे
    const [newForm, setNewForm] = useState<any>({}); // नवीन नोंद फॉर्म डेटा

    // --- आर्थिक वर्ष बदलण्याच्या मॉडेलची स्टेट ---
    const [showFYModal, setShowFYModal] = useState(false);

    // --- आळशी लोडिंगसाठी मालमत्तांची स्टेट (Bulk Tax Update साठी) ---
    const [properties, setProperties] = useState<PropertyRecord[]>([]);
    const [loadingProperties, setLoadingProperties] = useState(false);

    // --- एकत्रित कर बदल (Bulk Update) स्टेट ---
    const [bulkForm, setBulkForm] = useState({
        propertyType: "सर्व",
        layoutName: "सर्व",
        khasraNo: "सर्व",
        selectedKhasras: [] as string[],
        enabledFields: [] as string[],
        taxes: {
            streetLightTax: "" as any,
            healthTax: "" as any,
            wasteCollectionTax: "" as any,
            generalWaterTax: "" as any,
            specialWaterTax: "" as any,
        },
    });

    const [layouts, setLayouts] = useState<MasterItem[]>([]);
    const [propertyTypes, setPropertyTypes] = useState<MasterItem[]>([]);
    const [allKhasras, setAllKhasras] = useState<string[]>([]);

    /**
     * @function authHeaders
     * @description एपीआय विनंत्यांसाठी प्रमाणीकरण (Authorization) हेडर तयार करतो.
     */
    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("gp_token")}`,
    });

    /**
     * @function fetchData
     * @description सर्व मास्टर डेटा आणि कॉन्फिगरेशन्स सर्व्हरवरून समांतरपणे लोड करतो.
     */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                taxRes,
                catRes,
                depRes,
                buRes,
                rrRes,
                userRes,
                configRes,
                layRes,
                typeRes,
                khasraRes,
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/api/tax-rates`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/categories`, {
                    headers: authHeaders(),
                }),
                fetch(`${API_BASE_URL}/api/master/depreciation`, {
                    headers: authHeaders(),
                }),
                fetch(`${API_BASE_URL}/api/master/building-usage`, {
                    headers: authHeaders(),
                }),
                fetch(`${API_BASE_URL}/api/master/ready-reckoner`, {
                    headers: authHeaders(),
                }),
                fetch(`${API_BASE_URL}/api/auth/users`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/master/config`, { headers: authHeaders() }),
                fetch(`${API_BASE_URL}/api/properties/unique-layouts`, {
                    headers: authHeaders(),
                }),
                fetch(`${API_BASE_URL}/api/master/items/PROPERTY_TYPE`, {
                    headers: authHeaders(),
                }),
                fetch(`${API_BASE_URL}/api/properties/khasras`, {
                    headers: authHeaders(),
                }),
            ]);

            // टोकन अवैध असल्यास लॉगिनवर पाठवणे
            if (
                taxRes.status === 401 ||
                catRes.status === 401 ||
                depRes.status === 401 ||
                buRes.status === 401 ||
                rrRes.status === 401 ||
                userRes.status === 401 ||
                configRes.status === 401
            ) {
                onAuthError?.();
                return;
            }

            // प्रतिसाद यशस्वी असल्यास स्टेट अपडेट करणे
            if (taxRes.ok) setRates(await taxRes.json());
            if (catRes.ok) setCategories(await catRes.json());
            if (depRes.ok) setDepRates(await depRes.json());
            if (buRes.ok) setBuRates(await buRes.json());
            if (rrRes.ok) setRrRates(await rrRes.json());
            if (userRes.ok) setUsers(await userRes.json());
            if (configRes.ok) setConfig(await configRes.json());
            if (layRes.ok) setLayouts(await layRes.json());
            if (typeRes.ok) setPropertyTypes(await typeRes.json());
            if (khasraRes.ok) setAllKhasras(await khasraRes.json());
        } catch (err) {
            console.error(err);
            addToast("डेटा लोड करण्यात त्रुटी आली.", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // प्रारंभात डेटा लोड करणे
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * @function fetchProperties
     * @description एकत्रित कर बदल (Bulk Update) करण्यासाठी मालमत्तांची सूची लोड करतो (Lazy Load).
     */
    const fetchProperties = useCallback(async () => {
        setLoadingProperties(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/properties`, {
                headers: authHeaders(),
            });
            if (res.status === 401) {
                onAuthError?.();
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setProperties(data);
            }
        } catch (err) {
            console.error(err);
            addToast("मालमत्तांची माहिती लोड करण्यात त्रुटी आली.", "error");
        } finally {
            setLoadingProperties(false);
        }
    }, [addToast, onAuthError]);

    // टॅब 'bulk-tax' किंवा 'import' सक्रिय झाल्यावरच मालमत्ता लोड करणे (आळशी लोड)
    useEffect(() => {
        if ((activeTab === "bulk-tax" || activeTab === "import") && properties.length === 0) {
            fetchProperties();
        }
    }, [activeTab, properties.length, fetchProperties]);

    // --- मेमोइझ्ड फिल्टर्स (useMemo द्वारे मोजलेले) ---

    /**
     * @constant filteredCategories
     * @description विशिष्ट श्रेणी वगळून इतर मास्टर श्रेणी फिल्टर करतो.
     */
    const filteredCategories = useMemo(() => {
        const specializedCodes = ["BUILDING_USAGE", "WARD"];
        return categories.filter((c) => !specializedCodes.includes(c.code));
    }, [categories]);

    /**
     * @constant selectedCategory
     * @description सध्या टॅबनुसार निवडलेली मास्टर श्रेणी मिळवतो.
     */
    const selectedCategory = useMemo(() => {
        return filteredCategories.find((c) => c.code === activeTab);
    }, [filteredCategories, activeTab]);

    /**
     * @constant layoutOptions
     * @description एकत्रित कर बदलासाठी लेआउट पर्यायांची यादी (मराठी अंकांसह).
     */
    const layoutOptions = useMemo(() => {
        const opts = [{ value: "सर्व", label: "सर्व लेआउट (ALL)" }];
        layouts.forEach((l) => {
            if (l.item_value_mr) {
                opts.push({
                    value: l.item_value_mr,
                    label: `${l.item_value_mr} (${MN((l as any).propertyCount || 0)})`
                });
            }
        });
        return opts;
    }, [layouts]);

    /**
     * @constant propertyTypeOptions
     * @description एकत्रित कर बदलासाठी मालमत्ता प्रकार पर्यायांची यादी.
     */
    const propertyTypeOptions = useMemo(() => {
        const opts = [{ value: "सर्व", label: "सर्व मालमत्ता प्रकार (All)" }];
        propertyTypes.forEach((t) => {
            if (t.item_value_mr) {
                opts.push({
                    value: t.item_value_mr,
                    label: t.item_value_mr
                });
            }
        });
        return opts;
    }, [propertyTypes]);

    /**
     * @constant khasraOptions
     * @description एकत्रित कर बदलासाठी खसरा क्रमांकांची यादी (मराठी अंकांसह).
     */
    const khasraOptions = useMemo(() => {
        const opts = [{ value: "सर्व", label: "सर्व खसरा (ALL)" }];
        allKhasras.forEach((k) => {
            if (k) {
                opts.push({
                    value: k,
                    label: `खसरा क्र. ${MN(k)}`
                });
            }
        });
        return opts;
    }, [allKhasras]);

    /**
     * @function fetchSubItems
     * @description मास्टर श्रेणी अंतर्गत असणारे सर्व पर्याय/घटक लोड करतो.
     */
    const fetchSubItems = useCallback(async (catCode: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/items/${catCode}`, {
                headers: authHeaders(),
            });
            if (res.status === 401) {
                onAuthError?.();
                return;
            }
            if (res.ok) setSubItems(await res.json());
        } catch (err) {
            console.error(err);
        }
    }, []);

    // टॅब बदलल्यास संबंधित उप-घटक लोड करणे
    useEffect(() => {
        if (selectedCategory) {
            fetchSubItems(selectedCategory.code);
        }
    }, [selectedCategory, fetchSubItems]);

    // --- डेटा जतन आणि हटवण्याची प्रक्रिया (CRUD क्रिया) ---

    /**
     * @function handleSave
     * @description नवीन नोंद जोडणे किंवा जुन्या नोंदीमध्ये बदल (Save / Update) करण्याचे एपीआय चालवतो.
     * @param {string} type - मास्टरचा प्रकार.
     * @param {number|string|null} id - रेकॉर्ड आयडी (नवीन नोंद असल्यास null).
     * @param {any} data - पाठवायचा फॉर्म डेटा.
     */
    const handleSave = async (
        type: string,
        id: number | string | null,
        data: any,
    ) => {
        let url = `${API_BASE_URL}/api/${type === "tax" ? "tax-rates" : type === "dep" ? "master/depreciation" : type === "bu" ? "master/building-usage" : type === "rr" ? "master/ready-reckoner" : type === "config" ? "master/config" : "master/items"}`;
        if (id && type !== "config") url += `/${id}`;

        try {
            const res = await fetch(url, {
                method: id && type !== "config" ? "PUT" : "POST",
                headers: authHeaders(),
                body: JSON.stringify(data),
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
                addToast("नोंद यशस्वीरित्या जतन केली!", "success");
            } else {
                const err = await res.json();
                addToast(err.error || "त्रुटी आढळली", "error");
            }
        } catch (err) {
            console.error(err);
            addToast("सर्व्हरशी संपर्क होऊ शकला नाही.", "error");
        }
    };

    /**
     * @function handleDelete
     * @description डेटाबेस मधील विशिष्ट नोंद हटवण्यासाठी डिलीट एपीआय कॉल करतो.
     * @param {string} type - प्रकार.
     * @param {number} id - रेकॉर्ड आयडी.
     */
    const handleDelete = async (type: string, id: number) => {
        if (!window.confirm("हे रेकॉर्ड हटवायचे आहे का?")) return;
        let url = `${API_BASE_URL}/api/${type === "tax" ? "tax-rates" : type === "dep" ? "master/depreciation" : type === "bu" ? "master/building-usage" : type === "rr" ? "master/ready-reckoner" : "master/items"}/${id}`;
        try {
            const res = await fetch(url, {
                method: "DELETE",
                headers: authHeaders(),
            });
            if (res.status === 401) {
                onAuthError?.();
                return;
            }
            if (res.ok) {
                fetchData();
                if (selectedCategory) fetchSubItems(selectedCategory.code);
                addToast("नोंद यशस्वीरित्या हटवली!", "info");
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- एकत्रित कर बदल (लेआउट आणि मालमत्ता प्रकार जुळणारे फिल्टर्स) ---

    /**
     * @constant filteredProperties
     * @description निवडलेल्या लेआउट आणि प्रकारानुसार जुळणाऱ्या मालमत्तांची यादी तयार करतो.
     */
    const filteredProperties = useMemo(() => {
        return properties.filter((p) => {
            const matchLayout =
                bulkForm.layoutName === "सर्व" || p.layoutName === bulkForm.layoutName;
            const pType = p.sections?.[0]?.propertyType || p.buildingUsage;
            const matchType =
                bulkForm.propertyType === "सर्व" || pType === bulkForm.propertyType;
            const matchKhasra =
                bulkForm.khasraNo === "सर्व" || p.khasraNo === bulkForm.khasraNo;
            return matchLayout && matchType && matchKhasra;
        });
    }, [
        properties,
        bulkForm.layoutName,
        bulkForm.propertyType,
        bulkForm.khasraNo,
    ]);

    /**
     * @function handleBulkUpdate
     * @description निवडलेल्या निकषांनुसार सर्व मालमत्तांचे कर एकाच वेळी सुधारित (Bulk Update) करतो.
     */
    const handleBulkUpdate = async () => {
        const filteredTaxes: any = {};
        bulkUpdateFields.forEach((field) => {
            const val = (bulkForm.taxes as any)[field.key];
            if (val !== undefined && val !== null && val !== "") {
                filteredTaxes[field.key] = Number(val);
            }
        });

        if (Object.keys(filteredTaxes).length === 0) {
            addToast("कृपया किमान एका कराची रक्कम प्रविष्ट करा.", "warning");
            return;
        }

        const confirmMsg =
            `${bulkForm.layoutName === "सर्व" ? "सर्व लेआउट" : bulkForm.layoutName} मधील, ` +
            `${bulkForm.propertyType === "सर्व" ? "सर्व मालमत्ता प्रकार" : bulkForm.propertyType} ` +
            `असलेल्या एकूण ${filteredProperties.length} मालमत्तांचे कर अपडेट करायचे आहेत का?`;

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/properties/bulk-tax-update`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        propertyType: bulkForm.propertyType,
                        layoutName: bulkForm.layoutName,
                        khasraNo: bulkForm.khasraNo,
                        taxes: filteredTaxes,
                    }),
                },
            );

            if (res.status === 401) {
                onAuthError?.();
                return;
            }

            const result = await res.json();
            if (res.ok) {
                addToast(
                    result.message || "मालमत्तांचे कर यशस्वीरित्या अपडेट केले!",
                    "success",
                );
                fetchData();
                fetchProperties();
            } else {
                addToast(result.error || "अपडेट करताना त्रुटी आली", "error");
            }
        } catch (err) {
            console.error(err);
            addToast("सर्व्हरशी संपर्क होऊ शकला नाही.", "error");
        } finally {
            setLoading(false);
        }
    };

    /**
     * @function openFYModal
     * @description आर्थिक वर्ष बदलण्याचा विजार्ड उघडतो.
     */
    const openFYModal = () => setShowFYModal(true);

    /**
     * @function renderTabButton
     * @description मेनू टॅबचे बटण तयार करणारा मदतनीस.
     */
    const renderTabButton = (id: string, label: string, icon: any) => (
        <button
            key={id}
            onClick={() => {
                setActiveTab(id);
                setEditingId(null);
                setShowAddForm(false);
            }}
            className={`flex flex-col items-center gap-1.5 px-4 py-3 transition-all relative group shrink-0 ${activeTab === id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
        >
            <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTab === id ? "bg-indigo-50 shadow-sm" : "bg-transparent"}`}
            >
                {React.cloneElement(icon, {
                    size: 18,
                    className:
                        activeTab === id
                            ? "text-indigo-600"
                            : "text-slate-400 group-hover:scale-110 transition-transform",
                })}
            </div>
            <span
                className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeTab === id ? "opacity-100" : "opacity-60"}`}
            >
                {label}
            </span>
            {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
            )}
        </button>
    );

    // --- कॉन्फिगरेशन फिल्ड्स यादी डिक्शनरी ---

    const commonTaxFields = [
        {
            key: "street_light_default",
            label: "विज / दिवाबत्ती कर (Street Light Tax)",
        },
        { key: "health_tax_default", label: "आरोग्य रक्षण कर (Health Tax)" },
        {
            key: "general_water_default",
            label: "सामान्य पाणी कर (General Water Tax)",
        },
        {
            key: "special_water_default",
            label: "विशेष पाणी कर (Special Water Tax)",
        },
        {
            key: "waste_collection_default",
            label: "कचरा गाडी कर (Waste Collection Tax)",
        },
    ];

    const bulkUpdateFields = [
        { key: "streetLightTax", label: "विज / दिवाबत्ती कर (Street Light Tax)" },
        { key: "healthTax", label: "आरोग्य रक्षण कर (Health Tax)" },
        { key: "wasteCollectionTax", label: "कचरा गाडी कर (Waste Collection Tax)" },
        { key: "generalWaterTax", label: "सामान्य पाणी कर (General Water Tax)" },
        { key: "specialWaterTax", label: "विशेष पाणी कर (Special Water Tax)" },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
            {/* ====== मुख्य हेडर ॲक्शन बार ====== */}
            <header className="no-print shrink-0 bg-white border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                            <Settings className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                                प्रणाली संचलन
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                System Administration Master
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* आर्थिक वर्ष बदला विजार्ड बटण */}
                        <button
                            onClick={openFYModal}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-black uppercase tracking-wider hover:bg-amber-600 hover:text-white transition-all text-[10px] active:scale-95 group shadow-sm"
                            title="आर्थिक वर्ष बदला - विश्लेषण व पुष्टी"
                        >
                            <IndianRupee className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />{" "}
                            आर्थिक वर्ष बदला
                        </button>

                        {/* नवीन नोंद जोडण्याचे बटण (विशिष्ट पानांवरून नियंत्रित) */}
                        {activeTab !== "users" &&
                            activeTab !== "common" &&
                            activeTab !== "import" && (
                                <button
                                    onClick={() => {
                                        setShowAddForm(!showAddForm);
                                        if (activeTab === "rr")
                                            setNewForm({
                                                year_range: "",
                                                item_name_mr: "",
                                                valuation_rate: 0,
                                                tax_rate: 0,
                                                unit_mr: "चौ. मी.",
                                            });
                                        else if (activeTab === "dep")
                                            setNewForm({ min_age: 0, max_age: 0, percentage: 100 });
                                        else if (activeTab === "bu")
                                            setNewForm({
                                                usage_type_mr: "",
                                                usage_type_en: "",
                                                weightage: 1.0,
                                            });
                                        else if (selectedCategory)
                                            setNewForm({
                                                item_value_mr: "",
                                                item_value_en: "",
                                                item_code: "",
                                                sort_order: 0,
                                                category_id: selectedCategory.id,
                                            });
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-all text-[11px] active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> नवीन नोंद जोडा
                                </button>
                            )}

                        {/* मॅन्युअल डेटा रिफ्रेश बटण */}
                        <button
                            onClick={fetchData}
                            className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all active:scale-95"
                        >
                            <RotateCcw
                                className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`}
                            />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 p-6">
                {/* ====== मुख्य घटक विभाग ====== */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
                    {/* नेव्हिगेशन टॅब्स सूची */}
                    <div className="px-6 bg-white border-b border-slate-100 flex items-center justify-start shrink-0 overflow-x-auto hide-scrollbar">
                        {renderTabButton("tax", "कर दर", <TrendingDown />)}
                        {renderTabButton("dep", "घसारा", <Activity />)}
                        {renderTabButton("bu", "वापर प्रकार", <Briefcase />)}
                        {renderTabButton("rr", "रेडी रेकनर", <FileSpreadsheet />)}

                        {/* डायनॅमिक कॅटेगरी श्रेणी टॅब */}
                        {filteredCategories.map((cat) =>
                            renderTabButton(
                                cat.code,
                                cat.code === "WASTI" ? "वस्ती (वॉर्डसह)" : cat.name_mr,
                                <Filter />,
                            ),
                        )}

                        {renderTabButton("common", "सामान्य कर ", <Landmark />)}
                        {renderTabButton("bulk-tax", "एकत्रित कर बदल", <IndianRupee />)}
                        {renderTabButton("import", "डेटा आयात / एक्सपोर्ट", <FileUp />)}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {loading ? (
                            /* डेटा लोड होत असताना फिरणारे वर्तुळ (लोडर) */
                            <div className="h-full flex flex-col items-center justify-center gap-6 py-20 grayscale opacity-50">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                                <div className="text-center">
                                    <p className="font-black text-slate-800 uppercase tracking-widest text-sm">
                                        डेटा लोड होत आहे
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        कृपया काही क्षण प्रतीक्षा करा...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-500">
                                {/* ====== विभाग १: मालमत्ता कर दर टॅब ====== */}
                                {activeTab === "tax" && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    ⚙️ मालमत्ता कर दर (Property Tax Rates)
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    Building and Land Tax Configuration per Wasti
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th className="px-6 py-4">प्रकार</th>
                                                        <th className="px-6 py-4">वस्ती / वॉर्ड</th>
                                                        <th className="px-6 py-4 text-center">
                                                            इमारत दर (₹)
                                                        </th>
                                                        <th className="px-6 py-4 text-center">
                                                            इमारत कर (पैसे)
                                                        </th>
                                                        <th className="px-6 py-4 text-center">
                                                            जमीन दर (₹)
                                                        </th>
                                                        <th className="px-6 py-4 text-center">
                                                            जमीन कर (पैसे)
                                                        </th>
                                                        <th className="px-6 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {rates.map((r) => (
                                                        <tr
                                                            key={r.id}
                                                            className="hover:bg-indigo-50/30 transition-colors group"
                                                        >
                                                            <td className="px-6 py-4 font-bold text-slate-800 uppercase text-xs">
                                                                {r.propertyType}
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-500 font-bold">
                                                                {r.wastiName}
                                                            </td>
                                                            {/* इनलाइन संपादन पर्याय */}
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 bg-white border-slate-200 rounded p-1 text-center"
                                                                        type="number"
                                                                        value={editForm.buildingRate}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                buildingRate: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-extrabold text-blue-600">
                                                                        {MN(r.buildingRate)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 bg-white border-slate-200 rounded p-1 text-center"
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editForm.buildingTaxRate}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                buildingTaxRate: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-extrabold text-indigo-700">
                                                                        {MN(r.buildingTaxRate)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 bg-white border-slate-200 rounded p-1 text-center"
                                                                        type="number"
                                                                        value={editForm.landRate}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                landRate: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-extrabold text-amber-600">
                                                                        {MN(r.landRate)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 bg-white border-slate-200 rounded p-1 text-center"
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editForm.openSpaceTaxRate}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                openSpaceTaxRate: Number(
                                                                                    e.target.value,
                                                                                ),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-extrabold text-orange-600">
                                                                        {MN(r.openSpaceTaxRate)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {editingId === r.id ? (
                                                                    <div className="flex justify-end gap-1">
                                                                        <button
                                                                            onClick={() =>
                                                                                handleSave("tax", r.id, editForm)
                                                                            }
                                                                            className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <Save className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingId(null)}
                                                                            className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingId(r.id);
                                                                            setEditForm(r);
                                                                        }}
                                                                        className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm mx-auto"
                                                                    >
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

                                {/* ====== विभाग २: घसारा दर टॅब ====== */}
                                {activeTab === "dep" && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    📉 घसारा दर (Depreciation Rates)
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    Building Age-based Valuation Depreciation
                                                </p>
                                            </div>
                                        </div>
                                        {/* नवीन नोंद जोडण्याचा इनपुट बॉक्स */}
                                        {showAddForm && (
                                            <div className="bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 flex gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input
                                                    className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold flex-1"
                                                    type="number"
                                                    placeholder="किमान वय"
                                                    value={newForm.min_age}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            min_age: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold flex-1"
                                                    type="number"
                                                    placeholder="कमाल वय"
                                                    value={newForm.max_age}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            max_age: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold flex-1"
                                                    type="number"
                                                    placeholder="घसारा टक्केवारी (%)"
                                                    value={newForm.percentage}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            percentage: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                                <button
                                                    onClick={() => handleSave("dep", null, newForm)}
                                                    className="bg-indigo-600 text-white px-8 rounded-xl font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                                >
                                                    जतन करा
                                                </button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th className="px-8 py-4">इमारतीचे वय (वर्षे)</th>
                                                        <th className="px-8 py-4 text-center">
                                                            उर्वरित मूल्य टक्केवारी (%)
                                                        </th>
                                                        <th className="px-8 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {depRates.map((r) => (
                                                        <tr
                                                            key={r.id}
                                                            className="hover:bg-indigo-50/30 transition-colors group"
                                                        >
                                                            <td className="px-8 py-4 font-bold text-slate-700">
                                                                {editingId === r.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            className="w-16 border rounded p-1"
                                                                            type="number"
                                                                            value={editForm.min_age}
                                                                            onChange={(e) =>
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    min_age: Number(e.target.value),
                                                                                })
                                                                            }
                                                                        />
                                                                        <span className="text-slate-400">ते</span>
                                                                        <input
                                                                            className="w-16 border rounded p-1"
                                                                            type="number"
                                                                            value={editForm.max_age}
                                                                            onChange={(e) =>
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    max_age: Number(e.target.value),
                                                                                })
                                                                            }
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span className="flex items-center gap-2 tabular-nums">
                                                                        {MN(r.min_age || 0)}{" "}
                                                                        <span className="text-slate-300">ते</span>{" "}
                                                                        {MN(r.max_age || 0)} वर्षे
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 border rounded p-1 text-center"
                                                                        type="number"
                                                                        value={editForm.percentage}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                percentage: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-extrabold text-rose-600 tabular-nums">
                                                                        {MN(r.percentage)}%
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === r.id ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleSave("dep", r.id, editForm)
                                                                                }
                                                                                className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Save className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingId(null)}
                                                                                className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingId(r.id);
                                                                                    setEditForm(r);
                                                                                }}
                                                                                className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleDelete("dep", r.id)
                                                                                }
                                                                                className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
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

                                {/* ====== विभाग ३: इमारत वापर प्रकार टॅब ====== */}
                                {activeTab === "bu" && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    🏢 इमारत वापर प्रकार (Building Usage Types)
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    Weightage multipliers based on building purpose
                                                </p>
                                            </div>
                                        </div>
                                        {showAddForm && (
                                            <div className="bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 grid grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input
                                                    className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold"
                                                    placeholder="वापर (मराठी)"
                                                    value={newForm.usage_type_mr}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            usage_type_mr: e.target.value,
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold"
                                                    placeholder="Usage (English)"
                                                    value={newForm.usage_type_en}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            usage_type_en: e.target.value,
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="गुणक (Weightage)"
                                                    value={newForm.weightage}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            weightage: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                                <button
                                                    onClick={() => handleSave("bu", null, newForm)}
                                                    className="bg-indigo-600 text-white rounded-xl font-black uppercase text-[11px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10"
                                                >
                                                    जतन करा
                                                </button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-3xl mx-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th className="px-8 py-4">
                                                            वापर प्रकार (मराठी / English)
                                                        </th>
                                                        <th className="px-8 py-4 text-center">
                                                            गुणक (Weightage)
                                                        </th>
                                                        <th className="px-8 py-4 text-right">कृती</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {buRates.map((r) => (
                                                        <tr
                                                            key={r.id}
                                                            className="hover:bg-indigo-50/30 transition-colors group"
                                                        >
                                                            <td className="px-8 py-4">
                                                                {editingId === r.id ? (
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            className="bg-white border border-slate-200 rounded p-1 flex-1 font-bold text-sm"
                                                                            value={editForm.usage_type_mr}
                                                                            onChange={(e) =>
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    usage_type_mr: e.target.value,
                                                                                })
                                                                            }
                                                                        />
                                                                        <input
                                                                            className="bg-white border border-slate-200 rounded p-1 flex-1 font-bold text-sm opacity-60"
                                                                            value={editForm.usage_type_en}
                                                                            onChange={(e) =>
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    usage_type_en: e.target.value,
                                                                                })
                                                                            }
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span className="font-black text-slate-800 text-sm block">
                                                                            {r.usage_type_mr}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                            {r.usage_type_en || "-"}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 border rounded p-1 font-bold text-center"
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editForm.weightage}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                weightage: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-lg font-black font-mono shadow-sm border border-teal-100">
                                                                        {Number(r.weightage ?? 1.0).toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === r.id ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleSave("bu", r.id, editForm)
                                                                                }
                                                                                className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Save className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingId(null)}
                                                                                className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingId(r.id);
                                                                                    setEditForm(r);
                                                                                }}
                                                                                className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDelete("bu", r.id)}
                                                                                className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
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

                                {/* ====== विभाग ४: रेडी रेकनर दर टॅब ====== */}
                                {activeTab === "rr" && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    📜 रेडी रेकनर दर (Ready Reckoner Rates)
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    Government valuation rates for property calculation
                                                </p>
                                            </div>
                                        </div>
                                        {showAddForm && (
                                            <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-indigo-100 grid grid-cols-1 md:grid-cols-5 gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input
                                                    className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                    placeholder="वर्ष (उदा. २०२५-२६)"
                                                    value={newForm.year_range}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            year_range: e.target.value,
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                    placeholder="प्रकार (उदा. निवासी)"
                                                    value={newForm.item_name_mr}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            item_name_mr: e.target.value,
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                    type="number"
                                                    placeholder="मूल्यांकन दर"
                                                    value={newForm.valuation_rate}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            valuation_rate: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                                <input
                                                    className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="कर दर (%)"
                                                    value={newForm.tax_rate}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            tax_rate: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                                <button
                                                    onClick={() => handleSave("rr", null, newForm)}
                                                    className="bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                                                >
                                                    जतन करा
                                                </button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 z-20">
                                                    <tr className="bg-slate-50/90 backdrop-blur-md text-slate-500 border-b border-slate-200 shadow-sm">
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">
                                                            वर्ष / कालावधी
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">
                                                            वापर / आयटम नाव
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">
                                                            मूल्यांकन (₹)
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">
                                                            कर दर (%)
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">
                                                            कृती
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {rrRates.map((r) => (
                                                        <tr
                                                            key={r.id}
                                                            className="hover:bg-slate-50/80 transition-all group"
                                                        >
                                                            <td className="px-8 py-4">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full font-bold text-sm shadow-inner"
                                                                        value={editForm.year_range}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                year_range: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-black text-xs border border-amber-100">
                                                                        {MN(r.year_range)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full font-bold text-sm shadow-inner"
                                                                        value={editForm.item_name_mr}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                item_name_mr: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-extrabold text-slate-800 text-[13px]">
                                                                        {r.item_name_mr}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm shadow-inner text-center"
                                                                        type="number"
                                                                        value={editForm.valuation_rate}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                valuation_rate: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="font-black text-indigo-600">
                                                                        ₹{MN(r.valuation_rate)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                {editingId === r.id ? (
                                                                    <input
                                                                        className="w-20 bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm shadow-inner text-center"
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editForm.tax_rate}
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                tax_rate: Number(e.target.value),
                                                                            })
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg font-black text-xs border border-emerald-100">
                                                                        {MN(r.tax_rate)}%
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {editingId === r.id ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleSave("rr", r.id, editForm)
                                                                                }
                                                                                className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-md"
                                                                            >
                                                                                <Save className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingId(null)}
                                                                                className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-md"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingId(r.id);
                                                                                    setEditForm(r);
                                                                                }}
                                                                                className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Edit2 className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDelete("rr", r.id)}
                                                                                className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
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

                                {/* ====== विभाग ५: डायनॅमिक श्रेणी व्यवस्थापन ====== */}
                                {selectedCategory && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    📁{" "}
                                                    {selectedCategory.code === "WASTI"
                                                        ? "वस्ती आणि वॉर्ड व्यवस्थापन"
                                                        : `${selectedCategory.name_mr} व्यवस्थापन`}
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    {selectedCategory.code === "WASTI"
                                                        ? "येथून तुम्ही वस्ती आणि त्यांच्याशी संबंधित वॉर्ड नंबर व्यवस्थापित करू शकता."
                                                        : selectedCategory.code === "PROPERTY_TYPE"
                                                            ? "येथून तुम्ही मालमत्तेचे विविध प्रकार (उदा. आर.सी.सी, कच्चा, पक्का) व्यवस्थापित करू शकता."
                                                            : `येथून तुम्ही ${selectedCategory.name_mr} ची माहिती व्यवस्थापित करू शकता.`}
                                                </p>
                                            </div>
                                            {selectedCategory.code === "PROPERTY_TYPE" &&
                                                subItems.length === 0 && (
                                                    <button
                                                        onClick={() => fetchData()}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                                                    >
                                                        प्रमाणित प्रकार लोड करा (Refresh)
                                                    </button>
                                                )}
                                        </div>
                                        {/* डायनॅमिक श्रेणीमध्ये नवीन नोंद जोडण्याचा फॉर्म */}
                                        {showAddForm && (
                                            <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                                                <input
                                                    className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                    placeholder={
                                                        selectedCategory.code === "WASTI"
                                                            ? "वस्तीचे नाव"
                                                            : "आयटम नाव (मराठी)"
                                                    }
                                                    value={newForm.item_value_mr}
                                                    onChange={(e) =>
                                                        setNewForm({
                                                            ...newForm,
                                                            item_value_mr: e.target.value,
                                                        })
                                                    }
                                                />
                                                {selectedCategory.code === "WASTI" ? (
                                                    <input
                                                        className="bg-slate-50 border-transparent rounded-2xl p-3.5 font-bold text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                        placeholder="वॉर्ड क्रमांक"
                                                        value={newForm.item_code}
                                                        onChange={(e) =>
                                                            setNewForm({
                                                                ...newForm,
                                                                item_code: e.target.value,
                                                            })
                                                        }
                                                    />
                                                ) : (
                                                    <input
                                                        className="bg-slate-50 border-transparent rounded-2xl p-3.5 text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                        placeholder="Item Name (English)"
                                                        value={newForm.item_value_en}
                                                        onChange={(e) =>
                                                            setNewForm({
                                                                ...newForm,
                                                                item_value_en: e.target.value,
                                                            })
                                                        }
                                                    />
                                                )}
                                                {selectedCategory.code !== "WASTI" && (
                                                    <input
                                                        className="bg-slate-50 border-transparent rounded-2xl p-3.5 font-mono text-sm font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                                        placeholder="Item Code"
                                                        value={newForm.item_code}
                                                        onChange={(e) =>
                                                            setNewForm({
                                                                ...newForm,
                                                                item_code: e.target.value,
                                                            })
                                                        }
                                                    />
                                                )}
                                                <button
                                                    onClick={() =>
                                                        handleSave(selectedCategory.code, null, newForm)
                                                    }
                                                    className="bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                                                >
                                                    जतन करा
                                                </button>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 z-20">
                                                    <tr className="bg-slate-50/90 backdrop-blur-md text-slate-500 border-b border-slate-200 shadow-sm">
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">
                                                            {selectedCategory.code === "WASTI"
                                                                ? "वस्तीचे नाव"
                                                                : "आयटम नाव (मराठी / English)"}
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">
                                                            {selectedCategory.code === "WASTI"
                                                                ? "वॉर्ड क्रमांक"
                                                                : "कोड (Code)"}
                                                        </th>
                                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">
                                                            कृती (Action)
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {subItems.length > 0 ? (
                                                        subItems.map((i) => (
                                                            <tr
                                                                key={i.id}
                                                                className="hover:bg-slate-50/80 transition-all group"
                                                            >
                                                                <td className="px-8 py-4">
                                                                    {editingId === i.id ? (
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex-1 font-bold text-sm shadow-inner"
                                                                                value={editForm.item_value_mr}
                                                                                onChange={(e) =>
                                                                                    setEditForm({
                                                                                        ...editForm,
                                                                                        item_value_mr: e.target.value,
                                                                                    })
                                                                                }
                                                                            />
                                                                            {selectedCategory.code !== "WASTI" && (
                                                                                <input
                                                                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex-1 font-bold text-sm opacity-60 shadow-inner"
                                                                                    value={editForm.item_value_en}
                                                                                    onChange={(e) =>
                                                                                        setEditForm({
                                                                                            ...editForm,
                                                                                            item_value_en: e.target.value,
                                                                                        })
                                                                                    }
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-extrabold text-slate-800 text-[13px]">
                                                                                {i.item_value_mr}
                                                                            </span>
                                                                            {selectedCategory.code !== "WASTI" && (
                                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                                                    {i.item_value_en || "-"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-8 py-4 text-center">
                                                                    {editingId === i.id ? (
                                                                        <input
                                                                            className="w-32 bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm shadow-inner text-center"
                                                                            value={editForm.item_code}
                                                                            onChange={(e) =>
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    item_code: e.target.value,
                                                                                })
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest font-mono ${selectedCategory.code === "WASTI" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-indigo-50 text-indigo-400"}`}
                                                                        >
                                                                            {selectedCategory.code === "WASTI"
                                                                                ? `वॉर्ड ${MN(i.item_code)}`
                                                                                : i.item_code || "-"}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-8 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        {editingId === i.id ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        handleSave(
                                                                                            selectedCategory.code,
                                                                                            i.id,
                                                                                            editForm,
                                                                                        )
                                                                                    }
                                                                                    className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-md"
                                                                                >
                                                                                    <Save className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setEditingId(null)}
                                                                                    className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-md"
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingId(i.id);
                                                                                        setEditForm(i);
                                                                                    }}
                                                                                    className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                                >
                                                                                    <Edit2 className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        handleDelete(
                                                                                            selectedCategory.code,
                                                                                            i.id,
                                                                                        )
                                                                                    }
                                                                                    className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        /* रिकाम्या यादीसाठीचे डिफॉल्ट व्ह्यू */
                                                        <tr>
                                                            <td
                                                                colSpan={3}
                                                                className="py-20 text-center grayscale opacity-30"
                                                            >
                                                                <div className="flex flex-col items-center gap-4">
                                                                    <Settings className="w-12 h-12" />
                                                                    <p className="text-xs font-black uppercase tracking-[0.2em]">
                                                                        या श्रेणीत अद्याप कोणतीही माहिती नाही
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* ====== विभाग ६: एकत्रित कर बदल पॅनेल ====== */}
                                {activeTab === "bulk-tax" && (
                                    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
                                            {/* STICKY FILTER SELECTION BLOCK - 50% Width / Sticky on Large Screens */}
                                            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md border-b border-slate-100 p-8 shadow-sm rounded-t-[2.5rem]">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                                            <IndianRupee className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                                                एकत्रित कर बदल (Bulk Tax Update)
                                                            </h3>
                                                            <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1 tracking-widest">
                                                                निकष निवडा आणि एकाच वेळी सर्व मालमत्तांचे कर सुधारा
                                                            </p>
                                                        </div>
                                                    </div>


                                                </div>

                                                {/* फिल्टर निकष - ५०% रुंदी वापरणारे लेआउट */}
                                                <div className="w-full md:w-1/2 space-y-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                        १. मालमत्ता फिल्टर निकष (Filter Selection)
                                                    </h4>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* लेआउट निवड */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                                लेआउट (Layout)
                                                            </label>
                                                            <CustomDropdown
                                                                value={bulkForm.layoutName}
                                                                onChange={(val) =>
                                                                    setBulkForm({
                                                                        ...bulkForm,
                                                                        layoutName: val || "सर्व",
                                                                    })
                                                                }
                                                                placeholder="लेआउट निवडा"
                                                                options={layoutOptions}
                                                                className="w-full"
                                                            />
                                                        </div>

                                                        {/* मालमत्ता प्रकार निवड */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                                मालमत्ता प्रकार (Property Type)
                                                            </label>
                                                            <CustomDropdown
                                                                value={bulkForm.propertyType}
                                                                onChange={(val) =>
                                                                    setBulkForm({
                                                                        ...bulkForm,
                                                                        propertyType: val || "सर्व",
                                                                    })
                                                                }
                                                                placeholder="प्रकार निवडा"
                                                                options={propertyTypeOptions}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* मुख्य विभाग (Centered Single Column Layout) */}
                                            <div className="p-8 max-w-2xl mx-auto w-full">
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                                                            २. कर आणि दर प्रविष्ट करा (Insert Tax Values)
                                                        </h4>
                                                        <button
                                                            onClick={() => {
                                                                setBulkForm((prev) => ({
                                                                    ...prev,
                                                                    taxes: {
                                                                        streetLightTax: "" as any,
                                                                        healthTax: "" as any,
                                                                        wasteCollectionTax: "" as any,
                                                                        generalWaterTax: "" as any,
                                                                        specialWaterTax: "" as any,
                                                                    },
                                                                }));
                                                            }}
                                                            className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline animate-pulse"
                                                        >
                                                            सर्व साफ करा
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {bulkUpdateFields.map((field) => {
                                                            const val = (bulkForm.taxes as any)[field.key];
                                                            const isFilled =
                                                                val !== undefined && val !== null && val !== "";
                                                            return (
                                                                <div
                                                                    key={field.key}
                                                                    className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 ${isFilled ? "border-indigo-600 bg-indigo-50/20 shadow-md scale-[1.02]" : "border-slate-100 bg-white hover:border-slate-200"}`}
                                                                >
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span
                                                                            className={`text-[9px] font-black uppercase tracking-tight transition-colors ${isFilled ? "text-indigo-600" : "text-slate-400"}`}
                                                                        >
                                                                            {field.label.split("(")[0]}
                                                                        </span>
                                                                    </div>
                                                                    <div className="relative">
                                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">
                                                                            ₹
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            value={val === 0 ? "0" : val || ""}
                                                                            onChange={(e) => {
                                                                                setBulkForm({
                                                                                    ...bulkForm,
                                                                                    taxes: {
                                                                                        ...bulkForm.taxes,
                                                                                        [field.key]: e.target.value,
                                                                                    },
                                                                                });
                                                                            }}
                                                                            className={`w-full bg-white border-b-2 rounded-lg py-1.5 pl-6 pr-2 font-black text-xs text-slate-700 outline-none transition-all ${isFilled ? "border-indigo-600" : "border-slate-150 focus:border-indigo-300"}`}
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="pt-6 border-t border-slate-50 flex flex-col items-center justify-center gap-6">
                                                        {/* एकत्रित कर बदल अंमलात आणणारे मुख्य बटण */}
                                                        <button
                                                            onClick={handleBulkUpdate}
                                                            disabled={filteredProperties.length === 0}
                                                            className={`w-full px-16 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-xs shadow-xl ${filteredProperties.length === 0
                                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                                                : "bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95"
                                                                }`}
                                                        >
                                                            {bulkForm.layoutName === "सर्व"
                                                                ? "सर्व मालमत्तांवर लागू करा"
                                                                : "निवडलेल्या लेआउटवर लागू करा"}{" "}
                                                            (Apply Now)
                                                        </button>

                                                        {/* प्रशासकीय चेतावणी संदेश */}
                                                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 w-full">
                                                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                            <p className="text-[10px] font-bold text-amber-800 leading-tight uppercase">
                                                                टीप: वरील बदल केल्यावर निवडलेल्या{" "}
                                                                {bulkForm.layoutName === "सर्व" ? "सर्व लेआउट" : bulkForm.layoutName} मधील{" "}
                                                                {bulkForm.propertyType === "सर्व" ? "सर्व" : bulkForm.propertyType} मालमत्तांचे कर अपडेट होतील. (एकूण {MN(filteredProperties.length)} मालमत्ता प्रभावित होतील).
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ====== विभाग ७: ग्रामपंचायतीचे सामान्य कर डिफॉल्ट्स ====== */}
                                {activeTab === "common" && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                            <div>
                                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">
                                                    🏛️ सामान्य कर दर (Common/Global Taxes)
                                                </h3>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1">
                                                    Village-wide standard tax amounts
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto">
                                            <div className="divide-y divide-slate-50">
                                                {commonTaxFields.map((field) => (
                                                    <div
                                                        key={field.key}
                                                        className="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors group"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-700">
                                                                {field.label}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                Global Default Value
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {editingId === field.key ? (
                                                                <div className="flex gap-2 items-center">
                                                                    <input
                                                                        className="w-24 bg-white border border-indigo-200 rounded-xl px-4 py-2 font-black text-sm text-center shadow-inner focus:ring-2 focus:ring-indigo-100 outline-none"
                                                                        type="number"
                                                                        value={
                                                                            editForm[field.key] ??
                                                                            (config[field.key] || "0")
                                                                        }
                                                                        onChange={(e) =>
                                                                            setEditForm({
                                                                                ...editForm,
                                                                                [field.key]: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                    <button
                                                                        onClick={() =>
                                                                            handleSave("config", field.key, {
                                                                                [field.key]: editForm[field.key],
                                                                            })
                                                                        }
                                                                        className="bg-emerald-500 text-white p-2 rounded-lg shadow-md hover:bg-emerald-600 transition-all"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingId(null)}
                                                                        className="bg-slate-100 text-slate-400 p-2 rounded-lg hover:bg-slate-200 transition-all"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-6">
                                                                    <span className="text-lg font-black text-indigo-600 tabular-nums">
                                                                        ₹{MN(config[field.key] || "०")}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingId(field.key);
                                                                            setEditForm({
                                                                                [field.key]: config[field.key],
                                                                            });
                                                                        }}
                                                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                    >
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
                                                टीप: सामान्य कर दरांमध्ये बदल केल्यास, भविष्यात जोडल्या
                                                जाणाऱ्या सर्व नवीन मालमत्तांवर हे दर आपोआप लागू होतील.
                                                जुन्या मालमत्तांचे दर बदलण्यासाठी "मालमत्ता व्यवस्थापन"
                                                मध्ये जावे लागेल.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ====== विभाग ७: डेटा आयात / एक्सपोर्ट पॅनेल ====== */}
                                {activeTab === "import" && (
                                    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl p-8">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                                    <FileUp className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                                        डेटा आयात / एक्सपोर्ट (Data Import & Export Center)
                                                    </h3>
                                                    <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1 tracking-widest">
                                                        Excel फाईलद्वारे डेटा आयात करा किंवा एक्सपोर्ट करा
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Namuna 8 Card */}
                                                <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between gap-4">
                                                    <div>
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100/60 inline-block mb-3">
                                                            नमुना ८ (Assessment Register)
                                                        </span>
                                                        <h4 className="text-sm font-black text-slate-800">नमुना ८ डेटा आयात आणि एक्सपोर्ट</h4>
                                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                            नवीन मालमत्ता आणि कर आकारणी नोंदी एक्सल फाईलद्वारे आयात करा किंवा चालू नोंदी बॅकअपसाठी डाउनलोड करा.
                                                        </p>
                                                    </div>
                                                    <div className="border-t border-slate-100 pt-4 mt-2">
                                                        <ExcelActions
                                                            records={properties}
                                                            onImportSuccess={fetchProperties}
                                                            type="namuna8"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Namuna 9 Card */}
                                                <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between gap-4">
                                                    <div>
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100/60 inline-block mb-3">
                                                            नमुना ९ (Demand Register)
                                                        </span>
                                                        <h4 className="text-sm font-black text-slate-800">नमुना ९ डेटा आयात आणि एक्सपोर्ट</h4>
                                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                            मागणी बिल आणि मागील थकबाकीची माहिती एक्सल फाईलद्वारे आयात करा किंवा चालू डेटा बॅकअपसाठी डाउनलोड करा.
                                                        </p>
                                                    </div>
                                                    <div className="border-t border-slate-100 pt-4 mt-2">
                                                        <ExcelActions
                                                            records={properties}
                                                            onImportSuccess={fetchProperties}
                                                            type="namuna9"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ====== आर्थिक वर्ष बदलण्याचा विजार्ड मॉडेल संवाद ====== */}
            {showFYModal && (
                <FYMigrationWizard
                    currentFY={config["current_fy"] || ""}
                    onClose={() => setShowFYModal(false)}
                    onDone={fetchData}
                    addToast={addToast}
                    onAuthError={onAuthError}
                />
            )}
        </div>
    );
}
