/**
 * TAX ROUTES - कर दर राऊट्स (Tax Rates API)
 * 
 * या फाईलमध्ये मालमत्ता कर दर (RCC, विटा सिमेंट, खाली जागा) 
 * व्यवस्थापित करण्यासाठीचे API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const taxController = require('../controllers/tax.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// सर्व कर दर मिळवणे (Authenticated View)
router.get('/', authenticate, taxController.getAllTaxRates);

// नवीन कर दर जोडणे (Admin Only)
router.post('/', authenticate, authorize('super_admin'), taxController.addTaxRate);

// कर दर अपडेट करणे (Admin Only)
router.put('/:id', authenticate, authorize('super_admin'), taxController.updateTaxRate);

// कर दर हटवणे (Admin Only)
router.delete('/:id', authenticate, authorize('super_admin'), taxController.deleteTaxRate);

module.exports = router;
