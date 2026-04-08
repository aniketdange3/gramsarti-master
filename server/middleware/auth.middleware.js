/**
 * AUTHENTICATION MIDDLEWARE - सुरक्षा आणि अधिकृतता (Security & Auth)
 * 
 * या फाईलमध्ये वापरकर्त्याची ओळख (Authentication) आणि त्यांना 
 * रोलनुसार परवानगी (Authorization) देण्याचे काम होते.
 */

const jwt = require('jsonwebtoken');

// गुपित की (Secret Key for JWT)
const JWT_SECRET = process.env.JWT_SECRET || 'gramsarthi_secret_key_2025';

/**
 * Middleware: Verify JWT token
 * विनंतीमध्ये येणारे टोकन पडताळून पाहणे (Validate Incoming Token)
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[AUTH] Missing or invalid authorization header from ${req.ip}`);
        return res.status(401).json({ error: 'प्रमाणीकरण आवश्यक आहे (Authentication required)' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // युजर डेटा विनंतीसोबत जोडला (Attach user to request)
        next();
    } catch (err) {
        console.error(`[AUTH] Token verification failed: ${err.message}`);
        return res.status(401).json({ error: 'अवैध किंवा कालबाह्य टोकन (Invalid or Expired Token)' });
    }
};

/**
 * Middleware: Check user roles
 * रोलनुसार परवानगी तपासणे (Role-based access control)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'प्रमाणीकरण आवश्यक आहे (Authentication required)' });
        }
        if (!roles.includes(req.user.role)) {
            console.warn(`[AUTH] User '${req.user.username}' with role '${req.user.role}' unauthorized for ${req.originalUrl}`);
            return res.status(403).json({ error: 'या क्रियेसाठी अधिकृत नाही (Unauthorized action)' });
        }
        next();
    };
};

module.exports = { authenticate, authorize, JWT_SECRET };
