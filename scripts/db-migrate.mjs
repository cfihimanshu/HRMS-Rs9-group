import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { loadDatabaseEnv } from "./db-env.mjs";

const env = loadDatabaseEnv();
const dryRun = process.argv.includes("--dry-run");
const onlyIndex = process.argv.indexOf("--only");
const onlyFile = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : "";
if (onlyIndex >= 0 && (!onlyFile || onlyFile.startsWith("--") || path.basename(onlyFile) !== onlyFile)) {
  throw new Error("--only requires one exact migration filename");
}
const baselineIndex = process.argv.indexOf("--baseline");
const baselineFile = baselineIndex >= 0 ? process.argv[baselineIndex + 1] : "";
if (baselineIndex >= 0 && (!baselineFile || baselineFile.startsWith("--"))) {
  throw new Error("--baseline requires an exact migration filename");
}
const migrationDir = path.resolve("migrations/sql");
const files = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter(file => file.endsWith(".sql")).sort()
  : [];
const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: Number(env.MYSQL_PORT || 3306),
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  multipleStatements: true,
});

try {
  const [ledgerRows] = await connection.query(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'codex_schema_migrations'",
    [env.MYSQL_DATABASE]
  );
  const ledgerExists = Number(ledgerRows[0]?.count || 0) > 0;
  if (!dryRun && !ledgerExists) {
    await connection.query(`CREATE TABLE codex_schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
  }
  const [appliedRows] = ledgerExists
    ? await connection.query("SELECT id, checksum FROM codex_schema_migrations")
    : [[]];
  const applied = new Map(appliedRows.map(row => [row.id, row.checksum]));
  const pending = [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    if (applied.has(file)) {
      if (applied.get(file) !== checksum) throw new Error(`Applied migration was modified: ${file}`);
      continue;
    }
    if (!onlyFile || file === onlyFile) pending.push({ file, sql, checksum });
  }
  if (onlyFile && !files.includes(onlyFile)) {
    throw new Error(`Unknown migration file: ${onlyFile}`);
  }
  if (baselineFile) {
    const migration = pending.find(item => item.file === baselineFile);
    if (!migration) {
      throw new Error(`Cannot baseline unknown or already-applied migration: ${baselineFile}`);
    }
    if (dryRun) {
      throw new Error("--baseline cannot be combined with --dry-run");
    }
    await connection.query(
      "INSERT INTO codex_schema_migrations (id, checksum) VALUES (?, ?)",
      [migration.file, migration.checksum]
    );
    console.log(JSON.stringify({ baseline: migration.file, recorded: true }, null, 2));
    process.exit(0);
  }
  console.log(JSON.stringify({ dryRun, applied: applied.size, pending: pending.map(item => item.file) }, null, 2));
  if (dryRun) process.exit(0);
  for (const migration of pending) {
    await connection.beginTransaction();
    try {
      await connection.query(migration.sql);
      await connection.query("INSERT INTO codex_schema_migrations (id, checksum) VALUES (?, ?)", [migration.file, migration.checksum]);
      await connection.commit();
      console.log(`Applied ${migration.file}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
