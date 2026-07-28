import mysql from 'mysql2/promise';

async function syncVerticalColumn() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'root123',
      database: 'hrms_new',
      port: 3306
    });

    console.log("Connected to local MySQL database!");

    try {
      await connection.query("ALTER TABLE employeeprofiles ADD COLUMN vertical VARCHAR(255) NULL;");
      console.log("Successfully added column vertical to employeeprofiles table!");
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Column vertical already exists in employeeprofiles table.");
      } else {
        console.error("Error adding column vertical:", err.message);
      }
    }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS verticals (
          id VARCHAR(255) NOT NULL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(255) NULL,
          description TEXT NULL,
          status VARCHAR(255) NOT NULL DEFAULT 'active',
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        );
      `);
      console.log("Successfully ensured verticals master table exists!");
    } catch (err) {
      console.error("Error creating verticals table:", err.message);
    }

    await connection.end();
    console.log("Database sync completed successfully!");
  } catch (err) {
    console.error("Database connection error:", err.message);
  }
}

syncVerticalColumn();
