/**
 * MAGANI CONTROLLER - मागणी आणि जप्ती सूचना (Demand Notices)
 * 
 * या फाईलमध्ये थकीत कर वसुलीसाठी मागणी पत्र (Demand Note) तयार करणे, 
 * आणि विविध स्तरावर सूचना (Notices) पाठवण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');

/**
 * Get list of tax defaulters
 * थकीत कर असलेल्या मालमत्तांची यादी मिळवणे
 */
exports.getDefaulters = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.srNo, p.ownerName, p.occupantName, p.wastiName, p.wardNo, p.plotNo,
                    p.totalTaxAmount, p.arrearsAmount, p.paidAmount,
                    (COALESCE(p.totalTaxAmount, 0) + COALESCE(p.arrearsAmount, 0) - COALESCE(p.paidAmount, 0)) as balance
             FROM properties p
             WHERE (COALESCE(p.totalTaxAmount, 0) + COALESCE(p.arrearsAmount, 0) - COALESCE(p.paidAmount, 0)) > 0
             ORDER BY balance DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('[MAGANI] Defaulters error:', err);
        res.status(500).json({ error: 'थकीत यादी मिळवण्यात त्रुटी आली' });
    }
};

/**
 * Generate Magani Bills (Demand Notes) for multiple properties
 * मागणी पत्र जनरेट करणे (Bulk Generation)
 */
exports.generateBills = async (req, res) => {
    try {
        const { property_ids } = req.body;
        if (!property_ids || property_ids.length === 0) {
            return res.status(400).json({ error: 'कोणतीही मालमत्ता निवडलेली नाही' });
        }

        const generated = [];
        for (const pid of property_ids) {
            const [props] = await db.query(
                `SELECT id, totalTaxAmount, arrearsAmount, paidAmount FROM properties WHERE id = ?`, [pid]
            );
            if (props.length === 0) continue;
            
            const p = props[0];
            const balance = (Number(p.totalTaxAmount) || 0) + (Number(p.arrearsAmount) || 0) - (Number(p.paidAmount) || 0);
            if (balance <= 0) continue;

            // व्याज (Interest): १.५% दरमहा (Simple Approximation)
            const interest = Math.round(balance * 0.015 * 100) / 100;
            // दंड (Penalty): ५% (Flat)
            const penalty = Math.round(balance * 0.05 * 100) / 100;
            const totalDue = balance + interest + penalty;

            const issuedDate = new Date().toISOString().slice(0, 10);
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

            const [result] = await db.query(
                `INSERT INTO magani_bills (
                    property_id, overdue_amount, interest_amount, penalty_amount, 
                    total_due, notice_stage, status, issued_date, due_date, created_by
                ) VALUES (?, ?, ?, ?, ?, 'First', 'Issued', ?, ?, ?)`,
                [pid, balance, interest, penalty, totalDue, issuedDate, dueDate, req.user.id]
            );

            // पहिली सूचना तयार करणे (Insert first notice sequence)
            await db.query(`INSERT INTO notices (bill_id, stage, issued_date) VALUES (?, 'First', ?)`, [result.insertId, issuedDate]);

            generated.push({ id: result.insertId, property_id: pid, total_due: totalDue });
        }

        res.status(201).json({ 
            count: generated.length, 
            bills: generated,
            message: 'मागणी पत्र यशस्वीरित्या जनरेट झाले' 
        });
    } catch (err) {
        res.status(500).json({ error: 'मागणी पत्र तयार करताना त्रुटी आली' });
    }
};

/**
 * List all generated demand notices
 * सर्व मागणी पत्रांची यादी पाहणे
 */
exports.getAllBills = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT m.*, p.ownerName, p.occupantName, p.wastiName, p.wardNo, p.srNo, p.plotNo, u.name as created_by_name
             FROM magani_bills m
             LEFT JOIN properties p ON m.property_id = p.id
             LEFT JOIN users u ON m.created_by = u.id
             ORDER BY m.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'यादी मिळवण्यात त्रुटी आली' });
    }
};

/**
 * Advance notice to next stage (First -> Second -> Final -> Legal)
 * सूचनेचा पुढील स्तर अपडेट करणे (Stage progression)
 */
exports.advanceNotice = async (req, res) => {
    try {
        const [bills] = await db.query('SELECT * FROM magani_bills WHERE id = ?', [req.params.id]);
        if (bills.length === 0) return res.status(404).json({ error: 'मागणी पत्र सापडले नाही' });

        const bill = bills[0];
        const nextStage = bill.notice_stage === 'First' ? 'Second' : bill.notice_stage === 'Second' ? 'Final' : 'Legal';

        await db.query('UPDATE magani_bills SET notice_stage = ? WHERE id = ?', [nextStage, req.params.id]);

        if (nextStage !== 'Legal') {
            await db.query(
                `INSERT INTO notices (bill_id, stage, issued_date) VALUES (?, ?, ?)`,
                [req.params.id, nextStage, new Date().toISOString().slice(0, 10)]
            );
        } else {
            await db.query('UPDATE magani_bills SET status = ? WHERE id = ?', ['Legal', req.params.id]);
        }

        res.json({ success: true, newStage: nextStage, message: 'पुढील सूचनेचा स्तर अपडेट झाला' });
    } catch (err) {
        res.status(500).json({ error: 'अपडेट करताना त्रुटी आली' });
    }
};

/**
 * Recovery Summary Report
 * वसुली अहवाल (Recovery Summary)
 */
exports.getReport = async (req, res) => {
    try {
        const [summary] = await db.query(
            `SELECT status, COUNT(*) as count, SUM(total_due) as totalDue FROM magani_bills GROUP BY status`
        );
        const [byStage] = await db.query(
            `SELECT notice_stage, COUNT(*) as count FROM magani_bills WHERE status != 'Paid' GROUP BY notice_stage`
        );
        res.json({ summary, byStage });
    } catch (err) {
        res.status(500).json({ error: 'अहवाल मिळवण्यात त्रुटी आली' });
    }
};
