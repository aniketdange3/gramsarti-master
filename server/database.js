
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const DB_NAME = process.env.DB_NAME || 'gramsarthi_db';

console.log('DB Config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ? '********' : 'UNDEFINED',
    database: DB_NAME
});

// Auto-create database if it doesn't exist
const ensureDatabase = async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.end();
    console.log(`Database '${DB_NAME}' ensured.`);
};

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Helper: safely add column if it doesn't exist
const addColumnIfNotExists = async (connection, table, column, definition) => {
    const [cols] = await connection.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    if (cols.length === 0) {
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`  Added column ${table}.${column}`);
    }
};

const initializeDatabase = async () => {
    try {
        await ensureDatabase();
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // ──────────────────────────────────────────────
        // 1. USERS TABLE
        // ──────────────────────────────────────────────
        console.log('Ensuring users table exists...');
        await connection.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            mobile VARCHAR(20),
            age INT DEFAULT NULL,
            address TEXT DEFAULT NULL,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('super_admin','gram_sevak','operator','collection_officer','sarpanch','auditor','gram_sachiv','clerk','bill_operator') NOT NULL DEFAULT 'operator',
            gp_code VARCHAR(50) DEFAULT '',
            employee_id VARCHAR(100) DEFAULT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration for users table
        await addColumnIfNotExists(connection, 'users', 'employee_id', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'users', 'age', 'INT DEFAULT NULL');
        await addColumnIfNotExists(connection, 'users', 'address', 'TEXT DEFAULT NULL');
        await addColumnIfNotExists(connection, 'users', 'status', "ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING'");
        // Permission columns
        await addColumnIfNotExists(connection, 'users', 'can_view', 'BOOLEAN DEFAULT TRUE');
        await addColumnIfNotExists(connection, 'users', 'can_edit', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNotExists(connection, 'users', 'can_delete', 'BOOLEAN DEFAULT FALSE');
        // Module access column (comma-separated list of allowed module IDs)
        await addColumnIfNotExists(connection, 'users', 'allowed_modules', "VARCHAR(500) DEFAULT 'dashboard,namuna8,namuna9,payments,magani,reports,taxMaster'");

        // Seed default super_admin if no users exist
        const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (userCount[0].count === 0) {
            const hash = await bcrypt.hash('superadmin', 10);
            await connection.query(
                `INSERT INTO users (name, username, password_hash, role, employee_id, is_active, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['Super Admin', 'admin', hash, 'super_admin', 'ADM-001', true, 'APPROVED']
            );
            console.log('  Seeded default admin user (admin / superadmin)');
        }

        // Auto-generate employee IDs for users missing them
        const [usersWithoutId] = await connection.query('SELECT id, role FROM users WHERE employee_id IS NULL OR employee_id = ""');
        if (usersWithoutId.length > 0) {
            const prefixes = {
                'gram_sachiv': 'GS', 'gram_sevak': 'GV', 'operator': 'OP', 'clerk': 'CL',
                'bill_operator': 'BS', 'sarpanch': 'SP', 'auditor': 'AU', 'collection_officer': 'CO', 'super_admin': 'ADM'
            };
            for (const u of usersWithoutId) {
                const prefix = prefixes[u.role] || 'EMP';
                const [countRows] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role = ? AND employee_id IS NOT NULL AND employee_id != ""', [u.role]);
                const num = (countRows[0].count + 1).toString().padStart(3, '0');
                const empId = `${prefix}-${num}`;
                await connection.query('UPDATE users SET employee_id = ? WHERE id = ?', [empId, u.id]);
                console.log(`  Generated employee_id ${empId} for user #${u.id}`);
            }
        }
        // Migrations for users table
        const [userCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
        if (userCols.length > 0) {
            const currentType = userCols[0].Type;
            const targetType = "enum('super_admin','gram_sevak','operator','collection_officer','sarpanch','auditor','gram_sachiv','clerk','bill_operator')";
            if (currentType.toLowerCase() !== targetType.toLowerCase()) {
                console.log(`  Updating users.role from ${currentType} to ${targetType}`);
                await connection.query(`ALTER TABLE users MODIFY COLUMN role ${targetType} NOT NULL DEFAULT 'operator'`);
            }
        }

        console.log('Users table ready');

        // ──────────────────────────────────────────────
        // 2. PROPERTIES TABLE (existing + new columns)
        // ──────────────────────────────────────────────
        console.log('Ensuring properties table exists...');
        await connection.query(`CREATE TABLE IF NOT EXISTS properties (
            id VARCHAR(255) PRIMARY KEY,
            srNo INT,
            wardNo VARCHAR(255),
            khasraNo VARCHAR(255),
            layoutName VARCHAR(255),
            plotNo VARCHAR(255),
            occupantName VARCHAR(255),
            ownerName VARCHAR(255),
            hasConstruction BOOLEAN,
            openSpace DECIMAL(10, 2),
            propertyTax DECIMAL(10, 2),
            openSpaceTax DECIMAL(10, 2),
            streetLightTax DECIMAL(10, 2),
            healthTax DECIMAL(10, 2),
            generalWaterTax DECIMAL(10, 2),
            specialWaterTax DECIMAL(10, 2),
            totalTaxAmount DECIMAL(10, 2),
            arrearsAmount DECIMAL(10, 2) DEFAULT 0,
            paidAmount DECIMAL(10, 2) DEFAULT 0,
            wastiName VARCHAR(255),
            createdAt VARCHAR(255),
            status ENUM('draft','pending_verification','pending_approval','active','rejected') DEFAULT 'active',
            property_uid VARCHAR(100) DEFAULT NULL,
            land_use_type VARCHAR(100) DEFAULT 'Residential',
            construction_type VARCHAR(100) DEFAULT '',
            floors INT DEFAULT 1,
            year_of_construction INT DEFAULT NULL,
            mobile VARCHAR(20) DEFAULT '',
            financial_year VARCHAR(10) DEFAULT '2025-26',
            created_by INT DEFAULT NULL,
            verified_by INT DEFAULT NULL,
            approved_by INT DEFAULT NULL,
            verified_at TIMESTAMP NULL,
            approved_at TIMESTAMP NULL,
            rejection_remarks TEXT DEFAULT NULL,
            wasteCollectionTax DECIMAL(10, 2) DEFAULT 0,
            penaltyAmount DECIMAL(10, 2) DEFAULT 0,
            receiptNo VARCHAR(100) DEFAULT NULL,
            receiptBook VARCHAR(100) DEFAULT NULL,
            paymentDate VARCHAR(100) DEFAULT NULL,
            propertyId VARCHAR(100) DEFAULT NULL,
            constructionYear VARCHAR(50) DEFAULT NULL,
            propertyAge INT DEFAULT 0,
            readyReckonerLand DECIMAL(10, 2) DEFAULT 0,
            readyReckonerBuilding DECIMAL(10, 2) DEFAULT 0,
            readyReckonerComposite DECIMAL(10, 2) DEFAULT 0,
            depreciationAmount DECIMAL(10, 2) DEFAULT 0,
            discountAmount DECIMAL(10, 2) DEFAULT 0
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migrations for existing DB
        const newPropCols = [
            ['status', "ENUM('draft','pending_verification','pending_approval','active','rejected') DEFAULT 'active'"],
            ['property_uid', 'VARCHAR(100) DEFAULT NULL'],
            ['land_use_type', "VARCHAR(100) DEFAULT 'Residential'"],
            ['construction_type', "VARCHAR(100) DEFAULT ''"],
            ['floors', 'INT DEFAULT 1'],
            ['year_of_construction', 'INT DEFAULT NULL'],
            ['mobile', "VARCHAR(20) DEFAULT ''"],
            ['financial_year', "VARCHAR(10) DEFAULT '2025-26'"],
            ['created_by', 'INT DEFAULT NULL'],
            ['verified_by', 'INT DEFAULT NULL'],
            ['approved_by', 'INT DEFAULT NULL'],
            ['verified_at', 'TIMESTAMP NULL'],
            ['approved_at', 'TIMESTAMP NULL'],
            ['rejection_remarks', 'TEXT DEFAULT NULL'],
            ['arrearsAmount', 'DECIMAL(10,2) DEFAULT 0'],
            ['paidAmount', 'DECIMAL(10,2) DEFAULT 0'],
            //             ['citySurveyNo', 'VARCHAR(255) DEFAULT NULL'],
            //             ['construction_year', 'VARCHAR(100) DEFAULT NULL'],
            //             ['property_age', 'INT DEFAULT NULL'],
            //             ['ready_reckoner_land', 'DECIMAL(10,2) DEFAULT 0'],
            //             ['ready_reckoner_building', 'DECIMAL(10,2) DEFAULT 0'],
            //             ['ready_reckoner_composite', 'DECIMAL(10,2) DEFAULT 0'],
            //             ['surcharge_education', 'DECIMAL(10,2) DEFAULT 0'],
            //             ['surcharge_health', 'DECIMAL(10,2) DEFAULT 0'],
            //             surcharge_road DECIMAL(10,2) DEFAULT 0,
            //             surcharge_employment DECIMAL(10,2) DEFAULT 0,
            ['ownerName', 'TEXT DEFAULT NULL'],
            ['remarksNotes', 'TEXT DEFAULT NULL'],
            ['receiptNo', 'VARCHAR(100) DEFAULT NULL'],
            ['receiptBook', 'VARCHAR(100) DEFAULT NULL'],
            ['paymentDate', 'VARCHAR(100) DEFAULT NULL'],
            ['wasteCollectionTax', 'DECIMAL(10,2) DEFAULT 0'],
            ['penaltyAmount', 'DECIMAL(10,2) DEFAULT 0'],
            ['propertyId', 'VARCHAR(100) DEFAULT NULL'],
            ['constructionYear', 'VARCHAR(50) DEFAULT NULL'],
            ['propertyAge', 'INT DEFAULT 0'],
            ['readyReckonerLand', 'DECIMAL(10,2) DEFAULT 0'],
            ['readyReckonerBuilding', 'DECIMAL(10,2) DEFAULT 0'],
            ['readyReckonerComposite', 'DECIMAL(10,2) DEFAULT 0'],
            ['depreciationAmount', 'DECIMAL(10,2) DEFAULT 0'],
            ['discountAmount', 'DECIMAL(10,2) DEFAULT 0'],
        ];
        for (const [col, def] of newPropCols) {
            await addColumnIfNotExists(connection, 'properties', col, def);
        }

        await connection.query(`ALTER TABLE properties CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 
        // Strict Uniqueness Constraint - Ward, Wasti, Plot, Owner, Amount
        try {
            await connection.query(`ALTER TABLE properties ADD UNIQUE INDEX idx_strict_unique_prop (wardNo, wastiName, plotNo, ownerName, totalTaxAmount)`);
            console.log('  Added strict unique index onto properties');
        } catch (idxErr) {
            if (idxErr.code !== 'ER_DUP_KEYNAME') {
                console.error('  Index creation failed:', idxErr.message);
                // If it fails due to existing duplicates, we log but don't crash
            }
        }
        // Unique constraint - Commented out to allow duplicates as per user request
        /*
        try {
            await connection.query(`ALTER TABLE properties ADD UNIQUE INDEX idx_unique_property (srNo, wastiName, wardNo)`);
        } catch (idxErr) {
            if (idxErr.code !== 'ER_DUP_KEYNAME') throw idxErr;
        }
        */
        console.log('Properties table ready');

        // ──────────────────────────────────────────────
        // 3. PROPERTY SECTIONS TABLE (unchanged)
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS property_sections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            propertyId VARCHAR(255),
            floorIndex INT,
            propertyType VARCHAR(255),
            lengthFt DECIMAL(10, 2),
            widthFt DECIMAL(10, 2),
            areaSqFt DECIMAL(10, 2),
            areaSqMt DECIMAL(10, 2),
            landRate DECIMAL(10, 2),
            buildingRate DECIMAL(10, 2),
            depreciationRate DECIMAL(10, 2),
            weightage DECIMAL(10, 2),
            buildingValue DECIMAL(10, 2),
            openSpaceValue DECIMAL(10, 2),
            buildingTaxRate DECIMAL(10, 2),
            openSpaceTaxRate DECIMAL(10, 2),
            buildingFinalValue DECIMAL(10, 2) DEFAULT 0,
            openSpaceFinalValue DECIMAL(10, 2) DEFAULT 0,
            description TEXT DEFAULT NULL,
            FOREIGN KEY(propertyId) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`ALTER TABLE property_sections CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        const newSectionCols = [
            ['buildingFinalValue', 'DECIMAL(10,2) DEFAULT 0'],
            ['openSpaceFinalValue', 'DECIMAL(10,2) DEFAULT 0'],
            ['description', 'TEXT DEFAULT NULL']
        ];
        for (const [col, def] of newSectionCols) {
            await addColumnIfNotExists(connection, 'property_sections', col, def);
        }

        console.log('Property sections table ready');

        // ──────────────────────────────────────────────
        // 4. TAX RATES TABLE (+ interest/penalty)
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS tax_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            propertyType VARCHAR(255),
            wastiName VARCHAR(255),
            buildingRate DECIMAL(10, 2),
            buildingTaxRate DECIMAL(10, 2),
            landRate DECIMAL(10, 2),
            openSpaceTaxRate DECIMAL(10, 2),
            interest_rate DECIMAL(5, 2) DEFAULT 1.50,
            penalty_rate DECIMAL(5, 2) DEFAULT 5.00,
            financial_year VARCHAR(10) DEFAULT '2025-26',
            UNIQUE KEY unique_rate_config (propertyType, wastiName)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        await addColumnIfNotExists(connection, 'tax_rates', 'interest_rate', 'DECIMAL(5,2) DEFAULT 1.50');
        await addColumnIfNotExists(connection, 'tax_rates', 'penalty_rate', 'DECIMAL(5,2) DEFAULT 5.00');
        await addColumnIfNotExists(connection, 'tax_rates', 'financial_year', "VARCHAR(10) DEFAULT '2025-26'");

        // Seed initial rates
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM tax_rates');
        if (rows[0].count === 0) {
            const initialRates = [
                { propertyType: 'आर.सी.सी', wastiName: 'All', buildingRate: 21296, buildingTaxRate: 1.20, landRate: 0, openSpaceTaxRate: 0 },
                { propertyType: 'विटा सिमेंट', wastiName: 'All', buildingRate: 14000, buildingTaxRate: 1.20, landRate: 0, openSpaceTaxRate: 0 },
                { propertyType: 'खाली जागा', wastiName: 'शंकरपुर', buildingRate: 0, buildingTaxRate: 0, landRate: 7800, openSpaceTaxRate: 1.50 },
                { propertyType: 'खाली जागा', wastiName: 'गोटाळ पांजरी', buildingRate: 0, buildingTaxRate: 0, landRate: 5450, openSpaceTaxRate: 1.50 },
                { propertyType: 'खाली जागा', wastiName: 'वेळाहरी', buildingRate: 0, buildingTaxRate: 0, landRate: 6200, openSpaceTaxRate: 1.50 }
            ];
            for (const rate of initialRates) {
                await connection.query(`INSERT INTO tax_rates (propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate) VALUES (?, ?, ?, ?, ?, ?)`,
                    [rate.propertyType, rate.wastiName, rate.buildingRate, rate.buildingTaxRate, rate.landRate, rate.openSpaceTaxRate]);
            }
            console.log('  Seeded initial tax rates');
        }
        console.log('Tax rates table ready');

        // ──────────────────────────────────────────────
        // 5. PAYMENTS TABLE
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            receipt_no VARCHAR(50) NOT NULL UNIQUE,
            property_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            payment_mode ENUM('Cash','UPI','Cheque','Card','NetBanking') NOT NULL DEFAULT 'Cash',
            payment_date DATE NOT NULL,
            collector_id INT DEFAULT NULL,
            cheque_no VARCHAR(50) DEFAULT NULL,
            cheque_bank VARCHAR(255) DEFAULT NULL,
            cheque_status ENUM('Pending','Cleared','Bounced') DEFAULT NULL,
            upi_ref VARCHAR(100) DEFAULT NULL,
            remarks TEXT DEFAULT NULL,
            financial_year VARCHAR(10) DEFAULT '2025-26',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            receipt_book VARCHAR(50) DEFAULT NULL,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        await addColumnIfNotExists(connection, 'payments', 'receipt_book', 'VARCHAR(50) DEFAULT NULL');

        console.log('Payments table ready');

        // ──────────────────────────────────────────────
        // 6. TAX HEAD ALLOCATIONS (per payment breakdown)
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS tax_head_allocations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            payment_id INT NOT NULL,
            tax_head VARCHAR(100) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('Tax head allocations table ready');

        // ──────────────────────────────────────────────
        // 7. MAGANI BILLS (Recovery)
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS magani_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            overdue_amount DECIMAL(10, 2) NOT NULL,
            interest_amount DECIMAL(10, 2) DEFAULT 0,
            penalty_amount DECIMAL(10, 2) DEFAULT 0,
            total_due DECIMAL(10, 2) NOT NULL,
            notice_stage ENUM('First','Second','Final','Legal') DEFAULT 'First',
            status ENUM('Issued','Paid','Partially_Paid','Legal') DEFAULT 'Issued',
            issued_date DATE NOT NULL,
            due_date DATE NOT NULL,
            financial_year VARCHAR(10) DEFAULT '2025-26',
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('Magani bills table ready');

        // ──────────────────────────────────────────────
        // 8. NOTICES TABLE
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS notices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bill_id INT NOT NULL,
            stage ENUM('First','Second','Final') NOT NULL,
            issued_date DATE NOT NULL,
            served_date DATE DEFAULT NULL,
            served_by INT DEFAULT NULL,
            remarks TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(bill_id) REFERENCES magani_bills(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('Notices table ready');

        // ──────────────────────────────────────────────
        // 9. PROPERTY AUDIT LOG
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS property_audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            action VARCHAR(100) NOT NULL,
            field_name VARCHAR(255) DEFAULT NULL,
            old_value TEXT DEFAULT NULL,
            new_value TEXT DEFAULT NULL,
            performed_by INT DEFAULT NULL,
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            remarks TEXT DEFAULT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('Property audit log table ready');

        // ──────────────────────────────────────────────
        // 10. MASTER CATEGORIES & ITEMS
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS master_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name_mr VARCHAR(255) NOT NULL,
            name_en VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        await connection.query(`CREATE TABLE IF NOT EXISTS master_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            item_value_mr VARCHAR(255) NOT NULL,
            item_value_en VARCHAR(255),
            item_code VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(category_id) REFERENCES master_categories(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Granular Seed for categories and items
        const categories = [
            { name_mr: 'वस्तीचे नाव', name_en: 'Wasti Name', code: 'WASTI' },
            { name_mr: 'मालमत्तेचा प्रकार', name_en: 'Property Type', code: 'PROPERTY_TYPE' },
            { name_mr: 'वॉर्ड क्रमांक', name_en: 'Ward Number', code: 'WARD' },
            { name_mr: 'मालमत्तेचा वापर', name_en: 'Property Usage', code: 'PROPERTY_USAGE' }
        ];

        for (const cat of categories) {
            const [existing] = await connection.query('SELECT id FROM master_categories WHERE code = ?', [cat.code]);
            let categoryId;
            if (existing.length === 0) {
                const [result] = await connection.query(`INSERT INTO master_categories (name_mr, name_en, code) VALUES (?, ?, ?)`, [cat.name_mr, cat.name_en, cat.code]);
                categoryId = result.insertId;
                console.log(`  Added category: ${cat.code}`);
            } else {
                categoryId = existing[0].id;
            }

            // Check items for this category
            const [itemCount] = await connection.query('SELECT COUNT(*) as count FROM master_items WHERE category_id = ?', [categoryId]);
            if (itemCount[0].count === 0) {
                let items = [];
                if (cat.code === 'WASTI') {
                    items = ['शंकरपुर', 'गोटाळ पांजरी', 'वेळाहरी', ];
                } else if (cat.code === 'PROPERTY_TYPE') {
                    items = ['आर.सी.सी', 'विटा सिमेंट', 'मातीचे', 'खाली जागा'];
                } else if (cat.code === 'WARD') {
                    items = ['1', '2', '3'];
                } else if (cat.code === 'PROPERTY_USAGE') {
                    items = ['निवासी (Residential)', 'व्यावसायिक (Commercial)', 'औद्योगिक (Audyogik)', 'जमीन (Land)'];
                }
                for (const item of items) {
                    await connection.query(`INSERT INTO master_items (category_id, item_value_mr) VALUES (?, ?)`, [categoryId, item]);
                }
                console.log(`    Seeded items for category: ${cat.code}`);
            }
        }

        // ──────────────────────────────────────────────
        // 12. DEPRECIATION RATES TABLE
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS depreciation_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            min_age INT NOT NULL,
            max_age INT NOT NULL,
            percentage DECIMAL(5, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Seed initial depreciation rates
        const [depCount] = await connection.query('SELECT COUNT(*) as count FROM depreciation_rates');
        if (depCount[0].count === 0) {
            const initialDep = [
                { min_age: 0, max_age: 2, percentage: 100 },
                { min_age: 2, max_age: 5, percentage: 95 },
                { min_age: 5, max_age: 10, percentage: 90 },
                { min_age: 10, max_age: 20, percentage: 80 },
                { min_age: 20, max_age: 99, percentage: 70 }
            ];
            for (const d of initialDep) {
                await connection.query(`INSERT INTO depreciation_rates (min_age, max_age, percentage) VALUES (?, ?, ?)`, [d.min_age, d.max_age, d.percentage]);
            }
            console.log('  Seeded initial depreciation rates');
        }

        // ──────────────────────────────────────────────
        // 13. READY RECKONER RATES TABLE
        // ──────────────────────────────────────────────
        await connection.query(`CREATE TABLE IF NOT EXISTS ready_reckoner_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year_range VARCHAR(100) NOT NULL,
            item_name_mr VARCHAR(255) NOT NULL,
            item_name_en VARCHAR(255),
            valuation_rate DECIMAL(10, 2),
            tax_rate DECIMAL(10, 2),
            unit_mr VARCHAR(50) DEFAULT 'चौ. मी.',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Seed initial Ready Reckoner data from image
        const [rrCount] = await connection.query('SELECT COUNT(*) as count FROM ready_reckoner_rates');
        if (rrCount[0].count === 0) {
            const initialRR = [
                // सन २०१५-१६ पर्यंत
                { year_range: 'सन २०१५-१६ पर्यंत', item_name_mr: 'सर्व मालमत्ता', valuation_rate: 0, tax_rate: 0.20, unit_mr: 'चौ. फूट' },
                // सन २०१६-१७ ते २०२१-२२ पर्यंत
                { year_range: 'सन २०१६-१७ ते २०२१-२२ पर्यंत', item_name_mr: 'बांधकाम', valuation_rate: 14000, tax_rate: 1.20, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०१६-१७ ते २०२१-२२ पर्यंत', item_name_mr: 'शंकरपूर वार्ड क्र. १', valuation_rate: 7800, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०१६-१७ ते २०२१-२२ पर्यंत', item_name_mr: 'गोटाळपांजरी वार्ड क्र २', valuation_rate: 5000, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०१६-१७ ते २०२१-२२ पर्यंत', item_name_mr: 'वेळा (हरिश्चंद्र) वार्ड क्र ३', valuation_rate: 6000, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०२२-२३ पासून', item_name_mr: 'वेळा (हरिश्चंद्र) वार्ड क्र ३', valuation_rate: 6200, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
                // सन २०२५-२६ पासून
                { year_range: 'सन २०२५-२६ पासून', item_name_mr: 'आर.सी.सी (बांधकाम)', valuation_rate: 21296, tax_rate: 1.20, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०२५-२६ पासून', item_name_mr: 'शंकरपूर वार्ड क्र. १ (खाली जागा)', valuation_rate: 7800, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०२५-२६ पासून', item_name_mr: 'गोटाळपांजरी वार्ड क्र २ (खाली जागा)', valuation_rate: 5450, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
                { year_range: 'सन २०२५-२६ पासून', item_name_mr: 'वेळा (हरिश्चंद्र) वार्ड क्र ३ (खाली जागा)', valuation_rate: 6200, tax_rate: 1.50, unit_mr: 'चौ. मी.' },
            ];
            for (const r of initialRR) {
                await connection.query(`INSERT INTO ready_reckoner_rates (year_range, item_name_mr, valuation_rate, tax_rate, unit_mr) VALUES (?, ?, ?, ?, ?)`,
                    [r.year_range, r.item_name_mr, r.valuation_rate, r.tax_rate, r.unit_mr]);
            }
            console.log('  Seeded initial Ready Reckoner rates');
        }

        // ──────────────────────────────────────────────
        // 14. ATTENDANCE TABLE
        // ──────────────────────────────────────────────
        console.log('Ensuring attendance table exists...');
        await connection.query(`CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            check_out TIMESTAMP NULL DEFAULT NULL,
            status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('Attendance table ready');

        // ──────────────────────────────────────────────
        // 15. SYSTEM CONFIG TABLE
        // ──────────────────────────────────────────────
        console.log('Ensuring system_config table exists...');
        await connection.query(`CREATE TABLE IF NOT EXISTS system_config (
            config_key VARCHAR(100) PRIMARY KEY,
            config_value TEXT
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Seed default tax values
        const defaults = [
            { key: 'street_light_default', val: '25' },
            { key: 'waste_collection_default', val: '200' },
            { key: 'health_tax_default', val: '25' },
            { key: 'general_water_default', val: '25' },
            { key: 'special_water_default', val: '750' }
        ];

        for (const d of defaults) {
            await connection.query(
                'INSERT IGNORE INTO system_config (config_key, config_value) VALUES (?, ?)',
                [d.key, d.val]
            );
        }
        console.log('System config table ready');

        // ──────────────────────────────────────────────
        // 16. FERFAR REQUESTS TABLE
        // ──────────────────────────────────────────────
        console.log('Ensuring ferfar_requests table exists...');
        await connection.query(`CREATE TABLE IF NOT EXISTS ferfar_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            old_owner_name VARCHAR(255) NOT NULL,
            new_owner_name VARCHAR(255) NOT NULL,
            applicant_name VARCHAR(255) DEFAULT NULL,
            applicant_mobile VARCHAR(20) DEFAULT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            remarks TEXT DEFAULT NULL,
            document_proof VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP NULL DEFAULT NULL,
            approved_by INT DEFAULT NULL,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('Ferfar requests table ready');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
        console.log('MySQL Database initialized successfully');
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
};

module.exports = { db: pool, initializeDatabase };
