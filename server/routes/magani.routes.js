const express = require('express');
const { db } = require('../database');
const { authenticate, authorize } = require('../auth');

const router = express.Router();

// GET /api/magani/defaulters — properties overdue > 30 days
router.get('/defaulters', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.srNo, p.ownerName, p.occupantName, p.wastiName, p.wardNo, p.plotNo,
                    p.totalTaxAmount, p.arrearsAmount, p.paidAmount,
                    (COALESCE(p.totalTaxAmount,0) + COALESCE(p.arrearsAmount,0) - COALESCE(p.paidAmount,0)) as balance
             FROM properties p
             WHERE (COALESCE(p.totalTaxAmount,0) + COALESCE(p.arrearsAmount,0) - COALESCE(p.paidAmount,0)) > 0
             ORDER BY balance DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Defaulters error:', err);
        res.status(500).json({ error: 'Failed to fetch defaulters' });
    }
});

// POST /api/magani/generate — generate magani bill(s)
router.post('/generate', authenticate, authorize('super_admin', 'gram_sevak', 'operator'), async (req, res) => {
    try {
        const { property_ids } = req.body; // array of property IDs
        if (!property_ids || property_ids.length === 0) {
            return res.status(400).json({ error: 'No properties selected' });
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

            // Interest: 1.5% per month (simple approximation)
            const interest = Math.round(balance * 0.015 * 100) / 100;
            // Penalty: 5% flat
            const penalty = Math.round(balance * 0.05 * 100) / 100;
            const totalDue = balance + interest + penalty;

            const issuedDate = new Date().toISOString().slice(0, 10);
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

            const [result] = await db.query(
                `INSERT INTO magani_bills (property_id, overdue_amount, interest_amount, penalty_amount, total_due, notice_stage, status, issued_date, due_date, created_by)
                 VALUES (?, ?, ?, ?, ?, 'First', 'Issued', ?, ?, ?)`,
                [pid, balance, interest, penalty, totalDue, issuedDate, dueDate, req.user.id]
            );

            // Create first notice
            await db.query(
                `INSERT INTO notices (bill_id, stage, issued_date) VALUES (?, 'First', ?)`,
                [result.insertId, issuedDate]
            );

            generated.push({ id: result.insertId, property_id: pid, total_due: totalDue });
        }

        res.status(201).json({ generated: generated.length, bills: generated });
    } catch (err) {
        console.error('Magani generate error:', err);
        res.status(500).json({ error: 'Failed to generate bills' });
    }
});

// GET /api/magani/bills — list all magani bills
router.get('/bills', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT m.*, p.ownerName, p.occupantName, p.wastiName, p.wardNo, p.srNo, p.plotNo,
                    u.name as created_by_name
             FROM magani_bills m
             LEFT JOIN properties p ON m.property_id = p.id
             LEFT JOIN users u ON m.created_by = u.id
             ORDER BY m.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

// PUT /api/magani/:id/advance-notice — advance to next notice stage
router.put('/:id/advance-notice', authenticate, authorize('super_admin', 'gram_sevak'), async (req, res) => {
    try {
        const [bills] = await db.query('SELECT * FROM magani_bills WHERE id = ?', [req.params.id]);
        if (bills.length === 0) return res.status(404).json({ error: 'Bill not found' });

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

        res.json({ success: true, newStage: nextStage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to advance notice' });
    }
});

// GET /api/magani/report — recovery summary report
router.get('/report', authenticate, async (req, res) => {
    try {
        const [summary] = await db.query(
            `SELECT status, COUNT(*) as count, SUM(total_due) as totalDue
             FROM magani_bills GROUP BY status`
        );
        const [byStage] = await db.query(
            `SELECT notice_stage, COUNT(*) as count FROM magani_bills WHERE status != 'Paid' GROUP BY notice_stage`
        );
        res.json({ summary, byStage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

module.exports = router;
