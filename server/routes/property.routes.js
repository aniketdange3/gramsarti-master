/**
 * PROPERTY ROUTES - मालमत्ता राऊट्स (Property API Endpoints)
 */

const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const os         = require('os');
const propertyController       = require('../controllers/property.controller');
const receiptImportController  = require('../controllers/receiptImport.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Multer: store uploaded Excel in OS temp dir
const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
        else cb(new Error('फक्त .xlsx / .xls / .csv files allowed'), false);
    }
});

// ── Standard Property Routes ──────────────────────────────────────────────────
router.get('/unique-layouts', authenticate, propertyController.getUniqueLayouts);
router.get('/',        authenticate, propertyController.getAllProperties);
router.get('/:id',     authenticate, propertyController.getPropertyById);
router.put('/bulk-tax-update', authenticate, authorize('super_admin', 'gram_sachiv'), propertyController.bulkUpdateNormalTaxes);

router.post('/',       authenticate, propertyController.saveProperty);
router.post('/import', authenticate, authorize('super_admin', 'gram_sevak', 'gram_sachiv', 'clerk', 'collection_officer'), propertyController.bulkImport);
router.delete('/:id',  authenticate, authorize('super_admin'), propertyController.deleteProperty);

// ── Receipt Import Routes ─────────────────────────────────────────────────────
// Download blank template
router.get('/import-receipts/template', authenticate, receiptImportController.downloadTemplate);

// Upload & process Excel with receipt data
router.post('/import-receipts',
    authenticate,
    authorize('super_admin', 'gram_sevak', 'gram_sachiv', 'clerk', 'collection_officer'),
    upload.single('file'),
    receiptImportController.importReceipts
);

module.exports = router;
