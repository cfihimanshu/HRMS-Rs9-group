const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: '103.191.208.201',
    user: 'fmojnedg_Rs9_Group',
    password: 'Legal786skr',
    database: 'fmojnedg_Rs9_Group_HRMS'
  });
  
  const [profiles] = await conn.execute("SELECT * FROM employee_profiles WHERE user = '1782968291659'");
  console.log("Profile:", profiles);
  
  const [users] = await conn.execute("SELECT id, name, role FROM users WHERE id = '1782968291659'");
  console.log("User:", users);
  
  conn.end();
}
run();
