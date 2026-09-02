import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import { sendEmail } from "@/lib/email";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import TaskLog from "@/models/sequelize/TaskLog";
import Notification from "@/models/sequelize/Notification";
import MonthlyWorkReportDelivery from "@/models/sequelize/MonthlyWorkReportDelivery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const dateKey = (value: unknown) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value as any));
const timeLabel = (value: unknown) => value ? new Date(value as any).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "";
const safePart = (value: unknown) => String(value || "na").replace(/[^a-zA-Z0-9]/g, "").slice(-50) || "na";

function resolveMonth(request: Request) {
  const requested = new URL(request.url).searchParams.get("month");
  if (requested && /^\d{4}-\d{2}$/.test(requested)) return requested;
  const indiaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  indiaNow.setMonth(indiaNow.getMonth() - 1);
  return `${indiaNow.getFullYear()}-${String(indiaNow.getMonth() + 1).padStart(2, "0")}`;
}

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = new URL(request.url).searchParams.get("secret");
  if (secret && (supplied === secret || request.headers.get("authorization") === `Bearer ${secret}`)) return true;
  const session = await getServerSession(authOptions);
  return /owner|director|hr head|hr executive/i.test(String((session?.user as any)?.role || ""));
}

async function run(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await safeAuthenticate(12000))) return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });
  await Promise.all([MonthlyWorkReportDelivery.sync(), Notification.sync()]);

  const month = resolveMonth(request);
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(`${month}-01T00:00:00+05:30`);
  const nextMonth = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
  const end = new Date(`${nextMonth}-01T00:00:00+05:30`);
  const range = { [Op.gte]: start, [Op.lt]: end };

  const users = await User.findAll({ attributes: ["id", "name", "email", "role", "status"], raw: true }) as any[];
  const activeUsers = users.filter((user) => String(user.email || "").trim() && !["inactive", "disabled", "terminated", "archived"].includes(String(user.status || "active").toLowerCase()));
  const userIds = activeUsers.map((user) => String(user.id));
  const [profiles, sods, eods, tasks] = await Promise.all([
    EmployeeProfile.findAll({ where: { user: { [Op.in]: userIds } }, attributes: ["user", "designation", "department", "vertical"], raw: true }),
    SodReport.findAll({ where: { employee: { [Op.in]: userIds }, date: range }, order: [["date", "ASC"]], raw: true }),
    EodReport.findAll({ where: { employee: { [Op.in]: userIds }, date: range }, order: [["date", "ASC"]], raw: true }),
    TaskLog.findAll({ where: { employee: { [Op.in]: userIds }, date: range }, order: [["date", "ASC"]], raw: true }),
  ]) as any;
  const profileMap = new Map((profiles as any[]).map((profile) => [String(profile.user), profile]));
  const employeeCsvs = new Map<string, string>();
  const summaryRows: string[] = [];

  for (const user of activeUsers) {
    const id = String(user.id);
    const userSods = (sods as any[]).filter((item) => String(item.employee) === id);
    const userEods = (eods as any[]).filter((item) => String(item.employee) === id);
    const userTasks = (tasks as any[]).filter((item) => String(item.employee) === id);
    const days = [...new Set([...userSods, ...userEods, ...userTasks].map((item) => dateKey(item.date || item.createdAt)))].sort();
    const rows = days.map((day) => {
      const sod = userSods.find((item) => dateKey(item.date || item.createdAt) === day);
      const eod = [...userEods].reverse().find((item) => dateKey(item.date || item.createdAt) === day);
      const dayTasks = userTasks.filter((item) => dateKey(item.date || item.createdAt) === day);
      const completed = dayTasks.filter((item) => String(item.status).toLowerCase() === "completed").length;
      const startTime = sod?.timestamp || sod?.date;
      const endTime = eod?.timestamp || eod?.date;
      const minutes = startTime && endTime ? Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)) : 0;
      return [day, timeLabel(startTime), timeLabel(endTime), minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : "", dayTasks.length, completed, dayTasks.length - completed, sod?.taskSummary || sod?.plan || "", eod?.completedWork || "", eod?.pendingWork || ""].map(csvCell).join(",");
    });
    const header = ["Date", "SOD Time", "EOD Time", "Work Duration", "Tasks", "Completed", "Pending", "SOD Plan", "EOD Completed Work", "EOD Pending Work"].map(csvCell).join(",");
    employeeCsvs.set(id, `\uFEFF${header}\n${rows.join("\n")}`);
    const completedTasks = userTasks.filter((task) => String(task.status).toLowerCase() === "completed").length;
    const profile: any = profileMap.get(id) || {};
    summaryRows.push([user.name, user.email, profile.designation || user.role, profile.department || profile.vertical, days.length, userSods.length, userEods.length, userTasks.length, completedTasks, userTasks.length - completedTasks].map(csvCell).join(","));
  }

  let individualSent = 0, skipped = 0, failed = 0;
  for (const user of activeUsers) {
    const deliveryId = `monthly_${safePart(month)}_${safePart(user.id)}_individual`;
    const [delivery] = await MonthlyWorkReportDelivery.findOrCreate({ where: { id: deliveryId }, defaults: { id: deliveryId, reportMonth: month, recipientId: String(user.id), recipientEmail: user.email, reportType: "individual", status: "pending" } });
    if (delivery.status === "sent") { skipped++; continue; }
    const userTasks = (tasks as any[]).filter((task) => String(task.employee) === String(user.id));
    const completed = userTasks.filter((task) => String(task.status).toLowerCase() === "completed").length;
    const result = await sendEmail({
      to: String(user.email),
      subject: `Monthly Work Report — ${month} — ${user.name || "Employee"}`,
      html: `<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6"><h2>Monthly Work Report — ${escapeHtml(month)}</h2><p>Hello <b>${escapeHtml(user.name || "Employee")}</b>,</p><p>Your monthly work report is attached.</p><p><b>Total tasks:</b> ${userTasks.length} &nbsp; <b>Completed:</b> ${completed} &nbsp; <b>Pending:</b> ${userTasks.length - completed}</p><p style="font-size:12px;color:#64748b">RS9 Group HRMS · Automated month-end report</p></div>`,
      attachments: [{ filename: `Work_Report_${safePart(user.name)}_${month}.csv`, content: employeeCsvs.get(String(user.id)) || "", contentType: "text/csv; charset=utf-8" }],
    });
    if (result.success) {
      await delivery.update({ status: "sent", sentAt: new Date(), errorMessage: null }); individualSent++;
      await Notification.findOrCreate({ where: { id: `monthly_report_${month}_${safePart(user.id)}` }, defaults: { id: `monthly_report_${month}_${safePart(user.id)}`, recipient: String(user.id), title: `Monthly Work Report Sent: ${month}`, message: `Your ${month} work report has been sent to ${user.email}.`, read: false } });
    } else { await delivery.update({ status: "failed", errorMessage: String(result.error || "Email failed").slice(0, 2000) }); failed++; }
  }

  const summaryHeader = ["Employee", "Email", "Designation", "Department/Vertical", "Active Report Days", "SOD Count", "EOD Count", "Total Tasks", "Completed", "Pending"].map(csvCell).join(",");
  const consolidated = `\uFEFF${summaryHeader}\n${summaryRows.join("\n")}`;
  const managers = activeUsers.filter((user) => /owner|director|hr head|hr executive/i.test(String(user.role || "")));
  let consolidatedSent = 0;
  for (const manager of managers) {
    const deliveryId = `monthly_${safePart(month)}_${safePart(manager.id)}_consolidated`;
    const [delivery] = await MonthlyWorkReportDelivery.findOrCreate({ where: { id: deliveryId }, defaults: { id: deliveryId, reportMonth: month, recipientId: String(manager.id), recipientEmail: manager.email, reportType: "consolidated", status: "pending" } });
    if (delivery.status === "sent") continue;
    const result = await sendEmail({ to: String(manager.email), subject: `All Employees Monthly Work Report — ${month}`, html: `<div style="font-family:Arial,sans-serif"><h2>Consolidated Monthly Work Report — ${escapeHtml(month)}</h2><p>${activeUsers.length} active employee report summaries are attached.</p></div>`, attachments: [{ filename: `All_Employees_Work_Report_${month}.csv`, content: consolidated, contentType: "text/csv; charset=utf-8" }] });
    if (result.success) { await delivery.update({ status: "sent", sentAt: new Date(), errorMessage: null }); consolidatedSent++; }
    else { await delivery.update({ status: "failed", errorMessage: String(result.error || "Email failed").slice(0, 2000) }); failed++; }
  }

  return NextResponse.json({ success: failed === 0, month, employees: activeUsers.length, individualSent, consolidatedSent, skipped, failed });
}

export async function GET(request: Request) { try { return await run(request); } catch (error: any) { console.error("Monthly work report email failed:", error); return NextResponse.json({ success: false, error: error.message }, { status: 500 }); } }
export async function POST(request: Request) { return GET(request); }
