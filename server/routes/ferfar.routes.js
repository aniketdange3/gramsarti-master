const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get all ferfar requests
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT f.*, p.srNo, p.wardNo, p.wastiName, p.plotNo 
            FROM ferfar_requests f 
            JOIN properties p ON f.property_id = p.id 
            ORDER BY f.created_at DESC
        `;
        const [requests] = await db.query(query);
        res.json(requests);
    } catch (err) {
        console.error('Error fetching ferfar requests:', err);
        res.status(500).json({ error: 'Failed to fetch ferfar requests' });
    }
});

// Apply for ferfar (Mutation)
router.post('/apply', async (req, res) => {
    const { property_id, new_owner_name, applicant_name, applicant_mobile, remarks } = req.body;
    console.log(`[FERFAR] Apply request for prop: ${property_id}, new_owner: ${new_owner_name}`);

    if (!property_id || !new_owner_name) {
        return res.status(400).json({ error: 'Property ID and New Owner Name are required' });
    }

    try {
        // 1. Check if property exists and get old owner name & pending tax
        const [prop] = await db.query('SELECT ownerName, arrearsAmount, totalTaxAmount, paidAmount FROM properties WHERE id = ?', [property_id]);
        if (prop.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        const p = prop[0];
        const pendingDues = (Number(p.arrearsAmount) + Number(p.totalTaxAmount)) - Number(p.paidAmount);
        
        // Condition 1: Check zero dues
        if (pendingDues > 0) {
            return res.status(400).json({ 
                error: `फेरफार नोंद करण्यासाठी संपूर्ण कर भरणे आवश्यक आहे. (थकबाकी: ₹${pendingDues})`, 
                pendingDues 
            });
        }

        const old_owner_name = p.ownerName;

        // 2. Insert into ferfar_requests
        const [result] = await db.query(
            `INSERT INTO ferfar_requests 
            (property_id, old_owner_name, new_owner_name, applicant_name, applicant_mobile, ferfar_type, remarks, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [property_id, old_owner_name, new_owner_name, applicant_name || '', applicant_mobile || '', ferfar_type || '', remarks || '']
        );

        res.status(201).json({ message: 'Ferfar request applied successfully', id: result.insertId });
    } catch (err) {
        console.error('Error applying for ferfar:', err);
        res.status(500).json({ error: 'Failed to apply ferfar' });
    }
});

// Approve ferfar request
router.put('/approve/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get request details
        const [reqRows] = await connection.query('SELECT * FROM ferfar_requests WHERE id = ?', [id]);
        if (reqRows.length === 0) return res.status(404).json({ error: 'Request not found' });
        
        const fReq = reqRows[0];
        if (fReq.status !== 'PENDING') {
            return res.status(400).json({ error: `Request is already ${fReq.status}` });
        }

        // 2. Fetch current property ownerName
        const [propRows] = await connection.query('SELECT ownerName FROM properties WHERE id = ?', [fReq.property_id]);
        if (propRows.length === 0) throw new Error('Property no longer exists');
        
        const currentOwnerStr = propRows[0].ownerName;

        // 3. Construct new ownerString (Old Owner || New Owner)
        // We append ` || newOwner` to preserve history. If it's the first time, we just use the names.
        const updatedOwnerStr = currentOwnerStr ? `${currentOwnerStr} || ${fReq.new_owner_name}` : fReq.new_owner_name;

        // 4. Update property
        await connection.query('UPDATE properties SET ownerName = ?, remarksNotes = ? WHERE id = ?', [updatedOwnerStr, fReq.remarks, fReq.property_id]);

        // 5. Update ferfar_requests status
        await connection.query(
            'UPDATE ferfar_requests SET status = "APPROVED", approved_at = NOW() WHERE id = ?',
            [id]
        );

        await connection.commit();
        res.json({ message: 'Ferfar request approved and property ownership transferred successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Error approving ferfar:', err);
        res.status(500).json({ error: 'Failed to approve ferfar' });
    } finally {
        connection.release();
    }
});

// Reject ferfar request
router.put('/reject/:id', async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE ferfar_requests SET status = "REJECTED", remarks = ? WHERE id = ? AND status = "PENDING"',
            [remarks || 'Rejected by Admin', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found or not in PENDING status' });
        }
        res.json({ message: 'Ferfar request rejected successfully' });
    } catch (err) {
        console.error('Error rejecting ferfar:', err);
        res.status(500).json({ error: 'Failed to reject ferfar' });
    }
});

module.exports = router;
