/**
 * ATTENDANCE CONTROLLER - हजेरी नियंत्रण (Staff Attendance)
 * 
 * या फाईलमध्ये कर्मचाऱ्यांचे चेक-इन (Check-in) आणि 
 * चेक-आउट (Check-out) करण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');

/**
 * Handle Staff Check-in
 * कर्मचाऱ्याची हजेरी नोंदवणे
 */
exports.checkIn = async (req, res) => {
    try {
        const userId = req.user.id;

        // आधीच चेक-इन केले आहे का तपासणे (Check for existing active session)
        const [active] = await db.query(
            'SELECT id FROM attendance WHERE user_id = ? AND status = "ACTIVE"',
            [userId]
        );

        if (active.length > 0) {
            return res.status(400).json({ error: 'तुम्ही आधीच चेक-इन केले आहे' });
        }

        await db.query(
            'INSERT INTO attendance (user_id, status) VALUES (?, "ACTIVE")',
            [userId]
        );

        res.status(201).json({ success: true, message: 'चेक-इन यशस्वी झाले' });
    } catch (err) {
        console.error('[ATTENDANCE] Check-in error:', err);
        res.status(500).json({ error: 'हजेरी नोंदवताना तांत्रिक त्रुटी आली' });
    }
};

/**
 * Handle Staff Check-out
 * रजा किंवा कामाची वेळ संपल्यावर चेक-आउट करणे
 */
exports.checkOut = async (req, res) => {
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

        res.json({ success: true, message: 'चेक-आउट यशस्वी झाले' });
    } catch (err) {
        console.error('[ATTENDANCE] Check-out error:', err);
        res.status(500).json({ error: 'चेक-आउट करताना तांत्रिक त्रुटी आली' });
    }
};

/**
 * Get current attendance status
 * सध्याची हजेरी स्थिती पाहणे
 */
exports.getStatus = async (req, res) => {
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
        res.status(500).json({ error: 'स्थिती मिळवण्यात त्रुटी आली' });
    }
};
