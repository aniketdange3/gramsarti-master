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
        const isPrivileged = ['super_admin', 'gram_sevak', 'sarpanch', 'gram_sachiv'].includes(req.user.role);

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

        // Whitelist valid columns for the properties table
        const PROPERTY_COLUMNS = [
            'srNo', 'wardNo', 'khasraNo', 'layoutName', 'plotNo', 'ownerName', 'occupantName',
            'hasConstruction', 'openSpace', 'propertyTax', 'openSpaceTax', 'streetLightTax',
            'healthTax', 'generalWaterTax', 'specialWaterTax', 'wasteCollectionTax',
            'totalTaxAmount', 'arrearsAmount', 'paidAmount', 'penaltyAmount', 'discountAmount',
            'wastiName', 'contactNo', 'buildingUsage', 'receiptNo', 'receiptBook', 'paymentDate',
            'billNo', 'lastBillDate', 'propertyId', 'constructionYear', 'propertyAge',
            'readyReckonerLand', 'readyReckonerBuilding', 'readyReckonerComposite',
            'depreciationAmount', 'remarksNotes', 'propertyLength', 'propertyWidth',
            'totalAreaSqFt', 'totalAreaSqMt', 'status', 'createdAt', 'financial_year', 'created_by'
        ];

        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(newData)) {
            // Only include valid database columns and ignore non-updatable fields
            if (PROPERTY_COLUMNS.includes(key) && key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length > 0) {
            values.push(propId);
            const sql = `UPDATE properties SET ${fields.join(', ')} WHERE id = ?`;
            console.log('[AUDIT] Executing SQL:', sql);
            console.log('[AUDIT] With Values:', values);
            await connection.query(sql, values);
        }

        // Properly update all section measurements and tax details
        if (newData.sections && Array.isArray(newData.sections)) {
            await connection.query('DELETE FROM property_sections WHERE propertyId = ?', [propId]);
            for (const section of newData.sections) {
                // Skip empty sections
                if (!section.propertyType || section.propertyType === 'निवडा') continue;
                
                await connection.query(
                    `INSERT INTO property_sections (
                        propertyId, floorIndex, propertyType, lengthFt, widthFt, areaSqFt, areaSqMt,
                        landRate, buildingRate, depreciationRate, weightage, buildingValue, openSpaceValue,
                        buildingTaxRate, openSpaceTaxRate, buildingFinalValue, openSpaceFinalValue,
                        description, constructionYear, propertyAge
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        propId, section.floorIndex, section.propertyType, section.lengthFt || 0, section.widthFt || 0,
                        section.areaSqFt || 0, section.areaSqMt || 0, section.landRate || 0, section.buildingRate || 0,
                        section.depreciationRate || 1.0, section.weightage || 1.0, section.buildingValue || 0,
                        section.openSpaceValue || 0, section.buildingTaxRate || 0, section.openSpaceTaxRate || 0,
                        section.buildingFinalValue || 0, section.openSpaceFinalValue || 0,
                        section.description || null, section.constructionYear || null, section.propertyAge || 0
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
