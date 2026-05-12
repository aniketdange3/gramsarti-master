/**
 * PROPERTY ROUTES - मालमत्ता राऊट्स (Property API Endpoints)
 * 
 * या फाईलमध्ये मालमत्तांशी संबंधित सर्व API रस्ते (Endpoints) 
 * आणि त्यांचे कंट्रोलर फंक्शन्स जोडले आहेत.
 */

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// सर्व खसरा क्रमांक मिळवणे (Public access for selection)
router.get('/khasras', propertyController.getKhasras);

// सर्व मालमत्तांची यादी मिळवणे (Authenticated View)
router.get('/', authenticate, propertyController.getAllProperties);

// नवीन मालमत्ता जतन करणे किंवा अपडेट करणे (Authenticated Edit)
router.post('/', authenticate, propertyController.saveProperty);

// मोठ्या प्रमाणात डेटा इंपोर्ट (Admin Only)
router.post('/import', authenticate, authorize('super_admin', 'gram_sevak'), propertyController.bulkImport);

// युनिक लेआउट्स मिळवणे
router.get('/unique-layouts', authenticate, propertyController.getUniqueLayouts);

// युनिक प्लॉट्स मिळवणे
router.get('/plots', authenticate, propertyController.getUniquePlots);


// विशिष्ट मालमत्ता आयडीने मिळवणे
router.get('/:id', authenticate, propertyController.getPropertyById);

// मालमत्ता हटवणे (Admin Only)
router.delete('/:id', authenticate, authorize('super_admin'), propertyController.deleteProperty);

// मोठ्या प्रमाणात करांचे दर अपडेट करणे (Bulk Update)
router.put('/bulk-tax-update', authenticate, authorize('super_admin', 'gram_sevak'), propertyController.bulkUpdateNormalTaxes);

// हुबेहूब जुळणाऱ्या नोंदी साफ करणे (Maintenance - Admin Only)
router.post('/cleanup-duplicates', authenticate, authorize('super_admin'), propertyController.cleanupDuplicates);

module.exports = router;
