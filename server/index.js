/**
 * SERVER ENTRY POINT - ग्रामसारथी मुख्य सर्व्हर (GramSarthi Main Backend)
 * 
 * हा मुख्य सर्व्हर असून, इथून सर्व डेटाबेस आणि API ऑपरेशन्स 
 * नियंत्रित केली जातात. नवीन स्ट्रक्चरनुसार, सर्व लॉजिक 
 * कंट्रोलर्स आणि राऊट्समध्ये हलवण्यात आले आहे.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');

// कस्टम कॉन्फिगरेशन आणि मिडलवेअर (Custom Modules)
const { initializeDatabase } = require('./database');
const apiRoutes = require('./routes/index');
const { logger, errorHandler } = require('./middleware/logger.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// १. मिडलवेअर सेटअप (Middleware Setup)
app.use(compression()); // डेटा कॉम्प्रेस करण्यासाठी (Performance)

// BUG-003 FIX: Restrict CORS — allow localhost & LAN in dev, specific origin in production
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, mobile app, same-origin SSR)
        if (!origin) return callback(null, true);
        // In production: only allow the configured FRONTEND_URL
        if (FRONTEND_URL && origin === FRONTEND_URL) return callback(null, true);
        // In development: allow any localhost:* origin
        if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
        // In development: allow any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/.test(origin)) {
            return callback(null, true);
        }
        // Block all other origins
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// BUG-002 FIX: Rate limit login to prevent brute-force attacks
let loginLimiter = (req, res, next) => next(); // no-op fallback if package not installed
try {
    const rateLimit = require('express-rate-limit');
    loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 15,                   // max 15 login attempts per IP per 15 min
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'खूप जास्त लॉगिन प्रयत्न. १५ मिनिटांनंतर पुन्हा प्रयत्न करा.' }
    });
    console.log('[SECURITY] Rate limiting active on /api/auth/login');
} catch (e) {
    console.warn('[SECURITY] express-rate-limit not installed. Run: npm install express-rate-limit');
}
app.use('/api/auth/login', loginLimiter);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});


// २. रिक्वेस्ट लॉगर (Request Logging)
app.use(logger);

// ३. API राऊट्स (Central Route Mounting)
app.use('/api', apiRoutes);

// ४. स्टॅटिक फाईल्स होस्टिंग (React Frontend Hosting)
const fs = require('fs');
let staticPath = path.join(__dirname, '../dist');
if (!fs.existsSync(path.join(staticPath, 'index.html'))) {
    const fallbackPath = path.join(__dirname, '../frontend/dist');
    if (fs.existsSync(path.join(fallbackPath, 'index.html'))) {
        staticPath = fallbackPath;
    }
}
app.use(express.static(staticPath));
console.log(`[SYSTEM] Hosting static files from: ${staticPath}`);

// ५. क्लायंट-साइड राउटिंग (React Client Routing)
// इतर कोणत्याही मार्गासाठी फ्रंटएंडची index.html फाईल पाठवणे
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// ६. ग्लोबल एरर हँडलर (Error Management)
app.use(errorHandler);

// ७. सर्व्हर सुरू करण्याची प्रक्रिया (Server Startup)
const startServer = async () => {
    try {
        console.log('[SYSTEM] Starting GramSarthi Server...');
        
        // डेटाबेस तयार करणे (Schema & Migrations)
        await initializeDatabase();
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`[SUCCESS] Server is running on: http://localhost:${PORT}`);
        });
        // Large file import timeout: 10 minutes
        server.timeout = 10 * 60 * 1000;
        server.keepAliveTimeout = 10 * 60 * 1000;


        // सर्व्हर त्रुटी व्यवस्थापन
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`[CRITICAL] Port ${PORT} is already in use.`);
            } else {
                console.error('[CRITICAL] Server failed to start:', err);
            }
            process.exit(1);
        });
    } catch (err) {
        console.error('[CRITICAL] Database initialization failed:', err);
        process.exit(1);
    }
};

startServer();
