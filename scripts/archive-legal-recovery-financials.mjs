import fs from "node:fs";
import mysql from "mysql2/promise";
import { loadDatabaseEnv } from "./db-env.mjs";

const backupPath = process.argv[2];
if (!backupPath || !fs.existsSync(backupPath)) throw new Error("A verified database backup path is required");
const tailSize = Math.min(512, fs.statSync(backupPath).size);
const handle = fs.openSync(backupPath, "r");
const tail = Buffer.alloc(tailSize);
fs.readSync(handle, tail, 0, tailSize, fs.statSync(backupPath).size - tailSize);
fs.closeSync(handle);
if (!tail.toString().includes("Dump completed on")) throw new Error("Backup file is incomplete; active data was not changed");

const env = loadDatabaseEnv();
const connection = await mysql.createConnection({
  host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT || 3306), user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE, connectTimeout: 30000,
});

const before = {};
try {
  await connection.beginTransaction();
  const [columns] = await connection.query("SHOW COLUMNS FROM legal_recovery_masters LIKE 'archivedAt'");
  if (!columns.length) await connection.query("ALTER TABLE legal_recovery_masters ADD COLUMN archivedAt DATETIME NULL");
  const [masterCount] = await connection.query("SELECT COUNT(*) AS total FROM legal_recovery_masters WHERE archivedAt IS NULL FOR UPDATE");
  before.legal_recovery_masters = Number(masterCount[0]?.total || 0);
  await connection.query("UPDATE legal_recovery_masters SET archivedAt = NOW() WHERE archivedAt IS NULL");
  const [after] = await connection.query("SELECT COUNT(*) AS total FROM legal_recovery_masters WHERE archivedAt IS NULL");
  if (Number(after[0]?.total || 0) !== 0) throw new Error("Active Bank Cases table did not become empty");
  await connection.commit();
  console.log(JSON.stringify({ success: true, backupPath, archivedWithoutDeleting: before }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
