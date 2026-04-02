const { db } = require('./database');

async function check() {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM properties');
        console.log(`Property count: ${rows[0].count}`);
        if (rows[0].count > 0) {
            const [samples] = await db.query('SELECT * FROM properties LIMIT 5');
            console.log('Sample data:', samples);
        } else {
            console.log('Database is empty.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
