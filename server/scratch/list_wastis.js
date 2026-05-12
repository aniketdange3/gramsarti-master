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
    const [rows] = await connection.query('SELECT DISTINCT wastiName FROM properties');
    console.log('All Wastis:', rows.map(r => r.wastiName));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

test();
