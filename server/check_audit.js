const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function checkAuditLog() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM property_audit_log');
        console.log('Audit Log Count: ' + rows[0].count);
        if (rows[0].count > 0) {
            const [samples] = await pool.query('SELECT * FROM property_audit_log LIMIT 5');
            console.log('Samples:', samples);
        }
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkAuditLog();
