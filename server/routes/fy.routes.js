/**
 * FY ROUTES - आर्थिक वर्ष राऊट्स
 *
 * GET  /api/fy/current              → चालू आर्थिक वर्ष + stats + history
 * GET  /api/fy/property/:propertyId → मालमत्तेचे सर्व FY records
 * GET  /api/fy/analyze              → soft preview of next FY migration
 * POST /api/fy/migrate              → final FY migration (super_admin only)
 * PUT  /api/fy/chalu/:propertyId    → update चालू amount for property
 */

const express = require('express');
const router  = express.Router();
const fyController = require('../controllers/fy.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/current',              authenticate, fyController.getCurrent);
router.get('/property/:propertyId', authenticate, fyController.getPropertyFYData);
router.get('/analyze',              authenticate, authorize('super_admin', 'gram_sevak', 'gram_sachiv'), fyController.analyzeMigration);
router.post('/migrate',             authenticate, authorize('super_admin', 'gram_sevak'),                fyController.executeMigration);
router.put('/chalu/:propertyId',    authenticate, authorize('super_admin', 'gram_sevak', 'gram_sachiv', 'operator'), fyController.updateChalu);

module.exports = router;
