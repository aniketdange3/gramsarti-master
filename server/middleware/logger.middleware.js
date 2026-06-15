/**
 * LOGGER MIDDLEWARE - लॉगिंग आणि विनंती पडताळणी (Logging & Request Monitoring)
 *
 * प्रत्येक API विनंतीचा method, URL, status code, आणि response time (ms) लॉग करतो.
 * Request येताना नाही — Response पाठवल्यानंतर एकदाच लॉग होते (no duplicate logs).
 */

const logger = (req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Log ONCE after response is sent — avoids double-logging
    res.on('finish', () => {
        const ms = Date.now() - start;
        const status = res.statusCode;
        const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
        console.log(`${color}[API] ${method} ${url} → ${status} (${ms}ms)\x1b[0m`);
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
