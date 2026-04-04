
export interface PropertySection {
  description: string;
  lengthFt: number;
  widthFt: number;
  areaSqFt: number;
  areaSqMt: number;
  buildingTaxRate: number; // Moved here
  openSpaceTaxRate: number; // Moved here
  landRate: number;
  buildingRate: number;
  depreciationRate: number;
  weightage: number;
  buildingValue: number;
  openSpaceValue: number;
  buildingFinalValue: number;
  openSpaceFinalValue: number;
  propertyType: string;
  floorIndex: number;
}

export const FLOOR_NAMES = [
  "तळ मजला",
  "पहिला मजला",
  "दुसरा मजला",
  "तिसरा मजला",
  "चौथा मजला"
];

export const PROPERTY_TYPES = [
  "निवडा",
  "आर.सी.सी.",
  "विटा सिमेंट",
  "खाली जागा",
  "विटा माती",
  "माती"
];

export const WASTI_NAMES = [
  "निवडा",
  "वेळाहरी",
  "गोटाळ पांजरी",
  "शंकरपुर"
];

export interface PropertyRecord {
  id: string;
  srNo: number;
  wardNo: string;
  khasraNo: string;
  layoutName: string;
  wastiName: string;
  plotNo: string;
  occupantName: string;
  ownerName: string;
  contactNo?: string;
  hasConstruction: boolean;
  openSpace: number;
  propertyLength?: number;
  propertyWidth?: number;
  totalAreaSqFt?: number;
  totalAreaSqMt?: number;

  // Exactly 5 floors as requested
  sections: PropertySection[];

  // Tax details (calculated or manual entry)
  propertyTax: number;
  openSpaceTax: number;
  streetLightTax: number;
  healthTax: number;
  generalWaterTax: number;
  specialWaterTax: number;
  totalTaxAmount: number;
  arrearsAmount: number; // New: Arrears tracking
  paidAmount: number;    // New: Payment tracking
  penaltyAmount?: number; // New: Penalty tracking
  discountAmount?: number; // Tracking given discount
  wasteCollectionTax?: number; // New: Waste collection tax

  // Receipt details for Namuna 9
  propertyId?: string;
  receiptNo?: string;
  receiptBook?: string;
  paymentDate?: string;
  // billNo?: string;
  // billBookNo?: string;
  // lastBillDate?: string;

  // Ferfar status display cache
  hasPendingFerfar?: boolean;

  // New detailed fields for Rule 32(1) - Namuna 8
  //   citySurveyNo?: string;
  constructionYear?: string;
  propertyAge?: number;
  buildingAge?: string; // For display with text if needed

  // Ready Reckoner Rates (expanded)
  readyReckonerLand?: number;
  readyReckonerBuilding?: number;
  readyReckonerComposite?: number;
  depreciationAmount?: number; // Added for Namuna 8 replica

  // Surcharges (अधिभार)
  surchargeEducation?: number;
  surchargeHealth?: number;
  surchargeRoad?: number;
  surchargeEmployment?: number;
  surchargeTotal?: number;

  remarksNotes?: string;
  buildingUsage?: string;

  createdAt: string;
}

export const DEFAULT_SECTION: PropertySection = {
  description: '',
  lengthFt: 0,
  widthFt: 0,
  areaSqFt: 0,
  areaSqMt: 0,
  buildingTaxRate: 1.20,
  openSpaceTaxRate: 0,
  landRate: 0,
  buildingRate: 0,
  depreciationRate: 0.90,
  weightage: 1.00,
  buildingValue: 0,
  openSpaceValue: 0,
  buildingFinalValue: 0,
  openSpaceFinalValue: 0,
  propertyType: '',
  floorIndex: 0
}; export const LABELS = {
  appTitle: "मालमत्ता कर व्यवस्थापन",
  srNo: "अनुक्रमांक",
  wardNo: "वॉर्ड क्रमांक",
  khasraNo: "खसरा नंबर / सी टी नंबर",
  layoutName: "लेआउटचे नाव", // New label
  plotNo: "प्लॉट क्रमांक/मालमत्ता क्र.",
  occupantName: "भोगवटाधारकाचे नाव",
  ownerName: "मालकाचे नाव",
  contactNo: "संपर्क क्र.",
  hasConstruction: "बांधकाम आहे का",
  openSpace: "खाली जागा",
  lengthFt: "लांबी (फूट)",
  widthFt: "रुंदी (फूट)",
  areaSqFt: "क्षेत्रफळ (चौरस फूट)",
  areaSqMt: "क्षेत्रफळ (चौरस मीटर)",
  redKarSection: "कराचा तपशील (Red Kar Valuation)",
  landRate: "जमीन दर",
  buildingRate: "इमारत दर",
  depreciationRate: "घसारा दर",
  weightage: "भारांक",
  buildingValue: "इमारत मूल्य (रुपये)",
  openSpaceValue: "खाली जागा मूल्य (रुपये)",
  buildingTaxRate: "इमारत कराचे दर",
  openSpaceTaxRate: "खाली जागा कराचे दर",
  propertyType: "मालमत्तेचा प्रकार",
  propertyTax: "घरपट्टी",
  openSpaceTax: "जमीन (जागा)",
  streetLightTax: "दिवाबत्ती",
  healthTax: "आरोग्य",
  generalWaterTax: "सामान्य पाणी",
  specialWaterTax: "विशेष पाणी",
  wasteCollectionTax: "कचरा गाडी कर",
  penaltyAmount: "दंड",
  totalTax: "एकूण कराची रक्कम",
  addRecord: "नवीन नोंद करा",
  exportExcel: "एक्सेलमध्ये एक्सपोर्ट करा",
  save: "जतन करा",
  cancel: "रद्द करा",
  delete: "हटवा",
  edit: "सुधारा",
  searchPlaceholder: "नाव, वॉर्ड, वस्ती किंवा प्लॉट नंबरने शोधा...",
  wastiName: "वस्तीचे नाव",
  arrearsAmount: "मागील थकबाकी",
  paidAmount: "भरलेली रक्कम",
  //   citySurveyNo: "सिटी सर्व्हे नं.",
  constructionYear: "बांधकामाचे वर्ष",
  propertyAge: "इमारतीचे वय",
  readyReckonerLand: "रेडी रेकनर (जमीन)",
  readyReckonerBuilding: "रेडी रेकनर (इमारत)",
  readyReckonerComposite: "रेडी रेकनर (संयुक्त)",
  //   surchargeEducation: "शिक्षण अधिभार",
  //   surchargeHealth: "आरोग्य अधिभार",
  //   surchargeRoad: "रस्ता अधिभार",
  //   surchargeEmployment: "रोजगार हमी अधिभार",
  remarksNotes: "शेरा",
  // billNo: "बील नं.",
  // billBookNo: "बील बुक नं.",
  // lastBillDate: "मागील थकबाकीची तारीख",
  receiptNo: "पावती क्र.",
  receiptBook: "पावती बुक क्र.",
  paymentDate: "दिनांक",
};

export interface FerfarRequest {
  id: number;
  property_id: string;
  old_owner_name: string;
  new_owner_name: string;
  applicant_name?: string;
  applicant_mobile?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  document_proof?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: number;
  ferfar_type?: string;
  // Joined fields from properties
  srNo?: number;
  wardNo?: string;
  wastiName?: string;
  plotNo?: string;
}

export const BUILDING_USAGE_OPTIONS = []; // This is now managed via Master Data in the database


