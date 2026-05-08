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
router.post('/items', authenticate, authorize('super_admin'), masterController.addItem);
router.put('/items/:id', authenticate, authorize('super_admin'), masterController.updateItem);
router.delete('/items/:id', authenticate, authorize('super_admin'), masterController.deleteItem);

// --- Depreciation ---
router.get('/depreciation', authenticate, masterController.getDepreciationRates);
router.post('/depreciation', authenticate, authorize('super_admin'), masterController.addDepreciationRate);
router.put('/depreciation/:id', authenticate, authorize('super_admin'), masterController.updateDepreciationRate);
router.delete('/depreciation/:id', authenticate, authorize('super_admin'), masterController.deleteDepreciationRate);

// --- Ready Reckoner ---
router.get('/ready-reckoner', authenticate, masterController.getReadyReckonerRates);
router.post('/ready-reckoner', authenticate, authorize('super_admin'), masterController.addReadyReckonerRate);
router.put('/ready-reckoner/:id', authenticate, authorize('super_admin'), masterController.updateReadyReckonerRate);
router.delete('/ready-reckoner/:id', authenticate, authorize('super_admin'), masterController.deleteReadyReckonerRate);

// --- Building Usage ---
router.get('/building-usage', authenticate, masterController.getBuildingUsage);
router.post('/building-usage', authenticate, authorize('super_admin'), masterController.addBuildingUsage);
router.put('/building-usage/:id', authenticate, authorize('super_admin'), masterController.updateBuildingUsage);
router.delete('/building-usage/:id', authenticate, authorize('super_admin'), masterController.deleteBuildingUsage);

// --- System Config ---
router.get('/config', authenticate, masterController.getSystemConfig);
router.post('/config', authenticate, authorize('super_admin', 'gram_sevak', 'gram_sachiv'), masterController.updateSystemConfig);
router.put('/config', authenticate, authorize('super_admin', 'gram_sevak', 'gram_sachiv'), masterController.updateSystemConfig);

module.exports = router;
