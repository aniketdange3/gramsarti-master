/**
 * DATABASE INITIALIZER - डेटाबेस व्यवस्थापन (Schema & Seeding)
 * 
 * ही फाईल डेटाबेसचे टेबल्स तयार करणे, स्किमा अपडेट करणे (Migration) 
 * आणि सुरुवातीचा डेटा (Seeding) भरण्याचे काम करते.
 */

const bcrypt = require('bcryptjs');
const db = require('./config/db.config');

/**
 * Safely add a column if it doesn't exist
 */
const addColumnIfNotExists = async (connection, table, column, definition) => {
    const [cols] = await connection.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    if (cols.length === 0) {
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`  [MIGRATION] Added column ${table}.${column}`);
    }
};

/**
 * Safely add an index if it doesn't exist
 */
const addIndexIfNotExists = async (connection, table, indexName, columns) => {
    try {
        const [idxs] = await connection.query(
            `SELECT INDEX_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
            [table, indexName]
        );
        if (idxs.length === 0) {
            await connection.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`);
            console.log(`  [MIGRATION] Added index ${indexName} on ${table}`);
        }
    } catch (err) {
        console.error(`  [ERROR] Index ${indexName} failed:`, err.message);
    }
};

/**
 * Initialize all tables and default data
 */
const initializeDatabase = async () => {
    const connection = await db.getConnection();
    try {
        console.log('[DB] Initializing Schema...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // 1. USERS TABLE - कर्मचारी आणि लॉगिन माहिती
        await connection.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('super_admin','gram_sevak','operator','collection_officer','sarpanch','auditor','gram_sachiv','clerk','bill_operator') NOT NULL DEFAULT 'operator',
            employee_id VARCHAR(100) DEFAULT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            allowed_modules VARCHAR(500) DEFAULT 'dashboard,namuna8,namuna9,payments,magani,reports,taxMaster'
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration for users
        await addColumnIfNotExists(connection, 'users', 'allowed_modules', "VARCHAR(500) DEFAULT 'dashboard,namuna8,namuna9,payments,magani,reports,taxMaster'");

        // Default Admin Seeding
        const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (userCount[0].count === 0) {
            const hash = await bcrypt.hash('superadmin', 10);
            await connection.query(
                `INSERT INTO users (name, username, password_hash, role, employee_id, is_active, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['Super Admin', 'admin', hash, 'super_admin', 'ADM-001', true, 'APPROVED']
            );
            console.log('  [SEED] Default admin user created (admin / superadmin)');
        }

        // 2. PROPERTIES TABLE - मालमत्ता माहिती
        await connection.query(`CREATE TABLE IF NOT EXISTS properties (
            id VARCHAR(255) PRIMARY KEY,
            srNo INT,
            wardNo VARCHAR(255),
            khasraNo VARCHAR(255),
            plotNo VARCHAR(255),
            ownerName VARCHAR(255),
            occupantName VARCHAR(255),
            totalTaxAmount DECIMAL(10, 2),
            arrearsAmount DECIMAL(10, 2) DEFAULT 0,
            paidAmount DECIMAL(10, 2) DEFAULT 0,
            penaltyAmount DECIMAL(10, 2) DEFAULT 0,
            discountAmount DECIMAL(10, 2) DEFAULT 0,
            wastiName VARCHAR(255),
            contactNo VARCHAR(20) DEFAULT NULL,
            buildingUsage VARCHAR(100) DEFAULT 'निवास',
            status ENUM('active','draft','rejected') DEFAULT 'active',
            createdAt VARCHAR(255)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Performance Indexes
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_srNo', 'srNo');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_ward', 'wardNo');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_wasti', 'wastiName');

        // 3. PROPERTY SECTIONS - मजले आणि बांधकाम तपशील
        await connection.query(`CREATE TABLE IF NOT EXISTS property_sections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            propertyId VARCHAR(255),
            floorIndex INT,
            propertyType VARCHAR(255),
            areaSqFt DECIMAL(10, 2),
            buildingValue DECIMAL(10, 2),
            buildingTaxRate DECIMAL(10, 2),
            FOREIGN KEY(propertyId) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // 4. PAYMENTS TABLE - कर भरणा नोंदी
        await connection.query(`CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            receipt_no VARCHAR(50) NOT NULL UNIQUE,
            property_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            payment_mode ENUM('Cash','UPI','Cheque') NOT NULL DEFAULT 'Cash',
            payment_date DATE NOT NULL,
            collector_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // 5. TAX RATES - कर दर संरचना
        await connection.query(`CREATE TABLE IF NOT EXISTS tax_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            propertyType VARCHAR(255),
            buildingRate DECIMAL(10, 2),
            buildingTaxRate DECIMAL(10, 2),
            landRate DECIMAL(10, 2),
            openSpaceTaxRate DECIMAL(10, 2),
            wastiName VARCHAR(255) DEFAULT 'All'
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // 6. MASTER DATA TABLES - मास्टर यादी
        await connection.query(`CREATE TABLE IF NOT EXISTS master_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name_mr VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE
        )`);

        await connection.query(`CREATE TABLE IF NOT EXISTS master_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            item_value_mr VARCHAR(255) NOT NULL,
            FOREIGN KEY(category_id) REFERENCES master_categories(id) ON DELETE CASCADE
        )`);

        // 7. ATTENDANCE & OTHER
        await connection.query(`CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('[SUCCESS] Database tables and migrations verified.');
    } catch (err) {
        console.error('[CRITICAL] Database Init Error:', err.message);
        throw err;
    } finally {
        connection.release();
    }
};

module.exports = { db, initializeDatabase };
