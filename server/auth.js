const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gramsarthi_secret_key_2025';
const JWT_EXPIRY = '8h';

// Generate JWT token
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

// Middleware: verify JWT token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'प्रमाणीकरण आवश्यक आहे' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'अवैध किंवा कालबाह्य टोकन' });
    }
};

// Middleware: check role(s)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'प्रमाणीकरण आवश्यक आहे' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'या क्रियेसाठी अधिकार नाही' });
        }
        next();
    };
};

module.exports = { generateToken, authenticate, authorize, JWT_SECRET };
