import sequelize from "./sequelize";
import AuditLog from "../models/sequelize/AuditLog";
import { notifyOwners } from "./ownerNotification";

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
    notifyAdmins = true,
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

    const cleanTitle = action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
    await notifyOwners({
      title: `🔔 ${cleanTitle}`,
      message: `${details} Entity: ${entity}${entityId ? ` (${entityId})` : ""}.`,
      moduleName: entity,
      actionUrl: "/dashboard",
      eventId: `audit_${audit.id}`,
    });

    return audit;
  } catch (error) {
    // Audit failure must not corrupt or roll back the user's primary operation.
    console.error("Failed to write audit log:", error);
    return null;
  }
}
