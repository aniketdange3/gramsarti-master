import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PropertyRecord } from '../types';
import { PANCHAYAT_CONFIG } from '../utils/panchayatConfig';
import { calculateBill } from './billCalculations';
import { registerFonts } from './fonts';
import logo from '../assets/images/logo.png?base64';

// ─── Constants (Legal Landscape) ─────────────────────────────────────────────
const PW = 355.6; // Legal width (landscape) mm
const PH = 215.9; // Legal height (landscape) mm
const M = 10;     // side margin
const MTB = PH * 0.04; // Reduced from 5% to 4% for overall better spacing <!-- id: a1 -->
const HY = 35;    // header height

// B&W palette
// B&W palette
const BLACK: [number, number, number] = [0, 0, 0];
const DARK: [number, number, number] = [30, 30, 30];
const MID: [number, number, number] = [80, 80, 80];
const LIGHT: [number, number, number] = [255, 255, 255];
const HEAD_BG: [number, number, number] = [236, 252, 203]; // Light Yellow-Green (Lime-100)
const ALT_BG: [number, number, number] = [248, 250, 252]; // Very Subtle Gray-tinted row
const FOOT_BG: [number, number, number] = [241, 245, 249]; // Light Gray footer

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MN = (v: number | string | undefined | null): string =>
    String(v === undefined || v === null ? '0' : v)
        .replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

const loadLogo = async (): Promise<string | null> => {
    return logo;
};

const safeSetFont = (doc: jsPDF, font: string, style: string = 'normal') => {
    try {
        const fontList = (doc as any).getFontList();
        const hasFont = fontList && fontList[font];
        if (hasFont) {
            doc.setFont(font, style);
        } else {
            console.warn(`Font ${font} ${style} not in list, falling back to helvetica`);
            doc.setFont('helvetica', style);
        }
    } catch (e) {
        console.error('safeSetFont error:', e);
        doc.setFont('helvetica', style);
    }
};

/**
 * Draw header on any page — light blue background, black text,
 * logo + GP details left, large bold title center, legal ref right.
 */
const drawHeader = (doc: jsPDF, logo: string | null, title: string, subtitle: string, showBorder = true) => {
    const pg = (doc as any).internal.getCurrentPageInfo?.()?.pageNumber ?? 1;
    const { height, width } = doc.internal.pageSize;
    const mtb = height * 0.04; // Use reduced margin <!-- id: a2 -->

    // ── Centered watermark (very faint, grayscale) ───────────────────────────
    if (logo) {
        const WM = Math.round(height * 0.28);
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logo, 'PNG', (width - WM) / 2, (height - WM) / 2, WM, WM);
        doc.restoreGraphicsState();
    }

    // ── Top background band ──
    doc.setFillColor(...LIGHT);
    doc.rect(M, mtb - 9, width - 2 * M, HY - 3.5, 'F');
    if (showBorder) {
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        doc.rect(M, mtb - 9, width - 2 * M, HY - 3.5, 'D');
    }

    // ── LEFT: logo + GP details ──────────────────────────────────────────────
    const logoL = M + 2;
    const textBaseY = mtb - 4;
    if (logo) {
        doc.addImage(logo, 'PNG', logoL, textBaseY - 4, 16, 16);
    }
    const textX = logo ? logoL + 18 : logoL;
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`ग्रामपंचायत: ${PANCHAYAT_CONFIG.gpName}`, textX, textBaseY);

    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(7);
    doc.text(`तालुका: ${PANCHAYAT_CONFIG.taluka}`, textX, textBaseY + 4);
    doc.text(`जिल्हा: ${PANCHAYAT_CONFIG.jilha}`, textX, textBaseY + 8);
    doc.text(`राज्य: महाराष्ट्र`, textX, textBaseY + 12);

    // ── CENTER: Title ────────────────────────────────────────────────────────
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...BLACK);
    doc.text(title, width / 2, textBaseY + 2, { align: 'center' });

    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, width / 2, textBaseY + 9, { align: 'center' });

    // ── RIGHT: Legal ref + Page ──────────────────────────────────────────────
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(7.5);
    doc.text('महाराष्ट्र ग्रामपंचायत कायदा', width - M - 2, textBaseY, { align: 'right' });
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.text('नियम ३२(१)', width - M - 2, textBaseY + 4, { align: 'right' });
    doc.setFontSize(7);
    doc.text(`पृष्ठ: ${MN(pg)}`, width - M - 2, textBaseY + 10, { align: 'right' });

    doc.setTextColor(...BLACK);
};

/**
 * Draw header with exact Namuna 8 replica layout
 */
const drawNamuna8Header = (doc: jsPDF, logo: string | null) => {
    // 1. Watermark (Larger and centered, colorful)
    if (logo) {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
        const WM = 160;
        doc.addImage(logo, 'PNG', (PW - WM) / 2, (PH - WM) / 2 - 10, WM, WM);
        doc.restoreGraphicsState();
    }

    // 2. Logo (Top Left) - Shifted by MTB
    if (logo) {
        doc.addImage(logo, 'PNG', M, MTB, 25, 25);
    }

    // 3. Right Side Info (Grampanchayat Name precisely formatted) - Shifted by MTB
    doc.setFontSize(10);
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.text(`ग्रामपंचायत लेखा : ${PANCHAYAT_CONFIG.gpName}`, PW - M, MTB + 7, { align: 'right' });
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(9);
    doc.text(`तालुका : ${PANCHAYAT_CONFIG.taluka}`, PW - M, MTB + 13, { align: 'right' });
    doc.text(`जिल्हा : ${PANCHAYAT_CONFIG.jilha}`, PW - M, MTB + 19, { align: 'right' });

    // 4. Center Title Block (Namuna 8 emphasized) - Shifted by MTB
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(32);
    doc.text('नमुना ८', PW / 2, MTB + 9, { align: 'center' });
    doc.setFontSize(18);
    doc.text('ग्रामपंचायत', PW / 2, MTB + 17, { align: 'center' });

    doc.setFontSize(10);
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.text('महाराष्ट्र ग्रामपंचायत कायदा नियम ३२(१)', PW / 2, MTB + 24, { align: 'center' });
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.text(`सन २०२५-२०२६ या वर्षासाठी कर आकारणी नोंद`, PW / 2, MTB + 30, { align: 'center' });
};

export const generateNamuna8PDF = async (records: PropertyRecord[], filterWasti = '') => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
    const logo = await loadLogo();

    registerFonts(doc);
    drawNamuna8Header(doc, logo);

    const body: any[][] = records.map((r, i) => {
        const activeSections = r.sections?.filter(s => s.propertyType && s.propertyType !== 'निवडा') || [];
        const buildingVal = activeSections.reduce((sSum, s) => sSum + (Number(s.buildingValue) || 0), 0);
        const openSpaceVal = activeSections.reduce((sSum, s) => sSum + (Number(s.openSpaceValue) || 0), 0);
        const cap = buildingVal + openSpaceVal;

        // Valuation details
        const rrLand = r.readyReckonerLand || 0;
        const rrBuild = r.readyReckonerComposite || 0;
        const depr = (r as any).depreciationAmount || 5; // Sample value for replica if missing
        const taxType = activeSections[0]?.buildingTaxRate || '३२०';

        // Demand
        const dProp = Number(r.propertyTax) || 0;
        const dOpen = Number(r.openSpaceTax) || 0;
        const dLight = Number(r.streetLightTax) || 0;
        const dHealth = Number(r.healthTax) || 0;
        const dGenWater = Number(r.generalWaterTax) || 0;
        const dSpecWater = Number(r.specialWaterTax) || 0;
        const dWaste = Number((r as any).wasteCollectionTax) || 0;
        const dPenalty = Number(r.penaltyAmount) || 0;
        const dTotal = dProp + dOpen + dLight + dHealth + dGenWater + dSpecWater + dWaste + dPenalty;

        // Recovery
        const isPaid = (Number(r.paidAmount) || 0) > 0;
        const rProp = isPaid ? dProp : 0;
        const rLight = isPaid ? dLight : 0;
        const rGenWater = isPaid ? dGenWater : 0;
        const rSpecWater = isPaid ? dSpecWater : 0;
        const rWaste = isPaid ? dWaste : 0;
        const rTotal = isPaid ? dTotal : 0;

        const propertyDesc = activeSections.map(s => s.propertyType).join('\n');
        const areaStr = activeSections.map(s => s.areaSqFt ? MN(s.areaSqFt) + ' चौ. फु.' : '').join('\n');

        return [
            { content: MN(i + 1), styles: { halign: 'center' } },
            `${r.wastiName || '-'}\n${MN(r.khasraNo) || '-'}`,
            `${MN(r.propertyId || r.srNo)}\n${MN(r.plotNo) || '-'}`,
            `${r.ownerName || '-'}\n(${r.occupantName || 'स्वतः'})`,
            `${propertyDesc}\n${areaStr}`,
            `${r.constructionYear || '-'}\n${(r as any).buildingAge || '-'}`,
            MN(rrLand), MN(rrBuild), MN(depr),
            { content: MN(cap), styles: { fontStyle: 'bold' } },
            taxType,
            MN(dProp), MN(dOpen), MN(dLight), MN(dHealth), MN(dGenWater), MN(dSpecWater), MN(dWaste), MN(dPenalty), { content: MN(dTotal), styles: { fontStyle: 'bold' } },
            r.remarksNotes || '',
        ];
    });

    const head = [
        [
            { content: 'अ.क्र.', rowSpan: 2 },
            { content: 'वस्ती नाव\nखासरा क्र.', rowSpan: 2 },
            { content: 'मालमत्ता /\nप्लॉट क्र.', rowSpan: 2 },
            { content: 'मालकाचे नाव\nभोगवटादाराचे नाव', rowSpan: 2 },
            { content: 'मालमत्तेचे वर्णन\nमालमत्तेचे क्षेत्रफळ', rowSpan: 2 },
            { content: 'बांधकामाचे वर्ष\nइमारतीचे वय', rowSpan: 2 },
            { content: 'रेडी रेकनर प्रति चौ.मी.', colSpan: 2 },
            { content: 'घसारा', rowSpan: 2 },
            { content: 'भांडवली\nमूल्य (रुपये)', rowSpan: 2 },
            { content: 'कराचा\nप्रकार\n(पैसे)', rowSpan: 2 },
            { content: 'आकारणी केलेल्या करांची रक्कम', colSpan: 9 },
            { content: 'शेरा', rowSpan: 2 },
        ],
        [
            'जमीन', 'बांधकाम',
            'घरपट्टी', 'जागा कर', 'दिवाबत्ती', 'आरोग्य', 'सामान्य\nपाणी', 'विशेष\nपाणी', 'कचरागाडी', 'दंड', 'एकूण'
        ]
    ];

    // Numbered Columns (1 to 18)
    const numberedRow = Array.from({ length: 18 }, (_, i) => MN(i + 1));
    body.unshift(numberedRow);

    autoTable(doc, {
        head,
        body,
        startY: MTB + 42,
        margin: { left: M, right: M, top: MTB, bottom: MTB },
        tableWidth: PW - 2 * M,
        styles: {
            fontSize: 7.5,
            cellPadding: 1,
            lineWidth: 0.1,
            lineColor: BLACK,
            valign: 'middle',
            font: 'NotoMarathi',
            textColor: BLACK,
            halign: 'center'
        },
        headStyles: {
            fillColor: HEAD_BG,
            textColor: BLACK,
            fontStyle: 'bold',
            fontSize: 8,
            lineWidth: 0.1
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 22 },
            2: { cellWidth: 18 },
            3: { cellWidth: 42, halign: 'left' },
            4: { cellWidth: 38, halign: 'left' },
            5: { cellWidth: 16 },
            6: { cellWidth: 16 },
            7: { cellWidth: 16 },
            8: { cellWidth: 14 },
            9: { cellWidth: 22 },
            10: { cellWidth: 10 },
            11: { cellWidth: 11 }, 12: { cellWidth: 11 }, 13: { cellWidth: 11 }, 14: { cellWidth: 11 }, 15: { cellWidth: 11 }, 16: { cellWidth: 11 }, 17: { cellWidth: 11 }, 18: { cellWidth: 11 }, 19: { cellWidth: 14 },
            20: { cellWidth: 'auto' },
        },
        didDrawPage: (data: any) => {
            if (data.pageNumber > 1) drawNamuna8Header(doc, logo);
        },
    } as any);

    const lastY = (doc as any).lastAutoTable.finalY + 15;

    // Bottom Section (Exact Match positions)
    doc.setFontSize(10);
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.text('शिक्का', M + 45, lastY + 5);
    doc.line(M + 30, lastY + 7, M + 70, lastY + 7);

    doc.setFontSize(9);
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.text('मागणीवरून सत्य प्रत दिली आहे.', M + 10, lastY + 25);
    doc.text('रजुवात देणाऱ्याची सही', M + 15, lastY + 30);
    doc.line(M + 5, lastY + 32, M + 65, lastY + 32);

    doc.text('तयार करणाऱ्याची सही', PW / 2, lastY + 30, { align: 'center' });
    doc.line(PW / 2 - 35, lastY + 32, PW / 2 + 35, lastY + 32);

    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.text('ग्रा.वि.अधिकारी / ग्रामसेवक', PW - M - 10, lastY + 25, { align: 'right' });
    doc.text(`ग्रामपंचायत ट्रेमो`, PW - M - 15, lastY + 30, { align: 'right' });

    // Tips (Exact Match)
    const tipY = PH - 15;
    doc.setFontSize(8);
    safeSetFont(doc, 'NotoMarathi', 'normal');
    const tip1 = 'टिप :- * सदरचा उतारा हा मालकी हक्काचा नसून कर आकारणीचा आहे. सदरचा उताऱ्यावरून खरेदी-विक्रीचा व्यवहार झाल्यास त्यास ग्रामपंचायत जबाबदार राहणार नाही.';
    const tip2 = '* शासन परिपत्रक क्र. VTM2603/ प्र.क्र. २०६८/पं.रा. ४ दि २० नोव्हेंबर २००३ नुसार ग्रामीण भागातील घरांची नोंदणी पती-पत्नी यांच्या संयुक्त नावे करण्याबाबत निर्देशित करण्यात आलेले आहेत';
    doc.text(tip1, M, tipY);
    doc.text(tip2, M, tipY + 5);

    doc.save(`Namuna8_${PANCHAYAT_CONFIG.financialYearEn}.pdf`);
};


// ─── NAMUNA 9 ─────────────────────────────────────────────────────────────────
export const generateNamuna9PDF = async (records: PropertyRecord[], filterWasti = '') => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
    const logo = await loadLogo();
    const T1 = 'नमुना ९';
    const T2 = `ग्रामपंचायत: ${PANCHAYAT_CONFIG.gpName}, तालुका: ${PANCHAYAT_CONFIG.taluka}`;
    const mtb = PH * 0.03; // Significantly reduced top margin for Namuna 9 as requested <!-- id: a3 -->

    registerFonts(doc);
    drawHeader(doc, logo, T1, T2, false); // Removed header border <!-- id: a4 -->

    // Define the specific tax heads per user block
    const TAX_HEADS = [
        { label: '१. गृहकर', key: 'propertyTax' },
        { label: '२. भूमी कर', key: 'openSpaceTax' },
        { label: '३. वीज / दिवाबत्ती कर', key: 'streetLightTax' },
        { label: '४. आरोग्य स्वच्छता कर', key: 'healthTax' },
        { label: '५. सामान्य पाणी कर', key: 'generalWaterTax' },
        { label: '६. विशेष पाणी कर', key: 'specialWaterTax' },
        { label: '७. कचरा गाडी कर', key: 'wasteCollectionTax' },
        { label: '८. मागील थकबाकी', key: 'arrearsAmount' },
        { label: '९. व्याज ५%', key: 'penaltyArrears' },
        { label: '१०. दंड ५%', key: 'penaltyCurrent' },
        { label: '११. एकूण मागणी', key: 'total', isBold: true },
    ];

    const body: any[] = [];
    records.forEach((r, rIdx) => {
        const rowCount = TAX_HEADS.length;
        const totalArrears = Number(r.arrearsAmount) || 0;
        const totalCurrent = Number(r.totalTaxAmount) || 0;
        const penaltyOnArrears = Number(r.penaltyAmount) || Math.round(totalArrears * 0.05);
        const penaltyOnCurrent = Math.round(totalCurrent * 0.05); // Standard 5% for report breakdown
        const paid = Number(r.paidAmount) || 0;
        const balance = (totalArrears + totalCurrent + penaltyOnArrears + penaltyOnCurrent) - paid;

        TAX_HEADS.forEach((head, hIdx) => {
            const row: any[] = [];

            // Columns 1-5: Rowspanned Owner Info
            if (hIdx === 0) {
                row.push({ content: MN(rIdx + 1), rowSpan: rowCount, styles: { halign: 'center' } });
                row.push({
                    content: `श्री ${r.ownerName || '-'}\n${PANCHAYAT_CONFIG.financialYearEn}\nभोगवटादाराचे नाव :\n\nपत्ता :- ${r.wastiName || '-'}`,
                    rowSpan: rowCount,
                    styles: { fontSize: 6.5, halign: 'left' }
                });
                row.push({ content: MN(r.plotNo) || '-', rowSpan: rowCount, styles: { halign: 'center' } });
                row.push({ content: MN(r.khasraNo) || '-', rowSpan: rowCount, styles: { halign: 'center' } });
                row.push({ content: MN(r.propertyId || r.srNo), rowSpan: rowCount, styles: { halign: 'center' } });
            }

            // Column 6: Tax Name
            row.push({ content: head.label, styles: { halign: 'left', fontStyle: head.isBold ? 'bold' : 'normal' } });

            // Columns 7-9: Demand Section (Prev, Curr, Total)
            let dPrev = 0;
            let dCurr = 0;

            if (head.key === 'total') {
                dPrev = totalArrears + penaltyOnArrears;
                dCurr = totalCurrent + penaltyOnCurrent;
            } else if (head.key === 'arrearsAmount') {
                dPrev = totalArrears;
            } else if (head.key === 'penaltyArrears') {
                dPrev = penaltyOnArrears;
            } else if (head.key === 'penaltyCurrent') {
                dCurr = penaltyOnCurrent;
            } else {
                // Individual current taxes
                dCurr = Number((r as any)[head.key]) || 0;
            }

            const dTotal = dPrev + dCurr;

            row.push(dPrev > 0 ? MN(dPrev) : '');
            row.push(dCurr > 0 ? MN(dCurr) : '');
            row.push({ content: dTotal > 0 ? MN(dTotal) : '', styles: { fontStyle: head.isBold ? 'bold' : 'normal' } });

            // Column 10: Summary Note
            if (hIdx === 10) row.push({ content: 'एकूण मागणी', styles: { fontStyle: 'bold', fontSize: 6 } });
            else row.push('');

            // Column 11: Book/Receipt (Rowspanned)
            if (hIdx === 0) {
                row.push({
                    content: `पावती बुक : ${MN(r.receiptBook || '-')}\nपावती क्र. : ${MN(r.receiptNo || '-')}`,
                    rowSpan: rowCount,
                    styles: { halign: 'center', fontSize: 5.5 }
                });
            }

            // Column 12: Date (Dedicated Column)
            if (hIdx === 0) {
                const pDate = r.paymentDate ? (r.paymentDate.includes('-') ? r.paymentDate.split('-').reverse().join('/') : r.paymentDate) : '-';
                row.push({
                    content: pDate,
                    rowSpan: rowCount,
                    styles: { halign: 'center', fontSize: 6 }
                });
            }

            // Column 13: Tax Name (Recovery side)
            row.push(head.label);

            // Columns 14-17: Recovery Section
            row.push(''); // Prev Recov
            row.push(''); // Curr Recov
            row.push(''); // Total Recov

            if (hIdx === 10) {
                row.push({ content: paid > 0 ? MN(paid) : '', styles: { fontStyle: 'bold' } });
            } else {
                row.push('');
            }

            // Column 18: Balance
            if (hIdx === 10) {
                row.push({ content: MN(balance), styles: { fontStyle: 'bold' } });
            } else {
                row.push('');
            }

            body.push(row);
        });
    });

    const headN9 = [
        [
            { content: 'अ.क्र.', rowSpan: 2 },
            { content: 'घरमालकाचे नाव', rowSpan: 2 },
            { content: 'प्लॉट नं.', rowSpan: 2 },
            { content: 'खासरा नं.', rowSpan: 2 },
            { content: 'मालमत्ता नं.', rowSpan: 2 },
            { content: 'कराची नावे', rowSpan: 2 },
            { content: 'मागणी', colSpan: 3 },
            { content: 'एकूण मागणी', rowSpan: 2 },
            { content: 'पावती बुक पावती क्र.', rowSpan: 2 },
            { content: 'दिनांक', rowSpan: 2 },
            { content: 'कराची नावे', rowSpan: 2 },
            { content: 'वसुली', colSpan: 3 },
            { content: 'एकूण वसुली', rowSpan: 2 },
            { content: 'बाकी', rowSpan: 2 },
        ],
        [
            'मागील रुपये', 'चालू रुपये', 'एकूण',
            'मागील रुपये', 'चालू रुपये', 'एकूण',
        ]
    ];

    autoTable(doc, {
        head: headN9,
        body,
        startY: mtb + 30, // Adjusted for reduced margin <!-- id: a5 -->
        margin: { top: mtb, bottom: mtb, left: M, right: M },
        tableWidth: PW - 2 * M,
        styles: {
            fontSize: 6.2,
            cellPadding: 0.5,
            lineWidth: 0.1,
            lineColor: BLACK,
            valign: 'middle',
            font: 'NotoMarathi',
            textColor: BLACK,
            halign: 'center'
        },
        headStyles: {
            fillColor: HEAD_BG,
            textColor: BLACK,
            fontStyle: 'bold',
            fontSize: 5.5,
        },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 40 },
            2: { cellWidth: 12 },
            3: { cellWidth: 12 },
            4: { cellWidth: 12 },
            5: { cellWidth: 32, halign: 'left' },
            6: { cellWidth: 14 }, 7: { cellWidth: 14 }, 8: { cellWidth: 14 },
            9: { cellWidth: 12 },
            10: { cellWidth: 15 },
            11: { cellWidth: 15 },
            12: { cellWidth: 32, halign: 'left' },
            13: { cellWidth: 14 }, 14: { cellWidth: 14 }, 15: { cellWidth: 14 },
            16: { cellWidth: 14 },
            17: { cellWidth: 'auto' },
        },
        didDrawPage: (data: any) => {
            if (data.pageNumber > 1) drawHeader(doc, logo, T1, T2, false);
        }
    } as any);

    const { width, height } = doc.internal.pageSize;
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(10);
    doc.text(`ग्रामपंचायत वेळा हरिश्चंद्र मौजा घोटाळापांजरी जिल्हा नागपूर`, width / 2, height - mtb + 5, { align: 'center' });

    doc.save(`Namuna9_${PANCHAYAT_CONFIG.financialYearEn}.pdf`);
};

// ─── MAGANI BILL (DEMAND BILL) ────────────────────────────────────────────────
export const generateMaganiBillPDF = async (record: PropertyRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await loadLogo();
    registerFonts(doc);
    const P_WIDTH = 210;
    const P_HEIGHT = 297;
    const MARGIN = 10;
    const MTB_MAGANI = P_HEIGHT * 0.05; // ~14.85mm

    const calc = calculateBill(record.arrearsAmount || 0, record.totalTaxAmount || 0);
    const currYear = PANCHAYAT_CONFIG.financialYear;

    // 1. Watermark (Mandatory & Larger)
    if (logo) {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logo, 'PNG', 55, 100, 100, 100);
        doc.restoreGraphicsState();
    }

    // Outer Border
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN, MTB_MAGANI, P_WIDTH - 2 * MARGIN, P_HEIGHT - 2 * MTB_MAGANI);

    // 2. Header Section
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, MTB_MAGANI + 40, P_WIDTH - MARGIN, MTB_MAGANI + 40);

    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(8);
    doc.text(`बुक नं. ${MN((record as any).bookNo || 1)}`, MARGIN + 5, MTB_MAGANI + 10);
    doc.text(`बिल नं. ${MN(record.srNo)}`, P_WIDTH - MARGIN - 5, MTB_MAGANI + 10, { align: 'right' });

    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(8);
    doc.text(`(नमुना नं. ९ "क")`, P_WIDTH / 2, MTB_MAGANI + 10, { align: 'center' });

    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...HEAD_BG);
    doc.text(`कराच्या मागणीचे बिल`, P_WIDTH / 2, MTB_MAGANI + 18, { align: 'center' });

    doc.setTextColor(...BLACK);
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(9);
    doc.text(`कार्यालय ग्रामपंचायत ${PANCHAYAT_CONFIG.gpName} मौजा ${record.wastiName || ''}`, P_WIDTH / 2, MTB_MAGANI + 25, { align: 'center' });
    doc.text(`पंचायत समिती ${PANCHAYAT_CONFIG.taluka} जि. ${PANCHAYAT_CONFIG.jilha}`, P_WIDTH / 2, MTB_MAGANI + 30, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`(मुंबई ग्रा. पं. कायदा १९५८ कलम १२९ अन्वये)`, P_WIDTH / 2, MTB_MAGANI + 35, { align: 'center' });

    // 3. Owner Info Section
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(10);
    doc.text(`श्री ${record.ownerName || '-'}`, MARGIN + 5, MTB_MAGANI + 48);
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(9);
    doc.text(`यांचेकडुन`, MARGIN + 5, MTB_MAGANI + 53);

    autoTable(doc, {
        body: [
            [`वार्ड नं. - ${MN(record.wardNo || '-')}`, `घर नं. - ${MN(record.srNo || '-')}`, `प्लॉट नं. - ${MN(record.plotNo || '-')}`, `खसरा नं. - ${MN(record.khasraNo || '-')}`],
        ],
        startY: MTB_MAGANI + 55,
        margin: { left: MARGIN + 2, right: MARGIN + 2, top: MTB_MAGANI, bottom: MTB_MAGANI },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: BLACK, font: (doc as any).getFontList().NotoMarathi ? 'NotoMarathi' : 'helvetica' },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 'auto' } }
    });

    const subY = (doc as any).lastAutoTable.finalY + 5;
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.setFontSize(9);
    doc.text(`सोसायटीचे नाव - ${record.layoutName || '-'} याबद्दल`, MARGIN + 5, subY);
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.text(`सन ${currYear} करीता पुढे नमूद केलेल्या रकमा`, MARGIN + 5, subY + 6);

    // 4. Main Tax Table
    const taxRows: any[][] = [
        ['घरपट्टी', MN(0), MN(record.propertyTax || 0), MN(record.propertyTax || 0)],
        ['घरपट्टी (जागा)', MN(0), MN(record.openSpaceTax || 0), MN(record.openSpaceTax || 0)],
        ['दिवाबत्ती कर', MN(0), MN(record.streetLightTax || 0), MN(record.streetLightTax || 0)],
        ['आरोग्य कर', MN(0), MN(record.healthTax || 0), MN(record.healthTax || 0)],
        ['कचरा गाडी कर', MN(0), MN(record.wasteCollectionTax || 0), MN(record.wasteCollectionTax || 0)],
        ['सामान्य पाणी कर', MN(0), MN(record.generalWaterTax || 0), MN(record.generalWaterTax || 0)],
        ['विशेष पाणी कर', MN(0), MN(record.specialWaterTax || 0), MN(record.specialWaterTax || 0)],
        ['उशिरा कर (५% दंड)', MN(calc.penaltyAmount), MN(0), MN(calc.penaltyAmount)],
        ['नोटीस फी', MN(0), MN(0), MN(0)],
        ['अधिकाऱ्याची (वॉरंटी फी)', MN(0), MN(0), MN(0)],
        ['इतर', MN(0), MN(0), MN(0)],
    ];

    autoTable(doc, {
        head: [[
            { content: 'कराची नावे', styles: { halign: 'center', fontStyle: 'bold' } },
            { content: `सन २०२४-२५\nमागील बाकी रुपये`, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: `सन ${currYear}\nचालू कर रुपये`, styles: { halign: 'center', fontStyle: 'bold' } },
            { content: 'एकुण रुपये', styles: { halign: 'center', fontStyle: 'bold' } }
        ]],
        body: [
            ...taxRows,
            [
                { content: 'एकूण', styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: MN(calc.arrearsTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: MN(calc.currentTaxTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: `रु. ${MN(calc.billTotal)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 10 } }
            ]
        ],
        startY: subY + 10,
        margin: { left: MARGIN + 2, right: MARGIN + 2 },
        styles: { fontSize: 8.5, cellPadding: 2.5, lineWidth: 0.2, lineColor: BLACK, font: (doc as any).getFontList().NotoMarathi ? 'NotoMarathi' : 'helvetica' },
        headStyles: { fillColor: [245, 245, 245], textColor: BLACK, lineWidth: 0.2, lineColor: BLACK },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 'auto', halign: 'right' }
        }
    });

    const footerY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8.5);
    safeSetFont(doc, 'NotoMarathi', 'normal');
    doc.text(`वरील बिलात नमूद केलेल्या करदाखल्याच्या रकमा दि. ________________ पर्यंत आत ग्रा. पं. चे कार्यालयात`, MARGIN + 5, footerY);
    doc.text(`पटवून पावती घ्यावी. असे न केल्यास आपले वर योग्य कारवाई करण्यात येईल.`, MARGIN + 5, footerY + 5);

    doc.text(`मागणी बिल मिळाल्याबाबत स्वाक्षरी`, MARGIN + 5, footerY + 25);
    doc.text(`दिनांक : ${MN(new Date().toLocaleDateString('mr-IN'))}`, MARGIN + 5, footerY + 35);

    // Signature Area
    const sigX = P_WIDTH - MARGIN - 60;
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.text(`सरपंच/सचिव`, sigX + 30, footerY + 25, { align: 'center' });
    doc.text(`ग्रामपंचायत ${PANCHAYAT_CONFIG.gpName}`, sigX + 30, footerY + 30, { align: 'center' });
    doc.text(`पं. स. ${PANCHAYAT_CONFIG.taluka}`, sigX + 30, footerY + 35, { align: 'center' });

    // Discount Note
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN + 5, footerY + 45, P_WIDTH - 2 * MARGIN - 10, 10);
    safeSetFont(doc, 'NotoMarathi', 'bold');
    doc.setFontSize(8);
    doc.text(`टिप: महाराष्ट्र ग्रामपंचायत कर व फी (सुधारणा) व नियम २०१५ नुसार ३० सप्टेंबर पर्यंत कर भरल्यास ५% सुट देण्यात येईल.`, P_WIDTH / 2, footerY + 51, { align: 'center' });

    doc.save(`MaganiBill_${record.propertyId || record.srNo}_${record.ownerName}.pdf`);
};



