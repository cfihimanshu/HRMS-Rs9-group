import mysql from "mysql2/promise";
import { loadDatabaseEnv } from "./db-env.mjs";

const env = loadDatabaseEnv();
const socketPath = env.MYSQL_SOCKET_PATH?.trim();
const target = socketPath
  ? `unix socket ${socketPath}`
  : `${env.MYSQL_HOST}:${env.MYSQL_PORT || 3306}`;
const startedAt = Date.now();

let connection;
try {
  connection = await mysql.createConnection({
    host: socketPath ? undefined : env.MYSQL_HOST,
    port: socketPath ? undefined : Number(env.MYSQL_PORT || 3306),
    socketPath: socketPath || undefined,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    connectTimeout: Number(env.MYSQL_CONNECT_TIMEOUT_MS || 10000),
    ssl: env.MYSQL_SSL === "true"
      ? { rejectUnauthorized: env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  });
  const [rows] = await connection.query(
    "SELECT DATABASE() AS databaseName, VERSION() AS serverVersion, 1 AS healthy"
  );
  console.log(JSON.stringify({
    success: true,
    target,
    database: rows[0]?.databaseName,
    serverVersion: rows[0]?.serverVersion,
    latencyMs: Date.now() - startedAt,
  }, null, 2));
} catch (error) {
  const code = error?.code || "UNKNOWN";
  console.error(JSON.stringify({
    success: false,
    target,
    code,
    message: error?.message || String(error),
    guidance: code === "ETIMEDOUT"
      ? "The hosting server cannot reach MySQL. Use Hostinger's internal MySQL hostname (often localhost for same-host databases) or allow the hosting server IP in Remote MySQL."
      : code === "ER_ACCESS_DENIED_ERROR"
        ? "Check MYSQL_USER, MYSQL_PASSWORD, database-user assignment, and allowed host."
        : "Check the production database environment variables and MySQL availability.",
  }, null, 2));
  process.exitCode = 1;
} finally {
  await connection?.end();
}
