import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function loadEnv(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = { ...loadEnv(path.resolve(".env")), ...process.env };
const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
const missing = required.filter(key => !env[key]);
if (missing.length) throw new Error(`Missing database variables: ${missing.join(", ")}`);

const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: Number(env.MYSQL_PORT || 3306),
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  ssl: env.MYSQL_SSL === "true" ? { rejectUnauthorized: env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
});

try {
  await connection.query("SET SESSION TRANSACTION READ ONLY");
  const [tables] = await connection.query(
    `SELECT TABLE_NAME AS tableName, ENGINE AS engine, TABLE_ROWS AS estimatedRows,
            DATA_LENGTH AS dataBytes, INDEX_LENGTH AS indexBytes
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [env.MYSQL_DATABASE]
  );
  const [columns] = await connection.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType,
            IS_NULLABLE AS nullable, COLUMN_KEY AS columnKey, EXTRA AS extra
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [env.MYSQL_DATABASE]
  );
  const [indexes] = await connection.query(
    `SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
      ORDER BY TABLE_NAME, INDEX_NAME`,
    [env.MYSQL_DATABASE]
  );
  const [foreignKeys] = await connection.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName,
            REFERENCED_TABLE_NAME AS referencedTable, REFERENCED_COLUMN_NAME AS referencedColumn
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, COLUMN_NAME`,
    [env.MYSQL_DATABASE]
  );

  const columnsByTable = new Map();
  for (const column of columns) {
    if (!columnsByTable.has(column.tableName)) columnsByTable.set(column.tableName, []);
    columnsByTable.get(column.tableName).push(column);
  }
  const wideTables = Array.from(columnsByTable.entries())
    .map(([tableName, tableColumns]) => ({
      tableName,
      columnCount: tableColumns.length,
      varcharColumns: tableColumns.filter(column => /^varchar/i.test(column.columnType)).length,
      textColumns: tableColumns.filter(column => /text/i.test(column.columnType)).length,
    }))
    .filter(table => table.columnCount >= 30)
    .sort((a, b) => b.columnCount - a.columnCount);
  const tablesWithoutSecondaryIndexes = tables
    .filter(table => !indexes.some(index => index.tableName === table.tableName && index.indexName !== "PRIMARY"))
    .map(table => table.tableName);

  const report = {
    generatedAt: new Date().toISOString(),
    database: env.MYSQL_DATABASE,
    summary: {
      tables: tables.length,
      columns: columns.length,
      indexes: indexes.length,
      foreignKeys: foreignKeys.length,
      wideTables: wideTables.length,
      tablesWithoutSecondaryIndexes: tablesWithoutSecondaryIndexes.length,
    },
    wideTables,
    tablesWithoutSecondaryIndexes,
    tables,
    columns,
    indexes,
    foreignKeys,
  };
  const outputPath = process.argv[2] || path.resolve("db-audit-report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ success: true, outputPath, ...report.summary }, null, 2));
} finally {
  await connection.end();
}
