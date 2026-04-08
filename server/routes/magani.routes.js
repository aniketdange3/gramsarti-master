/**
 * MAGANI ROUTES - मागणी आणि जप्ती राऊट्स (Magani API Endpoints)
 * 
 * या फाईलमध्ये थकीत कर वसुलीसाठीच्या मागणी पत्रांचे 
 * API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const maganiController = require('../controllers/magani.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// थकीत कर मालमत्तांची यादी
router.get('/defaulters', authenticate, maganiController.getDefaulters);

// मागणी पत्र तयार करणे (Admin & Operator)
router.post('/generate', authenticate, authorize('super_admin', 'gram_sevak', 'operator'), maganiController.generateBills);

// सर्व मागणी पत्रांची यादी पाहणे 
router.get('/bills', authenticate, maganiController.getAllBills);

// पुढील सूचनेचा स्तर अपडेट करणे (Admin Only)
router.put('/:id/advance-notice', authenticate, authorize('super_admin', 'gram_sevak'), maganiController.advanceNotice);

// थकीत वसुली अहवाल मिळवणे
router.get('/report', authenticate, maganiController.getReport);

module.exports = router;


module.exports = router;
