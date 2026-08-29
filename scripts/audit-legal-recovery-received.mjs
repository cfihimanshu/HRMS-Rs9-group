import mysql from "mysql2/promise";
import { loadDatabaseEnv } from "./db-env.mjs";
const env = loadDatabaseEnv();
const db = await mysql.createConnection({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT || 3306), user: env.MYSQL_USER, password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE });
const [groups] = await db.query("SELECT status, COUNT(*) rowsCount, ROUND(SUM(billAmount),2) bill, ROUND(SUM(receivedAmount),2) received, ROUND(SUM(tdsAmount),2) tds, ROUND(SUM(dueAmount),2) due FROM legal_recovery_bills GROUP BY status ORDER BY status");
const [suspects] = await db.query("SELECT id, invoiceNo, status, billAmount, receivedAmount, tdsAmount, dueAmount, remark FROM legal_recovery_bills WHERE receivedAmount > 0 AND LOWER(status) = 'pending' ORDER BY receivedAmount DESC");
console.log(JSON.stringify({ groups, pendingWithReceived: suspects }, null, 2));
await db.end();
