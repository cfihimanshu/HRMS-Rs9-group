import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import SupportTicket from "@/models/sequelize/SupportTicket";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["owner", "director", "it admin", "hr head", "hr executive", "department manager", "accounts", "payroll executive"];
const STATUSES = new Set(["Open", "In Progress", "Waiting", "Resolved", "Closed", "Rejected"]);

function roleOf(user: any) {
  return String(user?.role || "").trim().toLowerCase();
}

function isOwner(user: any) {
  const role = roleOf(user);
  return role.includes("owner") || role.includes("director");
}

function isManagement(user: any) {
  const role = roleOf(user);
  return MANAGEMENT_ROLES.some(item => role.includes(item));
}

async function ready() {
  await sequelize.authenticate();
  await SupportTicket.sync();
  await User.sync();
}

async function adminUsers() {
  const users = await User.findAll({
    where: { status: { [Op.or]: [null, "active", "Active", "probation", "on notice"] } },
    attributes: ["id", "name", "email", "role"],
    raw: true,
  }) as any[];
  return users
    .filter(user => isManagement(user))
    .map(user => ({ id: String(user.id), name: user.name || user.email || user.id, email: user.email, role: user.role || "Admin" }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function visibleWhere(user: any) {
  if (isOwner(user)) return {};
  if (isManagement(user)) return { [Op.or]: [{ raisedById: String(user.id) }, { assignedToId: String(user.id) }] };
  return { raisedById: String(user.id) };
}

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const tickets = await SupportTicket.findAll({ where: visibleWhere(session.user), order: [["createdAt", "DESC"]], raw: true });
    return NextResponse.json({ success: true, data: tickets, admins: await adminUsers() });
  } catch (error: any) {
    console.error("[tickets GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Tickets load nahi hue" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    if (!title || !description) return NextResponse.json({ success: false, error: "Title aur description required hai" }, { status: 400 });

    const admins = await adminUsers();
    const assigned = admins.find(user => String(user.id) === String(body.assignedToId)) || null;
    const now = Date.now();
    const ticketNo = "TKT-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + String(now).slice(-5);
    const record = await SupportTicket.create({
      id: String(now) + Math.random().toString(36).slice(2, 7),
      ticketNo,
      title,
      category: String(body.category || "General"),
      moduleName: String(body.moduleName || ""),
      issueType: String(body.issueType || "Issue"),
      priority: String(body.priority || "Medium"),
      status: "Open",
      amount: body.amount === "" || body.amount === undefined || body.amount === null ? null : Number(body.amount),
      description,
      expectedResolution: String(body.expectedResolution || ""),
      raisedById: String(session.user.id),
      raisedByName: String(session.user.name || session.user.email || "Employee"),
      raisedByRole: String(session.user.role || "Employee"),
      assignedToId: assigned?.id || null,
      assignedToName: assigned?.name || null,
      assignedToRole: assigned?.role || null,
      dueDate: body.dueDate || null,
      lastActionBy: String(session.user.name || session.user.email || "Employee"),
      lastActionAt: new Date(),
    });
    await logAudit({ userId: String(session.user.id), userName: session.user.name, userRole: session.user.role, action: "SUPPORT_TICKET_CREATED", entity: "SupportTicket", entityId: record.id, details: ticketNo + " raised: " + title });
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("[tickets POST]", error);
    return NextResponse.json({ success: false, error: error.message || "Ticket create nahi hua" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ready();
    const body = await req.json();
    const record: any = await SupportTicket.findByPk(String(body.id || ""));
    if (!record) return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    const canUpdate = isOwner(session.user) || String(record.assignedToId || "") === String(session.user.id) || String(record.raisedById || "") === String(session.user.id);
    if (!canUpdate) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const updates: any = {};
    if (body.status !== undefined && STATUSES.has(String(body.status))) updates.status = String(body.status);
    if (body.priority !== undefined) updates.priority = String(body.priority || record.priority);
    if (body.resolution !== undefined) updates.resolution = String(body.resolution || "");
    if ((isOwner(session.user) || isManagement(session.user)) && body.assignedToId !== undefined) {
      const assigned = (await adminUsers()).find(user => String(user.id) === String(body.assignedToId));
      updates.assignedToId = assigned?.id || null;
      updates.assignedToName = assigned?.name || null;
      updates.assignedToRole = assigned?.role || null;
    }
    if (["Resolved", "Closed", "Rejected"].includes(String(updates.status || ""))) updates.closedAt = new Date();
    updates.lastActionBy = String(session.user.name || session.user.email || "User");
    updates.lastActionAt = new Date();
    await record.update(updates);
    await logAudit({ userId: String(session.user.id), userName: session.user.name, userRole: session.user.role, action: "SUPPORT_TICKET_UPDATED", entity: "SupportTicket", entityId: record.id, details: String(record.ticketNo || record.id) + " updated" });
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("[tickets PUT]", error);
    return NextResponse.json({ success: false, error: error.message || "Ticket update nahi hua" }, { status: 500 });
  }
}
