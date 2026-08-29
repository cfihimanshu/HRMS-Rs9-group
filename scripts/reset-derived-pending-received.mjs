import fs from "node:fs";
import mysql from "mysql2/promise";
import { loadDatabaseEnv } from "./db-env.mjs";

const backupPath = process.argv[2];
if (!backupPath || !fs.existsSync(backupPath)) throw new Error("Verified backup path is required");
const fd = fs.openSync(backupPath, "r");
const size = fs.statSync(backupPath).size;
const tail = Buffer.alloc(Math.min(512, size));
fs.readSync(fd, tail, 0, tail.length, size - tail.length); fs.closeSync(fd);
if (!tail.toString().includes("Dump completed on")) throw new Error("Backup is incomplete");

const env = loadDatabaseEnv();
const db = await mysql.createConnection({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT || 3306), user: env.MYSQL_USER, password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE });
try {
  await db.beginTransaction();
  // Exact rows identified by the preceding read-only audit; no other pending
  // payment data is touched.
  const auditedIds = [205, 206, 207, 208, 209, 210, 216, 234];
  const [result] = await db.query(
    "UPDATE legal_recovery_bills SET receivedAmount = 0, updatedAt = NOW() WHERE id IN (?) AND LOWER(status) = 'pending'",
    [auditedIds]
  );
  if (result.affectedRows !== auditedIds.length) throw new Error(`Expected ${auditedIds.length} audited rows, corrected ${result.affectedRows}`);
  const [totals] = await db.query("SELECT ROUND(SUM(CASE WHEN LOWER(status) = 'received' THEN receivedAmount ELSE 0 END),2) totalReceived, ROUND(SUM(CASE WHEN LOWER(status) = 'pending' THEN dueAmount ELSE 0 END),2) totalPending FROM legal_recovery_bills");
  await db.commit();
  console.log(JSON.stringify({ success: true, correctedPendingRows: result.affectedRows, totals: totals[0] }, null, 2));
} catch (error) { await db.rollback(); throw error; }
finally { await db.end(); }
