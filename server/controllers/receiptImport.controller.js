/**
 * RECEIPT IMPORT CONTROLLER - पावती डेटा Excel Import
 *
 * Excel file मधून पावती बुक क्र., पावती क्र., दिनांक
 * properties table मध्ये match करून update करतो.
 *
 * Match Strategy (क्रमाने):
 *   1. srNo + wastiName + plotNo  (सर्वात अचूक)
 *   2. srNo + plotNo
 *   3. ownerName + plotNo
 */

const xlsx    = require('xlsx');
const path    = require('path');
const fs      = require('fs');
const db      = require('../config/db.config');
const { clearPropertiesCache } = require('../utils/cache.util');

// ─── Column name normalizer ───────────────────────────────────────────────────
// Excel headers can be in Marathi/English, trim & lowercase for matching
const norm = (s) => String(s || '').trim().toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '');

// Map possible Marathi/English column names → internal keys
const COL_MAP = {
    srno:               ['srno', 'अक्र', 'अनुक्रमांक', 'srNo', 'sr', 'srnumber'],
    wastiName:          ['wastiname', 'वस्तीचेनाव', 'वस्ती', 'wasti', 'wastiनाव'],
    plotNo:             ['plotno', 'प्लॉटक्रमांक', 'प्लॉट', 'plotnumber', 'मालमत्ताक्र'],
    ownerName:          ['ownername', 'मालकाचेनाव', 'मालक', 'owner'],
    receiptBook:        ['receiptbook', 'पावतीबुकक्र', 'बुकक्र', 'bookno', 'पावतीबुक', 'receiptbookno'],
    receiptNo:          ['receiptno', 'पावतीक्र', 'पावतीक्रमांक', 'pavatiकर', 'receiptnumber', 'पावती'],
    paymentDate:        ['paymentdate', 'दिनांक', 'date', 'paydate', 'pavatidate', 'भरण्याचादिनांक'],
    paidAmount:         ['paidamount', 'वसुली', 'भरलेलीरक्कम', 'amount', 'रक्कम'],
};

function detectColumn(headers) {
    const result = {};
    headers.forEach((h, idx) => {
        const key = norm(h);
        for (const [field, aliases] of Object.entries(COL_MAP)) {
            if (aliases.some(a => norm(a) === key || key.includes(norm(a)))) {
                if (!result[field]) result[field] = idx; // first match wins
            }
        }
    });
    return result;
}

// ─── POST /api/properties/import-receipts ─────────────────────────────────────
exports.importReceipts = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Excel file आवश्यक आहे' });
    }

    const filePath = req.file.path;

    try {
        // Parse Excel
        const wb = xlsx.readFile(filePath, { cellDates: true, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rawRows.length < 2) {
            return res.status(400).json({ error: 'Excel file रिकामी आहे किंवा header नाही' });
        }

        const headers = rawRows[0].map(String);
        const colIdx  = detectColumn(headers);

        // Validate required columns
        const missing = [];
        if (colIdx.receiptNo  === undefined) missing.push('पावती क्र. (receiptNo)');
        if (colIdx.paymentDate === undefined) missing.push('दिनांक (paymentDate)');
        if (missing.length) {
            return res.status(400).json({
                error: `Excel मध्ये आवश्यक columns सापडले नाहीत: ${missing.join(', ')}`,
                detected_columns: headers,
                hint: 'columns: पावती बुक क्र., पावती क्र., दिनांक, अ.क्र. (srNo), वस्ती, प्लॉट क्र.'
            });
        }

        const dataRows = rawRows.slice(1).filter(r =>
            r.some(c => String(c).trim() !== '')
        );

        let updated = 0, skipped = 0, notFound = 0;
        const errors = [];
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNum = i + 2; // 1-indexed + header row

                const get = (field) => {
                    const idx = colIdx[field];
                    return idx !== undefined ? String(row[idx] || '').trim() : '';
                };

                const receiptNo   = get('receiptNo');
                const receiptBook = get('receiptBook');
                const paymentDate = get('paymentDate');
                const paidAmount  = get('paidAmount');
                const srNo        = get('srno');
                const plotNo      = get('plotNo');
                const wastiName   = get('wastiName');
                const ownerName   = get('ownerName');

                if (!receiptNo && !receiptBook && !paymentDate) {
                    skipped++;
                    continue; // empty row, skip
                }

                // Normalize paymentDate: DD/MM/YYYY → YYYY-MM-DD or keep as string
                let dateStr = paymentDate;
                if (paymentDate && paymentDate.includes('/')) {
                    const parts = paymentDate.split('/');
                    if (parts.length === 3 && parts[2].length === 4) {
                        dateStr = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                    }
                }

                // Build UPDATE fields
                const setClauses = [];
                const setParams  = [];
                if (receiptBook) { setClauses.push('receiptBook = ?'); setParams.push(receiptBook); }
                if (receiptNo)   { setClauses.push('receiptNo = ?');   setParams.push(receiptNo);   }
                if (dateStr)     { setClauses.push('paymentDate = ?'); setParams.push(dateStr);      }
                if (paidAmount && !isNaN(paidAmount)) {
                    setClauses.push('paidAmount = ?');
                    setParams.push(parseFloat(paidAmount));
                }

                if (setClauses.length === 0) { skipped++; continue; }

                // Try matching strategies
                let affectedRows = 0;

                // Strategy 1: srNo + wastiName + plotNo
                if (srNo && wastiName && plotNo) {
                    const [r] = await conn.query(
                        `UPDATE properties SET ${setClauses.join(', ')}
                         WHERE srNo = ? AND wastiName = ? AND plotNo = ?`,
                        [...setParams, srNo, wastiName, plotNo]
                    );
                    affectedRows = r.affectedRows;
                }

                // Strategy 2: srNo + plotNo
                if (!affectedRows && srNo && plotNo) {
                    const [r] = await conn.query(
                        `UPDATE properties SET ${setClauses.join(', ')}
                         WHERE srNo = ? AND plotNo = ?`,
                        [...setParams, srNo, plotNo]
                    );
                    affectedRows = r.affectedRows;
                }

                // Strategy 3: ownerName + plotNo
                if (!affectedRows && ownerName && plotNo) {
                    const [r] = await conn.query(
                        `UPDATE properties SET ${setClauses.join(', ')}
                         WHERE ownerName LIKE ? AND plotNo = ?`,
                        [...setParams, `%${ownerName.substring(0, 20)}%`, plotNo]
                    );
                    affectedRows = r.affectedRows;
                }

                if (affectedRows > 0) {
                    updated += affectedRows;
                } else {
                    notFound++;
                    if (notFound <= 10) { // log first 10 not found
                        errors.push(`Row ${rowNum}: srNo=${srNo}, plotNo=${plotNo}, wastiName=${wastiName} — सापडला नाही`);
                    }
                }
            }

            await conn.commit();
            if (updated > 0) {
                await clearPropertiesCache();
            }

        } catch (dbErr) {
            await conn.rollback();
            throw dbErr;
        } finally {
            conn.release();
            // Clean up uploaded file
            try { fs.unlinkSync(filePath); } catch (_) {}
        }

        res.json({
            success: true,
            message: `Import पूर्ण झाले`,
            updated,
            skipped,
            not_found: notFound,
            total_rows: dataRows.length,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (err) {
        try { fs.unlinkSync(filePath); } catch (_) {}
        console.error('[RECEIPT IMPORT] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ─── GET /api/properties/import-receipts/template ────────────────────────────
// Download a sample Excel template
exports.downloadTemplate = (req, res) => {
    const wb = xlsx.utils.book_new();
    const headers = ['अ.क्र. (srNo)', 'वस्ती (wastiName)', 'प्लॉट क्र. (plotNo)', 'मालकाचे नाव', 'पावती बुक क्र.', 'पावती क्र.', 'दिनांक (DD/MM/YYYY)', 'वसुली रक्कम'];
    const sample  = [1, 'शंकरपुर', '56', 'श्री अरुण देशमुख', 'B-12', 'GP-001', '01/04/2025', 6320];
    const ws = xlsx.utils.aoa_to_sheet([headers, sample]);

    // Column widths
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    xlsx.utils.book_append_sheet(wb, ws, 'पावती Import');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="receipt_import_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
};
