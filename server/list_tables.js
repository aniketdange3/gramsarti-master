const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function listTables() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await pool.query('SHOW TABLES');
        console.log('Tables in ' + process.env.DB_NAME + ':');
        rows.forEach(r => console.log(' - ' + Object.values(r)[0]));
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listTables();
