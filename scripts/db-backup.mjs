import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadDatabaseEnv } from "./db-env.mjs";

const env = loadDatabaseEnv();
const outputDir = path.resolve(process.argv[2] || "backups");
fs.mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outputDir, `${env.MYSQL_DATABASE}_${stamp}.sql`);
const output = fs.createWriteStream(outputPath, { flags: "wx", mode: 0o600 });
const args = [
  "--single-transaction",
  "--quick",
  "--triggers",
  "-h", env.MYSQL_HOST,
  "-P", String(env.MYSQL_PORT || 3306),
  "-u", env.MYSQL_USER,
  env.MYSQL_DATABASE,
];
const child = spawn("mysqldump", args, {
  env: { ...process.env, MYSQL_PWD: env.MYSQL_PASSWORD },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.pipe(output);
let errors = "";
child.stderr.on("data", chunk => { errors += chunk.toString(); });
const exitCode = await new Promise(resolve => child.on("close", resolve));
output.end();
if (exitCode !== 0) {
  fs.rmSync(outputPath, { force: true });
  throw new Error(`mysqldump failed: ${errors.trim() || `exit ${exitCode}`}`);
}
console.log(JSON.stringify({ success: true, outputPath, bytes: fs.statSync(outputPath).size }, null, 2));
