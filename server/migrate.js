const { initializeDatabase } = require('./database');

async function runMigrate() {
    try {
        console.log('Running manual migration...');
        await initializeDatabase();
        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
runMigrate();
