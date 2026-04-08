/**
 * TAX CALCULATION UTILITIES - कर मोजणी सूत्र (Gram Panchayat Tax Formulas)
 * 
 * या फाईलमध्ये मालमत्ता कराच्या दरांचे (Tax Rates) आणि मोजणीच्या नियमांचे व्यवस्थापन केले जाते.
 * 
 * TAX FORMULAS (STEP-BY-STEP):
 * 1. आर.सी.सी (RCC Building): 
 *    - सूत्र: [बांधकाम क्षेत्रफळ] x [बांधकाम दर] x [बांधकाम कर दर]
 *    - (Area x BuildingRate x BuildingTaxRate)
 * 
 * 2. खाली जागा (Open Land):
 *    - सूत्र: [जमीन क्षेत्रफळ] x [जमीन दर] x [खाली जागा कर दर]
 *    - (Area x LandRate x OpenSpaceTaxRate)
 * 
 * टिप: जमीन दर (Land Rate) हा संबंधित वस्तीच्या (शंकरपुर, वेळाहरी इ.) रेडी रेकनरनुसार बदलतो.
 */

export interface TaxRateConfig {
    buildingRate: number;
    buildingTaxRate: number;
    landRate: number;
    openSpaceTaxRate: number;
}

export const getApplicableRates = (propertyType: string, wastiName: string): TaxRateConfig => {
    const config: TaxRateConfig = {
        buildingRate: 0,
        buildingTaxRate: 0,
        landRate: 0,
        openSpaceTaxRate: 0,
    };

    if (!propertyType || propertyType === 'निवडा') {
        return config;
    }

    // 1. RCC Rules
    if (propertyType === 'आर.सी.सी') {
        config.buildingRate = 21296;
        config.buildingTaxRate = 1.20;
        // Assuming RCC doesn't affect Land Rate/Open Space Tax unless specified
    }

    // 2. Khali Jaga (Empty Space) Rules
    if (propertyType === 'खाली जागा') {
        config.openSpaceTaxRate = 1.50;

        // Land Rate depends on Wasti (Area)
        if (wastiName === 'शंकरपुर') {
            config.landRate = 7800;
            config.openSpaceTaxRate = 1.50; // Redundant but explicit
        } else if (wastiName === 'गोटाळ पांजरी') {
            config.landRate = 5450;
            config.openSpaceTaxRate = 1.50;
        } else if (wastiName === 'वेळाहरी') {
            config.landRate = 6200;
            config.openSpaceTaxRate = 1.50;
        }
        // Default fallback if Wasti matches none?
        // User didn't specify, keeping 0 or previous default
    }

    return config;
};
export interface TaxRateMaster {
    id: number;
    wastiName: string;
    propertyType: string;
    buildingRate: number;
    buildingTaxRate: number;
    landRate: number;
    openSpaceTaxRate: number;
}

export interface DepreciationMaster {
    id: number;
    min_age: number;
    max_age: number;
    percentage: number;
}

export interface BuildingUsageMaster {
    id: number;
    usage_type_mr: string;
    usage_type_en: string;
    weightage: number | string;
}

export interface TaxCalculationResult {
    valuation: number;
    depreciatedValue: number;
    finalTax: number;
}

/**
 * Centrally calculates property tax based on Gram Panchayat rules.
 * Standard Formula: Tax = (Area * Rate * Weightage * ValueMultiplier * TaxRate) / 1000
 * 
 * @param params { areaSqMt, rate, taxRate, weightage, valueMultiplier }
 * Note: valueMultiplier = 1 - (Depreciation Percentage / 100)
 */
export const calculateTax = (params: {
    areaSqMt: number;
    rate: number;
    taxRate: number;
    weightage?: number;
    valueMultiplier?: number;
}): TaxCalculationResult => {
    const {
        areaSqMt,
        rate,
        taxRate,
        weightage = 1.0,
        valueMultiplier = 1.0
    } = params;

    // 1. Calculate Valuation (Capital Value before depreciation)
    // Valuation = Area * Rate * Weightage
    const valuation = Number((areaSqMt * rate * weightage).toFixed(2));

    // 2. Apply Depreciation via Value Multiplier
    // Depreciated Value = Valuation * ValueMultiplier
    const depreciatedValue = Number((valuation * valueMultiplier).toFixed(2));

    // 3. Calculate Final Tax (per 1000 rate)
    // FinalTax = (DepreciatedValue * TaxRate) / 1000
    const finalTax = Math.round((depreciatedValue * taxRate) / 1000);

    return {
        valuation,
        depreciatedValue,
        finalTax
    };
};
