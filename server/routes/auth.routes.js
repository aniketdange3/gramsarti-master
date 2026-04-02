const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { generateToken, authenticate, authorize } = require('../auth');

const router = express.Router();

// Helper to generate role-based employee ID
async function generateEmployeeId(role) {
    const prefixes = {
        'gram_sachiv': 'GS',
        'gram_sevak': 'GV',
        'operator': 'OP',
        'clerk': 'CL',
        'bill_operator': 'BS',
        'sarpanch': 'SP',
        'auditor': 'AU',
        'collection_officer': 'CO',
        'super_admin': 'ADM'
    };
    const prefix = prefixes[role] || 'EMP';
    const [rows] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    const num = (rows[0].count + 1).toString().padStart(3, '0');
    return `${prefix}-${num}`;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'वापरकर्तानाव आणि पासवर्ड आवश्यक आहे' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'चुकीचे वापरकर्तानाव किंवा पासवर्ड' });
        }

        const user = users[0];

        // Check Account Status
        if (user.status === 'PENDING') {
            return res.status(403).json({ error: 'तुमच्या खात्याला अद्याप प्रशासकाची मान्यता मिळालेली नाही. कृपया प्रतीक्षा करा.' });
        }
        if (user.status === 'REJECTED') {
            return res.status(403).json({ error: 'तुमचे खाते नाकारण्यात आले आहे. कृपया प्रशासकाशी संपर्क साधा.' });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'तुमचे खाते निष्क्रिय आहे.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'चुकीचे वापरकर्तानाव किंवा पासवर्ड' });
        }

        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                email: user.email,
                mobile: user.mobile,
                gp_code: user.gp_code,
                employee_id: user.employee_id,
                age: user.age,
                address: user.address,
                status: user.status,
                can_view: !!user.can_view,
                can_edit: !!user.can_edit,
                can_delete: !!user.can_delete,
                allowed_modules: user.allowed_modules || 'dashboard'
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, username, password, role, email, mobile, gp_code, age, address } = req.body;
        if (!name || !username || !password || !role) {
            return res.status(400).json({ error: 'नाव, वापरकर्तानाव, पासवर्ड आणि भूमिका आवश्यक' });
        }

        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'हे वापरकर्तानाव आधीपासूनच वापरात आहे' });
        }

        const employee_id = await generateEmployeeId(role);
        const hash = await bcrypt.hash(password, 10);
        
        await db.query(
            `INSERT INTO users (name, username, password_hash, role, email, mobile, gp_code, age, address, employee_id, status, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, username, hash, role, email || null, mobile || null, gp_code || '', age || null, address || null, employee_id, 'PENDING', true]
        );

        res.status(201).json({ 
            message: 'नोंदणी यशस्वी झाली! प्रशासकाच्या मान्यतेनंतर तुम्ही लॉगिन करू शकाल.',
            employee_id 
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// GET /api/auth/me — get current user info from token
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, username, role, email, mobile, gp_code, employee_id, status, age, address FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'वापरकर्ता सापडला नाही' });
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// GET /api/auth/users/requests — admin: list pending registration requests
router.get('/users/requests', authenticate, authorize('super_admin', 'gram_sachiv', 'gram_sevak'), async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE status = "PENDING" ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// PUT /api/auth/users/:id/action — admin: approve or reject user
router.put('/users/:id/action', authenticate, authorize('super_admin', 'gram_sachiv', 'gram_sevak'), async (req, res) => {
    try {
        const { action } = req.body; 
        const normalizedAction = (action || '').toUpperCase();
        if (!['APPROVE', 'REJECT'].includes(normalizedAction)) {
            return res.status(400).json({ error: 'अवैध कृती' });
        }

        const status = normalizedAction === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        
        res.json({ success: true, message: `वापरकर्ता ${action === 'APPROVE' ? 'मंजूर' : 'नाकारला'} करण्यात आला आहे.` });
    } catch (err) {
        console.error('User action error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// GET /api/auth/users — admin: list all approved users
router.get('/users', authenticate, authorize('super_admin', 'gram_sevak', 'gram_sachiv'), async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, username, role, email, mobile, employee_id, gp_code, is_active, status, can_view, can_edit, can_delete, allowed_modules, created_at FROM users WHERE status = "APPROVED" ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// POST /api/auth/users — admin: create user directly
router.post('/users', authenticate, authorize('super_admin', 'gram_sachiv', 'gram_sevak'), async (req, res) => {
    try {
        const { name, username, password, role, email, mobile, gp_code } = req.body;
        if (!name || !username || !password || !role) {
            return res.status(400).json({ error: 'नाव, वापरकर्तानाव, पासवर्ड आणि भूमिका आवश्यक' });
        }

        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'हे वापरकर्तानाव आधीपासूनच वापरात आहे' });
        }

        const employee_id = await generateEmployeeId(role);
        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            `INSERT INTO users (name, username, password_hash, role, email, mobile, employee_id, gp_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, username, hash, role, email || null, mobile || null, employee_id, gp_code || '', 'APPROVED']
        );

        res.status(201).json({ id: result.insertId, name, username, role, employee_id });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// PUT /api/auth/users/:id — admin: update user details, or self-update profile
router.put('/users/:id', authenticate, async (req, res) => {
    try {
        const isAdminRole = ['super_admin', 'gram_sevak', 'gram_sachiv'].includes(req.user.role);
        const isSelf = String(req.user.id) === String(req.params.id);
        
        // Non-admin can only update their own profile
        if (!isAdminRole && !isSelf) {
            return res.status(403).json({ error: 'या क्रियेसाठी अधिकार नाही' });
        }
        const { name, role, email, mobile, employee_id, is_active, password, status, address, age, can_view, can_edit, can_delete } = req.body;
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (role) { updates.push('role = ?'); values.push(role); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile); }
        if (employee_id !== undefined) { updates.push('employee_id = ?'); values.push(employee_id); }
        if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address); }
        if (age !== undefined) { updates.push('age = ?'); values.push(age); }
        if (can_view !== undefined) { updates.push('can_view = ?'); values.push(can_view ? 1 : 0); }
        if (can_edit !== undefined) { updates.push('can_edit = ?'); values.push(can_edit ? 1 : 0); }
        if (can_delete !== undefined) { updates.push('can_delete = ?'); values.push(can_delete ? 1 : 0); }
        if (req.body.allowed_modules !== undefined) { updates.push('allowed_modules = ?'); values.push(req.body.allowed_modules); }
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            updates.push('password_hash = ?'); values.push(hash);
        }

        if (updates.length === 0) return res.status(400).json({ error: 'कोणताही बदल नाही' });

        values.push(req.params.id);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// GET /api/auth/users/all — admin: list all users regardless of status
router.get('/users/all', authenticate, authorize('super_admin', 'gram_sachiv', 'gram_sevak'), async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, username, role, email, mobile, age, address, employee_id, gp_code, is_active, status, can_view, can_edit, can_delete, allowed_modules, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

// DELETE /api/auth/users/:id — admin: delete user
router.delete('/users/:id', authenticate, authorize('super_admin', 'gram_sachiv', 'gram_sevak'), async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'वापरकर्ता यशस्वीरित्या हटविला गेला.' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'सर्व्हर त्रुटी' });
    }
});

module.exports = router;
