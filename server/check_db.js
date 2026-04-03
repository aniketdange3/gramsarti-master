const { db, initializeDatabase } = require('./database');

async function checkMasterData() {
    try {
        console.log('--- MASTER CATEGORIES ---');
        const [categories] = await db.query('SELECT * FROM master_categories');
        console.table(categories);

        console.log('\n--- BUILDING USAGE ITEMS ---');
        const [items] = await db.query(`
            SELECT i.* FROM master_items i
            JOIN master_categories c ON i.category_id = c.id
            WHERE c.code = 'BUILDING_USAGE'
        `);
        console.table(items);

        console.log('\n--- ALL ITEMS BY CATEGORY ---');
        const [allItems] = await db.query(`
            SELECT c.code as category, i.item_value_mr, i.item_code
            FROM master_items i
            JOIN master_categories c ON i.category_id = c.id
            ORDER BY c.code
        `);
        console.table(allItems);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMasterData();
