/**
 * ATTENDANCE ROUTES - हजेरी राऊट्स (Attendance API Endpoints)
 * 
 * या फाईलमध्ये कर्मचाऱ्यांची हजेरी नोंदवण्यासाठीचे API रस्ते आहेत.
 */

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth.middleware');

// चेक-इन करणे
router.post('/check-in', authenticate, attendanceController.checkIn);

// चेक-आउट करणे
router.post('/check-out', authenticate, attendanceController.checkOut);

// सध्याची स्थिती पाहणे
router.get('/status', authenticate, attendanceController.getStatus);

module.exports = router;


module.exports = router;
