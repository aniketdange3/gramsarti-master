/**
 * PROPERTY CONTROLLER - मालमत्ता नियंत्रण केंद्र (Property Logic)
 * 
 * या फाईलमध्ये मालमत्तांची नोंदणी, माहिती मिळवणे, अपडेट करणे आणि 
 * मोठ्या प्रमाणात डेटा इंपोर्ट (Bulk Import) करण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');
const {
    getPropertiesCache,
    getPropertiesEtag,
    setPropertiesCache,
    clearPropertiesCache
} = require('../utils/cache.util');

/**
 * Get all unique Khasra numbers
 * सर्व विशेष खसरा क्रमांक मिळवणे
 */
exports.getKhasras = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT khasraNo FROM properties WHERE khasraNo IS NOT NULL AND khasraNo != "" ORDER BY khasraNo ASC');
        const khasras = rows.map(r => r.khasraNo);
        res.json(khasras);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Search / Filter properties server-side (for quick retrieval)
 * Backend-side search: name, wasti, khasra, plotNo, wardNo
 * Usage: GET /api/properties/search?q=राम&wasti=&khasra=&page=1&limit=25
 */
const redis = require('../config/redis.config');
const SEARCH_CACHE_TTL = 60; // 60 seconds

exports.searchProperties = async (req, res) => {
    const q        = (req.query.q || '').trim();
    const wasti    = (req.query.wasti || '').trim();
    const khasra   = (req.query.khasra || '').trim();
    const plotNo   = (req.query.plotNo || '').trim();
    const wardNo   = (req.query.wardNo || '').trim();
    const layout   = (req.query.layout || '').trim();
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const limit    = Math.min(parseInt(req.query.limit) || 25, 200);
    const offset   = (page - 1) * limit;

    // Build cache key from all params
    const cacheKey = `prop:search:${q}:${wasti}:${khasra}:${plotNo}:${wardNo}:${layout}:p${page}:l${limit}`;

    try {
        // Try Redis cache first
        try {
            if (redis && typeof redis.get === 'function') {
                const cached = await redis.get(cacheKey);
                if (cached) return res.json(JSON.parse(cached));
            }
        } catch (_) { /* ignore cache errors */ }

        // Build WHERE conditions dynamically
        const conditions = [];
        const params = [];

        if (q) {
            // Search across ownerName, occupantName, khasraNo, plotNo
            conditions.push('(p.ownerName LIKE ? OR p.occupantName LIKE ? OR p.khasraNo LIKE ? OR p.plotNo LIKE ? OR p.wastiName LIKE ?)');
            const likeQ = `%${q}%`;
            params.push(likeQ, likeQ, likeQ, likeQ, likeQ);
        }
        if (wasti)  { conditions.push('p.wastiName = ?');  params.push(wasti); }
        if (khasra) { conditions.push('p.khasraNo = ?');   params.push(khasra); }
        if (plotNo) { conditions.push('p.plotNo = ?');     params.push(plotNo); }
        if (wardNo) { conditions.push('p.wardNo = ?');     params.push(wardNo); }
        if (layout) { conditions.push('p.layoutName = ?'); params.push(layout); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Lightweight query: only essential columns (no heavy JOINs)
        const dataQuery = `
            SELECT
                p.id, p.srNo, p.wardNo, p.khasraNo, p.layoutName, p.plotNo,
                p.ownerName, p.occupantName, p.wastiName, p.contactNo,
                p.hasConstruction, p.totalTaxAmount, p.arrearsAmount,
                p.paidAmount, p.penaltyAmount, p.discountAmount,
                p.buildingUsage, p.status, p.createdAt,
                p.propertyLength, p.propertyWidth, p.totalAreaSqFt
            FROM properties p
            ${whereClause}
            ORDER BY p.srNo ASC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `SELECT COUNT(*) AS total FROM properties p ${whereClause}`;

        // Run both queries in parallel
        const [[rows], [countRows]] = await Promise.all([
            db.query(dataQuery, [...params, limit, offset]),
            db.query(countQuery, params)
        ]);

        const total = countRows[0]?.total || 0;
        const response = {
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
        };

        // Cache result
        try {
            if (redis && typeof redis.setex === 'function') {
                await redis.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(response));
            }
        } catch (_) { /* ignore */ }

        res.json(response);
    } catch (err) {
        console.error('[PROPERTIES] searchProperties error:', err);
        res.status(500).json({ error: err.message });
    }
};



/**
 * Get all properties with their floor sections
 * सर्व मालमत्ता आणि त्यांच्या मजल्यांची माहिती मिळवणे (With Caching)
 */
exports.getAllProperties = async (req, res) => {
    // API: GET /api/properties
    // Returns: PropertyRecord[] with sections[] and prev_breakdown{}
    // Auth: Bearer token required | Uses: ETag + Redis memory cache (2 min TTL)

    res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ETag तपासणी (Check for browser cache)
    const currentEtag = await getPropertiesEtag();
    if (currentEtag && req.headers['if-none-match'] === currentEtag) {
        return res.status(304).end();
    }

    // मेमरी कॅशे तपासणी (Check Memory Cache)
    const cachedData = await getPropertiesCache();
    if (cachedData) {
        res.setHeader('ETag', currentEtag);
        return res.json(cachedData);
    }

    try {
        // १. वर्तमान आर्थिक वर्ष मिळवणे
        const [configRows] = await db.query("SELECT config_value FROM system_config WHERE config_key = 'current_fy'");
        const currentFY = configRows[0]?.config_value || '2024-25';

        // २. मागील आर्थिक वर्ष काढणे (उदा. '2025-26' -> '2024-25')
        const parts = currentFY.split('-');
        const startYear = parseInt(parts[0]);
        const prevFY = `${startYear - 1}-${startYear.toString().slice(-2)}`;

        // मुख्य क्वेरी: मालमत्ता + मजले + नवीनतम पावती तपशील + मागील वर्षाचा ब्रेकडाउन
        const query = `
            SELECT
                p.id, p.srNo, p.wardNo, p.khasraNo, p.layoutName, p.plotNo,
                p.occupantName, p.ownerName, p.contactNo, p.hasConstruction, p.openSpace,
                p.propertyTax, p.openSpaceTax, p.streetLightTax, p.healthTax,
                p.generalWaterTax, p.specialWaterTax, p.wasteCollectionTax,
                p.totalTaxAmount, p.arrearsAmount, p.paidAmount, p.penaltyAmount, p.discountAmount,
                p.wastiName, p.buildingUsage, p.status, p.createdAt,
                p.propertyId, p.constructionYear, p.propertyAge,
                p.readyReckonerLand, p.readyReckonerBuilding, p.readyReckonerComposite,
                p.depreciationAmount, p.remarksNotes,
                p.propertyLength, p.propertyWidth, p.totalAreaSqFt, p.totalAreaSqMt,
                p.billNo, p.lastBillDate,
                -- पावती तपशील
                COALESCE(p.receiptNo,   lat_pay.receipt_no)   AS receiptNo,
                COALESCE(p.receiptBook, lat_pay.receipt_book) AS receiptBook,
                COALESCE(p.paymentDate, lat_pay.payment_date) AS paymentDate,
                -- मजला तपशील
                s.floorIndex, s.propertyType, s.lengthFt, s.widthFt,
                s.areaSqFt, s.areaSqMt, s.landRate, s.buildingRate,
                s.depreciationRate, s.weightage, s.buildingValue,
                s.openSpaceValue, s.buildingTaxRate, s.openSpaceTaxRate,
                s.constructionYear AS sectionYear, s.propertyAge AS sectionAge,
                -- मागील वर्षाचा ब्रेकडाउन (Arrears Breakdown)
                pfy.property_tax AS prev_propertyTax,
                pfy.open_space_tax AS prev_openSpaceTax,
                pfy.street_light_tax AS prev_streetLightTax,
                pfy.health_tax AS prev_healthTax,
                pfy.general_water_tax AS prev_generalWaterTax,
                pfy.special_water_tax AS prev_specialWaterTax,
                pfy.waste_collection_tax AS prev_wasteCollectionTax,
                pfy.penalty_amount AS prev_penaltyAmount
            FROM properties p
            LEFT JOIN property_sections s ON p.id = s.propertyId
            LEFT JOIN property_fy_records pfy ON p.id = pfy.property_id AND pfy.financial_year = ?
            LEFT JOIN (
                SELECT property_id,
                       receipt_no,
                       receipt_book,
                       payment_date
                FROM payments
                WHERE id IN (
                    SELECT MAX(id) FROM payments GROUP BY property_id
                )
            ) lat_pay ON lat_pay.property_id = p.id
            WHERE 1=1

            ORDER BY p.srNo ASC
        `;

        const [rows] = await db.query(query, [prevFY]);


        // डेटा प्रोसेसिंग: मालमत्ता आणि मजले एकत्र करणे (Grouping sections)
        const propertiesMap = {};
        rows.forEach(row => {
            if (!propertiesMap[row.id]) {
                propertiesMap[row.id] = { ...row, sections: [] };
                // मजल्यांची वैयक्तिक माहिती मुख्य ऑब्जेक्टमधून काढणे
                const fieldsToDelete = [
                    'floorIndex', 'propertyType', 'lengthFt', 'widthFt', 'areaSqFt',
                    'areaSqMt', 'landRate', 'buildingRate', 'depreciationRate', 'weightage',
                    'buildingValue', 'openSpaceValue', 'buildingTaxRate', 'openSpaceTaxRate',
                    'sectionYear', 'sectionAge'
                ];
                fieldsToDelete.forEach(field => delete propertiesMap[row.id][field]);

                // Breakdown fields to keep in main object
                propertiesMap[row.id].prev_breakdown = {
                    propertyTax: row.prev_propertyTax || 0,
                    openSpaceTax: row.prev_openSpaceTax || 0,
                    streetLightTax: row.prev_streetLightTax || 0,
                    healthTax: row.prev_healthTax || 0,
                    generalWaterTax: row.prev_generalWaterTax || 0,
                    specialWaterTax: row.prev_specialWaterTax || 0,
                    wasteCollectionTax: row.prev_wasteCollectionTax || 0,
                    penaltyAmount: row.prev_penaltyAmount || 0
                };
            }

            if (row.floorIndex !== null) {
                propertiesMap[row.id].sections.push({
                    floorIndex: row.floorIndex,
                    propertyType: row.propertyType,
                    lengthFt: row.lengthFt,
                    widthFt: row.widthFt,
                    areaSqFt: row.areaSqFt,
                    areaSqMt: row.areaSqMt,
                    landRate: row.landRate,
                    buildingRate: row.buildingRate,
                    depreciationRate: row.depreciationRate,
                    weightage: row.weightage,
                    buildingValue: row.buildingValue,
                    openSpaceValue: row.openSpaceValue,
                    buildingTaxRate: row.buildingTaxRate,
                    openSpaceTaxRate: row.openSpaceTaxRate,
                    constructionYear: row.sectionYear,
                    propertyAge: row.sectionAge,
                });
            }
        });

        const propertiesArray = Object.values(propertiesMap);
        const newEtag = await setPropertiesCache(propertiesArray);
        res.setHeader('ETag', newEtag);
        res.json(propertiesArray);
    } catch (err) {
        console.error('[PROPERTIES] getAllProperties error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get a single property by ID
 * आयडीनुसार एका मालमत्तेची माहिती मिळवणे
 */
exports.getPropertyById = async (req, res) => {
    const { id } = req.params;
    // API: GET /api/properties/:id
    // Returns: Single PropertyRecord with sections[] joined from property_sections
    // Auth: Bearer token required

    try {
        const query = `
            SELECT
                p.*,
                COALESCE(p.receiptNo,   lat_pay.receipt_no)   AS receiptNo,
                COALESCE(p.receiptBook, lat_pay.receipt_book) AS receiptBook,
                COALESCE(p.paymentDate, lat_pay.payment_date) AS paymentDate,
                s.floorIndex, s.propertyType, s.lengthFt, s.widthFt,
                s.areaSqFt, s.areaSqMt, s.landRate, s.buildingRate,
                s.depreciationRate, s.weightage, s.buildingValue,
                s.openSpaceValue, s.buildingTaxRate, s.openSpaceTaxRate,
                s.constructionYear AS sectionYear, s.propertyAge AS sectionAge
            FROM properties p
            LEFT JOIN property_sections s ON p.id = s.propertyId
            LEFT JOIN (
                SELECT property_id, receipt_no, receipt_book, payment_date
                FROM payments
                WHERE id IN (SELECT MAX(id) FROM payments GROUP BY property_id)
            ) lat_pay ON lat_pay.property_id = p.id
            WHERE p.id = ?
        `;

        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'मालमत्ता सापडली नाही' });

        const property = { ...rows[0], sections: [] };

        // Cleanup main object from section fields
        const sectionFields = [
            'floorIndex', 'propertyType', 'lengthFt', 'widthFt', 'areaSqFt',
            'areaSqMt', 'landRate', 'buildingRate', 'depreciationRate', 'weightage',
            'buildingValue', 'openSpaceValue', 'buildingTaxRate', 'openSpaceTaxRate',
            'sectionYear', 'sectionAge'
        ];

        rows.forEach(row => {
            if (row.floorIndex !== null) {
                property.sections.push({
                    floorIndex: row.floorIndex,
                    propertyType: row.propertyType,
                    lengthFt: row.lengthFt,
                    widthFt: row.widthFt,
                    areaSqFt: row.areaSqFt,
                    areaSqMt: row.areaSqMt,
                    landRate: row.landRate,
                    buildingRate: row.buildingRate,
                    depreciationRate: row.depreciationRate,
                    weightage: row.weightage,
                    buildingValue: row.buildingValue,
                    openSpaceValue: row.openSpaceValue,
                    buildingTaxRate: row.buildingTaxRate,
                    openSpaceTaxRate: row.openSpaceTaxRate,
                    constructionYear: row.sectionYear,
                    propertyAge: row.sectionAge,
                });
            }
        });

        sectionFields.forEach(f => delete property[f]);

        res.json(property);
    } catch (err) {
        console.error('[PROPERTIES] getPropertyById error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create or Update a property record
 * मालमत्ता जतन करणे किंवा अपडेट करणे (Atomic Transaction)
 */
exports.saveProperty = async (req, res) => {
    const property = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // आयडी निश्चित करणे (Determine final ID)
        const finalId = (property.id && String(property.id).trim() !== '') ?
            property.id :
            (`${Math.random().toString(36).substr(2, 9)}_${Date.now()}`);

        // जुना डेटा साफ करणे (Clean rewrite for consistency)
        await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [finalId]);
        await connection.query('DELETE FROM properties WHERE id = ?', [finalId]);

        const propertyQuery = `
            INSERT INTO properties (
                id, srNo, wardNo, khasraNo, layoutName, plotNo, occupantName, ownerName, 
                hasConstruction, openSpace, propertyTax, openSpaceTax, streetLightTax, 
                healthTax, generalWaterTax, specialWaterTax, wasteCollectionTax, 
                penaltyAmount, totalTaxAmount, arrearsAmount, paidAmount, wastiName, 
                createdAt, receiptNo, receiptBook, paymentDate, propertyId, 
                constructionYear, propertyAge, readyReckonerLand, readyReckonerBuilding, 
                readyReckonerComposite, depreciationAmount, remarksNotes, propertyLength, 
                propertyWidth, totalAreaSqFt, totalAreaSqMt, contactNo, buildingUsage, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            finalId, property.srNo, property.wardNo, property.khasraNo, property.layoutName,
            property.plotNo, property.occupantName, property.ownerName, property.hasConstruction ? 1 : 0,
            property.openSpace, property.propertyTax, property.openSpaceTax, property.streetLightTax,
            property.healthTax, property.generalWaterTax, property.specialWaterTax, property.wasteCollectionTax || 0,
            property.penaltyAmount || 0, property.totalTaxAmount, property.arrearsAmount || 0, property.paidAmount || 0,
            property.wastiName || '', property.createdAt || new Date().toISOString(),
            property.receiptNo || null, property.receiptBook || null, property.paymentDate || null,
            property.propertyId || null, property.constructionYear || null, property.propertyAge || 0,
            property.readyReckonerLand || 0, property.readyReckonerBuilding || 0, property.readyReckonerComposite || 0,
            property.depreciationAmount || 0, property.remarksNotes || null,
            property.propertyLength || null, property.propertyWidth || null, property.totalAreaSqFt || null, property.totalAreaSqMt || null, property.contactNo || null,
            property.buildingUsage || 'निवास', req.user.id
        ];

        await connection.query(propertyQuery, params);

        // मजल्यांची माहिती जतन करणे (Save valid sections)
        const sectionQuery = `
            INSERT INTO property_sections (
                propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt, 
                landRate, buildingRate, depreciationRate, weightage, buildingValue, 
                openSpaceValue, buildingTaxRate, openSpaceTaxRate, buildingFinalValue, 
                openSpaceFinalValue, description, constructionYear, propertyAge
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const validSections = (property.sections || []).filter(s => {
            const pType = (s.propertyType || '').toString().trim();
            return pType !== '' && pType.toLowerCase() !== 'निवडा';
        });

        for (const [index, section] of validSections.entries()) {
            await connection.query(sectionQuery, [
                finalId, index, section.propertyType, section.lengthFt, section.widthFt,
                section.areaSqFt, section.areaSqMt, section.landRate, section.buildingRate,
                section.depreciationRate, section.weightage, section.buildingValue,
                section.openSpaceValue, section.buildingTaxRate, section.openSpaceTaxRate,
                section.buildingFinalValue || 0, section.openSpaceFinalValue || 0, section.description || null,
                section.constructionYear || null, section.propertyAge || 0
            ]);
        }

        await connection.commit();
        await clearPropertiesCache();
        res.status(201).json({ message: 'मालमत्ता यशस्वीरित्या जतन केली गेली', id: finalId });
    } catch (err) {
        await connection.rollback();
        console.error('[PROPERTIES] Save error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

/**
 * Bulk Import properties from array
 * मोठ्या प्रमाणात डेटा इंपोर्ट करणे (Transaction based)
 */
exports.bulkImport = async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'अवैध डेटा फॉरमॅट' });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const property of records) {
            const finalId = `${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

            const propertyQuery = `
                INSERT INTO properties (
                    id, srNo, wardNo, khasraNo, layoutName, plotNo, occupantName, ownerName, 
                    hasConstruction, openSpace, propertyTax, openSpaceTax, streetLightTax, 
                    healthTax, generalWaterTax, specialWaterTax, wasteCollectionTax, 
                    penaltyAmount, totalTaxAmount, arrearsAmount, paidAmount, wastiName, 
                    createdAt, contactNo, buildingUsage, created_by,
                    receiptNo, receiptBook, paymentDate
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await connection.query(propertyQuery, [
                finalId, property.srNo, property.wardNo, property.khasraNo, property.layoutName,
                property.plotNo, property.occupantName, property.ownerName, property.hasConstruction ? 1 : 0,
                property.openSpace, property.propertyTax, property.openSpaceTax, property.streetLightTax,
                property.healthTax, property.generalWaterTax, property.specialWaterTax, property.wasteCollectionTax || 0,
                property.penaltyAmount || 0, property.totalTaxAmount, property.arrearsAmount || 0, property.paidAmount || 0,
                property.wastiName, property.createdAt || new Date().toISOString(), property.contactNo || null,
                property.buildingUsage || 'निवास', req.user.id,
                property.receiptNo || null, property.receiptBook || null, property.paymentDate || null
            ]);

            const sectionQuery = `
                INSERT INTO property_sections (
                    propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt,
                    landRate, buildingRate, depreciationRate, weightage, buildingValue, openSpaceValue,
                    buildingTaxRate, openSpaceTaxRate, constructionYear, propertyAge
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const validSections = (property.sections || []).filter(s => (s.propertyType || '').toString().trim() !== '');

            for (const [index, section] of validSections.entries()) {
                await connection.query(sectionQuery, [
                    finalId, index, section.propertyType, section.lengthFt, section.widthFt, section.areaSqFt, section.areaSqMt,
                    section.landRate || 0, section.buildingRate || 0, section.depreciationRate || 1,
                    section.weightage || 1, section.buildingValue || 0, section.openSpaceValue || 0,
                    section.buildingTaxRate || 0, section.openSpaceTaxRate || 0,
                    section.constructionYear || null, section.propertyAge || 0
                ]);
            }
        }

        await connection.commit();
        await clearPropertiesCache();
        res.status(201).json({ message: `${records.length} नोंदी यशस्वीरित्या इंपोर्ट झाल्या` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
    }
};

/**
 * Delete a property
 * मालमत्ता हटवणे
 */
exports.deleteProperty = async (req, res) => {
    try {
        await db.query('DELETE FROM properties WHERE id = ?', [req.params.id]);
        await clearPropertiesCache();
        res.json({ message: 'मालमत्ता यशस्वीरित्या हटवली गेली' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Cleanup exact duplicate records
 */
exports.cleanupDuplicates = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [duplicateSets] = await connection.query(`
            SELECT wardNo, wastiName, plotNo, ownerName, totalTaxAmount, COUNT(*) as count, MIN(id) as keep_id
            FROM properties
            GROUP BY wardNo, wastiName, plotNo, ownerName, totalTaxAmount
            HAVING count > 1
        `);

        let removedCount = 0;
        for (const set of duplicateSets) {
            await connection.query(`
                DELETE ps FROM property_sections ps JOIN properties p ON ps.propertyId = p.id
                WHERE p.wardNo = ? AND p.wastiName = ? AND p.plotNo = ? AND p.ownerName = ? 
                AND p.totalTaxAmount = ? AND p.id != ?
            `, [set.wardNo, set.wastiName, set.plotNo, set.ownerName, set.totalTaxAmount, set.keep_id]);

            const [delResult] = await connection.query(`
                DELETE FROM properties WHERE wardNo = ? AND wastiName = ? AND plotNo = ? 
                AND ownerName = ? AND totalTaxAmount = ? AND id != ?
            `, [set.wardNo, set.wastiName, set.plotNo, set.ownerName, set.totalTaxAmount, set.keep_id]);
            removedCount += delResult.affectedRows;
        }

        await connection.commit();
        if (removedCount > 0) await clearPropertiesCache();
        res.json({ message: `${removedCount} दुप्पट नोंदी यशस्वीरित्या हटवल्या गेल्या`, removedCount });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

/**
 * Bulk update taxes and rates for specific property types/layouts
 */
exports.bulkUpdateNormalTaxes = async (req, res) => {
    const { propertyType, layoutName, taxes } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const propertyFields = ['streetLightTax', 'healthTax', 'wasteCollectionTax', 'generalWaterTax', 'specialWaterTax'];
        const sectionFields = ['buildingRate', 'landRate'];

        const propertyUpdates = Object.keys(taxes).filter(k => propertyFields.includes(k));
        const sectionUpdates = Object.keys(taxes).filter(k => sectionFields.includes(k));

        const isAllTypes = !propertyType || propertyType === 'सर्व' || propertyType === 'All';

        let subquery = `SELECT DISTINCT p.id FROM properties p`;
        const subparams = [];

        if (!isAllTypes) {
            subquery += ` JOIN property_sections ps ON p.id = ps.propertyId WHERE ps.propertyType LIKE ?`;
            subparams.push(`%${propertyType}%`);
        } else {
            subquery += ` WHERE 1=1`;
        }

        const { wastiName, khasraNo, plotNo, khasraNos } = req.body;

        if (wastiName && wastiName !== 'सर्व' && wastiName !== 'All') {
            subquery += ' AND p.wastiName = ?';
            subparams.push(wastiName);
        }

        if (layoutName && layoutName !== 'सर्व' && layoutName !== 'All') {
            subquery += ' AND p.layoutName = ?';
            subparams.push(layoutName);
        }

        if (khasraNo && khasraNo !== 'सर्व' && khasraNo !== 'All') {
            subquery += ' AND p.khasraNo = ?';
            subparams.push(khasraNo);
        }

        if (plotNo && plotNo !== 'सर्व' && plotNo !== 'All') {
            subquery += ' AND p.plotNo = ?';
            subparams.push(plotNo);
        }

        if (khasraNos && Array.isArray(khasraNos) && khasraNos.length > 0) {
            subquery += ' AND p.khasraNo IN (?)';
            subparams.push(khasraNos);
        }

        const [targetRows] = await connection.query(subquery, subparams);
        const targetIds = targetRows.map(r => r.id);

        if (targetIds.length === 0) {
            await connection.rollback();
            return res.json({ message: 'निवडलेल्या निकषांनुसार एकही मालमत्ता सापडली नाही.', affectedRows: 0 });
        }

        if (propertyUpdates.length > 0) {
            let pQuery = 'UPDATE properties SET ';
            const pParams = [];
            propertyUpdates.forEach((f, i) => {
                pQuery += `${f} = ?${i < propertyUpdates.length - 1 ? ', ' : ''}`;
                pParams.push(taxes[f]);
            });
            pQuery += ' WHERE id IN (?)';
            pParams.push(targetIds);
            await connection.query(pQuery, pParams);
        }

        if (sectionUpdates.length > 0) {
            let sQuery = 'UPDATE property_sections SET ';
            const sParams = [];
            sectionUpdates.forEach((f, i) => {
                const dbField = f === 'buildingRate' ? 'buildingRate' : 'landRate';
                sQuery += `${dbField} = ?${i < sectionUpdates.length - 1 ? ', ' : ''}`;
                sParams.push(taxes[f]);
            });
            sQuery += ' WHERE propertyId IN (?)';
            sParams.push(targetIds);

            if (!isAllTypes) {
                sQuery += ' AND propertyType LIKE ?';
                sParams.push(`%${propertyType}%`);
            }
            await connection.query(sQuery, sParams);
        }

        const recalcQuery = `
            UPDATE properties p
            SET p.totalTaxAmount = (
                COALESCE(p.propertyTax, 0) + 
                COALESCE(p.openSpaceTax, 0) + 
                COALESCE(p.streetLightTax, 0) + 
                COALESCE(p.healthTax, 0) + 
                COALESCE(p.wasteCollectionTax, 0) + 
                COALESCE(p.generalWaterTax, 0) + 
                COALESCE(p.specialWaterTax, 0)
            )
            WHERE id IN (?)
        `;
        await connection.query(recalcQuery, [targetIds]);

        await connection.commit();
        await clearPropertiesCache();

        res.json({
            message: `${targetIds.length} मालमत्ता यशस्वीरित्या अपडेट केल्या गेल्या`,
            affectedRows: targetIds.length
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[PROPERTIES] Bulk Update Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Get unique layout names with property counts
 */
exports.getUniqueLayouts = async (req, res) => {
    try {
        const query = `
            SELECT name, COUNT(p_id) as propertyCount FROM (
                SELECT item_value_mr as name, NULL as p_id FROM master_items mi 
                JOIN master_categories mc ON mi.category_id = mc.id 
                WHERE mc.code = 'LAYOUT'
                UNION ALL
                SELECT layoutName as name, id as p_id FROM properties WHERE layoutName IS NOT NULL AND layoutName != ""
            ) as all_layouts 
            GROUP BY name
            ORDER BY name ASC
        `;
        const [rows] = await db.query(query);

        const layouts = rows.map((r, i) => ({
            id: i + 1,
            item_value_mr: r.name,
            item_value_en: r.name,
            propertyCount: r.propertyCount
        }));

        res.json(layouts);
    } catch (err) {
        console.error('[PROPERTIES] Get Layouts Error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get unique plot numbers
 */
exports.getUniquePlots = async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT plotNo 
            FROM properties 
            WHERE plotNo IS NOT NULL AND plotNo != "" 
            ORDER BY plotNo ASC
        `;
        const [rows] = await db.query(query);
        const plots = rows.map(r => r.plotNo);
        res.json(plots);
    } catch (err) {
        console.error('[PROPERTIES] Get Plots Error:', err);
        res.status(500).json({ error: err.message });
    }
};