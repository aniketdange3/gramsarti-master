/**
 * LOGGER MIDDLEWARE - लॉगिंग आणि विनंती पडताळणी (Logging & Request Monitoring)
 * 
 * या फाईलमध्ये सर्व येणाऱ्या API विनंत्यांचा वेळ (Timestamp), 
 * पद्धत (Method), आणि पत्ता (URL) लॉग केला जातो.
 */

const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log(`[${timestamp}] ${method} ${url} | IP: ${ip}`);

    // विनंती पूर्ण झाल्यावर प्रतिसाद कोड तपासणे (Check response status after completion)
    res.on('finish', () => {
        const statusCode = res.statusCode;
        console.log(`[${timestamp}] ${method} ${url} | Status: ${statusCode}`);
    });

    next();
};

/**
 * Global Error Handler Middleware
 * सर्व्हरमध्ये उद्भवणाऱ्या चुकांना योग्य प्रतिसादात रूपांतरित करणे (Convert server errors to JSON)
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.stack}`);
    res.status(err.status || 500).json({ error: err.message || 'सर्व्हरमध्ये काहीतरी तांत्रिक त्रुटी आली आहे' });
};

module.exports = { logger, errorHandler };
