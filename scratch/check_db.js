const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

async function checkAndCreateDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
    });

    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'gramsarthi_db'}\``);
        console.log(`Database '${process.env.DB_NAME || 'gramsarthi_db'}' verified/created.`);
    } catch (err) {
        console.error('Error creating database:', err.message);
    } finally {
        await connection.end();
    }
}

checkAndCreateDB();
