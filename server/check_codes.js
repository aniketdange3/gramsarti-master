const { db } = require('./database');

async function listCodes() {
    try {
        const [rows] = await db.query('SELECT code FROM master_categories');
        console.log('Category codes in DB:', rows.map(r => r.code).join(', '));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
listCodes();
