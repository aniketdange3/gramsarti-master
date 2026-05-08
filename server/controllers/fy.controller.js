/**
 * FY CONTROLLER - आर्थिक वर्ष व्यवस्थापन
 *
 * नियम:
 *  मागील = मागील वर्षाचा (मागील + चालू) — locked, auto-calculated
 *  चालू  = नवीन वर्षात editable entries
 *  एकूण  = मागील + चालू
 *
 * Two-step migration:
 *  1. analyzeFY  → soft preview (काय होणार ते दाखवा)
 *  2. migrateFY  → final commit (प्रत्यक्ष बदल करा)
 */

const db = require('../config/db.config');

// ─── Helper: current FY from system_config ──────────────────────────────────
const getCurrentFY = async (conn) => {
    const [rows] = await conn.query(
        "SELECT config_value FROM system_config WHERE config_key = 'current_fy'"
    );
    if (rows.length) return rows[0].config_value;
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-${String(yr + 1).slice(-2)}`;
};

// ─── Helper: next FY string from current ────────────────────────────────────
const nextFY = (fy) => {
    const [startStr] = fy.split('-');
    const start = parseInt(startStr, 10);
    return `${start + 1}-${String(start + 2).slice(-2)}`;
};

// ─── GET /api/fy/current ─────────────────────────────────────────────────────
exports.getCurrent = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const fy = await getCurrentFY(conn);

        // Summary stats for current FY
        const [stats] = await conn.query(`
            SELECT
                COUNT(*)                    AS total_properties,
                COALESCE(SUM(magil_amount), 0) AS total_magil,
                COALESCE(SUM(chalu_amount), 0) AS total_chalu,
                COALESCE(SUM(paid_amount),  0) AS total_paid
            FROM property_fy_records
            WHERE financial_year = ?
        `, [fy]);

        // FY history list
        const [history] = await conn.query(`
            SELECT
                financial_year,
                COUNT(*)                    AS property_count,
                SUM(magil_amount)           AS total_magil,
                SUM(chalu_amount)           AS total_chalu,
                SUM(paid_amount)            AS total_paid,
                MIN(created_at)             AS started_at
            FROM property_fy_records
            GROUP BY financial_year
            ORDER BY financial_year DESC
        `);

        res.json({
            current_fy: fy,
            next_fy: nextFY(fy),
            stats: stats[0],
            history,
        });
    } catch (err) {
        console.error('[FY] getCurrent error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

// ─── GET /api/fy/property/:propertyId ────────────────────────────────────────
exports.getPropertyFYData = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { propertyId } = req.params;
        const [rows] = await conn.query(`
            SELECT
                financial_year,
                magil_amount,
                chalu_amount,
                paid_amount,
                (magil_amount + chalu_amount) AS ekun_amount,
                is_carry_forward,
                is_magil_locked,
                migrated_at,
                created_at
            FROM property_fy_records
            WHERE property_id = ?
            ORDER BY financial_year DESC
        `, [propertyId]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

// ─── GET /api/fy/analyze ──────────────────────────────────────────────────────
// Soft preview: दाखवतो काय होईल — no DB changes
exports.analyzeMigration = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const currentFY = await getCurrentFY(conn);
        const nxtFY     = nextFY(currentFY);

        // Check if migration already done for next FY
        const [alreadyDone] = await conn.query(
            'SELECT COUNT(*) AS cnt FROM property_fy_records WHERE financial_year = ?',
            [nxtFY]
        );
        if (alreadyDone[0].cnt > 0) {
            return res.json({
                already_migrated: true,
                current_fy: currentFY,
                next_fy: nxtFY,
                message: `${nxtFY} साठी migration आधीच झाले आहे.`,
            });
        }

        // Fetch current FY records (or fall back to properties table)
        const [currentRecords] = await conn.query(`
            SELECT
                p.id AS property_id,
                p.ownerName,
                p.plotNo,
                p.wastiName,
                COALESCE(f.magil_amount, p.arrearsAmount, 0)   AS cur_magil,
                COALESCE(f.chalu_amount, p.totalTaxAmount, 0)   AS cur_chalu,
                COALESCE(f.paid_amount,  p.paidAmount, 0)       AS cur_paid,
                -- Breakdown
                p.propertyTax, p.openSpaceTax, p.streetLightTax, p.healthTax, 
                p.generalWaterTax, p.specialWaterTax, p.wasteCollectionTax, p.penaltyAmount, p.arrearsAmount
            FROM properties p
            LEFT JOIN property_fy_records f
                ON f.property_id = p.id AND f.financial_year = ?
            WHERE p.status = 'active'
            ORDER BY p.srNo
        `, [currentFY]);

        // Build preview rows
        const preview = currentRecords.map(r => {
            const newMagil = Math.max(0, (parseFloat(r.cur_magil) + parseFloat(r.cur_chalu)) - parseFloat(r.cur_paid));
            const newChalu = parseFloat(r.cur_chalu); // carry forward
            return {
                property_id: r.property_id,
                ownerName:   r.ownerName,
                plotNo:      r.plotNo,
                wastiName:   r.wastiName,
                current_fy:  currentFY,
                cur_magil:   parseFloat(r.cur_magil),
                cur_chalu:   parseFloat(r.cur_chalu),
                cur_paid:    parseFloat(r.cur_paid),
                new_magil:   newMagil,
                new_chalu:   newChalu,
                new_total:   newMagil + newChalu,
                // Breakdown
                property_tax:          r.propertyTax || 0,
                open_space_tax:       r.openSpaceTax || 0,
                street_light_tax:     r.streetLightTax || 0,
                health_tax:           r.healthTax || 0,
                general_water_tax:    r.generalWaterTax || 0,
                special_water_tax:    r.specialWaterTax || 0,
                waste_collection_tax: r.wasteCollectionTax || 0,
                penalty_amount:       r.penaltyAmount || 0,
                arrears_amount:       r.arrearsAmount || 0
            };
        });

        const summary = {
            total_properties: preview.length,
            total_new_magil:  preview.reduce((s, r) => s + r.new_magil, 0),
            total_new_chalu:  preview.reduce((s, r) => s + r.new_chalu, 0),
            total_new_ekun:   preview.reduce((s, r) => s + r.new_ekun, 0),
        };

        res.json({
            already_migrated: false,
            current_fy:  currentFY,
            next_fy:     nxtFY,
            summary,
            preview,     // first 20 for UI
            preview_total: preview.length,
        });
    } catch (err) {
        console.error('[FY] analyzeMigration error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

// ─── POST /api/fy/migrate ─────────────────────────────────────────────────────
// Final commit: actual DB changes
exports.executeMigration = async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        const currentFY = await getCurrentFY(conn);
        const nxtFY     = nextFY(currentFY);

        // Double-check not already done
        const [alreadyDone] = await conn.query(
            'SELECT COUNT(*) AS cnt FROM property_fy_records WHERE financial_year = ?',
            [nxtFY]
        );
        if (alreadyDone[0].cnt > 0) {
            await conn.rollback();
            return res.status(409).json({
                error: `${nxtFY} साठी migration आधीच झाले आहे.`,
                already_migrated: true,
            });
        }

        // Fetch current data
        const [currentRecords] = await conn.query(`
            SELECT
                p.id AS property_id,
                COALESCE(f.magil_amount, p.arrearsAmount, 0) AS cur_magil,
                COALESCE(f.chalu_amount, p.totalTaxAmount, 0) AS cur_chalu,
                COALESCE(f.paid_amount,  p.paidAmount,    0) AS cur_paid,
                -- Breakdown
                p.propertyTax, p.openSpaceTax, p.streetLightTax, p.healthTax, 
                p.generalWaterTax, p.specialWaterTax, p.wasteCollectionTax, p.penaltyAmount, p.arrearsAmount
            FROM properties p
            LEFT JOIN property_fy_records f
                ON f.property_id = p.id AND f.financial_year = ?
            WHERE p.status = 'active'
        `, [currentFY]);

        let migrated = 0;

        for (const r of currentRecords) {
            const newMagil = Math.max(0, (parseFloat(r.cur_magil) + parseFloat(r.cur_chalu)) - parseFloat(r.cur_paid));
            const newChalu = parseFloat(r.cur_chalu);

            // Lock current FY record (if exists, mark migrated_at)
            await conn.query(`
                INSERT INTO property_fy_records
                    (property_id, financial_year, magil_amount, chalu_amount, paid_amount, is_magil_locked, migrated_at,
                     property_tax, open_space_tax, street_light_tax, health_tax, general_water_tax, special_water_tax, 
                     waste_collection_tax, penalty_amount, arrears_amount)
                VALUES (?, ?, ?, ?, ?, 1, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    magil_amount   = VALUES(magil_amount),
                    chalu_amount   = VALUES(chalu_amount),
                    paid_amount    = VALUES(paid_amount),
                    is_magil_locked = 1,
                    migrated_at    = NOW(),
                    property_tax = VALUES(property_tax),
                    open_space_tax = VALUES(open_space_tax),
                    street_light_tax = VALUES(street_light_tax),
                    health_tax = VALUES(health_tax),
                    general_water_tax = VALUES(general_water_tax),
                    special_water_tax = VALUES(special_water_tax),
                    waste_collection_tax = VALUES(waste_collection_tax),
                    penalty_amount = VALUES(penalty_amount),
                    arrears_amount = VALUES(arrears_amount)
            `, [
                r.property_id, currentFY, parseFloat(r.cur_magil), parseFloat(r.cur_chalu), parseFloat(r.cur_paid),
                r.propertyTax || 0, r.openSpaceTax || 0, r.streetLightTax || 0, r.healthTax || 0, 
                r.generalWaterTax || 0, r.specialWaterTax || 0, r.wasteCollectionTax || 0, r.penaltyAmount || 0, r.arrearsAmount || 0
            ]);

            // Create new FY record (Carry forward breakdown to new year's 'chalu' config)
            await conn.query(`
                INSERT INTO property_fy_records
                    (property_id, financial_year, magil_amount, chalu_amount, paid_amount, is_carry_forward, is_magil_locked,
                     property_tax, open_space_tax, street_light_tax, health_tax, general_water_tax, special_water_tax, 
                     waste_collection_tax, penalty_amount, arrears_amount)
                VALUES (?, ?, ?, ?, 0, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    magil_amount     = VALUES(magil_amount),
                    chalu_amount     = VALUES(chalu_amount),
                    is_carry_forward = 1,
                    is_magil_locked  = 1,
                    property_tax = VALUES(property_tax),
                    open_space_tax = VALUES(open_space_tax),
                    street_light_tax = VALUES(street_light_tax),
                    health_tax = VALUES(health_tax),
                    general_water_tax = VALUES(general_water_tax),
                    special_water_tax = VALUES(special_water_tax),
                    waste_collection_tax = VALUES(waste_collection_tax),
                    penalty_amount = VALUES(penalty_amount),
                    arrears_amount = VALUES(arrears_amount)
            `, [
                r.property_id, nxtFY, newMagil, newChalu,
                r.propertyTax || 0, r.openSpaceTax || 0, r.streetLightTax || 0, r.healthTax || 0, 
                r.generalWaterTax || 0, r.specialWaterTax || 0, r.wasteCollectionTax || 0, 
                0,        // Penalty resets in new year
                newMagil  // Remaining balance becomes the base arrears for the next year
            ]);

            // Sync back to properties table
            await conn.query(`
                UPDATE properties
                SET arrearsAmount  = ?,
                    totalTaxAmount = ?,
                    paidAmount     = 0,
                    financial_year = ?
                WHERE id = ?
            `, [newMagil, newChalu, nxtFY, r.property_id]);

            migrated++;
        }

        // Update system_config current_fy → new FY
        await conn.query(
            "UPDATE system_config SET config_value = ? WHERE config_key = 'current_fy'",
            [nxtFY]
        );

        await conn.commit();

        res.json({
            success: true,
            migrated_count: migrated,
            from_fy: currentFY,
            to_fy:   nxtFY,
            message: `${migrated} मालमत्तांचे ${currentFY} → ${nxtFY} migration यशस्वी झाले.`,
        });
    } catch (err) {
        await conn.rollback();
        console.error('[FY] executeMigration error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

// ─── PUT /api/fy/chalu/:propertyId ───────────────────────────────────────────
// Update चालू amount for a property in current FY
exports.updateChalu = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { propertyId } = req.params;
        const { chalu_amount, paid_amount } = req.body;
        const fy = await getCurrentFY(conn);

        await conn.query(`
            INSERT INTO property_fy_records
                (property_id, financial_year, chalu_amount, paid_amount)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                chalu_amount = VALUES(chalu_amount),
                paid_amount  = IF(VALUES(paid_amount) IS NOT NULL, VALUES(paid_amount), paid_amount)
        `, [propertyId, fy,
            chalu_amount !== undefined ? chalu_amount : null,
            paid_amount  !== undefined ? paid_amount  : null
        ]);

        // Sync to properties
        if (chalu_amount !== undefined) {
            await conn.query(
                'UPDATE properties SET totalTaxAmount = ?, financial_year = ? WHERE id = ?',
                [chalu_amount, fy, propertyId]
            );
        }
        if (paid_amount !== undefined) {
            await conn.query(
                'UPDATE properties SET paidAmount = ? WHERE id = ?',
                [paid_amount, propertyId]
            );
        }

        res.json({ success: true, financial_year: fy });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};
