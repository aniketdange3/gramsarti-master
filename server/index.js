/**
 * SERVER ENTRY POINT - ग्रामसारथी मुख्य सर्व्हर (GramSarthi Main Backend)
 * 
 * हा मुख्य सर्व्हर असून, इथून सर्व डेटाबेस आणि API ऑपरेशन्स 
 * नियंत्रित केली जातात. नवीन स्ट्रक्चरनुसार, सर्व लॉजिक 
 * कंट्रोलर्स आणि राऊट्समध्ये हलवण्यात आले आहे.
 */

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
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// २. रिक्वेस्ट लॉगर (Request Logging)
app.use(logger);

// ३. API राऊट्स (Central Route Mounting)
app.use('/api', apiRoutes);

// ४. स्टॅटिक फाईल्स होस्टिंग (React Frontend Hosting)
const staticPath = path.join(__dirname, '../dist');
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
