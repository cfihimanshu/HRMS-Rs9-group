import sequelize from "./sequelize";
import AuditLog from "../models/sequelize/AuditLog";

interface AuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
}

export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
}: AuditParams) {
  try {
    await sequelize.authenticate();
    await AuditLog.sync({ alter: true });
    const audit = new AuditLog({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      user: userId || null,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      timestamp: new Date(),
    });
    await audit.save();
    console.log(`[AUDIT LOG] ${action} on ${entity} (${entityId || "N/A"})`);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
