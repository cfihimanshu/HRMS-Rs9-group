// Removed @ts-nocheck
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import RiskAlert from "@/models/sequelize/RiskAlert";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// GET: Fetch all active risk alerts (HR & Owner only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();
    const alerts = await RiskAlert.findAll({ 
      where: { status: { [Op.ne]: "inactive" } },
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const userIds = [...new Set(alerts.map((a: any) => a.triggeredBy).filter(Boolean))];
    let userMap: any = {};
    if (userIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, raw: true });
      users.forEach((u: any) => { userMap[u.id] = { name: u.name, email: u.email, role: u.role }; });
    }

    const data = alerts.map((a: any) => ({
      ...a,
      triggeredBy: userMap[a.triggeredBy] || null
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Trigger a new system risk alert (Internal / Screening automation endpoint)
export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    // Ensure column is TEXT to avoid length truncation
    await sequelize.query("ALTER TABLE riskalerts MODIFY COLUMN description TEXT;").catch(() => {});

    const body = await req.json();
    const { source, level, description, triggeredBy } = body;

    if (!source || !level || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const alert = await RiskAlert.create({
      id: Date.now().toString(),
      source,
      level,
      description,
      triggeredBy: triggeredBy || null,
      status: "Open",
    });

    // Notify Owners & Directors via Email & In-App Notification
    try {
      const allActiveUsers = await User.findAll({
        where: { status: "active" },
        attributes: ["id", "name", "email", "role"],
        raw: true,
      });

      const owners = allActiveUsers.filter((u: any) => {
        const role = String(u.role || "").toLowerCase();
        return role.includes("owner") || role.includes("director") || role.includes("hr head");
      });

      const alertRef = `RA-${alert.id.slice(-4).toUpperCase()}`;
      const severityColor = 
        level === "Critical" ? "#E11D48" :
        level === "High" ? "#EA580C" :
        level === "Medium" ? "#D97706" : "#059669";

      // 1. Send In-App Notifications
      const Notification = (await import("@/models/sequelize/Notification")).default;
      for (const owner of owners) {
        await Notification.create({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          recipient: owner.id,
          title: `🚨 [${level.toUpperCase()} RISK ALERT] #${alertRef}`,
          message: `New risk alert logged: ${source}. Check Enterprise Risk Management dashboard.`,
          read: false,
        }).catch(() => {});
      }

      // 2. Send Executive Email Notification to Owners
      const { sendEmail } = await import("@/lib/email");
      const recipientEmails = owners.map((o: any) => o.email).filter(Boolean);

      if (recipientEmails.length > 0) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
              .header { background: linear-gradient(135deg, #714B67, #5F3F56); padding: 24px; color: #ffffff; text-align: left; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: ${severityColor}; color: #ffffff; margin-top: 8px; }
              .content { padding: 24px; color: #1e293b; line-height: 1.6; font-size: 14px; }
              .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
              .info-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
              .info-table td:first-child { font-weight: 700; color: #64748b; width: 35%; }
              .info-table td:last-child { font-weight: 600; color: #0f172a; }
              .desc-box { background: #fff1f2; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 4px 12px 12px 4px; font-size: 13px; color: #334155; margin-top: 16px; white-space: pre-wrap; font-family: monospace; }
              .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800;">🚨 Enterprise Risk Alert Triggered</h2>
                <div class="badge">${level} Severity Risk</div>
              </div>
              <div class="content">
                <p style="margin-top: 0;">Dear Leadership,</p>
                <p>A new enterprise risk / compliance incident has been logged on the <strong>RS9 HRMS</strong> portal and requires your review.</p>
                
                <table class="info-table">
                  <tr>
                    <td>Alert Ticket</td>
                    <td><strong style="color: #714B67; font-family: monospace;">#${alertRef}</strong></td>
                  </tr>
                  <tr>
                    <td>Risk Category</td>
                    <td>${source}</td>
                  </tr>
                  <tr>
                    <td>Threat Level</td>
                    <td><span style="color: ${severityColor}; font-weight: 800;">${level} Risk</span></td>
                  </tr>
                  <tr>
                    <td>Timestamp</td>
                    <td>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  </tr>
                </table>

                <div style="font-weight: 700; color: #0f172a; margin-top: 20px;">Flagged Details &amp; Evidence:</div>
                <div class="desc-box">${description}</div>

                <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
                  Please login to the Executive HRMS Dashboard to review details, assign investigation, or take necessary actions.
                </p>
              </div>
              <div class="footer">
                RS9 Enterprise Risk &amp; Compliance Monitoring Engine • Confidential Automated Notification
              </div>
            </div>
          </body>
          </html>
        `;

        sendEmail({
          to: recipientEmails,
          subject: `🚨 [${level.toUpperCase()} RISK ALERT] #${alertRef} - ${source}`,
          html: emailHtml,
        }).catch((err) => console.error("Risk alert email dispatch failed:", err));
      }
    } catch (notifyErr) {
      console.error("Failed to notify owners for risk alert:", notifyErr);
    }

    return NextResponse.json({ success: true, data: alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Resolve or change status of a risk alert (HR & Owner only)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { alertId, status } = body;

    if (!alertId || !status) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await sequelize.authenticate();

    const alert: any = await RiskAlert.findByPk(alertId);
    if (!alert) {
      return NextResponse.json({ success: false, error: "Risk alert not found" }, { status: 404 });
    }

    alert.status = status;
    await alert.save();

    await logAudit({
      userId: (session.user as any).id,
      action: "RISK_ALERT_RESOLVED",
      entity: "RiskAlert",
      entityId: (alert as any).id ? (alert as any).id.toString() : alert.id,
      details: `System risk alert (source: ${alert.source}, severity: ${alert.level}) marked as ${status}`,
    });

    return NextResponse.json({ success: true, data: alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
