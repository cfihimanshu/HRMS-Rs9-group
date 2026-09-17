const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: '103.191.208.201',
    user: 'fmojnedg_Rs9_Group',
    password: 'Legal786skr',
    database: 'fmojnedg_Rs9_Group_HRMS'
  });
  try {
    const [rows] = await conn.execute("SELECT * FROM asset_requests");
    console.log("Total requests:", rows.length);
    console.log(rows);
  } catch(e) {
    console.error(e.message);
  }
  conn.end();
}
run();
