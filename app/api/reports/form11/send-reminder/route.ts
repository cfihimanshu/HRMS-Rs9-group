import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import FranchiseRegistration, { ensureFranchiseRegistrationSchema } from "@/models/sequelize/FranchiseRegistration";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

function parseDateString(str?: string) {
  if (!str) return null;
  const cleaned = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [y, m, d] = cleaned.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(cleaned)) {
    const parts = cleaned.split(/[\/-]/).map(Number);
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function calculateDaysLeft(endDateStr?: string) {
  const end = parseDateString(endDateStr);
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function generateRenewalEmailHtml(partnerName: string, territory: string, endDate: string, daysLeft: number | null) {
  const isExpired = daysLeft !== null && daysLeft < 0;
  const statusLabel = isExpired ? `Expired (${Math.abs(daysLeft!)} days ago)` : `${daysLeft} days remaining`;
  const bannerColor = isExpired ? "#e11d48" : "#d97706";
  const statusBadge = isExpired ? "CONTRACT EXPIRED" : "RENEWAL URGENT";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #714B67; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .content { padding: 28px; }
        .alert-box { background: ${isExpired ? '#fff1f2' : '#fffbeb'}; border-left: 4px solid ${bannerColor}; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
        .alert-title { font-weight: 800; color: ${bannerColor}; font-size: 14px; text-transform: uppercase; margin-bottom: 4px; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .details-table td.label { font-weight: 700; color: #64748b; width: 40%; text-transform: uppercase; font-size: 11px; }
        .details-table td.value { font-weight: 700; color: #0f172a; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; color: #ffffff; background: ${bannerColor}; }
        .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RS9 GROUP — FRANCHISE AGREEMENT RENEWAL</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <div class="alert-title">⚠️ ${statusBadge}: ${statusLabel}</div>
            <div style="font-size: 13px; color: #334155;">
              Dear <strong>${partnerName}</strong>, your official Franchise & Territory Agreement is ${isExpired ? 'currently EXPIRED' : `expiring in ${daysLeft} days`}.
            </div>
          </div>

          <p style="font-size: 14px; margin-bottom: 16px;">
            This is an official notice regarding the renewal of your territory agreement with <strong>RS9 Group</strong>. To avoid disruption to your territory operations and rights, please complete the renewal process immediately.
          </p>

          <table class="details-table">
            <tr>
              <td class="label">Partner / Firm Name</td>
              <td class="value">${partnerName}</td>
            </tr>
            <tr>
              <td class="label">Allotted Territory</td>
              <td class="value">${territory || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Agreement End Date</td>
              <td class="value">${endDate || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Current Status</td>
              <td class="value"><span class="badge">${statusLabel}</span></td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #475569;">
            Please contact your RS9 Operations Manager or submit updated agreement documentation to finalize your renewal.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} RS9 Group HRMS & Operations Portal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

// POST: Send On-Demand Renewal Email to Partner/Owner
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { franchiseId, email: directEmail, partnerName: directPartnerName, territory: directTerritory, agreementEndDate: directEndDate } = body;

    let targetEmail = directEmail;
    let partnerName = directPartnerName || "Franchise Partner";
    let territory = directTerritory || "N/A";
    let endDate = directEndDate || "N/A";

    if (franchiseId) {
      await sequelize.authenticate();
      const record = await FranchiseRegistration.findByPk(franchiseId);
      if (record) {
        targetEmail = record.get("email") || targetEmail;
        partnerName = record.get("partnerName") || partnerName;
        territory = record.get("territory") || territory;
        endDate = record.get("agreementEndDate") || endDate;
      }
    }

    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json({ success: false, error: "No valid email address found for this partner" }, { status: 400 });
    }

    const daysLeft = calculateDaysLeft(endDate);
    const isExpired = daysLeft !== null && daysLeft < 0;

    const subject = isExpired
      ? `🚨 [EXPIRED] Franchise Agreement Renewal Reminder — ${partnerName}`
      : `⏳ [Action Required] Franchise Agreement Renewal Reminder (${daysLeft !== null ? daysLeft + ' days left' : 'Expiring Soon'}) — ${partnerName}`;

    const html = generateRenewalEmailHtml(partnerName, territory, endDate, daysLeft);

    const emailResult = await sendEmail({
      to: targetEmail,
      subject,
      html,
    });

    if (!emailResult.success) {
      return NextResponse.json({ success: false, error: (emailResult as any).error || "Failed to send email" }, { status: 500 });
    }

    await logAudit({
      userId: (session.user as any).id,
      action: "SEND_FRANCHISE_RENEWAL_EMAIL",
      entity: "FranchiseRegistration",
      entityId: franchiseId || "N/A",
      details: `Sent contract renewal reminder email to ${targetEmail} for partner ${partnerName} (Days Left: ${daysLeft})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Renewal reminder email successfully sent to ${targetEmail}`,
      emailSentTo: targetEmail,
      daysLeft,
    });
  } catch (error: any) {
    console.error("Error sending renewal reminder email:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Automated Daily Email Trigger for all agreements expiring in <= 30 days
export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    await FranchiseRegistration.sync();
    await ensureFranchiseRegistrationSchema();

    const records = await FranchiseRegistration.findAll({
      where: { status: "Active" }
    });

    const expiringRecords: any[] = [];
    const results: any[] = [];

    for (const record of records) {
      const data = record.toJSON() as any;
      const daysLeft = calculateDaysLeft(data.agreementEndDate);

      // Trigger reminder if <= 30 days left or expired
      if (daysLeft !== null && daysLeft <= 30 && data.email && data.email.includes("@")) {
        expiringRecords.push({ ...data, daysLeft });

        const isExpired = daysLeft < 0;
        const subject = isExpired
          ? `🚨 [DAILY REMINDER] Franchise Agreement EXPIRED — ${data.partnerName}`
          : `⏳ [DAILY REMINDER] Franchise Agreement Expiring in ${daysLeft} Days — ${data.partnerName}`;

        const html = generateRenewalEmailHtml(data.partnerName, data.territory, data.agreementEndDate, daysLeft);

        const emailResult = await sendEmail({
          to: data.email,
          subject,
          html
        });

        results.push({
          id: data.id,
          partnerName: data.partnerName,
          email: data.email,
          daysLeft,
          sent: emailResult.success
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalExpiring: expiringRecords.length,
      sentCount: results.filter(r => r.sent).length,
      details: results
    });
  } catch (error: any) {
    console.error("Error in automated daily renewal email trigger:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
