/**
 * MASTER DATA ROUTES - मुख्य डेटा राऊट्स (Master Data API)
 * 
 * या फाईलमध्ये वॉर्ड, वस्ती, मालमत्ता प्रकार, घसारा दर, 
 * आणि सिस्टीम कॉन्फिगरेशनचे API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const masterController = require('../controllers/master.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// --- Categories & Items ---
router.get('/categories', authenticate, masterController.getAllCategories);
router.get('/items/:categoryCode', authenticate, masterController.getItemsByCategory);
router.get('/items', authenticate, masterController.getAllItems);
router.post('/items', authenticate, authorize('super_admin'), masterController.addItem);
router.put('/items/:id', authenticate, authorize('super_admin'), masterController.updateItem);
router.delete('/items/:id', authenticate, authorize('super_admin'), masterController.deleteItem);

// --- Depreciation ---
router.get('/depreciation', authenticate, masterController.getDepreciationRates);

// --- Ready Reckoner ---
router.get('/ready-reckoner', authenticate, masterController.getReadyReckonerRates);

// --- Building Usage ---
router.get('/building-usage', authenticate, masterController.getBuildingUsage);

// --- System Config ---
router.get('/config', authenticate, masterController.getSystemConfig);
router.post('/config', authenticate, authorize('super_admin'), masterController.updateSystemConfig);

// --- System Maintenance ---
router.post('/system/reset', authenticate, authorize('super_admin'), masterController.resetAndSeed);

module.exports = router;
