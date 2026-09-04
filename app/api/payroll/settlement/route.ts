import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Attendance from "@/models/sequelize/Attendance";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Expense from "@/models/sequelize/Expense";
import Payroll from "@/models/sequelize/Payroll";
import StaffAdvance from "@/models/sequelize/StaffAdvance";
import User from "@/models/sequelize/User";
import { notifyOwners } from "@/lib/ownerNotification";

export const dynamic = "force-dynamic";
const roles = ["owner", "director", "hr head", "hr executive", "payroll executive", "accounts", "cfo", "it admin"];
const allowed = (role: unknown) => roles.includes(String(role || "").toLowerCase().trim());
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

async function sessionUser() {
  const session: any = await getServerSession(authOptions);
  return session?.user && allowed(session.user.role) ? session.user : null;
}
async function ready() { await sequelize.authenticate(); await StaffAdvance.sync(); }

export async function GET(req: Request) {
  try {
    if (!await sessionUser()) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const requested = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, monthNumber] = requested.split("-").map(Number);
    if (!year || monthNumber < 1 || monthNumber > 12) return NextResponse.json({ success: false, error: "Invalid month" }, { status: 400 });
    const start = `${requested}-01`;
    const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
    const [users, profiles, payrolls, expenses, attendance, advances] = await Promise.all([
      User.findAll({ attributes: ["id", "name", "email", "status"], raw: true }),
      EmployeeProfile.findAll({ attributes: ["user", "employeeId", "baseSalary"], raw: true }),
      Payroll.findAll({ where: { month: monthNames[monthNumber - 1], year }, raw: true }),
      Expense.findAll({ where: { dateIncurred: { [Op.gte]: start, [Op.lt]: end }, status: "Approved" }, raw: true }),
      Attendance.findAll({ where: { date: { [Op.gte]: new Date(`${start}T00:00:00.000Z`), [Op.lt]: new Date(`${end}T00:00:00.000Z`) } }, raw: true }),
      StaffAdvance.findAll({ where: { issuedDate: { [Op.lt]: end }, status: { [Op.ne]: "Cancelled" } }, order: [["issuedDate", "DESC"]], raw: true }),
    ]);
    const profileMap = new Map((profiles as any[]).map(item => [String(item.user), item]));
    const payrollMap = new Map((payrolls as any[]).map(item => [String(item.employee), item]));
    const data = (users as any[]).filter(user => !/inactive|terminated|disabled|exited/i.test(String(user.status || ""))).map(user => {
      const id = String(user.id);
      const payroll: any = payrollMap.get(id);
      const employeeExpenses = (expenses as any[]).filter(item => String(item.employee) === id);
      const employeeAttendance = (attendance as any[]).filter(item => String(item.employee) === id);
      const employeeAdvances = (advances as any[]).filter(item => String(item.employeeId) === id);
      const expenseAmount = employeeExpenses.reduce((sum, item) => sum + Number(item.netPayable ?? item.amount ?? 0), 0);
      const outstandingAdvance = employeeAdvances.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0) - Number(item.recoveredAmount || 0)), 0);
      const advanceRecovery = employeeAdvances.reduce((sum, item) => sum + Math.min(Math.max(0, Number(item.amount || 0) - Number(item.recoveredAmount || 0)), Number(item.monthlyRecovery || 0)), 0);
      const presentDays = employeeAttendance.filter(item => /present/i.test(String(item.status || ""))).length;
      const absentDays = employeeAttendance.filter(item => /absent/i.test(String(item.status || ""))).length;
      const payrollNet = Number(payroll?.netPay || 0);
      return { employeeId: id, employeeCode: profileMap.get(id)?.employeeId || "", employeeName: user.name || user.email || id, baseSalary: Number(profileMap.get(id)?.baseSalary || 0), presentDays, absentDays, payrollId: payroll?.id || null, payrollStatus: payroll?.status || "Not Processed", earnedSalary: payrollNet, approvedExpenses: expenseAmount, approvedExpenseCount: employeeExpenses.length, outstandingAdvance, advanceRecovery, finalPayable: Math.max(0, payrollNet + expenseAmount - advanceRecovery) };
    });
    return NextResponse.json({ success: true, month: requested, data, advances });
  } catch (error: any) {
    console.error("[payroll settlement GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Settlement could not be loaded" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await sessionUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const amount = Number(body.amount || 0);
    const monthlyRecovery = Number(body.monthlyRecovery || 0);
    if (!body.employeeId || amount <= 0 || monthlyRecovery <= 0 || monthlyRecovery > amount || !body.issuedDate) return NextResponse.json({ success: false, error: "Employee, valid amount, recovery installment and issue date are required" }, { status: 400 });
    const employee = await User.findByPk(String(body.employeeId));
    if (!employee) return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    const data = await StaffAdvance.create({ id: `ADV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, employeeId: String(body.employeeId), amount, issuedDate: body.issuedDate, monthlyRecovery, recoveredAmount: 0, paymentMode: String(body.paymentMode || "Bank Transfer"), transactionRef: String(body.transactionRef || "").trim() || null, proofUrl: String(body.proofUrl || "").trim() || null, notes: String(body.notes || "").trim() || null, status: "Active", createdBy: String(user.id || user.email || user.name || "") });
    await notifyOwners({ title: `Staff Advance Issued: ${employee.name || body.employeeId}`, message: `${user.name || "Payroll team"} recorded ₹${amount.toLocaleString("en-IN")} staff advance. Monthly recovery: ₹${monthlyRecovery.toLocaleString("en-IN")}. Issue date: ${body.issuedDate}.`, moduleName: "Employee Settlement", actionUrl: "/dashboard/payroll-management", eventId: `staff_advance_${data.id}` });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Advance could not be saved" }, { status: 500 });
  }
}
