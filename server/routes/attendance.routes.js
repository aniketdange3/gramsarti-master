const express = require('express');
const { db } = require('../database');
const { authenticate } = require('../auth');

const router = express.Router();

// POST /api/attendance/check-in
router.post('/check-in', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if already checked in
        const [active] = await db.query(
            'SELECT id FROM attendance WHERE user_id = ? AND status = "ACTIVE"',
            [userId]
        );

        if (active.length > 0) {
            return res.status(400).json({ error: 'आधीच चेक-इन केले आहे' });
        }

        await db.query(
            'INSERT INTO attendance (user_id, status) VALUES (?, "ACTIVE")',
            [userId]
        );

        res.status(201).json({ success: true, message: 'चेक-इन यशस्वी' });
    } catch (err) {
        console.error('Check-in error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// POST /api/attendance/check-out
router.post('/check-out', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const [active] = await db.query(
            'SELECT id FROM attendance WHERE user_id = ? AND status = "ACTIVE" ORDER BY check_in DESC LIMIT 1',
            [userId]
        );

        if (active.length === 0) {
            return res.status(400).json({ error: 'सक्रिय चेक-इन सापडले नाही' });
        }

        await db.query(
            'UPDATE attendance SET check_out = CURRENT_TIMESTAMP, status = "COMPLETED" WHERE id = ?',
            [active[0].id]
        );

        res.json({ success: true, message: 'चेक-आउट यशस्वी' });
    } catch (err) {
        console.error('Check-out error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// GET /api/attendance/status
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [active] = await db.query(
            'SELECT id, check_in FROM attendance WHERE user_id = ? AND status = "ACTIVE"',
            [userId]
        );

        res.json({
            checkedIn: active.length > 0,
            checkInTime: active.length > 0 ? active[0].check_in : null
        });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

module.exports = router;
