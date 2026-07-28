import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AuditLog from "@/models/sequelize/AuditLog";
import User from "@/models/sequelize/User";
import { Op, WhereOptions } from "sequelize";

export const dynamic = "force-dynamic";

const AUDIT_ROLES = ["Owner", "Director", "HR Head"];

function parseDetails(value: unknown) {
  if (typeof value !== "string") {
    return { summary: value || "", changes: [], actor: null };
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed?.version === 2) {
      return {
        summary: parsed.summary || "",
        changes: Array.isArray(parsed.changes) ? parsed.changes : [],
        actor: parsed.actor || null,
      };
    }
  } catch {
    // Older audit entries contain plain text and remain readable.
  }
  return { summary: value, changes: [], actor: null };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || !AUDIT_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId")?.trim();
    const search = searchParams.get("search")?.trim();
    const action = searchParams.get("action")?.trim();
    const entity = searchParams.get("entity")?.trim();
    const userId = searchParams.get("userId")?.trim();
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    await sequelize.authenticate();

    const where: WhereOptions = {};
    if (action) (where as any).action = action;
    if (entity) (where as any).entity = entity;
    if (userId) (where as any).user = userId;
    if (search) {
      (where as any)[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { entity: { [Op.like]: `%${search}%` } },
        { entityId: { [Op.like]: `%${search}%` } },
        { details: { [Op.like]: `%${search}%` } },
      ];
    }

    if (from || to) {
      const dateRange: Record<symbol, Date> = {};
      if (from) dateRange[Op.gte] = new Date(`${from}T00:00:00`);
      if (to) dateRange[Op.lte] = new Date(`${to}T23:59:59.999`);
      (where as any).createdAt = dateRange;
    }

    if (companyId) {
      const companyUsers = await User.findAll({
        where: { companies: { [Op.like]: `%${companyId}%` } },
        attributes: ["id"],
        raw: true,
      });
      const companyUserIds = companyUsers.map((user: any) => user.id);
      (where as any).user = userId
        ? userId
        : { [Op.in]: companyUserIds.length ? companyUserIds : ["__none__"] };
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      raw: true,
    });

    const userIds = Array.from(new Set(rows.map((log: any) => log.user).filter(Boolean)));
    const users = userIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ["id", "name", "role", "email"],
          raw: true,
        })
      : [];
    const userMap = new Map(users.map((user: any) => [String(user.id), user]));

    const data = rows.map((log: any) => {
      const parsed = parseDetails(log.details);
      const databaseUser = userMap.get(String(log.user));
      return {
        ...log,
        details: parsed.summary,
        changes: parsed.changes,
        timestamp: log.createdAt || log.timestamp,
        user:
          databaseUser ||
          parsed.actor || {
            id: log.user || null,
            name: log.user ? "Unknown User" : "System",
            role: "System",
          },
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/audit]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load audit history" },
      { status: 500 }
    );
  }
}
