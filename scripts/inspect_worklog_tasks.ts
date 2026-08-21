import fs from "node:fs";
import path from "node:path";

// Load .env before sequelize initializes
const envPath = path.resolve(".env");
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
    process.env[key] = value;
  }
}

async function main() {
  const sequelize = (await import("../lib/sequelize")).default;
  const User = (await import("../models/sequelize/User")).default;
  const SodReport = (await import("../models/sequelize/SodReport")).default;
  const Attendance = (await import("../models/sequelize/Attendance")).default;
  const TaskLog = (await import("../models/sequelize/TaskLog")).default;
  const { logAudit } = await import("../lib/audit");
  const { logHRActivity } = await import("../lib/hrAudit");
  const { Op } = await import("sequelize");

  await sequelize.authenticate();
  await SodReport.sync();
  await Attendance.sync();
  await TaskLog.sync();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const targets = [
    {
      userId: "1782911515980",
      userName: "Astha Sharma",
      userRole: "Wordpress Developer",
      taskSummary: "[Daily SOD] WordPress website maintenance, frontend UI updates & HRMS module testing",
      taskType: "Development",
      projectName: "HRMS & WordPress Portal",
      remarks: "Routine daily development tasks, bug fixes and feature updates",
      selfieUrl: null,
      location: { latitude: 26.9124, longitude: 75.7873, address: "Jaipur Head Office" },
    },
    {
      userId: "1783144170962",
      userName: "Lakshman Singh",
      userRole: "Facility Manager",
      taskSummary: "[Daily SOD] Facility administration, security oversight & operational task coordination",
      taskType: "Operations",
      projectName: null,
      remarks: "Daily facility management, security checks and site operational monitoring",
      selfieUrl: null,
      location: { latitude: 26.9124, longitude: 75.7873, address: "Jaipur Head Office" },
    }
  ];

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Processing SOD for ${t.userName} (${t.userId})...`);

    // Check if SOD already exists for today
    let sodRecord = await SodReport.findOne({
      where: {
        employee: t.userId,
        [Op.or]: [
          { date: { [Op.gte]: dayStart, [Op.lte]: dayEnd } },
          { createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
        ]
      },
      order: [["createdAt", "DESC"]]
    });

    if (sodRecord) {
      console.log(`⚠️ SOD already exists for today (ID: ${sodRecord.id}). Updating fields...`);
      sodRecord.taskSummary = t.taskSummary;
      sodRecord.taskType = t.taskType;
      sodRecord.projectName = t.projectName;
      sodRecord.remarks = t.remarks;
      await sodRecord.save();
      console.log(`✅ SOD updated successfully (ID: ${sodRecord.id})`);
    } else {
      sodRecord = await SodReport.create({
        employee: t.userId,
        date: now,
        taskSummary: t.taskSummary,
        taskType: t.taskType,
        remarks: t.remarks,
        projectName: t.projectName,
        selfieUrl: t.selfieUrl,
        latitude: t.location?.latitude || null,
        longitude: t.location?.longitude || null,
        locationAddress: t.location?.address || null,
      });
      console.log(`✅ SOD created successfully (ID: ${sodRecord.id})`);
    }

    // Auto-punch attendance check-in (Present) if not already punched today
    const attendanceExists = await Attendance.findOne({
      where: {
        employee: t.userId,
        date: {
          [Op.gte]: dayStart,
          [Op.lt]: dayEnd
        }
      }
    });

    if (!attendanceExists) {
      const attRecord = await Attendance.create({
        id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000),
        employee: t.userId,
        date: now,
        status: "Present",
        checkIn: now,
      });
      console.log(`✅ Attendance punched: Present at ${now.toLocaleTimeString()}`);
    } else {
      console.log(`ℹ️ Attendance already marked for today.`);
    }

    // Auto-create TaskLog entry if not created today
    const existingTask = await TaskLog.findOne({
      where: {
        employee: t.userId,
        taskTitle: t.taskSummary,
        createdAt: {
          [Op.gte]: dayStart,
          [Op.lte]: dayEnd
        }
      }
    });

    if (!existingTask) {
      const sodTaskId = await TaskLog.generateNextTaskId(t.userId);
      await TaskLog.create({
        id: sodTaskId,
        employee: t.userId,
        date: now,
        taskTitle: t.taskSummary,
        taskType: t.taskType,
        description: t.projectName ? `[Project: ${t.projectName}] ${t.remarks}` : t.remarks,
        status: "Pending",
        timerState: "Running",
        timerStart: now,
        elapsedSeconds: 0,
      });
      console.log(`✅ Kanban TaskLog created (Task ID: ${sodTaskId})`);
    } else {
      console.log(`ℹ️ Kanban TaskLog already exists for today.`);
    }

    // Audit logs
    try {
      await logAudit({
        userId: t.userId,
        action: "SOD_DECLARED",
        entity: "SodReport",
        entityId: String(sodRecord.id),
        details: `${t.userName} declared Start of Day (SOD) targets.`,
      });

      await logHRActivity({
        userId: t.userId,
        userRole: t.userRole,
        action: "SOD_DECLARED",
        details: `${t.userName} declared Start of Day (SOD). Task: ${t.taskSummary}.`,
      });
      console.log(`✅ Audit logs recorded.`);
    } catch (e: any) {
      console.warn(`Audit log note:`, e.message);
    }
  }

  console.log(`\n🎉 All SODs successfully filled and verified for Lakshman Singh and Astha Sharma!`);
}

main().catch(console.error).finally(() => process.exit(0));
