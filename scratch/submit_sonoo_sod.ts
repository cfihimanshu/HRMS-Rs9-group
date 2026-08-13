import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import sequelize from '../lib/sequelize';
import User from '../models/sequelize/User';
import SodReport from '../models/sequelize/SodReport';
import Attendance from '../models/sequelize/Attendance';
import TaskLog from '../models/sequelize/TaskLog';
import AuditLog from '../models/sequelize/AuditLog';
import { Op } from 'sequelize';

async function run() {
  try {
    await sequelize.authenticate();
    await SodReport.sync();
    await Attendance.sync().catch(() => {});
    await TaskLog.sync().catch(() => {});

    console.log("Connected to DB.");

    // 1. Find Sonoo User
    const sonoo = await User.findOne({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%Sonoo%' } },
          { email: { [Op.like]: '%sonoo%' } }
        ]
      },
      raw: true
    }) as any;

    if (!sonoo) {
      console.error("User Sonoo not found!");
      process.exit(1);
    }

    console.log("Found Sonoo:", sonoo.name, sonoo.id);

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 2. Create or Update SOD Report for Today (2026-08-13)
    let sodRecord = await SodReport.findOne({
      where: {
        employee: String(sonoo.id),
        date: { [Op.gte]: dayStart, [Op.lte]: dayEnd }
      }
    });

    const sodData = {
      employee: String(sonoo.id),
      date: now,
      plan: "Client Pitching, BDA Lead Calling & Follow-up",
      taskSummary: "Client Pitching, BDA Lead Calling & Follow-up",
      taskType: "Sales",
      callsPlanned: 10,
      meetings: 2,
      fieldVisits: 0,
      target: "10 Assigned Leads Pitching & Conversion",
      remarks: "SOD Submitted for BDA Sales Activities",
      selfieUrl: null,
      latitude: 28.6139,
      longitude: 77.2090,
      locationAddress: "Head Office",
      timestamp: now,
      status: "Declared"
    };

    if (sodRecord) {
      await sodRecord.update(sodData);
      console.log("Updated existing SOD record for Sonoo today!");
    } else {
      sodRecord = await SodReport.create(sodData);
      console.log("Created NEW SOD record for Sonoo today!");
    }

    // 3. Mark Attendance CheckIn / SOD for Sonoo
    const checkInTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0);
    let attRecord = await Attendance.findOne({
      where: {
        employee: String(sonoo.id),
        date: { [Op.gte]: dayStart, [Op.lte]: dayEnd }
      }
    });

    if (attRecord) {
      await attRecord.update({
        status: "Present",
        checkIn: checkInTime
      });
      console.log("Updated Attendance record for Sonoo to Present!");
    } else {
      await Attendance.create({
        id: "ATT_" + sonoo.id + "_" + Date.now(),
        employee: String(sonoo.id),
        date: now,
        status: "Present",
        checkIn: checkInTime,
        checkOut: null
      });
      console.log("Created NEW Attendance record for Sonoo!");
    }

    // 4. Create SOD Task in TaskLog for Sonoo
    const taskId = await TaskLog.generateNextTaskId(String(sonoo.id));
    const existingSodTask = await TaskLog.findOne({
      where: {
        employee: String(sonoo.id),
        taskTitle: { [Op.like]: "%SOD%" },
        createdAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd }
      }
    });

    if (!existingSodTask) {
      await TaskLog.create({
        id: taskId,
        employee: String(sonoo.id),
        date: now,
        taskTitle: "[Sales] SOD Work Plan - BDA Lead Calling",
        taskType: "Call",
        description: `SOD Declaration\nTask Summary: Client Pitching, BDA Lead Calling & Follow-up\nTarget: 10 Assigned Leads Pitching & Conversion\nCalls Planned: 10 | Meetings Planned: 2\nStatus: In Progress`,
        status: "In Progress",
        scheduledAt: now,
        timerState: "Stopped",
        timerStart: null,
        elapsedSeconds: 0,
        salesReason: "Pitching",
        callStatus: "In Progress",
        leadStatus: "In Progress"
      });
      console.log("Created SOD Task in TaskLog:", taskId);
    }

    // 5. Add Audit Log
    try {
      await AuditLog.create({
        userId: String(sonoo.id),
        userName: sonoo.name || "Sonoo",
        userRole: sonoo.role || "BDA",
        action: "SOD_DECLARED",
        entity: "SodReport",
        entityId: (sodRecord as any).id ? String((sodRecord as any).id) : null,
        details: `${sonoo.name} declared Start of Day (SOD). Task: Client Pitching, BDA Lead Calling & Follow-up.`,
        timestamp: now
      });
    } catch (e) {}

    console.log("✅ SUCCESSFULLY FILLED SOD FOR SONOO FOR TODAY!");
    process.exit(0);
  } catch (err) {
    console.error("Error submitting SOD:", err);
    process.exit(1);
  }
}

run();
