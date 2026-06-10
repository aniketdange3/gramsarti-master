/**
 * FY CONTROLLER - आर्थिक वर्ष नियंत्रण केंद्र (Fiscal Year Management)
 */

const db = require('../config/db.config');
const { getCache, setCache, clearCache, CACHE_TTL_LONG, clearPropertiesCache } = require('../utils/cache.util');

const CACHE_KEY_CURRENT_FY = 'fy:current';

/**
 * Get current FY and basic stats
 */
exports.getCurrent = async (req, res) => {
    try {
        const cached = await getCache(CACHE_KEY_CURRENT_FY);
        if (cached) return res.json(cached);

        const [rows] = await db.query("SELECT config_value FROM system_config WHERE config_key = 'current_fy'");
        const currentFY = rows[0]?.config_value || '2024-25';
        const data = { currentFY };
        
        await setCache(CACHE_KEY_CURRENT_FY, data, CACHE_TTL_LONG);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all FY records for a specific property
 */
exports.getPropertyFYData = async (req, res) => {
    try {
        const propertyId = req.params.propertyId;
        const cacheKey = `fy:property:${propertyId}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query("SELECT * FROM property_fy_records WHERE property_id = ? ORDER BY financial_year DESC", [propertyId]);
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
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
 * Execute migration - Final process to shift years
 */
exports.executeMigration = async (req, res) => {
    const { newFY } = req.body;
    if (!newFY) {
        return res.status(400).json({ error: "नवीन आर्थिक वर्ष निवडणे आवश्यक आहे." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Update the current FY in system configuration
        await connection.query("UPDATE system_config SET config_value = ? WHERE config_key = 'current_fy'", [newFY]);
        await clearCache(CACHE_KEY_CURRENT_FY);
        await clearCache('master:system_config');
        
        // 2. Roll over balances and RESET RECEIPT DETAILS (पावती तपशील रीसेट)
        // New Arrears = (Old Arrears + Current Demand + Penalty) - Paid Amount
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
        await clearPropertiesCache();
        
        res.json({ 
            success: true, 
            message: `सन ${newFY} मध्ये स्थलांतर यशस्वी झाले. पावती तपशील रीसेट करण्यात आला आहे.` 
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[FY_MIGRATE] Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Update chalu amount
 */
exports.updateChalu = async (req, res) => {
    const { amount } = req.body;
    try {
        await db.query("UPDATE properties SET totalTaxAmount = ? WHERE id = ?", [amount, req.params.propertyId]);
        await clearPropertiesCache();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
