
const express = require('express');
const cors = require('cors');
const { db, initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth.routes');
const paymentRoutes = require('./routes/payment.routes');
const maganiRoutes = require('./routes/magani.routes');
const attendanceRoutes = require('./routes/attendance.routes');

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin 
        // (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5000;

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Initialize Database and Start Server
const startServer = async () => {
    try {
        await initializeDatabase();
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please kill the process using it.`);
            } else {
                console.error('Server error:', err);
            }
            process.exit(1);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/magani', maganiRoutes);
app.use('/api/attendance', attendanceRoutes);

const ferfarRoutes = require('./routes/ferfar.routes');
app.use('/api/ferfar', ferfarRoutes);

app.get('/test-root', (req, res) => {
    res.send('Root is reachable');
});

// Serve static files from the React frontend app
const path = require('path');
const staticPath = path.join(__dirname, '../dist');
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));


// Get unique Khasra numbers
app.get('/api/properties/khasras', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT khasraNo FROM properties WHERE khasraNo IS NOT NULL AND khasraNo != "" ORDER BY khasraNo ASC');
        const khasras = rows.map(r => r.khasraNo);
        res.json(khasras);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Simple in-memory cache for properties
let propertiesCache = null;
let propertiesEtag = null;

const clearPropertiesCache = () => {
    propertiesCache = null;
    propertiesEtag = null;
    console.log('[CACHE] Properties cache cleared.');
};

// Get all properties with their sections
app.get('/api/properties', async (req, res) => {
    console.log('GET /api/properties request received');

    // Check ETag
    if (propertiesEtag && req.headers['if-none-match'] === propertiesEtag) {
        console.log('[CACHE] Returning 304 Not Modified');
        return res.status(304).end();
    }

    // Check Memory Cache
    if (propertiesCache) {
        console.log('[CACHE] Returning cached properties (Length: ' + propertiesCache.length + ')');
        res.setHeader('ETag', propertiesEtag);
        return res.json(propertiesCache);
    }

    const query = `
    SELECT p.*, s.floorIndex, s.propertyType, s.lengthFt, s.widthFt, s.areaSqFt, s.areaSqMt, 
           s.landRate, s.buildingRate, s.depreciationRate, s.weightage, s.buildingValue, 
           s.openSpaceValue, s.buildingTaxRate, s.openSpaceTaxRate
    FROM properties p
    LEFT JOIN property_sections s ON p.id = s.propertyId
    ORDER BY p.srNo ASC
  `;

    try {
        const [rows] = await db.query(query);
        console.log(`Successfully fetched ${rows.length} rows from database`);

        // Process rows to group sections by property
        const propertiesMap = {};
        rows.forEach(row => {
            if (!propertiesMap[row.id]) {
                propertiesMap[row.id] = {
                    ...row,
                    sections: []
                };
                // Remove individual section fields from the main property object
                delete propertiesMap[row.id].floorIndex;
                delete propertiesMap[row.id].propertyType;
                delete propertiesMap[row.id].lengthFt;
                delete propertiesMap[row.id].widthFt;
                delete propertiesMap[row.id].areaSqFt;
                delete propertiesMap[row.id].areaSqMt;
                delete propertiesMap[row.id].landRate;
                delete propertiesMap[row.id].buildingRate;
                delete propertiesMap[row.id].depreciationRate;
                delete propertiesMap[row.id].weightage;
                delete propertiesMap[row.id].buildingValue;
                delete propertiesMap[row.id].openSpaceValue;
                delete propertiesMap[row.id].buildingTaxRate;
                delete propertiesMap[row.id].openSpaceTaxRate;
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
                    openSpaceTaxRate: row.openSpaceTaxRate
                });
            }
        });

        // Cache the result
        propertiesCache = Object.values(propertiesMap);
        propertiesEtag = `W/"${Date.now()}-${propertiesCache.length}"`;
        console.log(`[CACHE] Data cached with ETag ${propertiesEtag}`);

        res.setHeader('ETag', propertiesEtag);
        res.json(propertiesCache);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or Update property
app.post('/api/properties', async (req, res) => {
    const property = req.body;
    console.log('Received POST request for property:', property.id);
    console.log('Property data payload:', JSON.stringify(property, null, 2));

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('Transaction started');

        // Removed "Clash" check and deletion to allow duplicates as per user request
        /*
        const sNo = parseInt(property.srNo);
        const wNo = String(property.wardNo || '').trim();
        const wName = String(property.wastiName || '').trim();

        if (sNo > 0 && wNo && wName) {
            const [clashes] = await connection.query(
                'SELECT id FROM properties WHERE srNo = ? AND wastiName = ? AND wardNo = ? AND id != ?',
                [sNo, wName, wNo, property.id]
            );
            for (const clash of clashes) {
                console.log(`[MERGE] Removing clashing record ${clash.id} (Unique Key Match)`);
                await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [clash.id]);
                await connection.query('DELETE FROM properties WHERE id = ?', [clash.id]);
            }
        }

        const [delSections] = await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [property.id]);
        const [delProp] = await connection.query('DELETE FROM properties WHERE id = ?', [property.id]);
        console.log(`Deleted sections: ${delSections.affectedRows}, Deleted properties: ${delProp.affectedRows}`);
        */

        // Use existing ID if provided (for updates), otherwise generate a new one
        const finalId = (property.id && String(property.id).trim() !== '') ? 
            property.id : 
            (Math.random().toString(36).substr(2, 9) + '_' + Date.now());
            
        console.log(`[DATA UPDATE] Persistence operation for ID: ${finalId}`);

        // Perform clean overwrite for updates
        await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [finalId]);
        await connection.query('DELETE FROM properties WHERE id = ?', [finalId]);

        const propertyQuery = `INSERT INTO properties (id, srNo, wardNo, khasraNo, layoutName, plotNo, occupantName, ownerName, hasConstruction, openSpace, propertyTax, openSpaceTax, streetLightTax, healthTax, generalWaterTax, specialWaterTax, wasteCollectionTax, penaltyAmount, totalTaxAmount, arrearsAmount, paidAmount, wastiName, createdAt, receiptNo, receiptBook, paymentDate, propertyId, constructionYear, propertyAge, readyReckonerLand, readyReckonerBuilding, readyReckonerComposite, depreciationAmount, remarksNotes, propertyLength, propertyWidth, totalAreaSqFt, totalAreaSqMt, contactNo, buildingUsage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const propertyParams = [
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

        await connection.query(propertyQuery, propertyParams);
        console.log('Property main record inserted successfully');

        const sectionQuery = `INSERT INTO property_sections (propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt, landRate, buildingRate, depreciationRate, weightage, buildingValue, openSpaceValue, buildingTaxRate, openSpaceTaxRate, buildingFinalValue, openSpaceFinalValue, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // Strictly filter: only save sections that have a valid Property Type selected
        // This prevents creating empty records for unused floors
        const validSections = property.sections.filter((s, idx) => {
            const pType = (s.propertyType || '').toString().trim();
            const isValid = pType !== '' && pType.toLowerCase() !== 'निवडा';

            if (!isValid) {
                console.log(`[FILTER] Skipping Floor ${idx} (Property: ${property.id}) - Reason: Property Type is blank or 'निवडा'`);
            }
            return isValid;
        });

        console.log(`[ACTION] Inserting ${validSections.length} valid sections into property_sections (Total received: ${property.sections.length})`);

        for (const [index, section] of validSections.entries()) {
            console.log(`[DB] Saving Valid Section ${index}: ${section.propertyType}`);
            await connection.query(sectionQuery, [
                finalId,
                index, // Use loop index as the new floorIndex for clean ordering
                section.propertyType, section.lengthFt, section.widthFt,
                section.areaSqFt, section.areaSqMt, section.landRate, section.buildingRate,
                section.depreciationRate, section.weightage, section.buildingValue,
                section.openSpaceValue, section.buildingTaxRate, section.openSpaceTaxRate,
                section.buildingFinalValue || 0, section.openSpaceFinalValue || 0, section.description || null
            ]);
        }
        console.log('All sections inserted successfully');

        await connection.commit();
        clearPropertiesCache();
        console.log('**************************************************');
        console.log(`[DATA UPDATE] Property ${property.id} (${property.ownerName}) successfully saved/updated at ${new Date().toLocaleString()}`);
        console.log('**************************************************');
        console.log('Transaction committed successfully');
        res.status(201).json({ message: 'Property saved successfully' });
    } catch (err) {
        console.error('Error during data persistence:', err);
        await connection.rollback();
        console.log('Transaction rolled back');

        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('idx_strict_unique_prop')) {
                res.status(400).json({ error: 'या मालमत्तेची नोंद (वॉर्ड, वस्ती, प्लॉट, मालकाचे नाव आणि रक्कम) आधीच अस्तित्वात आहे.' });
            } else if (err.message.includes('idx_unique_property')) {
                res.status(400).json({ error: 'या वस्ती आणि वॉर्ड मध्ये हा अनुक्रमांक (S.No) आधीच वापरला गेला आहे.' });
            } else {
                res.status(400).json({ error: 'ही नोंद आधीच अस्तित्वात आहे.' });
            }
        } else {
            res.status(500).json({ error: err.message });
        }
    } finally {
        connection.release();
        console.log('Connection released');
    }
});

// Bulk Import properties
app.post('/api/properties/import', async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid data format: Expected an array of records' });
    }

    console.log(`Received bulk import request for ${records.length} records`);
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Get the current max srNo to auto-assign for records with srNo=0
        const [maxRow] = await connection.query('SELECT COALESCE(MAX(srNo), 0) as maxSrNo FROM properties');
        let nextSrNo = maxRow[0].maxSrNo + 1;
        let importedCount = 0;

        for (const property of records) {
            let targetId = property.id;

            // Parse srNo, wastiName, wardNo
            let sNo = property.srNo !== undefined && property.srNo !== null ? parseInt(property.srNo) : 0;
            const wName = String(property.wastiName || '').trim();
            const wNo = String(property.wardNo || '').trim();

            // Auto-assign srNo if it's 0 or missing
            if (!sNo || sNo <= 0) {
                sNo = nextSrNo++;
            }

            if (!targetId) {
                targetId = Math.random().toString(36).substr(2, 9);
            }

            // Removed Clash/ID deletion to allow duplicates
            /*
            if (sNo > 0 && wNo) {
                let clash = true;
                while (clash) {
                    const [existing] = await connection.query(
                        'SELECT id FROM properties WHERE srNo = ? AND wastiName = ? AND wardNo = ? AND id != ?',
                        [sNo, wName, wNo, targetId]
                    );
                    if (existing && existing.length > 0) {
                        sNo = nextSrNo++;
                    } else {
                        clash = false;
                    }
                }
            }

            await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [targetId]);
            await connection.query('DELETE FROM properties WHERE id = ?', [targetId]);
            */

            // Ensure unique ID for every import record to prevent collisions and store everything
            const finalId = Math.random().toString(36).substr(2, 9) + '_' + Date.now();

            // Insert Property with the resolved srNo
            const propertyQuery = `INSERT INTO properties (id, srNo, wardNo, khasraNo, layoutName, plotNo, occupantName, ownerName, hasConstruction, openSpace, propertyTax, openSpaceTax, streetLightTax, healthTax, generalWaterTax, specialWaterTax, wasteCollectionTax, penaltyAmount, totalTaxAmount, arrearsAmount, paidAmount, wastiName, createdAt, receiptNo, receiptBook, paymentDate, propertyId, constructionYear, propertyAge, readyReckonerLand, readyReckonerBuilding, readyReckonerComposite, depreciationAmount, propertyLength, propertyWidth, totalAreaSqFt, totalAreaSqMt, contactNo, buildingUsage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await connection.query(propertyQuery, [
                finalId, sNo, property.wardNo, property.khasraNo, property.layoutName,
                property.plotNo, property.occupantName, property.ownerName, property.hasConstruction ? 1 : 0,
                property.openSpace, property.propertyTax, property.openSpaceTax, property.streetLightTax,
                property.healthTax, property.generalWaterTax, property.specialWaterTax, property.wasteCollectionTax || 0,
                property.penaltyAmount || 0, property.totalTaxAmount, property.arrearsAmount || 0, property.paidAmount || 0,
                property.wastiName, property.createdAt || new Date().toISOString(),
                property.receiptNo || null, property.receiptBook || null, property.paymentDate || null,
                property.propertyId || null, property.constructionYear || null, property.propertyAge || 0,
                property.readyReckonerLand || 0, property.readyReckonerBuilding || 0, property.readyReckonerComposite || 0,
                property.depreciationAmount || 0,
                property.propertyLength || null, property.propertyWidth || null, property.totalAreaSqFt || null, property.totalAreaSqMt || null, property.contactNo || null,
                property.buildingUsage || 'निवास'
            ]);

            // Insert Sections
            const sectionQuery = `INSERT INTO property_sections (propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt, landRate, buildingRate, depreciationRate, weightage, buildingValue, openSpaceValue, buildingTaxRate, openSpaceTaxRate, buildingFinalValue, openSpaceFinalValue, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const validSections = (property.sections || []).filter(s => {
                const pType = (s.propertyType || '').toString().trim();
                return pType !== '' && pType.toLowerCase() !== 'निवडा';
            });

            for (const [index, section] of validSections.entries()) {
                await connection.query(sectionQuery, [
                    finalId, index,
                    section.propertyType, section.lengthFt, section.widthFt,
                    section.areaSqFt, section.areaSqMt, section.landRate, section.buildingRate,
                    section.depreciationRate, section.weightage, section.buildingValue,
                    section.openSpaceValue, section.buildingTaxRate, section.openSpaceTaxRate,
                    section.buildingFinalValue || 0, section.openSpaceFinalValue || 0, section.description || null
                ]);
            }
            importedCount++;
        }

        await connection.commit();
        clearPropertiesCache();
        console.log(`Import complete: ${importedCount} records inserted successfully`);
        res.status(201).json({ message: `Successfully imported ${importedCount} records` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Import error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: `इंपोर्ट अयशस्वी: काही नोंदी आधीच अस्तित्वात आहेत (डुप्लिकेट डेटा). तपशील: ${err.message}` });
        } else {
            res.status(500).json({ error: err.message });
        }
    } finally {
        if (connection) {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            connection.release();
        }
    }
});

// Delete property
app.delete('/api/properties/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM properties WHERE id = ?', [req.params.id]);
        clearPropertiesCache();
        res.json({ message: 'Property deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to Cleanup Exact Duplicates (Keeping only one of each set of identical records)
app.post('/api/properties/cleanup-duplicates', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        console.log('[CLEANUP] Starting exact duplicate cleanup...');
        
        // Find sets of exact duplicates based on specific fields: ward, wasti, plot, owner, amount
        const [duplicateSets] = await connection.query(`
            SELECT wardNo, wastiName, plotNo, ownerName, totalTaxAmount,
                   COUNT(*) as count,
                   MIN(id) as keep_id
            FROM properties
            GROUP BY wardNo, wastiName, plotNo, ownerName, totalTaxAmount
            HAVING count > 1
        `);
        
        let removedCount = 0;
        for (const set of duplicateSets) {
            // Delete redundant sections first
            await connection.query(`
                DELETE ps FROM property_sections ps
                JOIN properties p ON ps.propertyId = p.id
                WHERE p.wardNo = ? AND p.wastiName = ? AND p.plotNo = ? 
                AND p.ownerName = ? AND p.totalTaxAmount = ?
                AND p.id != ?
            `, [
                set.wardNo, set.wastiName, set.plotNo, 
                set.ownerName, set.totalTaxAmount, set.keep_id
            ]);

            // Delete redundant properties
            const [delResult] = await connection.query(`
                DELETE FROM properties
                WHERE wardNo = ? AND wastiName = ? AND plotNo = ? 
                AND ownerName = ? AND totalTaxAmount = ?
                AND id != ?
            `, [
                set.wardNo, set.wastiName, set.plotNo, 
                set.ownerName, set.totalTaxAmount, set.keep_id
            ]);
            removedCount += delResult.affectedRows;
        }
        
        await connection.commit();
        if (removedCount > 0) clearPropertiesCache();
        console.log(`[CLEANUP] Removed ${removedCount} exact duplicate records.`);
        res.json({ message: `Successfully removed ${removedCount} exact duplicate records.`, removedCount });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[CLEANUP] Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// कर दरांसाठी मेमरी कॅशे (Memory Cache for Tax Rates)
let taxRatesCache = null;

const clearTaxRatesCache = () => {
    taxRatesCache = null;
    console.log('[CACHE] Tax rates cache cleared.');
};

// Tax Rate Master Endpoints (कर दर मुख्य डेटा)
app.get('/api/tax-rates', async (req, res) => {
    try {
        // जर कॅशे उपलब्ध असेल तर थेट कॅशेमधून डेटा पाठवा (Optimized Caching)
        if (taxRatesCache) {
            console.log('[CACHE] Returning cached tax rates');
            return res.json(taxRatesCache);
        }
        
        const [rows] = await db.query('SELECT * FROM tax_rates');
        taxRatesCache = rows; // कॅशेमध्ये जतन करा (Save to Cache)
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tax-rates', async (req, res) => {
    const { propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO tax_rates (propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate) VALUES (?, ?, ?, ?, ?, ?)',
            [propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate]
        );
        clearTaxRatesCache(); // नवीन दर जोडल्यावर कॅशे साफ करा (Invalidate cache on write)
        res.status(201).json({ id: result.insertId, message: 'Tax rate added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tax-rates/:id', async (req, res) => {
    const { buildingRate, buildingTaxRate, landRate, openSpaceTaxRate } = req.body;
    try {
        await db.query(
            'UPDATE tax_rates SET buildingRate = ?, buildingTaxRate = ?, landRate = ?, openSpaceTaxRate = ? WHERE id = ?',
            [buildingRate, buildingTaxRate, landRate, openSpaceTaxRate, req.params.id]
        );
        clearTaxRatesCache(); // अपडेट केल्यावर कॅशे साफ करा (Invalidate cache on update)
        res.json({ message: 'Tax rate updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tax-rates/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
        clearTaxRatesCache(); // डिलीट झाल्यावर कॅशे साफ करा (Invalidate cache on delete)
        res.json({ message: 'Tax rate deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────
// SYSTEM CONFIG
// ──────────────────────────────────────────────
app.get('/api/system-config', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT config_key, config_value FROM system_config');
        if (!rows) throw new Error('Failed to fetch system config');

        const config = {};
        rows.forEach(r => config[r.config_key] = r.config_value);
        res.json(config);
    } catch (err) {
        console.error('GET /api/system-config Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/system-config', async (req, res) => {
    try {
        const updates = req.body; // { key: value, ... }
        for (const [key, val] of Object.entries(updates)) {
            await db.query(
                'INSERT INTO system_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
                [key, val, val]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/system-config Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── MASTER DATA ENDPOINTS ──────────────────────────────────────────────────

// Get all categories
app.get('/api/master/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM master_categories ORDER BY name_mr ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get items by category code
app.get('/api/master/items/:categoryCode', async (req, res) => {
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
});

// Get all items (grouped or flat)
app.get('/api/master/items', async (req, res) => {
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
});

// Add new submaster item
app.post('/api/master/items', async (req, res) => {
    const { category_id, item_value_mr, item_value_en, item_code, sort_order } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO master_items (category_id, item_value_mr, item_value_en, item_code, sort_order) VALUES (?, ?, ?, ?, ?)',
            [category_id, item_value_mr, item_value_en, item_code, sort_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Item added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update submaster item
app.put('/api/master/items/:id', async (req, res) => {
    const { item_value_mr, item_value_en, item_code, sort_order, is_active } = req.body;
    try {
        await db.query(
            'UPDATE master_items SET item_value_mr = ?, item_value_en = ?, item_code = ?, sort_order = ?, is_active = ? WHERE id = ?',
            [item_value_mr, item_value_en, item_code, sort_order, is_active, req.params.id]
        );
        res.json({ message: 'Item updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete submaster item
app.delete('/api/master/items/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM master_items WHERE id = ?', [req.params.id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DEPRECIATION RATES ENDPOINTS ──────────────────────────────────────────

app.get('/api/master/depreciation', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM depreciation_rates ORDER BY min_age ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/master/depreciation', async (req, res) => {
    const { min_age, max_age, percentage } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO depreciation_rates (min_age, max_age, percentage) VALUES (?, ?, ?)',
            [min_age, max_age, percentage]
        );
        res.status(201).json({ id: result.insertId, message: 'Depreciation rate added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/master/depreciation/:id', async (req, res) => {
    const { min_age, max_age, percentage } = req.body;
    try {
        await db.query(
            'UPDATE depreciation_rates SET min_age = ?, max_age = ?, percentage = ? WHERE id = ?',
            [min_age, max_age, percentage, req.params.id]
        );
        res.json({ message: 'Depreciation rate updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/master/depreciation/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM depreciation_rates WHERE id = ?', [req.params.id]);
        res.json({ message: 'Depreciation rate deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── READY RECKONER RATES ENDPOINTS ────────────────────────────────────────

app.get('/api/master/ready-reckoner', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ready_reckoner_rates ORDER BY year_range DESC, id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/master/ready-reckoner', async (req, res) => {
    const { year_range, item_name_mr, valuation_rate, tax_rate, unit_mr } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO ready_reckoner_rates (year_range, item_name_mr, valuation_rate, tax_rate, unit_mr) VALUES (?, ?, ?, ?, ?)',
            [year_range, item_name_mr, valuation_rate, tax_rate, unit_mr]
        );
        res.status(201).json({ id: result.insertId, message: 'Ready Reckoner rate added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/master/ready-reckoner/:id', async (req, res) => {
    const { year_range, item_name_mr, valuation_rate, tax_rate, unit_mr } = req.body;
    try {
        await db.query(
            'UPDATE ready_reckoner_rates SET year_range = ?, item_name_mr = ?, valuation_rate = ?, tax_rate = ?, unit_mr = ? WHERE id = ?',
            [year_range, item_name_mr, valuation_rate, tax_rate, unit_mr, req.params.id]
        );
        res.json({ message: 'Ready Reckoner rate updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/master/ready-reckoner/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM ready_reckoner_rates WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ready Reckoner rate deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── BUILDING USAGE MASTER ENDPOINTS ───────────────────────────────────────

app.get('/api/master/building-usage', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM building_usage_master ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/master/building-usage', async (req, res) => {
    const { usage_type_mr, usage_type_en, weightage } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO building_usage_master (usage_type_mr, usage_type_en, weightage) VALUES (?, ?, ?)',
            [usage_type_mr, usage_type_en, weightage]
        );
        res.status(201).json({ id: result.insertId, message: 'Usage type added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/master/building-usage/:id', async (req, res) => {
    const { usage_type_mr, usage_type_en, weightage } = req.body;
    try {
        await db.query(
            'UPDATE building_usage_master SET usage_type_mr = ?, usage_type_en = ?, weightage = ? WHERE id = ?',
            [usage_type_mr, usage_type_en, weightage, req.params.id]
        );
        res.json({ message: 'Usage type updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/master/building-usage/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM building_usage_master WHERE id = ?', [req.params.id]);
        res.json({ message: 'Usage type deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── SYSTEM RESET & SEED ────────────────────────────────────────────────────
app.post('/api/system/reset-and-seed', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('[SYSTEM] Clearing all data tables...');
        await connection.query('TRUNCATE TABLE property_sections');
        await connection.query('TRUNCATE TABLE properties');
        await connection.query('TRUNCATE TABLE payments');
        await connection.query('TRUNCATE TABLE tax_head_allocations');
        await connection.query('TRUNCATE TABLE magani_bills');
        await connection.query('TRUNCATE TABLE notices');
        await connection.query('TRUNCATE TABLE property_audit_log');

        console.log('[SYSTEM] Seeding high-fidelity test cases...');

        const testProperties = [
            {
                id: 'test_prop_01',
                srNo: 1,
                wardNo: '3',
                khasraNo: '45/2',
                layoutName: 'विठ्ठल रुक्मिणी लेआउट',
                plotNo: '101/A',
                occupantName: 'श्री. गणेश पाटील',
                ownerName: 'श्री. गणेश पाटील',
                hasConstruction: 1,
                openSpace: 600,
                propertyTax: 4500,
                openSpaceTax: 300,
                streetLightTax: 150,
                healthTax: 100,
                generalWaterTax: 250,
                specialWaterTax: 0,
                wasteCollectionTax: 200,
                totalTaxAmount: 5500,
                arrearsAmount: 5000,
                paidAmount: 0,
                wastiName: 'वेळाहरी',
                createdAt: new Date().toISOString(),
                sections: [
                    { floorIndex: 0, propertyType: 'आर.सी.सी', lengthFt: 30, widthFt: 30, areaSqFt: 900, areaSqMt: 83.61, buildingTaxRate: 1.20, buildingValue: 4500 }
                ]
            },
            {
                id: 'test_prop_02',
                srNo: 2,
                wardNo: '1',
                khasraNo: '21',
                layoutName: 'श्रीनगर लेआउट',
                plotNo: '55',
                occupantName: 'श्रीपती महादेव कोळगे',
                ownerName: 'श्रीपती महादेव कोळगे',
                hasConstruction: 1,
                openSpace: 1200,
                propertyTax: 3200,
                openSpaceTax: 150,
                streetLightTax: 120,
                healthTax: 80,
                generalWaterTax: 200,
                specialWaterTax: 500,
                wasteCollectionTax: 200,
                totalTaxAmount: 4450,
                arrearsAmount: 3500,
                paidAmount: 1000,
                wastiName: 'शंकरपुर',
                createdAt: new Date().toISOString(),
                sections: [
                    { floorIndex: 0, propertyType: 'विटा सिमेंट', lengthFt: 40, widthFt: 50, areaSqFt: 2000, areaSqMt: 185.81, buildingTaxRate: 0.80, buildingValue: 3200 }
                ]
            },
            {
                id: 'test_prop_03',
                srNo: 3,
                wardNo: '2',
                khasraNo: '10 / 1',
                layoutName: 'आंबेडकर नगर',
                plotNo: '89',
                occupantName: 'श्रीमती शांताबाई शिंदे',
                ownerName: 'श्रीमती शांताबाई शिंदे',
                hasConstruction: 0,
                openSpace: 3000,
                propertyTax: 0,
                openSpaceTax: 1500,
                streetLightTax: 200,
                healthTax: 150,
                generalWaterTax: 300,
                specialWaterTax: 0,
                wasteCollectionTax: 0,
                totalTaxAmount: 2150,
                arrearsAmount: 12000,
                paidAmount: 0,
                wastiName: 'गोटाळ पांजरी',
                createdAt: new Date().toISOString(),
                sections: []
            }
        ];

        for (const prop of testProperties) {
            const propQuery = `INSERT INTO properties (id, srNo, wardNo, khasraNo, layoutName, plotNo, occupantName, ownerName, hasConstruction, openSpace, propertyTax, openSpaceTax, streetLightTax, healthTax, generalWaterTax, specialWaterTax, wasteCollectionTax, penaltyAmount, totalTaxAmount, arrearsAmount, paidAmount, wastiName, createdAt, receiptNo, receiptBook, paymentDate, propertyId, constructionYear, propertyAge, readyReckonerLand, readyReckonerBuilding, readyReckonerComposite, depreciationAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await connection.query(propQuery, [
                prop.id, prop.srNo, prop.wardNo, prop.khasraNo, prop.layoutName, prop.plotNo,
                prop.occupantName, prop.ownerName, prop.hasConstruction, prop.openSpace,
                prop.propertyTax, prop.openSpaceTax, prop.streetLightTax, prop.healthTax,
                prop.generalWaterTax, prop.specialWaterTax, prop.wasteCollectionTax || 0,
                0, prop.totalTaxAmount, prop.arrearsAmount, prop.paidAmount, prop.wastiName, prop.createdAt,
                null, null, null, null, null, 0, 0, 0, 0, 0
            ]);

            for (const sec of prop.sections) {
                const secQuery = `INSERT INTO property_sections (propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt, landRate, buildingRate, depreciationRate, weightage, buildingValue, openSpaceValue, buildingTaxRate, openSpaceTaxRate, buildingFinalValue, openSpaceFinalValue, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                await connection.query(secQuery, [
                    prop.id, sec.floorIndex, sec.propertyType, sec.lengthFt, sec.widthFt,
                    sec.areaSqFt, sec.areaSqMt, 0, 0, 0, 0, sec.buildingValue, 0, sec.buildingTaxRate || 0, 0,
                    0, 0, null
                ]);
            }
        }

        await connection.commit();
        console.log('[SYSTEM] Reset and Seed complete.');
        res.json({ message: 'System reset and seeded with 3 test cases successfully' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[SYSTEM] Reset failed:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            connection.release();
        }
    }
});

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// app.listen moved to startServer()
