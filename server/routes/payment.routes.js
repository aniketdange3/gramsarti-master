/**
 * PAYMENT ROUTES - देयके राऊट्स (Payment API Endpoints)
 * 
 * या फाईलमध्ये कर भरणा नोंदवणे, पावत्या पाहणे आणि 
 * वसुली अहवाल मिळवण्यासाठीचे API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// नवीन पेमेंट नोंदवणे (Operator & Admin)
router.post('/', authenticate, authorize('super_admin', 'gram_sevak', 'collection_officer', 'operator', 'gram_sachiv', 'bill_operator'), paymentController.createPayment);

// सर्व पेमेंट्सची यादी मिळवणे (Authenticated View)
router.get('/', authenticate, paymentController.getAllPayments);

// पावती तपशील मिळवणे 
router.get('/receipt/:id', authenticate, paymentController.getReceiptById);

// दैनंदिन वसुली अहवाल (Admin Only)
router.get('/daily-summary', authenticate, authorize('super_admin', 'gram_sevak', 'collection_officer'), paymentController.getDailySummary);

// चेक स्टेटस अपडेट करणे (Admin Only)
router.put('/cheques/:id/status', authenticate, authorize('super_admin', 'gram_sevak'), paymentController.updateChequeStatus);

module.exports = router;


module.exports = router;
