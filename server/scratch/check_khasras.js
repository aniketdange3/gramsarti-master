const mysql = require('mysql2/promise');
const config = {
  host: 'localhost',
  user: 'root',
  password: 'Admin@123',
  database: 'gramsarthi_db'
};

async function test() {
  const connection = await mysql.createConnection(config);
  try {
    const wastis = [
        { en: 'Gotalpanjari', mr: 'गोटाळ पांजरी' },
        { en: 'Velahari', mr: 'वेळाहरी' },
        { en: 'Shankarpur', mr: 'शंकरपुर' }
    ];
    for (const wasti of wastis) {
        const [khasras] = await connection.query(
            'SELECT DISTINCT khasraNo FROM properties WHERE wastiName = ? AND khasraNo IS NOT NULL AND khasraNo != ""',
            [wasti.mr]
        );
        const [total] = await connection.query(
            'SELECT COUNT(*) as count FROM properties WHERE wastiName = ?',
            [wasti.mr]
        );
        const [plots] = await connection.query(
            'SELECT COUNT(DISTINCT plotNo) as count FROM properties WHERE wastiName = ? AND plotNo IS NOT NULL AND plotNo != ""',
            [wasti.mr]
        );
        console.log(`Wasti: ${wasti.mr} (${wasti.en})`);
        console.log(`- Total Properties: ${total[0].count}`);
        console.log(`- Unique Khasras: ${khasras.length}`);
        console.log(`- Unique Plots: ${plots[0].count}`);
        console.log('-----------------------------------');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

test();
