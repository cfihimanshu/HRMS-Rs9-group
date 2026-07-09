const mysql = require("mysql2/promise");

async function check() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "root123",
      database: "hrms_new"
    });

    const [rows] = await connection.execute("SELECT id, name FROM companys");
    console.log("All Companys:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.end();
  }
}

check();
