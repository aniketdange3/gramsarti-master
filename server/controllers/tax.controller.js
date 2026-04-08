/**
 * TAX CONTROLLER - कर दर नियंत्रण केंद्र (Tax Rates & Logic)
 * 
 * या फाईलमध्ये मालमत्ता कर दरांची (RCC, विटा सिमेंट, खाली जागा) 
 * माहिती व्यवस्थापित करण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');

// कर दरांसाठी मेमरी कॅशे (Memory Cache for Tax Rates)
let taxRatesCache = null;

const clearTaxRatesCache = () => {
    taxRatesCache = null;
    console.log('[CACHE] Tax rates cache cleared.');
};

/**
 * Get all tax rates
 * सर्व कर दर मिळवणे (With optimization caching)
 */
exports.getAllTaxRates = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        if (taxRatesCache) {
            return res.json(taxRatesCache);
        }

        const [rows] = await db.query('SELECT * FROM tax_rates');
        taxRatesCache = rows;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new tax rate
 * नवीन कर दर जोडणे
 */
exports.addTaxRate = async (req, res) => {
    const { propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO tax_rates (propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate) VALUES (?, ?, ?, ?, ?, ?)',
            [propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate]
        );
        clearTaxRatesCache();
        res.status(201).json({ id: result.insertId, message: 'कर दर यशस्वीरित्या जोडला गेला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update an existing tax rate
 * कर दर अपडेट करणे
 */
exports.updateTaxRate = async (req, res) => {
    const { buildingRate, buildingTaxRate, landRate, openSpaceTaxRate } = req.body;
    try {
        await db.query(
            'UPDATE tax_rates SET buildingRate = ?, buildingTaxRate = ?, landRate = ?, openSpaceTaxRate = ? WHERE id = ?',
            [buildingRate, buildingTaxRate, landRate, openSpaceTaxRate, req.params.id]
        );
        clearTaxRatesCache();
        res.json({ message: 'कर दर यशस्वीरित्या अपडेट झाला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete a tax rate
 * कर दर हटवणे
 */
exports.deleteTaxRate = async (req, res) => {
    try {
        await db.query('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
        clearTaxRatesCache();
        res.json({ message: 'कर दर यशस्वीरित्या हटवला गेला' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
