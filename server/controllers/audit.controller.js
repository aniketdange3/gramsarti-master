/**
 * PROPERTY AUDIT CONTROLLER - मालमत्ता दुरुस्ती प्रस्ताव नियंत्रण (Edit Approval Workflow)
 */

const db = require('../config/db.config');

exports.submitRequest = async (req, res) => {
    try {
        const { property_id, request_data } = req.body;
        if (!property_id || !request_data) {
            return res.status(400).json({ error: 'मालमत्ता आयडी आणि नवीन डेटा आवश्यक आहे' });
        }
        const [prop] = await db.query('SELECT id FROM properties WHERE id = ?', [property_id]);
        if (prop.length === 0) return res.status(404).json({ error: 'मालमत्ता सापडली नाही' });

        await db.query(
            'INSERT INTO property_audit_requests (property_id, request_data, requested_by) VALUES (?, ?, ?)',
            [property_id, JSON.stringify(request_data), req.user.id]
        );
        clearAuditCache();
        res.status(201).json({ message: 'दुरुस्तीचा प्रस्ताव सादर केला आहे.' });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी: ' + err.message });
    }
};

const redis = require('../config/redis.config');

const clearAuditCache = async () => {
    try {
        const keys = await redis.keys('audit:*');
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`[REDIS] Cleared ${keys.length} audit cache keys.`);
        }
    } catch (err) {
        console.error('[REDIS] Cache Clear Error:', err);
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const isPrivileged = ['super_admin', 'gram_sevak', 'sarpanch', 'gram_sachiv'].includes(req.user.role);
        const cacheKey = `audit:pending:u${isPrivileged ? 'admin' : req.user.id}`;

        let cachedData = null;
        try {
            if (redis && typeof redis.get === 'function') {
                cachedData = await redis.get(cacheKey);
            }
        } catch (e) {
            console.warn('[REDIS] Cache fetch failed:', e.message);
        }

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const query = `
            SELECT r.*, p.ownerName as old_owner_name, p.srNo, u.name as requester_name 
            FROM property_audit_requests r
            JOIN properties p ON r.property_id = p.id
            JOIN users u ON r.requested_by = u.id
            WHERE r.status = 'PENDING'
            AND (? = TRUE OR r.requested_by = ?)
            ORDER BY r.created_at DESC
        `;
        const [requests] = await db.query(query, [isPrivileged, req.user.id]);
        
        try {
            if (redis && typeof redis.setex === 'function') {
                await redis.setex(cacheKey, 120, JSON.stringify(requests));
            }
        } catch (e) {}

        res.json(requests);
    } catch (err) { res.status(500).json({ error: 'सर्व्हर त्रुटी' }); }
};

exports.approveRequest = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params;
        const [reqRow] = await connection.query('SELECT * FROM property_audit_requests WHERE id = ?', [id]);
        if (reqRow.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'प्रस्ताव सापडला नाही' });
        }

        // केवळ प्रस्तावाची स्थिती मंजूर म्हणून नोंदवणे
        // मूळ मालमत्ता नोंदवही (properties table) थेट बदलणे नाही
        await connection.query('UPDATE property_audit_requests SET status = "APPROVED" WHERE id = ?', [id]);
        await connection.commit();
        clearAuditCache();
        res.json({ message: 'प्रस्ताव मंजूर झाला.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: 'त्रुटी: ' + err.message });
    } finally { connection.release(); }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        await db.query(
            'UPDATE property_audit_requests SET status = "REJECTED", admin_remarks = ? WHERE id = ?',
            [remarks || 'नाकारले', id]
        );
        clearAuditCache();
        res.json({ message: 'प्रस्ताव नाकारला.' });
    } catch (err) { res.status(500).json({ error: 'सर्व्हर त्रुटी' }); }
};
