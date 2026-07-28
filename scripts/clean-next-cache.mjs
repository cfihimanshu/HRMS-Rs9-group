import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const requestedCache = process.argv[2];
const allowedCaches = new Set([".next", ".next-dev"]);

if (!allowedCaches.has(requestedCache)) {
  throw new Error("Specify one allowed generated cache: .next or .next-dev");
}

const cachePath = path.join(projectRoot, requestedCache);
if (path.dirname(cachePath) !== projectRoot || !allowedCaches.has(path.basename(cachePath))) {
  throw new Error(`Refusing to clean unexpected cache path: ${cachePath}`);
}

if (fs.existsSync(cachePath)) {
  fs.rmSync(cachePath, { recursive: true, force: true });
  console.log(`Cleared generated Next.js cache (${requestedCache}).`);
}
