/**
 * AUTH CONTROLLER - प्रवेश आणि सुरक्षा नियंत्रण (Authentication & User Management)
 * 
 * या फाईलमध्ये लॉगिन, नोंदणी, आणि युजर मॅनेजमेंटचे 
 * सर्व मुख्य लॉजिक (Business Logic) आहे.
 */

const bcrypt = require('bcryptjs');
const db = require('../config/db.config');
const jwt = require('jsonwebtoken');

// गुपित की (Secret Key for JWT)
const JWT_SECRET = process.env.JWT_SECRET || 'gramsarthi_secret_key_2025';

/**
 * Helper: Generate Employee ID based on role
 * रोलनुसार नवीन एम्प्लॉयी आयडी तयार करणे
 */
const generateEmployeeId = async (role) => {
    const prefixes = {
        'gram_sachiv': 'GS', 'gram_sevak': 'GV', 'operator': 'OP', 'clerk': 'CL',
        'bill_operator': 'BS', 'sarpanch': 'SP', 'auditor': 'AU', 'collection_officer': 'CO', 'super_admin': 'ADM'
    };
    const prefix = prefixes[role] || 'EMP';
    const [rows] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    const num = (rows[0].count + 1).toString().padStart(3, '0');
    return `${prefix}-${num}`;
};

/**
 * Generate JWT token
 * वापरकर्त्यासाठी ८ तासांचे 'Access Token' तयार करणे
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, username: user.username, role: user.role, name: user.name,
            can_view: !!user.can_view, can_edit: !!user.can_edit, can_delete: !!user.can_delete,
            allowed_modules: user.allowed_modules || 'dashboard'
        },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
};

/**
 * Login handler
 * लॉगिन प्रक्रिया
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'वापरकर्तानाव आणि पासवर्ड आवश्यक आहे' });

        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'चुकीचे वापरकर्तानाव किंवा पासवर्ड' });

        const user = users[0];
        
        // स्टेटस तपासणे (Check Account Status)
        if (user.status === 'PENDING') return res.status(403).json({ error: 'तुमच्या खात्याला अद्याप प्रशासकाची मान्यता मिळालेली नाही' });
        if (user.status === 'REJECTED') return res.status(403).json({ error: 'तुमचे खाते नाकारण्यात आले आहे' });
        if (!user.is_active) return res.status(403).json({ error: 'तुमचे खाते निष्क्रिय आहे' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'चुकीचे वापरकर्तानाव किंवा पासवर्ड' });

        const token = generateToken(user);
        res.json({
            token,
            user: {
                id: user.id, name: user.name, username: user.username, role: user.role,
                employee_id: user.employee_id, status: user.status,
                allowed_modules: user.allowed_modules || 'dashboard'
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
};

/**
 * User Registration request
 * नवीन नोंदणी अर्ज
 */
exports.register = async (req, res) => {
    try {
        const { name, username, password, role, email, mobile, gp_code, age, address } = req.body;
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(409).json({ error: 'वापरकर्तानाव आधीपासूनच वापरात आहे' });

        const employee_id = await generateEmployeeId(role);
        const hash = await bcrypt.hash(password, 10);
        
        await db.query(
            `INSERT INTO users (name, username, password_hash, role, email, mobile, gp_code, age, address, employee_id, status, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, username, hash, role, email || null, mobile || null, gp_code || '', age || null, address || null, employee_id, 'PENDING', true]
        );

        res.status(201).json({ message: 'नोंदणी यशस्वी! प्रशासकाच्या मान्यतेनंतर तुम्ही लॉगिन करू शकाल.', employee_id });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
};

/**
 * Get current user (Self)
 * स्वतःची माहिती मिळवणे
 */
exports.getMe = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, username, role, email, mobile, employee_id, status FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'वापरकर्ता सापडला नाही' });
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
};

/**
 * Admin: List all user requests or approved users
 * प्रशासक: सर्व युजर्सची माहिती पाहणे
 */
exports.getUsers = async (req, res) => {
    try {
        const { status } = req.query; // PENDING, APPROVED, all
        let query = 'SELECT id, name, username, role, email, mobile, employee_id, status, is_active, created_at FROM users';
        if (status) query += ` WHERE status = '${status}'`;
        query += ' ORDER BY created_at DESC';

        const [users] = await db.query(query);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
};

/**
 * Admin: Approve/Reject user
 * प्रशासक: युजर मंजूर किंवा नाकारणे
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { action } = req.body; // APPROVE or REJECT
        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'स्थिती अपडेट झाली' });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
};
