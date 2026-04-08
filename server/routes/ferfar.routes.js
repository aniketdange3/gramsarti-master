/**
 * FERFAR ROUTES - फेरफार आणि वारस नोंद राऊट्स (Ferfar API Endpoints)
 * 
 * या फाईलमध्ये मालमत्तेच्या मालकी हक्कात बदल (Mutation) 
 * आणि वारस नोंदणीचे API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const ferfarController = require('../controllers/ferfar.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// सर्व फेरफार अर्जांची यादी मिळवणे
router.get('/', authenticate, ferfarController.getAllRequests);

// फेरफार अर्ज करणे (Public Apply - might need auth depending on user requirements)
router.post('/apply', authenticate, ferfarController.applyFerfar);

// फेरफार अर्ज मंजूर करणे (Admin Only)
router.put('/approve/:id', authenticate, authorize('super_admin', 'gram_sevak'), ferfarController.approveFerfar);

// फेरफार अर्ज नाकारणे (Admin Only)
router.put('/reject/:id', authenticate, authorize('super_admin', 'gram_sevak'), ferfarController.rejectFerfar);

module.exports = router;


module.exports = router;
