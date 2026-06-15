/**
 * AUTH CONTROLLER - प्रवेश आणि सुरक्षा नियंत्रण (Authentication & User Management)
 * 
 * या फाईलमध्ये लॉगिन, नोंदणी, आणि युजर मॅनेजमेंटचे 
 * सर्व मुख्य लॉजिक (Business Logic) आहे.
 */

const bcrypt = require('bcryptjs');
const db = require('../config/db.config');
const jwt = require('jsonwebtoken');

// गुपित की (Secret Key for JWT) — must be set in .env
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[CRITICAL] JWT_SECRET is not set in .env file. Server cannot start securely.');
    process.exit(1);
}

/**
 * Helper: Generate Employee ID based on role
 * रोलनुसार नवीन एम्प्लॉयी आयडी तयार करणे
 */
const generateEmployeeId = async (role) => {
    try {
        const prefixes = {
            'gram_sachiv': 'GS', 'gram_sevak': 'GV', 'operator': 'OP', 'clerk': 'CL',
            'bill_operator': 'BS', 'sarpanch': 'SP', 'auditor': 'AU', 'collection_officer': 'CO', 'super_admin': 'ADM'
        };
        const prefix = prefixes[role] || 'EMP';
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
        const num = (rows[0].count + 1).toString().padStart(3, '0');
        return `${prefix}-${num}`;
    } catch (err) {
        console.error('generateEmployeeId Error:', err);
        throw err;
    }
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
        if (!name || !username || !password || !role) {
            return res.status(400).json({ error: 'नाव, वापरकर्तानाव, पासवर्ड आणि भूमिका आवश्यक आहे' });
        }
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
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी: ' + err.message });
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
        let query = 'SELECT id, name, username, role, email, mobile, age, address, employee_id, status, is_active, allowed_modules, can_view, can_edit, can_delete, created_at FROM users';
        const queryParams = [];
        if (status) {
            query += ' WHERE status = ?';
            queryParams.push(status);
        }
        query += ' ORDER BY created_at DESC';

        const [users] = await db.query(query, queryParams);
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
        const { action } = req.body; // approve/APPROVE or reject/REJECT
        const actionUpper = (action || '').toUpperCase();
        const status = actionUpper === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'स्थिती अपडेट झाली' });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
};

/**
 * Admin: Update User Profile & Module Access
 * प्रशासक: वापरकर्ता अधिकार व माहिती अद्यतनित करा
 */
exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const fieldsToUpdate = {};
        
        // Define admin-only fields check
        const isAdmin = ['super_admin', 'gram_sachiv', 'gram_sevak'].includes(req.user.role);
        const allowedFields = isAdmin
            ? ['name', 'role', 'email', 'mobile', 'status', 'age', 'address', 'allowed_modules', 'can_view', 'can_edit', 'can_delete', 'is_active']
            : ['name', 'email', 'mobile', 'age', 'address'];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                fieldsToUpdate[field] = req.body[field];
            }
        }
        
        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ error: 'अद्ययावत करण्यासाठी कोणताही डेटा पुरवला नाही' });
        }
        
        const queryParts = [];
        const queryValues = [];
        for (const [key, val] of Object.entries(fieldsToUpdate)) {
            queryParts.push(`\`${key}\` = ?`);
            queryValues.push(val);
        }
        queryValues.push(userId);
        
        const sql = `UPDATE users SET ${queryParts.join(', ')} WHERE id = ?`;
        await db.query(sql, queryValues);
        res.json({ success: true, message: 'वापरकर्ता यशस्वीरित्या अद्यतनित केला गेला!' });
    } catch (err) {
        console.error('updateUser Error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी: ' + err.message });
    }
};

/**
 * Admin: Delete User
 * प्रशासक: वापरकर्ता हटवा
 */
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ success: true, message: 'वापरकर्ता यशस्वीरित्या हटविला गेला.' });
    } catch (err) {
        console.error('deleteUser Error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी: ' + err.message });
    }
};

