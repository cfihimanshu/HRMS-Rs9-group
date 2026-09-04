import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { notifyOwners } from "@/lib/ownerNotification";
import { safeAuthenticate } from "@/lib/sequelize";
import Expense from "@/models/sequelize/Expense";
import Leave from "@/models/sequelize/Leave";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import LegalSecurity from "@/models/sequelize/LegalSecurity";
import Payroll from "@/models/sequelize/Payroll";
import StaffAdvance from "@/models/sequelize/StaffAdvance";
import TaskLog from "@/models/sequelize/TaskLog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const number = (value: unknown) => Number(String(value ?? 0).replace(/[^0-9.-]/g, "")) || 0;
const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const indiaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = new URL(request.url).searchParams.get("secret");
  if (secret && (supplied === secret || request.headers.get("authorization") === `Bearer ${secret}`)) return true;
  const session: any = await getServerSession(authOptions);
  return /owner|director/i.test(String(session?.user?.role || ""));
}

export async function GET(request: Request) {
  try {
    if (!await authorized(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!await safeAuthenticate(10000)) return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });
    await StaffAdvance.sync();
    const [tasks, leaves, expenses, payrolls, legalCases, securityBills, advances] = await Promise.all([
      TaskLog.findAll({ where: { status: { [Op.notIn]: ["Completed", "Cancelled", "Canceled"] } }, raw: true }),
      Leave.findAll({ raw: true }), Expense.findAll({ raw: true }), Payroll.findAll({ raw: true }),
      LegalRecoveryMaster.findAll({ raw: true }), LegalSecurity.findAll({ raw: true }), StaffAdvance.findAll({ where: { status: "Active" }, raw: true }),
    ]);
    const pendingLeaves = (leaves as any[]).filter(item => /pending|recommended/i.test(String(item.status || "")));
    const pendingExpenses = (expenses as any[]).filter(item => /pending|recommended/i.test(String(item.status || "")));
    const pendingPayroll = (payrolls as any[]).filter(item => !/paid|locked/i.test(String(item.status || "")));
    const legalPending = (legalCases as any[]).reduce((sum, item) => sum + Math.max(0, number(item.pendingAmount)), 0);
    const securityPending = (securityBills as any[]).reduce((sum, item) => sum + Math.max(0, number(item.billAmount) - number(item.receivedAmount)), 0);
    const securityFollowUps = (securityBills as any[]).filter(item => item.followUpAt && new Date(item.followUpAt) <= new Date()).length;
    const advanceOutstanding = (advances as any[]).reduce((sum, item) => sum + Math.max(0, number(item.amount) - number(item.recoveredAmount)), 0);
    const date = indiaDate();
    const message = `Pending work: ${tasks.length} tasks. Approvals: ${pendingLeaves.length} leaves, ${pendingExpenses.length} expenses. Payroll pending: ${pendingPayroll.length}. Legal recovery pending: ${money(legalPending)}. Security bills pending: ${money(securityPending)}; due follow-ups: ${securityFollowUps}. Staff advance outstanding: ${money(advanceOutstanding)}.`;
    const delivery = await notifyOwners({ title: `Daily Owner Operations Summary — ${date}`, message, moduleName: "Owner Dashboard", actionUrl: "/dashboard/vertical-dashboard", eventId: `owner_operations_digest_${date.replace(/[^0-9]/g, "")}` });
    return NextResponse.json({ success: true, date, message, delivery, summary: { pendingTasks: tasks.length, pendingLeaves: pendingLeaves.length, pendingExpenses: pendingExpenses.length, pendingPayroll: pendingPayroll.length, legalPending, securityPending, securityFollowUps, advanceOutstanding } });
  } catch (error: any) {
    console.error("[owner operations digest]", error);
    return NextResponse.json({ success: false, error: error.message || "Owner digest failed" }, { status: 500 });
  }
}

export async function POST(request: Request) { return GET(request); }
