/**
 * FY CONTROLLER - आर्थिक वर्ष नियंत्रण केंद्र (Fiscal Year Management)
 */

const db = require('../config/db.config');

/**
 * Get current FY and basic stats
 */
exports.getCurrent = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT config_value FROM system_config WHERE config_key = 'current_fy'");
        const currentFY = rows[0]?.config_value || '2024-25';
        res.json({ currentFY });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all FY records for a specific property
 */
exports.getPropertyFYData = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM property_fy_records WHERE property_id = ? ORDER BY financial_year DESC", [req.params.propertyId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Analyze migration (Preview)
 */
exports.analyzeMigration = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'active'");
        res.json({ propertyCount: rows[0].count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Execute migration
 */
exports.executeMigration = async (req, res) => {
    const { newFY } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.query("INSERT INTO system_config (config_key, config_value) VALUES ('current_fy', ?) ON DUPLICATE KEY UPDATE config_value = ?", [newFY, newFY]);
        
        await connection.query(`
            UPDATE properties 
            SET 
                arrearsAmount = (COALESCE(arrearsAmount, 0) + COALESCE(totalTaxAmount, 0) + COALESCE(penaltyAmount, 0)) - COALESCE(paidAmount, 0),
                paidAmount = 0,
                penaltyAmount = 0,
                discountAmount = 0,
                receiptNo = NULL,
                receiptBook = NULL,
                paymentDate = NULL
        `);
        
        await connection.commit();
        res.json({ success: true, message: 'स्थलांतर यशस्वी झाले' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

/**
 * Update chalu amount
 */
exports.updateChalu = async (req, res) => {
    const { amount } = req.body;
    try {
        await db.query("UPDATE properties SET totalTaxAmount = ? WHERE id = ?", [amount, req.params.propertyId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
