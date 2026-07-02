import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "root123",
    database: process.env.MYSQL_DATABASE || "hrms",
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  console.log("Connected to MySQL.");

  const [roles] = await connection.execute("SELECT name, department FROM roles");
  console.log("\nRoles in DB:");
  console.log(roles);

  await connection.end();
}

run().catch(console.error);
