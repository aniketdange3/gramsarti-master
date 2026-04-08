export interface BillCalculation {
    arrearsBase: number;
    arrearsTotal: number;
    currentTaxBase: number;
    discountAmount: number;
    penaltyAmount: number;
    currentTaxTotal: number;
    billTotal: number;
    isDiscountEligible: boolean;
}

/**
 * Calculates discount for Magani Bill.
 * - Discount: 5% of current year tax (चालू कर) if paid before September 30th
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

    // Arrears total is just the base amount as penalty is removed
    const arrearsTotal = arrearsBase;

    // Check Discount Eligibility: Before or on September 30th of the current financial year
    const month = referenceDate.getMonth(); // 0-indexed (0=Jan, 3=Apr, 8=Sep)
    const isDiscountEligible = month >= 3 && month <= 8;

    const discountAmount = isDiscountEligible ? Math.round(currentTaxBase * 0.05) : 0;
    
    // Penalty: 5% of Arrears (मागील थकबाकी) only as per Namuna 9 print logic
    const penaltyAmount = Math.round(arrearsBase * 0.05);

    const currentTaxTotal = currentTaxBase - discountAmount;
    const billTotal = arrearsTotal + currentTaxTotal + penaltyAmount;

    return {
        arrearsBase,
        arrearsTotal,
        currentTaxBase,
        discountAmount,
        penaltyAmount,
        currentTaxTotal,
        billTotal,
        isDiscountEligible,
    };
};
