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
    try {
        const [cols] = await connection.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, column]
        );
        if (cols.length === 0) {
            await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
            console.log(`  [MIGRATION] Added column ${table}.${column}`);
        }
    } catch (err) {
        console.error(`  [MIGRATION ERROR] Failed to add column ${table}.${column}:`, err.message);
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
        console.log('  [DB] Foreign key checks disabled.');

        await connection.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('super_admin','gram_sevak','operator','collection_officer','sarpanch','auditor','gram_sachiv','clerk','bill_operator') NOT NULL DEFAULT 'operator',
            employee_id VARCHAR(100) DEFAULT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            is_active BOOLEAN DEFAULT TRUE,
            email VARCHAR(255) DEFAULT NULL,
            mobile VARCHAR(20) DEFAULT NULL,
            gp_code VARCHAR(100) DEFAULT NULL,
            age INT DEFAULT NULL,
            address TEXT DEFAULT NULL,
            can_view BOOLEAN DEFAULT TRUE,
            can_edit BOOLEAN DEFAULT FALSE,
            can_delete BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            allowed_modules VARCHAR(500) DEFAULT 'dashboard,namuna8,namuna9,payments,magani,reports,taxMaster'
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration for users
        await addColumnIfNotExists(connection, 'users', 'allowed_modules', "TEXT DEFAULT NULL");
        try {
            await connection.query('ALTER TABLE users MODIFY COLUMN allowed_modules TEXT');
            console.log('  [DB] Successfully migrated users.allowed_modules to TEXT');
        } catch (alterErr) {
            console.warn('  [DB] Migration warning allowed_modules:', alterErr.message);
        }
        await addColumnIfNotExists(connection, 'users', 'email', "VARCHAR(255) DEFAULT NULL");
        await addColumnIfNotExists(connection, 'users', 'mobile', "VARCHAR(20) DEFAULT NULL");
        await addColumnIfNotExists(connection, 'users', 'gp_code', "VARCHAR(100) DEFAULT NULL");
        await addColumnIfNotExists(connection, 'users', 'age', "INT DEFAULT NULL");
        await addColumnIfNotExists(connection, 'users', 'address', "TEXT DEFAULT NULL");
        await addColumnIfNotExists(connection, 'users', 'can_view', "BOOLEAN DEFAULT TRUE");
        await addColumnIfNotExists(connection, 'users', 'can_edit', "BOOLEAN DEFAULT FALSE");
        await addColumnIfNotExists(connection, 'users', 'can_delete', "BOOLEAN DEFAULT FALSE");

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
            layoutName VARCHAR(255) DEFAULT NULL,
            plotNo VARCHAR(255),
            ownerName VARCHAR(255),
            occupantName VARCHAR(255),
            hasConstruction TINYINT(1) DEFAULT 1,
            openSpace DECIMAL(10, 2) DEFAULT 0,
            propertyTax DECIMAL(10, 2) DEFAULT 0,
            openSpaceTax DECIMAL(10, 2) DEFAULT 0,
            streetLightTax DECIMAL(10, 2) DEFAULT 0,
            healthTax DECIMAL(10, 2) DEFAULT 0,
            generalWaterTax DECIMAL(10, 2) DEFAULT 0,
            specialWaterTax DECIMAL(10, 2) DEFAULT 0,
            wasteCollectionTax DECIMAL(10, 2) DEFAULT 0,
            totalTaxAmount DECIMAL(10, 2) DEFAULT 0,
            arrearsAmount DECIMAL(10, 2) DEFAULT 0,
            paidAmount DECIMAL(10, 2) DEFAULT 0,
            penaltyAmount DECIMAL(10, 2) DEFAULT 0,
            discountAmount DECIMAL(10, 2) DEFAULT 0,
            wastiName VARCHAR(255),
            contactNo VARCHAR(20) DEFAULT NULL,
            buildingUsage VARCHAR(100) DEFAULT 'निवास',
            receiptNo VARCHAR(100) DEFAULT NULL,
            receiptBook VARCHAR(100) DEFAULT NULL,
            paymentDate VARCHAR(50) DEFAULT NULL,
            billNo VARCHAR(100) DEFAULT NULL,
            lastBillDate VARCHAR(50) DEFAULT NULL,
            propertyId VARCHAR(255) DEFAULT NULL,
            constructionYear VARCHAR(50) DEFAULT NULL,
            propertyAge INT DEFAULT 0,
            readyReckonerLand DECIMAL(15, 2) DEFAULT 0,
            readyReckonerBuilding DECIMAL(15, 2) DEFAULT 0,
            readyReckonerComposite DECIMAL(15, 2) DEFAULT 0,
            depreciationAmount DECIMAL(10, 2) DEFAULT 0,
            remarksNotes TEXT DEFAULT NULL,
            propertyLength DECIMAL(10, 2) DEFAULT NULL,
            propertyWidth DECIMAL(10, 2) DEFAULT NULL,
            totalAreaSqFt DECIMAL(10, 2) DEFAULT NULL,
            totalAreaSqMt DECIMAL(10, 2) DEFAULT NULL,
            status ENUM('active','draft','rejected') DEFAULT 'active',
            created_by INT DEFAULT NULL,
            createdAt VARCHAR(255),
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration: Add missing columns to existing properties table
        await addColumnIfNotExists(connection, 'properties', 'layoutName', 'VARCHAR(255) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'hasConstruction', 'TINYINT(1) DEFAULT 1');
        await addColumnIfNotExists(connection, 'properties', 'openSpace', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'propertyTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'openSpaceTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'streetLightTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'healthTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'generalWaterTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'specialWaterTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'wasteCollectionTax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'receiptNo', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'receiptBook', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'paymentDate', 'VARCHAR(50) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'billNo', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'lastBillDate', 'VARCHAR(50) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'propertyId', 'VARCHAR(255) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'constructionYear', 'VARCHAR(50) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'propertyAge', 'INT DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'readyReckonerLand', 'DECIMAL(15,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'readyReckonerBuilding', 'DECIMAL(15,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'readyReckonerComposite', 'DECIMAL(15,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'depreciationAmount', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'properties', 'remarksNotes', 'TEXT DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'propertyLength', 'DECIMAL(10,2) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'propertyWidth', 'DECIMAL(10,2) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'totalAreaSqFt', 'DECIMAL(10,2) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'totalAreaSqMt', 'DECIMAL(10,2) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'properties', 'buildingUsage', "VARCHAR(100) DEFAULT 'निवास'");
        await addColumnIfNotExists(connection, 'properties', 'financial_year', "VARCHAR(10) DEFAULT NULL COMMENT 'आर्थिक वर्ष e.g. 2024-25'");
        await addColumnIfNotExists(connection, 'properties', 'created_by', 'INT DEFAULT NULL');
        await connection.query('ALTER TABLE properties ADD CONSTRAINT fk_properties_created_by FOREIGN KEY IF NOT EXISTS (created_by) REFERENCES users(id) ON DELETE SET NULL').catch(() => { });

        // Performance Indexes
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_srNo', 'srNo');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_ward', 'wardNo');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_wasti', 'wastiName');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_khasra', 'khasraNo');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_layout', 'layoutName');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_owner', 'ownerName(255)');
        await addIndexIfNotExists(connection, 'properties', 'idx_prop_occupant', 'occupantName(255)');

        // 3. PROPERTY SECTIONS - मजले आणि बांधकाम तपशील
        await connection.query(`CREATE TABLE IF NOT EXISTS property_sections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            propertyId VARCHAR(255),
            floorIndex INT,
            propertyType VARCHAR(255),
            lengthFt DECIMAL(10, 2) DEFAULT NULL,
            widthFt DECIMAL(10, 2) DEFAULT NULL,
            areaSqFt DECIMAL(10, 2) DEFAULT 0,
            areaSqMt DECIMAL(10, 2) DEFAULT 0,
            landRate DECIMAL(10, 2) DEFAULT 0,
            buildingRate DECIMAL(10, 2) DEFAULT 0,
            depreciationRate DECIMAL(5, 2) DEFAULT 1.0,
            weightage DECIMAL(5, 2) DEFAULT 1.0,
            buildingValue DECIMAL(10, 2) DEFAULT 0,
            openSpaceValue DECIMAL(10, 2) DEFAULT 0,
            buildingTaxRate DECIMAL(10, 2) DEFAULT 0,
            openSpaceTaxRate DECIMAL(10, 2) DEFAULT 0,
            buildingFinalValue DECIMAL(10, 2) DEFAULT 0,
            openSpaceFinalValue DECIMAL(10, 2) DEFAULT 0,
            description TEXT DEFAULT NULL,
            constructionYear VARCHAR(50) DEFAULT NULL,
            propertyAge INT DEFAULT 0,
            FOREIGN KEY(propertyId) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration: Add missing columns to existing property_sections table
        await addColumnIfNotExists(connection, 'property_sections', 'lengthFt', 'DECIMAL(10,2) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'property_sections', 'widthFt', 'DECIMAL(10,2) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'property_sections', 'areaSqMt', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'landRate', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'buildingRate', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'depreciationRate', 'DECIMAL(5,2) DEFAULT 1.0');
        await addColumnIfNotExists(connection, 'property_sections', 'weightage', 'DECIMAL(5,2) DEFAULT 1.0');
        await addColumnIfNotExists(connection, 'property_sections', 'openSpaceValue', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'openSpaceTaxRate', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'buildingFinalValue', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'openSpaceFinalValue', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_sections', 'description', 'TEXT DEFAULT NULL');
        await addColumnIfNotExists(connection, 'property_sections', 'constructionYear', 'VARCHAR(50) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'property_sections', 'propertyAge', 'INT DEFAULT 0');

        // Migration: Fix precision for rate columns to prevent out-of-range errors
        await connection.query('ALTER TABLE property_sections MODIFY COLUMN depreciationRate DECIMAL(12,2) DEFAULT 1.0').catch(() => { });
        await connection.query('ALTER TABLE property_sections MODIFY COLUMN weightage DECIMAL(12,2) DEFAULT 1.0').catch(() => { });
        await connection.query('ALTER TABLE properties MODIFY COLUMN wasteCollectionTax DECIMAL(12,2) DEFAULT 0').catch(() => { });

        // 4. PAYMENTS TABLE - कर भरणा नोंदी
        await connection.query(`CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            receipt_no VARCHAR(50) NOT NULL UNIQUE,
            property_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            payment_mode ENUM('Cash','UPI','Cheque') NOT NULL DEFAULT 'Cash',
            payment_date DATE NOT NULL,
            collector_id INT DEFAULT NULL,
            receipt_book VARCHAR(100) DEFAULT NULL,
            cheque_no VARCHAR(100) DEFAULT NULL,
            cheque_bank VARCHAR(255) DEFAULT NULL,
            cheque_status ENUM('Pending','Cleared','Bounced') DEFAULT NULL,
            upi_ref VARCHAR(255) DEFAULT NULL,
            remarks TEXT DEFAULT NULL,
            financial_year VARCHAR(10) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration: add missing columns to existing payments table
        await addColumnIfNotExists(connection, 'payments', 'receipt_book', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'payments', 'cheque_no', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'payments', 'cheque_bank', 'VARCHAR(255) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'payments', 'cheque_status', "ENUM('Pending','Cleared','Bounced') DEFAULT NULL");
        await addColumnIfNotExists(connection, 'payments', 'upi_ref', 'VARCHAR(255) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'payments', 'remarks', 'TEXT DEFAULT NULL');
        await addColumnIfNotExists(connection, 'payments', 'financial_year', 'VARCHAR(10) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'payments', 'created_by', 'INT DEFAULT NULL');
        await connection.query('ALTER TABLE payments ADD CONSTRAINT fk_payments_created_by FOREIGN KEY IF NOT EXISTS (created_by) REFERENCES users(id) ON DELETE SET NULL').catch(() => { });

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
            item_value_en VARCHAR(255) DEFAULT NULL,
            item_code VARCHAR(100) DEFAULT NULL,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(category_id) REFERENCES master_categories(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration for master_items (add missing columns to existing tables)
        await addColumnIfNotExists(connection, 'master_items', 'item_value_en', 'VARCHAR(255) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'master_items', 'item_code', 'VARCHAR(100) DEFAULT NULL');
        await addColumnIfNotExists(connection, 'master_items', 'sort_order', 'INT DEFAULT 0');
        await addColumnIfNotExists(connection, 'master_items', 'is_active', 'BOOLEAN DEFAULT TRUE');

        // 7. TAX MASTER TABLES (Advanced)
        await connection.query(`CREATE TABLE IF NOT EXISTS depreciation_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            min_age INT NOT NULL,
            max_age INT NOT NULL,
            percentage DECIMAL(5, 2) NOT NULL
        )`);

        // Migration for depreciation_rates
        const [depCols] = await connection.query('SHOW COLUMNS FROM depreciation_rates');
        const depColNames = depCols.map(c => c.Field);
        if (!depColNames.includes('min_age')) await connection.query('ALTER TABLE depreciation_rates ADD COLUMN min_age INT NOT NULL DEFAULT 0');
        if (!depColNames.includes('max_age')) await connection.query('ALTER TABLE depreciation_rates ADD COLUMN max_age INT NOT NULL DEFAULT 0');
        if (!depColNames.includes('percentage')) {
            await connection.query('ALTER TABLE depreciation_rates ADD COLUMN percentage DECIMAL(5, 2) NOT NULL DEFAULT 0');
            console.log('[MIGRATION] Added percentage column to depreciation_rates.');
        }


        await connection.query(`CREATE TABLE IF NOT EXISTS ready_reckoner_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year_range VARCHAR(50) NOT NULL,
            item_name_mr VARCHAR(255) NOT NULL,
            valuation_rate DECIMAL(15, 2) NOT NULL,
            tax_rate DECIMAL(5, 2) NOT NULL,
            unit_mr VARCHAR(50) DEFAULT 'चौ. मी.'
        )`);

        // Migration for ready_reckoner_rates
        const [rrCols] = await connection.query('SHOW COLUMNS FROM ready_reckoner_rates');
        const rrColNames = rrCols.map(c => c.Field);
        if (!rrColNames.includes('year_range')) await connection.query('ALTER TABLE ready_reckoner_rates ADD COLUMN year_range VARCHAR(50) NOT NULL');
        if (!rrColNames.includes('item_name_mr')) await connection.query('ALTER TABLE ready_reckoner_rates ADD COLUMN item_name_mr VARCHAR(255) NOT NULL');
        if (!rrColNames.includes('valuation_rate')) await connection.query('ALTER TABLE ready_reckoner_rates ADD COLUMN valuation_rate DECIMAL(15, 2) NOT NULL DEFAULT 0');
        if (!rrColNames.includes('tax_rate')) await connection.query('ALTER TABLE ready_reckoner_rates ADD COLUMN tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0');
        if (!rrColNames.includes('unit_mr')) await connection.query("ALTER TABLE ready_reckoner_rates ADD COLUMN unit_mr VARCHAR(50) DEFAULT 'चौ. मी.'");

        await connection.query(`CREATE TABLE IF NOT EXISTS building_usage_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usage_type_mr VARCHAR(255) NOT NULL,
            usage_type_en VARCHAR(255) NOT NULL,
            weightage DECIMAL(5, 2) NOT NULL DEFAULT 1.0
        )`);

        // Migration for building_usage_master
        const [buColsM] = await connection.query('SHOW COLUMNS FROM building_usage_master');
        const buColNamesM = buColsM.map(c => c.Field);
        if (!buColNamesM.includes('usage_type_mr')) await connection.query('ALTER TABLE building_usage_master ADD COLUMN usage_type_mr VARCHAR(255) NOT NULL');
        if (!buColNamesM.includes('usage_type_en')) await connection.query('ALTER TABLE building_usage_master ADD COLUMN usage_type_en VARCHAR(255) NOT NULL');
        if (!buColNamesM.includes('weightage')) await connection.query('ALTER TABLE building_usage_master ADD COLUMN weightage DECIMAL(5, 2) NOT NULL DEFAULT 1.0');


        await connection.query(`CREATE TABLE IF NOT EXISTS system_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(100) NOT NULL UNIQUE,
            config_value TEXT
        )`);

        // 11. FINANCIAL YEAR RECORDS - आर्थिक वर्ष कर नोंदी (One-to-Many: property → yearly tax)
        await connection.query(`CREATE TABLE IF NOT EXISTS property_fy_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            financial_year VARCHAR(10) NOT NULL,           -- e.g. '2024-25'
            magil_amount DECIMAL(12,2) DEFAULT 0,          -- मागील (auto-calculated, locked)
            chalu_amount DECIMAL(12,2) DEFAULT 0,          -- चालू (editable in new year)
            paid_amount DECIMAL(12,2) DEFAULT 0,           -- वसुली
            is_carry_forward TINYINT(1) DEFAULT 0,         -- क्या चालू carry forward है?
            is_magil_locked TINYINT(1) DEFAULT 1,          -- मागील manually editable नाही
            migrated_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_prop_fy (property_id, financial_year),
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration: Add breakdown columns to property_fy_records
        await addColumnIfNotExists(connection, 'property_fy_records', 'property_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'open_space_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'street_light_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'health_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'general_water_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'special_water_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'waste_collection_tax', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'penalty_amount', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(connection, 'property_fy_records', 'arrears_amount', 'DECIMAL(12,2) DEFAULT 0');

        // Seed current financial year in system_config if not present
        const [fyConfig] = await connection.query(
            "SELECT config_key FROM system_config WHERE config_key = 'current_fy'"
        );
        if (fyConfig.length === 0) {
            const currentFY = '2026-27';
            await connection.query(
                "INSERT INTO system_config (config_key, config_value) VALUES ('current_fy', ?)",
                [currentFY]
            );
            console.log(`  [SEED] Default current_fy set to ${currentFY}`);
        } else {
            // Update to 2026-27 if not already
            await connection.query(
                "UPDATE system_config SET config_value = '2026-27' WHERE config_key = 'current_fy'"
            );
            console.log('  [MIGRATION] current_fy updated to 2026-27');
        }

        // Seed Global Tax Defaults (only if they don't exist, so admin changes are preserved)
        const defaultTaxes = [
            ['street_light_default', '25'],
            ['health_tax_default', '25'],
            ['general_water_default', '25'],
            ['special_water_default', '750'],
            ['waste_collection_default', '200']
        ];
        
        for (const [key, val] of defaultTaxes) {
            const [tRows] = await connection.query("SELECT config_key FROM system_config WHERE config_key = ?", [key]);
            if (tRows.length === 0) {
                await connection.query("INSERT INTO system_config (config_key, config_value) VALUES (?, ?)", [key, val]);
                console.log(`  [SEED] Default ${key} set to ${val}`);
            }
        }

        await connection.query(`CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // 9. PROPERTY AUDIT REQUESTS - मालमत्ता दुरुस्ती प्रस्ताव
        await connection.query(`CREATE TABLE IF NOT EXISTS property_audit_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            request_data LONGTEXT NOT NULL,
            requested_by INT NOT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            admin_remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
            FOREIGN KEY(requested_by) REFERENCES users(id)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // 10. FERFAR REQUESTS - फेरफार नोंदणी (Property Mutation)
        await connection.query(`CREATE TABLE IF NOT EXISTS ferfar_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            village_id INT DEFAULT NULL,
            old_owner_name VARCHAR(500) NOT NULL,
            new_owner_name VARCHAR(500) NOT NULL,
            applicant_name VARCHAR(255) DEFAULT '',
            applicant_mobile VARCHAR(20) DEFAULT '',
            ferfar_type VARCHAR(100) DEFAULT 'खरेदीखत',
            remarks TEXT DEFAULT NULL,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            srNo INT DEFAULT NULL,
            wardNo VARCHAR(255) DEFAULT NULL,
            wastiName VARCHAR(255) DEFAULT NULL,
            plotNo VARCHAR(255) DEFAULT NULL,
            requested_by INT DEFAULT NULL,
            approved_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
            FOREIGN KEY(requested_by) REFERENCES users(id) ON DELETE SET NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Migration for ferfar_requests
        await addColumnIfNotExists(connection, 'ferfar_requests', 'village_id', 'INT DEFAULT NULL');
        await addColumnIfNotExists(connection, 'ferfar_requests', 'requested_by', 'INT DEFAULT NULL');
        await connection.query('ALTER TABLE ferfar_requests ADD CONSTRAINT fk_ferfar_requested_by FOREIGN KEY IF NOT EXISTS (requested_by) REFERENCES users(id) ON DELETE SET NULL').catch(() => { });
        await addIndexIfNotExists(connection, 'ferfar_requests', 'idx_ferfar_village', 'village_id');
        await addIndexIfNotExists(connection, 'ferfar_requests', 'idx_ferfar_status', 'status');
        await addIndexIfNotExists(connection, 'ferfar_requests', 'idx_ferfar_created', 'created_at');

        // 11. MAGANI BILLS - मागणी बिल (Demand Notices)
        await connection.query(`CREATE TABLE IF NOT EXISTS magani_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            property_id VARCHAR(255) NOT NULL,
            overdue_amount DECIMAL(12, 2) DEFAULT 0,
            interest_amount DECIMAL(12, 2) DEFAULT 0,
            penalty_amount DECIMAL(12, 2) DEFAULT 0,
            total_due DECIMAL(12, 2) DEFAULT 0,
            notice_stage ENUM('First', 'Second', 'Final', 'Legal') DEFAULT 'First',
            status ENUM('Issued', 'Paid', 'Legal') DEFAULT 'Issued',
            issued_date DATE,
            due_date DATE,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // 12. NOTICES HISTORY - सूचनांचा इतिहास
        await connection.query(`CREATE TABLE IF NOT EXISTS notices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bill_id INT NOT NULL,
            stage VARCHAR(50) NOT NULL,
            issued_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bill_id) REFERENCES magani_bills(id) ON DELETE CASCADE
        )`);


        const [depCount] = await connection.query('SELECT COUNT(*) as count FROM depreciation_rates');
        if (depCount[0].count === 0) {
            await connection.query(`INSERT INTO depreciation_rates (min_age, max_age, percentage) VALUES 
                (0, 2, 100.00), (2, 5, 95.00), (5, 10, 90.00), (10, 20, 80.00), (20, 99, 70.00)`);
        }

        const [buCount] = await connection.query('SELECT COUNT(*) as count FROM building_usage_master');
        if (buCount[0].count === 0) {
            await connection.query(`INSERT INTO building_usage_master (usage_type_mr, usage_type_en, weightage) VALUES 
                ('निवास', 'RESIDENTIAL', 1.00), ('औद्योगिक', 'INDUSTRIAL', 1.20), ('वाणिज्य', 'COMMERCIAL', 1.25)`);
        }

        // --- REFINED SEEDING FOR MASTER DATA ---
        const [cats] = await connection.query('SELECT id, code FROM master_categories');
        const codes = cats.map(c => c.code);

        // 1. PROPERTY_TYPE
        if (!codes.includes('PROPERTY_TYPE')) {
            const [res] = await connection.query("INSERT INTO master_categories (name_mr, code) VALUES ('मालमत्तेचा प्रकार', 'PROPERTY_TYPE')");
            const catId = res.insertId;
            await connection.query(`INSERT INTO master_items (category_id, item_value_mr, item_code) VALUES 
                (?, 'आर.सी.सी', 'RCC'), (?, 'खाली जागा', 'OPEN_LAND'), (?, 'मातीचे', 'KUCHA'), (?, 'विटा सिमेंट', 'BRICK')`,
                [catId, catId, catId, catId]);
            console.log('  [SEED] Restored PROPERTY_TYPE category and items');
        } else {
            const catId = cats.find(c => c.code === 'PROPERTY_TYPE').id;
            const [items] = await connection.query('SELECT COUNT(*) as count FROM master_items WHERE category_id = ?', [catId]);
            if (items[0].count === 0) {
                await connection.query(`INSERT INTO master_items (category_id, item_value_mr, item_code) VALUES 
                    (?, 'आर.सी.सी', 'RCC'), (?, 'खाली जागा', 'OPEN_LAND'), (?, 'मातीचे', 'KUCHA'), (?, 'विटा सिमेंट', 'BRICK')`,
                    [catId, catId, catId, catId]);
                console.log('  [SEED] Restored PROPERTY_TYPE items');
            }
        }

        // 2. WASTI
        if (!codes.includes('WASTI')) {
            const [res] = await connection.query("INSERT INTO master_categories (name_mr, code) VALUES ('वस्ती (वॉर्डसह)', 'WASTI')");
            const catId = res.insertId;
            await connection.query(`INSERT INTO master_items (category_id, item_value_mr, item_code) VALUES 
                (?, 'शंकरपुर', 'WARD-1'), (?, 'गोटाळ पांजरी', 'WARD-2'), (?, 'वेळाहरी', 'WARD-3')`,
                [catId, catId, catId]);
            console.log('  [SEED] Restored WASTI category and items');
        }

        const [taxCount2] = await connection.query('SELECT COUNT(*) as count FROM tax_rates');
        if (taxCount2[0].count === 0) {
            await connection.query(`INSERT INTO tax_rates (propertyType, wastiName, buildingRate, buildingTaxRate, landRate, openSpaceTaxRate) VALUES 
                ('आर.सी.सी', 'All', 21296.00, 1.20, 0.00, 0.00),
                ('विटा सिमेंट', 'All', 14000.00, 1.20, 0.00, 0.00),
                ('खाली जागा', 'शंकरपुर', 0.00, 0.00, 7800.00, 1.50),
                ('खाली जागा', 'गोटाळ पांजरी', 0.00, 0.00, 5450.00, 1.50),
                ('खाली जागा', 'वेळाहरी', 0.00, 0.00, 6200.00, 1.50)`);
        }

        const [rrCount] = await connection.query('SELECT COUNT(*) as count FROM ready_reckoner_rates');
        if (rrCount[0].count === 0) {
            await connection.query(`INSERT INTO ready_reckoner_rates (year_range, item_name_mr, valuation_rate, tax_rate, unit_mr) VALUES 
                ('२०२६-२७', 'निवासी (Residential)', 12500.00, 1.20, 'चौ. मी.'),
                ('२०२६-२७', 'वाणिज्य (Commercial)', 18500.00, 1.50, 'चौ. मी.'),
                ('२०२६-२७', 'औद्योगिक (Industrial)', 15000.00, 1.25, 'चौ. मी.'),
                ('२०२५-२६', 'निवासी (Residential)', 12500.00, 1.20, 'चौ. मी.'),
                ('२०२५-२६', 'वाणिज्य (Commercial)', 18500.00, 1.50, 'चौ. मी.')`);
        }

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
