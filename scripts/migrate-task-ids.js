/**
 * migrate-task-ids.js
 * ─────────────────────────────────────────────────────────────────
 * One-time script to rename numeric TaskLog IDs (like 25, 26, 58)
 * to the new formatted company-prefix IDs (like CFI-TSK-025).
 *
 * HOW TO RUN (from project root):
 *   node scripts/migrate-task-ids.js
 *
 * NO TASKS ARE SKIPPED:
 *   If a preferred ID already exists, the next available number
 *   is used automatically (e.g. CFI-TSK-025 taken → CFI-TSK-112).
 * ─────────────────────────────────────────────────────────────────
 */

const mysql = require("mysql2/promise");

// ── DB Config (matches your .env local setup) ─────────────────────
const DB_CONFIG = {
  host: "127.0.0.1",
  user: "root",
  password: "root123",
  database: "hrms_new",
  port: 3306,
};

// ── Same prefix logic as TaskLog.generateNextTaskId ───────────────
function getCompanyPrefix(companyName) {
  if (!companyName) return "TSK";
  const upper = companyName.toUpperCase();
  if (upper.includes("CFI") || upper.includes("CHARTERED")) return "CFI";
  if (upper.includes("RAA") || upper.includes("RUKSANA")) return "RAA";
  if (upper.includes("CTPL") || upper.includes("CITILINE")) return "CTP";
  if (upper.includes("ATPL") || upper.includes("ACOLYTE")) return "ATP";
  if (upper.includes("RNPL") || upper.includes("RUHAN")) return "RNP";
  if (upper.includes("MVPL") || upper.includes("MAVICS")) return "MVP";
  return companyName.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log("✅ Connected to MySQL database:", DB_CONFIG.database);

  // Step 1: Fetch all existing IDs upfront to track used IDs in memory
  const [allTasks] = await conn.execute("SELECT id FROM tasklogs");
  const usedIds = new Set(allTasks.map((t) => t.id));

  // Step 2: Fetch only numeric IDs to migrate, sorted ascending
  const [tasks] = await conn.execute(
    "SELECT id, employee FROM tasklogs WHERE id REGEXP '^[0-9]+$' ORDER BY CAST(id AS UNSIGNED) ASC"
  );

  if (tasks.length === 0) {
    console.log("ℹ️  No numeric IDs found. Nothing to migrate.");
    await conn.end();
    return;
  }

  console.log(`\n🔎 Found ${tasks.length} task(s) with numeric IDs to migrate:\n`);

  // Track max number across all IDs to find next available
  let globalMax = 0;
  for (const id of usedIds) {
    const idStr = String(id);
    let num = NaN;
    if (idStr.includes("-TSK-")) num = parseInt(idStr.split("-TSK-")[1], 10);
    else if (/^\d+$/.test(idStr)) num = parseInt(idStr, 10);
    if (!isNaN(num) && num > globalMax) globalMax = num;
  }

  let successCount = 0;

  for (const task of tasks) {
    const oldId = String(task.id);
    const numericPart = parseInt(oldId, 10);

    // Step 3: Get company prefix from the employee's company
    let prefix = "TSK";
    try {
      const [userRows] = await conn.execute(
        "SELECT companies FROM users WHERE id = ?",
        [task.employee]
      );
      if (userRows.length > 0 && userRows[0].companies) {
        let companyIds = userRows[0].companies;
        if (typeof companyIds === "string") companyIds = JSON.parse(companyIds);
        if (Array.isArray(companyIds) && companyIds.length > 0) {
          const [compRows] = await conn.execute(
            "SELECT name FROM companys WHERE id = ?",
            [companyIds[0]]
          );
          if (compRows.length > 0 && compRows[0].name) {
            prefix = getCompanyPrefix(compRows[0].name);
          }
        }
      }
    } catch (e) {
      console.warn(`  ⚠️  Could not find company for task ${oldId}, using prefix TSK`);
    }

    // Step 4: Try preferred ID first (original number), else find next available
    let preferredId = `${prefix}-TSK-${String(numericPart).padStart(3, "0")}`;
    let newId = preferredId;
    let usedFallback = false;

    if (usedIds.has(newId)) {
      // Preferred slot taken — find next free number
      globalMax++;
      newId = `${prefix}-TSK-${String(globalMax).padStart(3, "0")}`;
      // Keep incrementing until a free slot is found
      while (usedIds.has(newId)) {
        globalMax++;
        newId = `${prefix}-TSK-${String(globalMax).padStart(3, "0")}`;
      }
      usedFallback = true;
    }

    // Step 5: Update task ID in tasklogs table
    await conn.execute(
      "UPDATE tasklogs SET id = ? WHERE id = ?",
      [newId, oldId]
    );

    // Mark new ID as used
    usedIds.delete(oldId);
    usedIds.add(newId);

    // Step 6: Update audit log references
    try {
      await conn.execute(
        "UPDATE audit_logs SET entityId = ? WHERE entity = 'TaskLog' AND entityId = ?",
        [newId, oldId]
      );
    } catch (e) {
      // audit_logs may not exist — safe to ignore
    }

    if (usedFallback) {
      console.log(`  ✅  RENAMED: ${oldId.padStart(4)} → ${newId}  [preferred ${preferredId} was taken, used next free]`);
    } else {
      console.log(`  ✅  RENAMED: ${oldId.padStart(4)} → ${newId}`);
    }
    successCount++;
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅ Migration complete! ${successCount} task(s) renamed.`);
  console.log(`─────────────────────────────────────────\n`);

  await conn.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
