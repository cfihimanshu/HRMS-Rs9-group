import fs from "node:fs";
import mysql from "mysql2/promise";
import { loadDatabaseEnv } from "./db-env.mjs";

const backupPath = process.argv[2];
if (!backupPath || !fs.existsSync(backupPath)) throw new Error("Verified backup path is required");
const backup = fs.readFileSync(backupPath);
if (!backup.subarray(Math.max(0, backup.length - 512)).toString().includes("Dump completed on")) {
  throw new Error("Backup is incomplete; correction was not started");
}

const env = loadDatabaseEnv();
const connection = await mysql.createConnection({
  host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT || 3306), user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE, connectTimeout: 30000,
});

try {
  await connection.beginTransaction();
  const [before] = await connection.query(`
    SELECT COUNT(*) AS rowsToFix,
           ROUND(SUM(GREATEST(0, billAmount - dueAmount - tdsAmount)), 2) AS derivedReceived
    FROM legal_recovery_bills
    WHERE receivedAmount = 0
      AND LOWER(status) <> 'cancelled'
      AND (billAmount - dueAmount - tdsAmount) > 0
    FOR UPDATE
  `);
  const [result] = await connection.query(`
    UPDATE legal_recovery_bills
       SET receivedAmount = GREATEST(0, billAmount - dueAmount - tdsAmount),
           updatedAt = NOW()
     WHERE receivedAmount = 0
       AND LOWER(status) <> 'cancelled'
       AND (billAmount - dueAmount - tdsAmount) > 0
  `);
  const [totals] = await connection.query(`
    SELECT COUNT(*) AS billCount,
           ROUND(SUM(billAmount), 2) AS totalBill,
           ROUND(SUM(receivedAmount), 2) AS totalReceived,
           ROUND(SUM(CASE WHEN LOWER(status) = 'pending' THEN dueAmount ELSE 0 END), 2) AS pendingDue
    FROM legal_recovery_bills
  `);
  await connection.commit();
  console.log(JSON.stringify({ success: true, backupPath, preview: before[0], affectedRows: result.affectedRows, totals: totals[0] }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
