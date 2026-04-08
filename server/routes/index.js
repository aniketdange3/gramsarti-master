/**
 * ROUTE AGGREGATOR - मुख्य राऊट व्यवस्थापन (Primary Route Hub)
 * 
 * या फाईलमध्ये सर्व मॉड्युल्सचे (Auth, Property, Payment, etc.) 
 * राऊट्स एकत्र करून एकाच ठिकाणी जोडले जातात.
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const propertyRoutes = require('./property.routes');
const paymentRoutes = require('./payment.routes');
const maganiRoutes = require('./magani.routes');
const attendanceRoutes = require('./attendance.routes');
const ferfarRoutes = require('./ferfar.routes');
const masterRoutes = require('./master.routes');
const taxRoutes = require('./tax.routes');

// प्रत्येक मॉड्युलसाठी स्वतंत्र रस्ता (Mounting separate modules)
router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/payments', paymentRoutes);
router.use('/magani', maganiRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/ferfar', ferfarRoutes);
router.use('/master', masterRoutes);
router.use('/tax-rates', taxRoutes);

module.exports = router;
