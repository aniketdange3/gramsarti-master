const { db } = require('./database');

async function finalCheck() {
    try {
        const [rows] = await db.query(`
            SELECT i.item_value_mr, i.item_code 
            FROM master_items i 
            JOIN master_categories c ON i.category_id = c.id 
            WHERE c.code = 'BUILDING_USAGE'
        `);
        console.log('Building Usage Items:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
finalCheck();
