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
 * Get all properties with their floor sections
 * सर्व मालमत्ता आणि त्यांच्या मजल्यांची माहिती मिळवणे (With Caching)
 */
exports.getAllProperties = async (req, res) => {
    console.log('[PROPERTIES] Fetching all properties...');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ETag तपासणी (Check for browser cache)
    const currentEtag = getPropertiesEtag();
    if (currentEtag && req.headers['if-none-match'] === currentEtag) {
        return res.status(304).end();
    }

    // मेमरी कॅशे तपासणी (Check Memory Cache)
    const cachedData = getPropertiesCache();
    if (cachedData) {
        res.setHeader('ETag', currentEtag);
        return res.json(cachedData);
    }

    const query = `
        SELECT p.*, s.floorIndex, s.propertyType, s.lengthFt, s.widthFt, s.areaSqFt, s.areaSqMt, 
               s.landRate, s.buildingRate, s.depreciationRate, s.weightage, s.buildingValue, 
               s.openSpaceValue, s.buildingTaxRate, s.openSpaceTaxRate, s.constructionYear as sectionYear, s.propertyAge as sectionAge
        FROM properties p
        LEFT JOIN property_sections s ON p.id = s.propertyId
        ORDER BY p.srNo ASC
    `;

    try {
        const [rows] = await db.query(query);
        
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
                    propertyAge: row.sectionAge
                });
            }
        });

        const propertiesArray = Object.values(propertiesMap);
        const newEtag = setPropertiesCache(propertiesArray);
        res.setHeader('ETag', newEtag);
        res.json(propertiesArray);
    } catch (err) {
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
                propertyWidth, totalAreaSqFt, totalAreaSqMt, contactNo, buildingUsage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
            property.buildingUsage || 'निवास'
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
        clearPropertiesCache();
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
                    createdAt, contactNo, buildingUsage
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await connection.query(propertyQuery, [
                finalId, property.srNo, property.wardNo, property.khasraNo, property.layoutName,
                property.plotNo, property.occupantName, property.ownerName, property.hasConstruction ? 1 : 0,
                property.openSpace, property.propertyTax, property.openSpaceTax, property.streetLightTax,
                property.healthTax, property.generalWaterTax, property.specialWaterTax, property.wasteCollectionTax || 0,
                property.penaltyAmount || 0, property.totalTaxAmount, property.arrearsAmount || 0, property.paidAmount || 0,
                property.wastiName, property.createdAt || new Date().toISOString(), property.contactNo || null,
                property.buildingUsage || 'निवास'
            ]);

            const sectionQuery = `INSERT INTO property_sections (propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const validSections = (property.sections || []).filter(s => (s.propertyType || '').toString().trim() !== '');

            for (const [index, section] of validSections.entries()) {
                await connection.query(sectionQuery, [
                    finalId, index, section.propertyType, section.lengthFt, section.widthFt, section.areaSqFt, section.areaSqMt
                ]);
            }
        }

        await connection.commit();
        clearPropertiesCache();
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
        clearPropertiesCache();
        res.json({ message: 'मालमत्ता यशस्वीरित्या हटवली गेली' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Cleanup exact duplicate records
 * हुबेहूब जुळणाऱ्या नोंदी साफ करणे
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
        if (removedCount > 0) clearPropertiesCache();
        res.json({ message: `${removedCount} दुप्पट नोंदी यशस्वीरित्या हटवल्या गेल्या`, removedCount });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
