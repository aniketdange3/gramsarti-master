const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function checkDuplicates() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        
        const [rows] = await pool.query(`
            SELECT wardNo, wastiName, plotNo, ownerName, totalTaxAmount, COUNT(*) as count
            FROM properties
            GROUP BY wardNo, wastiName, plotNo, ownerName, totalTaxAmount
            HAVING count > 1
        `);
        
        console.log('Duplicate Sets Found:', rows.length);
        if (rows.length > 0) {
            console.log('Sample duplicates:');
            rows.slice(0, 5).forEach(r => console.log(` - ${r.ownerName} (${r.wastiName}): ${r.count} times`));
        }
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkDuplicates();
