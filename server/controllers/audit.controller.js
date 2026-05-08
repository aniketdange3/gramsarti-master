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
        res.status(201).json({ message: 'दुरुस्तीचा प्रस्ताव सादर केला आहे.' });
    } catch (err) {
        res.status(500).json({ error: 'सर्व्हर त्रुटी: ' + err.message });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const query = `
            SELECT r.*, p.ownerName as old_owner_name, p.srNo, u.name as requester_name 
            FROM property_audit_requests r
            JOIN properties p ON r.property_id = p.id
            JOIN users u ON r.requested_by = u.id
            WHERE r.status = 'PENDING'
            ORDER BY r.created_at DESC
        `;
        const [requests] = await db.query(query);
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
        const request = reqRow[0];
        const newData = JSON.parse(request.request_data);
        const propId = request.property_id;

        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(newData)) {
            if (['id', 'sections', 'payments', 'receipts'].includes(key)) continue;
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length > 0) {
            values.push(propId);
            await connection.query(`UPDATE properties SET ${fields.join(', ')} WHERE id = ?`, values);
        }
        if (newData.sections && Array.isArray(newData.sections)) {
            await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [propId]);
            for (const section of newData.sections) {
                await connection.query(
                    `INSERT INTO property_sections (
                        propertyId, floorIndex, propertyType, areaSqFt, 
                        buildingValue, buildingTaxRate
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        propId, section.floorIndex, section.propertyType, section.areaSqFt,
                        section.buildingValue || 0, section.buildingTaxRate || 0
                    ]
                );
            }
        }
        await connection.query('UPDATE property_audit_requests SET status = "APPROVED" WHERE id = ?', [id]);
        await connection.commit();
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
        res.json({ message: 'प्रस्ताव नाकारला.' });
    } catch (err) { res.status(500).json({ error: 'सर्व्हर त्रुटी' }); }
};
