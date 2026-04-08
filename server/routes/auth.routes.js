/**
 * AUTH ROUTES - सुरक्षा आणि युजर राऊट्स (Auth API Endpoints)
 * 
 * या फाईलमध्ये लॉगिन, नोंदणी आणि युजर मॅनेजमेंटचे 
 * API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// लॉगिन आणि नोंदणी (Public access)
router.post('/login', authController.login);
router.post('/register', authController.register);

// स्वतःची माहिती मिळवणे (Self view)
router.get('/me', authenticate, authController.getMe);

// प्रशासकीय युजर मॅनेजमेंट (Admin only)
router.get('/users', authenticate, authorize('super_admin', 'gram_sachiv'), authController.getUsers);
router.put('/users/:id/action', authenticate, authorize('super_admin', 'gram_sachiv'), authController.updateUserStatus);

module.exports = router;

