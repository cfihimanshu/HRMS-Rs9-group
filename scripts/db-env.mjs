import fs from "node:fs";
import path from "node:path";

export function loadDatabaseEnv() {
  const values = {};
  const envPath = path.resolve(process.env.DB_ENV_FILE || ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
  }
  const env = { ...values, ...process.env };
  const required = ["MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
  const missing = required.filter(key => !env[key]);
  if (!env.MYSQL_HOST && !env.MYSQL_SOCKET_PATH) missing.push("MYSQL_HOST");
  if (missing.length) throw new Error(`Missing database variables: ${missing.join(", ")}`);
  return env;
}
