const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/requests', authenticate, auditController.submitRequest);
router.get('/pending', authenticate, authorize('super_admin', 'gram_sachiv'), auditController.getPendingRequests);
router.put('/approve/:id', authenticate, authorize('super_admin', 'gram_sachiv'), auditController.approveRequest);
router.put('/reject/:id', authenticate, authorize('super_admin', 'gram_sachiv'), auditController.rejectRequest);

module.exports = router;
