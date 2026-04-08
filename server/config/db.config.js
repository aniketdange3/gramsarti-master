/**
 * DATABASE CONFIGURATION - डेटाबेस संरचना (Database Setup)
 * 
 * या फाईलमध्ये MySQL डेटाबेसशी कनेक्शन जोडण्यासाठी 'Pool' तयार केला जातो.
 * 'Pool' वापरल्याने एकाच वेळी अनेक युजर्सना जलद प्रतिसाद मिळतो.
 */

const mysql = require('mysql2/promise');
const path = require('path');

// .env फाईलमधून डेटाबेसची माहिती लोड करणे (Load DB config from .env)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_NAME = process.env.DB_NAME || 'gramsarthi_db';

// कनेक्शन पूल तयार करणे (Creating Connection Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 25, // अधिक क्षमता (Increased capacity for better performance)
    queueLimit: 0,
    charset: 'utf8mb4'
});

// डेटाबेसशी कनेक्शन तपासणे (Testing Connection)
pool.getConnection()
    .then(connection => {
        console.log(`[DB] Successfully connected to '${DB_NAME}' database pool.`);
        connection.release();
    })
    .catch(err => {
        console.error('[DB] Database connection error:', err.message);
    });

module.exports = pool;
