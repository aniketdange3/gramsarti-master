const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function listDatabases() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
        });
        const [rows] = await conn.query('SHOW DATABASES');
        console.log('Available Databases:');
        rows.forEach(r => console.log(' - ' + r.Database));
        await conn.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listDatabases();
