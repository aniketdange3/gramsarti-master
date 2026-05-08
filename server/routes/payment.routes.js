/**
 * PAYMENT ROUTES - देयके राउट्स (Payment API Endpoints)
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

module.exports = router;
