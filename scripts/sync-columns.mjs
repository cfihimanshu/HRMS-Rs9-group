import mysql from 'mysql2/promise';

async function syncLocalDb() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'root123',
      database: 'hrms_new',
      port: 3306
    });

    console.log("Connected to local MySQL database!");

    const cols = [
      "routerAdminPass TEXT NULL",
      "routerIsp TEXT NULL",
      "printerIp TEXT NULL"
    ];

    for (const c of cols) {
      try {
        await connection.query(`ALTER TABLE asset_inventory ADD COLUMN ${c};`);
        console.log(`Successfully added column: ${c.split(' ')[0]}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${c.split(' ')[0]} already exists.`);
        } else {
          console.error(`Error adding column ${c}:`, err.message);
        }
      }
    }

    await connection.end();
    console.log("Local Database sync complete!");
  } catch (err) {
    console.error("Failed to connect to local MySQL:", err.message);
  }
}

syncLocalDb();
