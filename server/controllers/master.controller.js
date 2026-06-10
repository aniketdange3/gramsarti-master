/**
 * MASTER DATA CONTROLLER - मुख्य डेटा नियंत्रण केंद्र (Master Data)
 * 
 * या फाईलमध्ये वॉर्ड, वस्ती, मालमत्ता प्रकार, घसारा दर (Depreciation), 
 * आणि रेडी रेकनर दरांची माहिती व्यवस्थापित करण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');
const { getCache, setCache, clearCache, CACHE_TTL_LONG } = require('../utils/cache.util');

/**
 * Get all categories
 * सर्व मास्टर कॅटेगरी मिळवणे
 */
exports.getAllCategories = async (req, res) => {
    try {
        const cacheKey = 'master:categories';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT * FROM master_categories ORDER BY name_mr ASC');
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
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
        const categoryCode = req.params.categoryCode;
        const cacheKey = `master:items:cat:${categoryCode}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const query = `
            SELECT i.* FROM master_items i
            JOIN master_categories c ON i.category_id = c.id
            WHERE c.code = ? AND i.is_active = TRUE
            ORDER BY i.sort_order ASC, i.item_value_mr ASC
        `;
        const [rows] = await db.query(query, [categoryCode]);
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
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
        const cacheKey = 'master:items:all';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const query = `
            SELECT i.*, c.code as category_code, c.name_mr as category_name
            FROM master_items i
            JOIN master_categories c ON i.category_id = c.id
            ORDER BY c.code, i.sort_order
        `;
        const [rows] = await db.query(query);
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
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
        await clearCache('master:items*');
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
        await clearCache('master:items*');
        res.json({ message: 'आयटम यशस्वीरित्या अपडेट झाला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        await db.query('DELETE FROM master_items WHERE id = ?', [req.params.id]);
        await clearCache('master:items*');
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
        const cacheKey = 'master:depreciation';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT * FROM depreciation_rates ORDER BY min_age ASC');
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
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
        const cacheKey = 'master:rr';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT * FROM ready_reckoner_rates ORDER BY year_range DESC, id ASC');
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
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
        const cacheKey = 'master:building_usage';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT * FROM building_usage_master ORDER BY id ASC');
        await setCache(cacheKey, rows, CACHE_TTL_LONG);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * CRUD for Advanced Masters (Depreciation, RR, Building Usage)
 */
exports.addDepreciationRate = async (req, res) => {
    const { min_age, max_age, percentage } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO depreciation_rates (min_age, max_age, percentage) VALUES (?, ?, ?)',
            [min_age, max_age, percentage]
        );
        await clearCache('master:depreciation');
        res.status(201).json({ id: result.insertId, message: 'घसारा दर जोडला गेला' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateDepreciationRate = async (req, res) => {
    const { min_age, max_age, percentage } = req.body;
    try {
        await db.query(
            'UPDATE depreciation_rates SET min_age = ?, max_age = ?, percentage = ? WHERE id = ?',
            [min_age, max_age, percentage, req.params.id]
        );
        await clearCache('master:depreciation');
        res.json({ message: 'अपडेट यशस्वी' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteDepreciationRate = async (req, res) => {
    try {
        await db.query('DELETE FROM depreciation_rates WHERE id = ?', [req.params.id]);
        await clearCache('master:depreciation');
        res.json({ message: 'हटवले गेले' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addReadyReckonerRate = async (req, res) => {
    const { year_range, item_name_mr, valuation_rate, tax_rate, unit_mr } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO ready_reckoner_rates (year_range, item_name_mr, valuation_rate, tax_rate, unit_mr) VALUES (?, ?, ?, ?, ?)',
            [year_range, item_name_mr, valuation_rate, tax_rate, unit_mr || 'चौ. मी.']
        );
        await clearCache('master:rr');
        res.status(201).json({ id: result.insertId, message: 'रेडी रेकनर दर जोडला गेला' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateReadyReckonerRate = async (req, res) => {
    const { year_range, item_name_mr, valuation_rate, tax_rate, unit_mr } = req.body;
    try {
        await db.query(
            'UPDATE ready_reckoner_rates SET year_range = ?, item_name_mr = ?, valuation_rate = ?, tax_rate = ?, unit_mr = ? WHERE id = ?',
            [year_range, item_name_mr, valuation_rate, tax_rate, unit_mr, req.params.id]
        );
        await clearCache('master:rr');
        res.json({ message: 'अपडेट यशस्वी' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteReadyReckonerRate = async (req, res) => {
    try {
        await db.query('DELETE FROM ready_reckoner_rates WHERE id = ?', [req.params.id]);
        await clearCache('master:rr');
        res.json({ message: 'हटवले गेले' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addBuildingUsage = async (req, res) => {
    const { usage_type_mr, usage_type_en, weightage } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO building_usage_master (usage_type_mr, usage_type_en, weightage) VALUES (?, ?, ?)',
            [usage_type_mr, usage_type_en, weightage]
        );
        await clearCache('master:building_usage');
        res.status(201).json({ id: result.insertId, message: 'वापर प्रकार जोडला गेला' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBuildingUsage = async (req, res) => {
    const { usage_type_mr, usage_type_en, weightage } = req.body;
    try {
        await db.query(
            'UPDATE building_usage_master SET usage_type_mr = ?, usage_type_en = ?, weightage = ? WHERE id = ?',
            [usage_type_mr, usage_type_en, weightage, req.params.id]
        );
        await clearCache('master:building_usage');
        res.json({ message: 'अपडेट यशस्वी' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteBuildingUsage = async (req, res) => {
    try {
        await db.query('DELETE FROM building_usage_master WHERE id = ?', [req.params.id]);
        await clearCache('master:building_usage');
        res.json({ message: 'हटवले गेले' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};


/**
 * System Config (Tax Defaults)
 */
exports.getSystemConfig = async (req, res) => {
    try {
        const cacheKey = 'master:system_config';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT config_key, config_value FROM system_config');
        const config = {};
        rows.forEach(r => config[r.config_key] = r.config_value);
        await setCache(cacheKey, config, CACHE_TTL_LONG);
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
        await clearCache('master:system_config');
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

/**
 * PRE-ANALYSIS for Financial Year Migration
 * Returns a breakdown of gharpatti vs khali jaga totals before migration.
 */
exports.preAnalyzeFY = async (req, res) => {
    try {
        // Get current FY from system_config
        const [cfRows] = await db.query("SELECT config_value FROM system_config WHERE config_key = 'current_fy'");
        const currentFY = cfRows[0]?.config_value || '';

        // Get all system config values
        const [configRows] = await db.query('SELECT config_key, config_value FROM system_config');
        const sysConfig = {};
        configRows.forEach(r => sysConfig[r.config_key] = r.config_value);

        // --- Gharpatti (घरपट्टी): Properties that do NOT have खाली जागा sections ---
        const [gharpatti] = await db.query(`
            SELECT
                COUNT(DISTINCT p.id) as count,
                SUM(COALESCE(p.arrearsAmount, 0)) as totalMagil,
                SUM(COALESCE(p.totalTaxAmount, 0)) as totalChalu,
                SUM(COALESCE(p.paidAmount, 0)) as totalPaid
            FROM properties p
            WHERE p.status = 'active'
            AND p.id NOT IN (
                SELECT DISTINCT propertyId FROM property_sections
                WHERE propertyType LIKE '%खाली जागा%'
            )
        `);

        // --- Khali Jaga (खाली जागा): Properties that have खाली जागा sections ---
        const [khaliJaga] = await db.query(`
            SELECT
                COUNT(DISTINCT p.id) as count,
                SUM(COALESCE(p.arrearsAmount, 0)) as totalMagil,
                SUM(COALESCE(p.totalTaxAmount, 0)) as totalChalu,
                SUM(COALESCE(p.paidAmount, 0)) as totalPaid
            FROM properties p
            WHERE p.status = 'active'
            AND p.id IN (
                SELECT DISTINCT propertyId FROM property_sections
                WHERE propertyType LIKE '%खाली जागा%'
            )
        `);

        // --- Overall ---
        const [overall] = await db.query(`
            SELECT
                COUNT(*) as count,
                SUM(COALESCE(arrearsAmount, 0)) as totalMagil,
                SUM(COALESCE(totalTaxAmount, 0)) as totalChalu,
                SUM(COALESCE(paidAmount, 0)) as totalPaid,
                SUM(COALESCE(penaltyAmount, 0)) as totalPenalty
            FROM properties WHERE status = 'active'
        `);

        const otherTaxes = {
            streetLight: Number(sysConfig.street_light_default) || 0,
            healthTax: Number(sysConfig.health_tax_default) || 0,
            generalWater: Number(sysConfig.general_water_default) || 0,
            specialWater: Number(sysConfig.special_water_default) || 0,
            wasteCollection: Number(sysConfig.waste_collection_default) || 0,
        };
        const hasOtherTaxes = Object.values(otherTaxes).some(v => v > 0);

        const toNum = v => Number(v) || 0;

        res.json({
            currentFY,
            gharpatti: {
                count: toNum(gharpatti[0].count),
                totalMagil: toNum(gharpatti[0].totalMagil),
                totalChalu: toNum(gharpatti[0].totalChalu),
                totalPaid: toNum(gharpatti[0].totalPaid),
                projectedMagil: toNum(gharpatti[0].totalMagil) + toNum(gharpatti[0].totalChalu)
            },
            khaliJaga: {
                count: toNum(khaliJaga[0].count),
                totalMagil: toNum(khaliJaga[0].totalMagil),
                totalChalu: toNum(khaliJaga[0].totalChalu),
                totalPaid: toNum(khaliJaga[0].totalPaid),
                projectedMagil: toNum(khaliJaga[0].totalMagil) + toNum(khaliJaga[0].totalChalu)
            },
            overall: {
                count: toNum(overall[0].count),
                totalMagil: toNum(overall[0].totalMagil),
                totalChalu: toNum(overall[0].totalChalu),
                totalPaid: toNum(overall[0].totalPaid),
                totalPenalty: toNum(overall[0].totalPenalty),
                projectedMagil: toNum(overall[0].totalMagil) + toNum(overall[0].totalChalu) - toNum(overall[0].totalPaid)
            },
            otherTaxes,
            hasOtherTaxes
        });
    } catch (err) {
        console.error('[ERROR] preAnalyzeFY:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * FINANCIAL YEAR MIGRATION - आर्थिक वर्ष स्थलांतर
 */
exports.migrateFinancialYear = async (req, res) => {
    const { newFY } = req.body || {};
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        console.log('[SYSTEM] Starting Financial Year Migration...');

        // 1. नवीन मागील = जुनी मागील + चालू (+ दंड) - भरलेले
        //    चालू (totalTaxAmount) तेच राहते - रिसेट होत नाही
        const [propResult] = await connection.query(`
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

        // 2. Increment Property Age in sections
        await connection.query(`UPDATE property_sections SET propertyAge = COALESCE(propertyAge, 0) + 1`);

        // 3. Save new FY to system_config
        if (newFY) {
            await connection.query(
                'INSERT INTO system_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
                ['current_fy', newFY, newFY]
            );
            await clearCache('master:system_config');
        }

        await connection.commit();
        console.log(`[SUCCESS] FY Migration done. ${propResult.affectedRows} properties updated.`);

        res.json({
            success: true,
            message: `आर्थिक वर्ष ${newFY || ''} मध्ये स्थलांतर यशस्वीरित्या पूर्ण झाले!`,
            updatedCount: propResult.affectedRows
        });
    } catch (err) {
        await connection.rollback();
        console.error('[ERROR] FY Migration failed:', err);
        res.status(500).json({ error: 'स्थलांतर प्रक्रियेत त्रुटी आली: ' + err.message });
    } finally {
        connection.release();
    }
};
