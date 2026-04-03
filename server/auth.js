/**
 * AUTHENTICATION MIDDLEWARE - सुरक्षा आणि अधिकृतता (Security & Auth)
 * 
 * या फाईलमध्ये वापरकर्त्याची ओळख पटवणे (Authentication) आणि त्यांना 
 * ठराविक कृतींची परवानगी देणे (Authorization) या गोष्टी हाताळल्या जातात.
 * 
 * SECURITY PROCESS (STEP-BY-STEP):
 * 1. Token Generation: युजर लॉग-इन झाल्यावर 'jsonwebtoken' (JWT) चा वापर करून ८ तासांचे टोकन दिले जाते.
 * 2. Authenticate Middleware: प्रत्येक API कॉलवर येणारे टोकन `JWT_SECRET` द्वारे पडताळून पाहिले जाते.
 * 3. Authorize Middleware: युजरचा रोल (Admin, Operator इ.) तपासून त्यांना त्या मॉड्युलची परवानगी आहे की नाही हे ठरवले जाते.
 */

const jwt = require('jsonwebtoken');

// गुपित की आणि कालबाह्यता काळ (Secret Key and Token Expiry Time)
const JWT_SECRET = process.env.JWT_SECRET || 'gramsarthi_secret_key_2025';
const JWT_EXPIRY = '8h'; // 8 तासांनी सत्र संपुष्टात येईल (Session expires in 8 hours)

/**
 * Generate JWT token for an authenticated user
 * वापरकर्त्याचे प्रमाणीकरण झाल्यानंतर JWT टोकन तयार करते
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            name: user.name,
            can_view: !!user.can_view,
            can_edit: !!user.can_edit,
            can_delete: !!user.can_delete,
            allowed_modules: user.allowed_modules || 'dashboard'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

/**
 * Middleware: Verify JWT token
 * विनंतीमध्ये येणारे JWT टोकन तपासून वापरकर्त्याला अधिकृत करते
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'प्रमाणीकरण आवश्यक आहे (Authentication is required)' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // वापरकर्त्याचा डेटा विनंतीसोबत जोडला जातो (Attach user data to request)
        next();
    } catch (err) {
        return res.status(401).json({ error: 'अवैध किंवा कालबाह्य टोकन (Invalid or expired token)' });
    }
};

/**
 * Middleware: Check user roles
 * वापरकर्त्याचा रोल तपासून त्यांना ठराविक गोष्टी करण्यासाठी परवानगी आहे का हे ठरवते
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'प्रमाणीकरण आवश्यक आहे (Authentication is required)' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'या क्रियेसाठी अधिकार नाही (Unauthorized calculation/action)' });
        }
        next();
    };
};

module.exports = { generateToken, authenticate, authorize, JWT_SECRET };

