/**
 * MASTER DATA CONTROLLER - मुख्य डेटा नियंत्रण केंद्र (Master Data)
 * 
 * या फाईलमध्ये वॉर्ड, वस्ती, मालमत्ता प्रकार, घसारा दर (Depreciation), 
 * आणि रेडी रेकनर दरांची माहिती व्यवस्थापित करण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');

/**
 * Get all categories
 * सर्व मास्टर कॅटेगरी मिळवणे
 */
exports.getAllCategories = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const [rows] = await db.query('SELECT * FROM master_categories ORDER BY name_mr ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get items by category code
 * ठराविक कॅटेगरीमधील आयटम्स मिळवणे
 */
exports.getItemsByCategory = async (req, res) => {
    try {
        const query = `
            SELECT i.* FROM master_items i
            JOIN master_categories c ON i.category_id = c.id
            WHERE c.code = ? AND i.is_active = TRUE
            ORDER BY i.sort_order ASC, i.item_value_mr ASC
        `;
        const [rows] = await db.query(query, [req.params.categoryCode]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * CRUD for Master Items
 */
exports.getAllItems = async (req, res) => {
    try {
        const query = `
            SELECT i.*, c.code as category_code, c.name_mr as category_name
            FROM master_items i
            JOIN master_categories c ON i.category_id = c.id
            ORDER BY c.code, i.sort_order
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addItem = async (req, res) => {
    const { category_id, item_value_mr, item_value_en, item_code, sort_order } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO master_items (category_id, item_value_mr, item_value_en, item_code, sort_order) VALUES (?, ?, ?, ?, ?)',
            [category_id, item_value_mr, item_value_en, item_code, sort_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'आयटम यशस्वीरित्या जोडला गेला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateItem = async (req, res) => {
    const { item_value_mr, item_value_en, item_code, sort_order, is_active } = req.body;
    try {
        await db.query(
            'UPDATE master_items SET item_value_mr = ?, item_value_en = ?, item_code = ?, sort_order = ?, is_active = ? WHERE id = ?',
            [item_value_mr, item_value_en, item_code, sort_order, is_active, req.params.id]
        );
        res.json({ message: 'आयटम यशस्वीरित्या अपडेट झाला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        await db.query('DELETE FROM master_items WHERE id = ?', [req.params.id]);
        res.json({ message: 'आयटम यशस्वीरित्या हटवला गेला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Depreciation Rates logic
 */
exports.getDepreciationRates = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM depreciation_rates ORDER BY min_age ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Ready Reckoner Rates logic
 */
exports.getReadyReckonerRates = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ready_reckoner_rates ORDER BY year_range DESC, id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Building Usage logic
 */
exports.getBuildingUsage = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM building_usage_master ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * System Config (Tax Defaults)
 */
exports.getSystemConfig = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT config_key, config_value FROM system_config');
        const config = {};
        rows.forEach(r => config[r.config_key] = r.config_value);
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSystemConfig = async (req, res) => {
    try {
        const updates = req.body;
        for (const [key, val] of Object.entries(updates)) {
            await db.query(
                'INSERT INTO system_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
                [key, val, val]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * System Reset and Seed
 */
exports.resetAndSeed = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('[SYSTEM] Resetting all transaction data...');
        const tables = [
            'property_sections', 'properties', 'payments', 
            'tax_head_allocations', 'magani_bills', 'notices', 'property_audit_log'
        ];
        for (const table of tables) await connection.query(`TRUNCATE TABLE ${table}`);

        await connection.commit();
        res.json({ message: 'सिस्टम यशस्वीरित्या रिसेट झाली' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
    }
};
