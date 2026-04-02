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
