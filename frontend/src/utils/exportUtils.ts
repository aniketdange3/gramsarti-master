import * as XLSX from 'xlsx';
import { PropertyRecord, DEFAULT_SECTION } from '../types';
import { EXCEL_HEADERS } from './constants';

export const exportToExcel = (records: PropertyRecord[], fileNamePrefix: string = 'GramSarthi_Data') => {
    const wsData = records.map((r) => {
        const row: any[] = [
            r.srNo, r.wastiName || '', r.wardNo, r.khasraNo, r.layoutName,
            r.plotNo, r.occupantName, r.ownerName,
            r.hasConstruction ? 'हो' : 'नाही', r.openSpace
        ];
        
        // Map 5 sections
        for (let i = 0; i < 5; i++) {
            const s = r.sections[i] || { ...DEFAULT_SECTION };
            row.push(
                s.propertyType || '', s.lengthFt || 0, s.widthFt || 0,
                s.areaSqFt || 0, s.areaSqMt || 0, s.buildingTaxRate || 0,
                s.openSpaceTaxRate || 0, s.landRate || 0, s.buildingRate || 0,
                s.depreciationRate || 0, s.weightage || 0, s.buildingValue || 0,
                s.openSpaceValue || 0, s.constructionYear || '', s.propertyAge || 0
            );
        }
        
        // Final columns
        row.push(
            r.propertyTax || 0, 
            r.openSpaceTax || 0, 
            r.streetLightTax || 0, 
            r.healthTax || 0,
            r.generalWaterTax || 0, 
            r.specialWaterTax || 0, 
            r.wasteCollectionTax || 0,
            r.receiptNo || '', 
            r.receiptBook || '', 
            r.paymentDate || '',
            r.totalTaxAmount || 0, 
            r.arrearsAmount || 0, 
            r.paidAmount || 0
        );
        return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...wsData]);
    XLSX.utils.book_append_sheet(wb, ws, "Property Records");
    
    const fileName = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
