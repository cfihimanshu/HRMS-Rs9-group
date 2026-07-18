import sequelize from "./sequelize";
import AuditLog from "../models/sequelize/AuditLog";
import Notification from "../models/sequelize/Notification";
import User from "../models/sequelize/User";
import { sendEmail } from "./email";
import { Op } from "sequelize";

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
    await Notification.sync({ alter: true });
    
    // 1. Save Audit Log (Fully Automated Tracking)
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

    // 2. Fetch Administrators to notify
    const admins = await User.findAll({
      where: {
        role: {
          [Op.in]: ["Owner", "Director", "HR Head"]
        }
      },
      attributes: ["id", "email"]
    });

    if (admins.length > 0) {
      const adminIds = admins.map((a: any) => a.id);
      const adminEmails = admins.map((a: any) => a.email).filter(Boolean);

      const cleanTitle = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const title = `🔔 ${cleanTitle}`;
      const message = `${details}`;

      // 3. Create In-App Notifications
      const notifications = adminIds.map(adminId => ({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        recipient: adminId,
        title,
        message,
        read: false,
      }));
      await Notification.bulkCreate(notifications);

      // 4. Send Email Notification
      if (adminEmails.length > 0) {
        // Send asynchronously to avoid blocking the API response
        sendEmail({
          to: adminEmails,
          subject: `RS9 HRMS Alert - ${action}`,
          html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .field-table{width:100%;border-collapse:collapse;margin:16px 0}
  .field-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .field-table td.label{font-weight:700;color:#64748b;width:130px}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🚨 RS9 HRMS Security Alert</h1>
    <p>Automated action log tracking alert</p>
  </div>
  <div class="body">
    <table class="field-table">
      <tr><td class="label">Action</td><td style="font-weight:700;color:#ef4444">${action}</td></tr>
      <tr><td class="label">Details</td><td>${details}</td></tr>
      <tr><td class="label">Entity Affected</td><td>${entity} (ID: ${entityId || "N/A"})</td></tr>
      <tr><td class="label">Triggered By</td><td><strong>${userId || "System"}</strong></td></tr>
      <tr><td class="label">Timestamp</td><td>${new Date().toLocaleString()}</td></tr>
    </table>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated log tracker</div>
</div>
</body></html>`
        }).catch(err => console.error("Async email failed:", err));
      }
    }
  } catch (error) {
    console.error("Failed to write audit log and notifications:", error);
  }
}
