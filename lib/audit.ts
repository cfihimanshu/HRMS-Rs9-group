import dbConnect from "./db";
import AuditLog from "@/models/AuditLog";

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
    await dbConnect();
    const audit = new AuditLog({
      user: userId || null,
      action,
      entity,
      entityId,
      details,
      ipAddress,
    });
    await audit.save();
    console.log(`[AUDIT LOG] ${action} on ${entity} (${entityId || "N/A"})`);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
