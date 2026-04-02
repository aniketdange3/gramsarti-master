export interface BillCalculation {
    arrearsBase: number;
    penaltyAmount: number;
    arrearsTotal: number;
    currentTaxBase: number;
    discountAmount: number;
    currentTaxTotal: number;
    billTotal: number;
    isDiscountEligible: boolean;
}

/**
 * Calculates penalty and discount for Magani Bill.
 * - Penalty: 5% of arrears (मागील थकबाकी) fix 
 * - Discount: 5% of current year tax (चालू कर) if paid before September 30th
 * check first date then calcuted amount
 * 
 * @param arrearsAmount Existing arrears from record
 * @param currentTaxAmount Current year tax amount
 * @param referenceDate Date to check for discount eligibility (default: today)
 */
export const calculateBill = (
    arrearsAmount: number,
    currentTaxAmount: number,
    referenceDate: Date = new Date()
): BillCalculation => {
    const arrearsBase = Number(arrearsAmount) || 0;
    const currentTaxBase = Number(currentTaxAmount) || 0;

    // 5% Penalty on Arrears  aniket danage namuna 9 calculation
    const penaltyAmount = Math.round(arrearsBase * 0.05);
    const arrearsTotal = arrearsBase + penaltyAmount;

    // Check Discount Eligibility: Before or on September 30th of the current financial year
    // In India, financial year starts April 1st. 
    // If payment is made between April 1st and September 30th, it's eligible for discount on current year tax.
    const month = referenceDate.getMonth(); // 0-indexed (0=Jan, 3=Apr, 8=Sep)
    const day = referenceDate.getDate();

    // Eligibility: April (3) to September (8)
    const isDiscountEligible = month >= 3 && month <= 8;

    const discountAmount = isDiscountEligible ? Math.round(currentTaxBase * 0.05) : 0;
    const currentTaxTotal = currentTaxBase - discountAmount;

    const billTotal = arrearsTotal + currentTaxTotal;

    return {
        arrearsBase,
        penaltyAmount,
        arrearsTotal,
        currentTaxBase,
        discountAmount,
        currentTaxTotal,
        billTotal,
        isDiscountEligible
    };
};
