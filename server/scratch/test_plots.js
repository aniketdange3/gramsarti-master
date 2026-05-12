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
    const [rows] = await connection.query('SELECT DISTINCT plotNo FROM properties WHERE plotNo IS NOT NULL AND plotNo != "" ORDER BY plotNo ASC');
    console.log('Plots:', rows.map(r => r.plotNo));
    
    const [layouts] = await connection.query('SELECT DISTINCT layoutName FROM properties WHERE layoutName IS NOT NULL AND layoutName != "" ORDER BY layoutName ASC');
    console.log('Layouts:', layouts.map(r => r.layoutName));

    const [all] = await connection.query('SELECT COUNT(*) as count FROM properties');
    console.log('Total Properties:', all[0].count);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

test();
