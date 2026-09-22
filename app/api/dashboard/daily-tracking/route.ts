import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { requireApiSession } from "@/lib/apiAuth";
import User from "@/models/sequelize/User";
import Attendance from "@/models/sequelize/Attendance";
import SodReport from "@/models/sequelize/SodReport";
import TaskLog from "@/models/sequelize/TaskLog";
import AuditLog from "@/models/sequelize/AuditLog";
import LegalRecoveryPayment from "@/models/sequelize/LegalRecoveryPayment";
import LegalSecurityPayment from "@/models/sequelize/LegalSecurityPayment";

export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  // Organization-wide information must not inherit the generic manager/head role matching.
  const role = String((auth.session.user as Row).role || "").trim().toLowerCase();
  if (!["owner", "director", "hr head", "hr executive"].includes(role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const date = new URL(request.url).searchParams.get("date") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
  }
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 86400000);
  const range = { [Op.gte]: start, [Op.lt]: end };
  const errors: string[] = [];
  try {
    const users = await User.findAll({ attributes: ["id", "name"], raw: true }) as unknown as Row[];
    const names = new Map(users.map(user => [String(user.id), user.name]));
    const name = (id: unknown) => id ? names.get(String(id)) || String(id) : "Not recorded";
    const results = await Promise.allSettled([
      LegalRecoveryPayment.findAll({ where: { paymentDate: range }, raw: true }),
      LegalSecurityPayment.findAll({ where: { paymentDate: date }, raw: true }),
      Attendance.findAll({ where: { date: range }, raw: true }),
      SodReport.findAll({ where: { date: range }, raw: true }),
      TaskLog.findAll({ where: { createdAt: range }, order: [["createdAt", "DESC"]], raw: true }),
      AuditLog.findAll({ where: { entity: "TaskLog", timestamp: range }, order: [["timestamp", "DESC"]], raw: true }),
    ]);
    const labels = ["Legal receipts", "Security receipts", "Attendance", "SOD", "Tasks", "Task history"];
    const rows = results.map((result, index): Row[] => {
      if (result.status === "fulfilled") return result.value as unknown as Row[];
      console.error(`[daily-tracking] ${labels[index]}`, result.reason);
      errors.push(`${labels[index]} could not be loaded`);
      return [];
    });
    const payments = [...rows[0].map(row => ({ ...row, source: "Legal Recovery", payer: row.bankName })), ...rows[1].map(row => ({ ...row, source: "Security", payer: row.nbfcName }))].map((row: Row) => ({
      id: `${row.source}-${row.id}`, source: row.source, payer: row.payer || "Not recorded", branch: row.branchName || "—", amount: Number(row.amount), paymentDate: row.paymentDate, recordedAt: row.createdAt, receivedBy: name(row.receivedBy), mode: row.paymentMode || "—", reference: row.transactionId || "—",
    })).sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt));
    const present = new Map<string, Row>();
    for (const row of rows[2]) {
      if (!row.employee || !["present", "late", "on duty", "half day"].includes(String(row.status).toLowerCase())) continue;
      const id = String(row.employee);
      const previous = present.get(id);
      present.set(id, { id, name: name(id), checkIn: previous?.checkIn && (!row.checkIn || +new Date(previous.checkIn) < +new Date(row.checkIn)) ? previous.checkIn : row.checkIn, source: "Attendance", late: previous?.late || String(row.status).toLowerCase() === "late" });
    }
    for (const row of rows[3]) {
      if (!row.employee) continue;
      const id = String(row.employee);
      const previous = present.get(id);
      if (previous?.source === "Attendance") continue;
      if (previous && +new Date(previous.checkIn) <= +new Date(row.createdAt)) continue;
      present.set(id, { id, name: name(id), checkIn: row.createdAt, source: "SOD", late: false });
    }
    const attendance = [...present.values()].map((row): Row => ({ ...row, late: row.late || Boolean(row.checkIn && +new Date(row.checkIn) >= +new Date(`${date}T11:00:00+05:30`)) })).sort((a, b) => a.name.localeCompare(b.name));
    const parsedAudits = rows[5].map((row): Row => {
      try { return { ...row, detail: JSON.parse(row.details) }; } catch { return { ...row, detail: {} }; }
    });
    const creators = new Map(parsedAudits.filter(row => row.action === "TASK_LOGGED").map(row => [String(row.entityId), name(row.user)]));
    const tasks = rows[4].map(row => ({ id: row.id, title: row.taskTitle || row.description || "Untitled task", creator: creators.get(String(row.id)) || name(row.assignedBy || row.employee), assignedTo: name(row.employee), forwardedTo: row.forwardedTo ? name(row.forwardedTo) : "—", status: row.status, createdAt: row.createdAt }));
    const forwards = parsedAudits.flatMap(row => {
      const changes = Array.isArray(row.detail?.changes) ? row.detail.changes : [];
      const change = changes.find((item: Row) => item.field === "forwardedTo" && item.after && item.after !== item.before);
      return change ? [{ id: row.id, taskId: row.entityId, from: name(row.user), to: name(change.after), previousRecipient: change.before ? name(change.before) : "—", at: row.timestamp }] : [];
    });
    return NextResponse.json({ success: true, data: { date, payments, attendance, tasks, forwards, errors, paymentsAvailable: results[0].status === "fulfilled" && results[1].status === "fulfilled", attendanceAvailable: results[2].status === "fulfilled" && results[3].status === "fulfilled", tasksAvailable: results[4].status === "fulfilled", forwardsAvailable: results[5].status === "fulfilled" } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[daily-tracking]", error);
    return NextResponse.json({ success: false, error: "Daily tracking could not be loaded" }, { status: 500 });
  }
}
