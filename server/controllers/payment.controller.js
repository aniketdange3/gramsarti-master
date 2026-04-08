/**
 * PAYMENT CONTROLLER - देयके आणि वसुली नियंत्रण (Payments & Collections)
 * 
 * या फाईलमध्ये कर भरणा (Tax Payment), पावती तयार करणे, 
 * आणि दैनंदिन वसुली अहवालाचे लॉजिक आहे.
 */

const db = require('../config/db.config');

/**
 * Record a new payment
 * नवीन कर भरणा नोंदवणे (Receipt Generation)
 */
exports.createPayment = async (req, res) => {
    try {
        const { 
            property_id, amount, payment_mode, payment_date, 
            cheque_no, cheque_bank, upi_ref, remarks, 
            financial_year, receipt_book, discount_applied, penalty_applied 
        } = req.body;

        if (!property_id || !amount || !payment_mode || !payment_date) {
            return res.status(400).json({ error: 'महत्त्वाची माहिती (Property, Amount, Mode, Date) आवश्यक आहे' });
        }

        // पावती क्रमांक तयार करणे: GP-YYYYMMDD-NNNN (Generate receipt number)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM payments WHERE DATE(created_at) = CURDATE()');
        const seq = String((countRows[0].cnt || 0) + 1).padStart(4, '0');
        const receipt_no = `GP-${dateStr}-${seq}`;

        const chequeStatus = payment_mode === 'Cheque' ? 'Pending' : null;

        const [result] = await db.query(
            `INSERT INTO payments (
                receipt_no, property_id, amount, payment_mode, payment_date, 
                collector_id, cheque_no, cheque_bank, cheque_status, upi_ref, 
                remarks, financial_year, receipt_book
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                receipt_no, property_id, amount, payment_mode, payment_date, 
                req.user.id, cheque_no || null, cheque_bank || null, chequeStatus, 
                upi_ref || null, remarks || null, financial_year || '2025-26', receipt_book || null
            ]
        );

        // मालमत्तेचा भरलेला कर आणि सूट अपडेट करणे (Update property balances)
        const disc = Number(discount_applied) || 0;
        const pen = Number(penalty_applied) || 0;

        await db.query(
            `UPDATE properties 
             SET paidAmount = COALESCE(paidAmount, 0) + ?, 
                 discountAmount = COALESCE(discountAmount, 0) + ?, 
                 penaltyAmount = GREATEST(COALESCE(penaltyAmount, 0), ?) 
             WHERE id = ?`,
            [amount, disc, pen, property_id]
        );

        res.status(201).json({ 
            id: result.insertId, 
            receipt_no, 
            amount, 
            payment_mode,
            message: 'पेमेंट यशस्वीरित्या नोंदवले गेले' 
        });
    } catch (err) {
        console.error('[PAYMENT] Create error:', err);
        res.status(500).json({ error: 'पेमेंट जतन करताना त्रुटी आली' });
    }
};

/**
 * List all payments with filters
 * सर्व देयकांची यादी (Filter by property, date)
 */
exports.getAllPayments = async (req, res) => {
    try {
        const { property_id, date_from, date_to } = req.query;
        let sql = `
            SELECT p.*, u.name as collector_name, pr.ownerName, pr.wastiName, pr.wardNo, pr.srNo
            FROM payments p
            LEFT JOIN users u ON p.collector_id = u.id
            LEFT JOIN properties pr ON p.property_id = pr.id
            WHERE 1=1
        `;
        const params = [];
        if (property_id) { sql += ' AND p.property_id = ?'; params.push(property_id); }
        if (date_from) { sql += ' AND p.payment_date >= ?'; params.push(date_from); }
        if (date_to) { sql += ' AND p.payment_date <= ?'; params.push(date_to); }
        sql += ' ORDER BY p.created_at DESC';

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'पेमेंट यादी मिळवण्यात त्रुटी आली' });
    }
};

/**
 * Get single receipt details
 * पावतीचे सविस्तर तपशील मिळवणे
 */
exports.getReceiptById = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, u.name as collector_name, pr.ownerName, pr.occupantName, 
                    pr.wastiName, pr.wardNo, pr.plotNo, pr.srNo, pr.totalTaxAmount, pr.arrearsAmount
             FROM payments p
             LEFT JOIN users u ON p.collector_id = u.id
             LEFT JOIN properties pr ON p.property_id = pr.id
             WHERE p.id = ?`, [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'पावती सापडली नाही' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'पावती तपशील मिळवण्यात त्रुटी आली' });
    }
};

/**
 * Daily summary for collection closing
 * दैनंदिन वसुली अहवाल (Daily Closing)
 */
exports.getDailySummary = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const [rows] = await db.query(
            `SELECT payment_mode, COUNT(*) as count, SUM(amount) as total
             FROM payments WHERE payment_date = ? GROUP BY payment_mode`, [date]
        );
        const [overall] = await db.query(
            `SELECT COUNT(*) as totalReceipts, SUM(amount) as totalAmount FROM payments WHERE payment_date = ?`, [date]
        );
        res.json({ date, byMode: rows, total: overall[0] });
    } catch (err) {
        res.status(500).json({ error: 'अहवाल जनरेट करण्यात त्रुटी आली' });
    }
};

/**
 * Update cheque status (Cleared/Bounced)
 * चेकची स्थिती अपडेट करणे (Bank status)
 */
exports.updateChequeStatus = async (req, res) => {
    try {
        const { status } = req.body; // Pending, Cleared, Bounced
        await db.query('UPDATE payments SET cheque_status = ? WHERE id = ? AND payment_mode = ?', [status, req.params.id, 'Cheque']);
        
        if (status === 'Bounced') {
            // रिव्हर्स एन्ट्री: मालमत्तेचा भरलेला कर कमी करणे (Reverse paidAmount)
            const [payment] = await db.query('SELECT property_id, amount FROM payments WHERE id = ?', [req.params.id]);
            if (payment.length > 0) {
                await db.query(
                    'UPDATE properties SET paidAmount = GREATEST(COALESCE(paidAmount, 0) - ?, 0) WHERE id = ?', 
                    [payment[0].amount, payment[0].property_id]
                );
            }
        }
        res.json({ success: true, message: 'चेक स्टेटस अपडेट झाले' });
    } catch (err) {
        res.status(500).json({ error: 'स्टेटस अपडेट करण्यात त्रुटी आली' });
    }
};
