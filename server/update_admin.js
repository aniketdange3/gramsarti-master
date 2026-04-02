
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const DB_NAME = process.env.DB_NAME || 'gramsarthi_db';

const updateAdminPassword = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: DB_NAME,
        });

        const connection = await pool.getConnection();
        console.log('Connected to MySQL database');

        const hash = await bcrypt.hash('superadmin', 10);
        const [result] = await connection.query(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [hash, 'admin']
        );

        if (result.affectedRows > 0) {
            console.log('Successfully updated password for user "admin" to "superadmin"');
        } else {
            console.log('User "admin" not found. No password updated.');
        }

        connection.release();
        await pool.end();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Failed to update admin password:', err);
    }
};

updateAdminPassword();
