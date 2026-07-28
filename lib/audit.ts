import sequelize from "./sequelize";
import AuditLog from "../models/sequelize/AuditLog";
import Notification from "../models/sequelize/Notification";
import User from "../models/sequelize/User";
import { sendEmail } from "./email";
import { Op } from "sequelize";

type AuditValue = Record<string, unknown> | null | undefined;

export interface AuditParams {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  before?: AuditValue;
  after?: AuditValue;
  notifyAdmins?: boolean;
}

export interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

const SENSITIVE_FIELD_PATTERN =
  /password|secret|token|otp|authorization|cookie|aadhaar|panNumber|accountNumber|ifsc|puk|routerAdminPass/i;

function plainObject(value: AuditValue): Record<string, unknown> {
  if (!value) return {};
  if (typeof (value as any).toJSON === "function") {
    return (value as any).toJSON();
  }
  return { ...value };
}

export function sanitizeAuditSnapshot(value: AuditValue): Record<string, unknown> {
  const source = plainObject(value);
  const output: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(source)) {
    if (["createdAt", "updatedAt"].includes(key)) continue;
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      output[key] = "[REDACTED]";
    } else if (item instanceof Date) {
      output[key] = item.toISOString();
    } else {
      output[key] = item;
    }
  }

  return output;
}

export function buildAuditChanges(
  before?: AuditValue,
  after?: AuditValue
): AuditChange[] {
  const oldValue = sanitizeAuditSnapshot(before);
  const newValue = sanitizeAuditSnapshot(after);
  const fields = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

  return Array.from(fields)
    .filter((field) => JSON.stringify(oldValue[field]) !== JSON.stringify(newValue[field]))
    .map((field) => ({
      field,
      before: oldValue[field] ?? null,
      after: newValue[field] ?? null,
    }));
}

export function getRequestIp(req?: Request): string | undefined {
  if (!req) return undefined;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

/**
 * Stores a permanent, structured audit event inside the existing `details` TEXT
 * column. This keeps the upgrade backward compatible and avoids changing a live
 * database schema at request time.
 */
export async function logAudit(params: AuditParams) {
  const {
    userId,
    userName,
    userRole,
    action,
    entity,
    entityId,
    details,
    ipAddress,
    before,
    after,
    notifyAdmins = false,
  } = params;

  try {
    await sequelize.authenticate();

    const changes = buildAuditChanges(before, after);
    const structuredDetails = JSON.stringify({
      version: 2,
      summary: details,
      actor: {
        id: userId || null,
        name: userName || null,
        role: userRole || null,
      },
      changes,
    });

    const audit = await AuditLog.create({
      id: `${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
      user: userId || null,
      action,
      entity,
      entityId,
      details: structuredDetails,
      ipAddress,
      timestamp: new Date(),
    });

    if (!notifyAdmins) return audit;

    const admins = await User.findAll({
      where: { role: { [Op.in]: ["Owner", "Director", "HR Head"] } },
      attributes: ["id", "email"],
    });
    if (admins.length === 0) return audit;

    const cleanTitle = action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());

    await Notification.bulkCreate(
      admins.map((admin: any) => ({
        id: `${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
        recipient: admin.id,
        title: `🔔 ${cleanTitle}`,
        message: details,
        read: false,
      }))
    );

    const adminEmails = admins.map((admin: any) => admin.email).filter(Boolean);
    if (adminEmails.length > 0) {
      sendEmail({
        to: adminEmails,
        subject: `RS9 HRMS Alert - ${action}`,
        html: `<p><strong>${cleanTitle}</strong></p><p>${details}</p><p>Entity: ${entity} (${entityId || "N/A"})</p>`,
      }).catch((error) => console.error("Async audit email failed:", error));
    }

    return audit;
  } catch (error) {
    // Audit failure must not corrupt or roll back the user's primary operation.
    console.error("Failed to write audit log:", error);
    return null;
  }
}
