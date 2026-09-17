const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: '103.191.208.201',
    user: 'fmojnedg_Rs9_Group',
    password: 'Legal786skr',
    database: 'fmojnedg_Rs9_Group_HRMS'
  });
  const [rows] = await conn.execute("SELECT id, name, role FROM users WHERE name LIKE '%Ali%'");
  console.log(rows);
  conn.end();
}
run();
