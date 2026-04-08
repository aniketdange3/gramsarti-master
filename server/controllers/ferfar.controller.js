/**
 * FERFAR CONTROLLER - फेरफार आणि वारस नोंद (Property Mutation)
 * 
 * या फाईलमध्ये मालमत्तेच्या मालकी हक्कात बदल (Ownership Transfer), 
 * वारस नोंद, आणि फेरफार अर्जांचे व्यवस्थापन करण्याचे लॉजिक आहे.
 */

const db = require('../config/db.config');
const { clearPropertiesCache } = require('../utils/cache.util');

/**
 * 30-Day Auto-Cleanup for Non-Approved Requests
 * ३० दिवसांपेक्षा जुने आणि अपूर्ण अर्ज काढून टाकणे
 */
const cleanupOldRequests = async () => {
    try {
        const [result] = await db.query(
            'DELETE FROM ferfar_requests WHERE status IN ("PENDING", "REJECTED") AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
        );
        if (result.affectedRows > 0) {
            console.log(`[CLEANUP] Removed ${result.affectedRows} expired ferfar requests.`);
        }
    } catch (err) {
        console.error('[CLEANUP] Error:', err);
    }
};

/**
 * Get all ferfar requests
 * सर्व फेरफार अर्जांची यादी मिळवणे
 */
exports.getAllRequests = async (req, res) => {
    try {
        const query = `
            SELECT f.*, COALESCE(p.srNo, f.srNo) as srNo, COALESCE(p.wardNo, f.wardNo) as wardNo, 
                   COALESCE(p.wastiName, f.wastiName) as wastiName, COALESCE(p.plotNo, f.plotNo) as plotNo 
            FROM ferfar_requests f 
            LEFT JOIN properties p ON f.property_id = p.id 
            ORDER BY f.created_at DESC
        `;
        const [requests] = await db.query(query);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'फेरफार यादी मिळवण्यात त्रुटी आली' });
    }
};

/**
 * Apply for ferfar (Mutation)
 * फेरफार नोंदणीसाठी अर्ज करणे (Validation of zero dues)
 */
exports.applyFerfar = async (req, res) => {
    const { property_id, new_owner_name, applicant_name, applicant_mobile, ferfar_type, remarks } = req.body;

    if (!property_id || !new_owner_name) {
        return res.status(400).json({ error: 'मालमत्ता आयडी आणि नवीन मालकाचे नाव आवश्यक आहे' });
    }

    try {
        // १. मालमत्तेची थकबाकी तपासणे (Check for pending dues)
        const [prop] = await db.query('SELECT ownerName, arrearsAmount, totalTaxAmount, paidAmount, srNo, wardNo, wastiName, plotNo FROM properties WHERE id = ?', [property_id]);
        if (prop.length === 0) return res.status(404).json({ error: 'मालमत्ता सापडली नाही' });

        const p = prop[0];
        const pendingDues = (Number(p.arrearsAmount) + Number(p.totalTaxAmount)) - Number(p.paidAmount);
        
        // २. जर कर थकला असेल तर फेरफार नाकारणे (Zero dues policy)
        if (pendingDues > 0) {
            return res.status(400).json({ 
                error: `फेरफार नोंद करण्यासाठी संपूर्ण कर भरणे आवश्यक आहे. (थकबाकी: ₹${pendingDues})`, 
                pendingDues 
            });
        }

        cleanupOldRequests();

        // ३. अर्ज नोंदवणे (Insert request)
        const [result] = await db.query(
            `INSERT INTO ferfar_requests 
            (property_id, old_owner_name, new_owner_name, applicant_name, applicant_mobile, ferfar_type, remarks, status, srNo, wardNo, wastiName, plotNo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
            [
                property_id, p.ownerName, new_owner_name, 
                applicant_name || '', applicant_mobile || '', 
                ferfar_type || '', remarks || '',
                p.srNo, p.wardNo, p.wastiName, p.plotNo
            ]
        );

        res.status(201).json({ message: 'फेरफार अर्ज यशस्वीरित्या स्वीकारला गेला', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'अर्ज करताना तांत्रिक त्रुटी आली' });
    }
};

/**
 * Approve ferfar request
 * फेरफार अर्ज मंजूर करणे आणि मालमत्ता मालक बदलणे (Ownership Transfer)
 */
exports.approveFerfar = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [reqRows] = await connection.query('SELECT * FROM ferfar_requests WHERE id = ?', [id]);
        if (reqRows.length === 0) return res.status(404).json({ error: 'अर्ज सापडला नाही' });
        
        const fReq = reqRows[0];
        if (fReq.status !== 'PENDING') return res.status(400).json({ error: 'हा अर्ज आधीच निकाली काढला आहे' });

        const [propRows] = await connection.query('SELECT ownerName, remarksNotes FROM properties WHERE id = ?', [fReq.property_id]);
        if (propRows.length === 0) throw new Error('मालमत्ता आता अस्तित्वात नाही');
        
        const currentOwnerStr = propRows[0].ownerName;
        const currentRemarks = propRows[0].remarksNotes || '';

        // १. मालकाचे नाव अद्ययावत करणे (Append new owner to history)
        const updatedOwnerStr = currentOwnerStr ? `${currentOwnerStr} || ${fReq.new_owner_name}` : fReq.new_owner_name;
        // २. शेरा अद्ययावत करणे
        const updatedRemarks = currentRemarks ? `${currentRemarks}\n\n${fReq.remarks}` : fReq.remarks;

        // ३. मालमत्ता अपडेट करणे
        await connection.query('UPDATE properties SET ownerName = ?, remarksNotes = ? WHERE id = ?', [updatedOwnerStr, updatedRemarks, fReq.property_id]);

        // ४. अर्जाची स्थिती बदलणे
        await connection.query('UPDATE ferfar_requests SET status = "APPROVED", approved_at = NOW() WHERE id = ?', [id]);

        await connection.commit();
        clearPropertiesCache();
        res.json({ message: 'फेरफार मंजूर झाला आणि मालकी हक्क बदलले गेले' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: 'मंजूर करताना त्रुटी आली' });
    } finally {
        connection.release();
    }
};

/**
 * Reject ferfar request
 * फेरफार अर्ज नाकारणे
 */
exports.rejectFerfar = async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE ferfar_requests SET status = "REJECTED", remarks = ? WHERE id = ? AND status = "PENDING"',
            [remarks || 'Rejected by Admin', id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: 'अर्ज सापडला नाही' });
        res.json({ message: 'फेरफार अर्ज नाकारला गेला' });
    } catch (err) {
        res.status(500).json({ error: 'नाकारताना त्रुटी आली' });
    }
};
