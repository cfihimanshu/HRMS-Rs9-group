import { NextResponse } from "next/server";
import { Op } from "sequelize";
import sequelize, { safeAuthenticate } from "@/lib/sequelize";
import { requireApiSession } from "@/lib/apiAuth";
import DomainRecord from "@/models/sequelize/DomainRecord";
import User from "@/models/sequelize/User";
import Notification from "@/models/sequelize/Notification";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// ─── Background Domain Expiry Reminder Daemon ────────────────────────────────
// Checks for domain/infrastructure records expiring within 30 days every 60s
// Sends daily emails & in-app notifications with remaining days count

let daemonStarted = (global as any).__domainReminderDaemonStarted || false;
const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

if (!daemonStarted && !isServerless) {
  (global as any).__domainReminderDaemonStarted = true;
  console.log("🌐 [Domain Expiry Daemon] Started background reminder interval (every 60s)...");

  setInterval(async () => {
    try {
      await safeAuthenticate(5000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);

      const records = await DomainRecord.findAll({
        where: {
          expiryDate: { [Op.ne]: null }
        }
      });

      const portalUrl = "https://hrms.cfi247.com/";

      for (const record of records) {
        try {
          if (!record.expiryDate || record.expiryDate === "Invalid date") continue;
          
          const expDate = new Date(record.expiryDate);
          if (isNaN(expDate.getTime())) continue;

          expDate.setHours(0, 0, 0, 0);
          const diffTime = expDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Trigger when domain is expiring within 30 days (<= 30 days) and not sent today
          if (daysRemaining <= 30 && record.lastExpiryReminderSent !== todayStr) {
            console.log(`🌐 [Domain Expiry Daemon] Domain ${record.name} expires in ${daysRemaining} days. Sending daily reminder...`);

            const recipients: string[] = [];
            if (record.attachedEmail && record.attachedEmail.includes("@")) {
              recipients.push(record.attachedEmail.trim());
            }

            try {
              const adminUsers = await User.findAll({
                where: {
                  role: { [Op.or]: ["Owner", "Director", "IT Admin", "IT Manager", "HR Head"] }
                },
                attributes: ["id", "email", "name"],
                raw: true
              });

              adminUsers.forEach((u: any) => {
                if (u.email && !recipients.includes(u.email)) {
                  recipients.push(u.email);
                }
              });

              // Create in-app notifications for admins
              for (const admin of adminUsers) {
                if (admin.id) {
                  const notifId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
                  await Notification.create({
                    id: notifId,
                    recipient: String(admin.id),
                    title: `Domain Expiry Alert: ${record.name}`,
                    message: `This domain (${record.name}) is going to be expired in ${daysRemaining} days.`,
                    read: false
                  }).catch(() => {});
                }
              }
            } catch (aErr) {
              console.error("Admin user fetch error in domain daemon:", aErr);
            }

            if (recipients.length > 0) {
              const daysLabel = daysRemaining < 0 
                ? `EXPIRED ${Math.abs(daysRemaining)} days ago`
                : daysRemaining === 0 
                  ? "0 days (EXPIRES TODAY)" 
                  : `${daysRemaining} days`;

              const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#e11d48 0%,#4f46e5 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#ffe4e6;color:#be123c;margin-bottom:12px}
  .box{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0}
  .box h2{margin:0 0 6px;font-size:18px;font-weight:700;color:#0f172a}
  .box p{margin:4px 0;font-size:13px;color:#475569}
  .due{background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;font-size:14px;font-weight:700;color:#92400e}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🌐 Domain Expiry Alert</h1>
    <p>Infrastructure Expiry Daily Notice</p>
  </div>
  <div class="body">
    <div class="badge">${record.recordType || "Domain Record"}</div>
    <div class="box">
      <h2>${record.name}</h2>
      ${record.platform ? `<p><strong>Platform / Registrar:</strong> ${record.platform}</p>` : ""}
      ${record.attachedEmail ? `<p><strong>Attached Email:</strong> ${record.attachedEmail}</p>` : ""}
      ${record.expiryDate ? `<p><strong>Expiry Date:</strong> ${record.expiryDate}</p>` : ""}
    </div>
    <div class="due">
      ⏰ Notice: This domain (${record.name}) is going to be expired in ${daysLabel}.
    </div>
    <p>Please renew the domain or update the renewal status in the portal to prevent service interruption.</p>
    <p style="text-align:center;margin-top:20px">
      <a href="${portalUrl}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Infrastructure Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • Domain & Infrastructure Registry</div>
</div>
</body></html>`;

              await sendEmail({
                to: recipients,
                subject: `🌐 Domain Expiry Warning: This domain (${record.name}) is going to be expired in ${daysRemaining} days.`,
                html
              });
            }

            record.lastExpiryReminderSent = todayStr;
            await record.save();
          }
        } catch (itemErr) {
          console.error("Error in domain expiry daemon for item:", record.id, itemErr);
        }
      }
    } catch (daemonErr: any) {
      if (daemonErr?.name === "SequelizeConnectionAcquireTimeoutError" || daemonErr?.message?.includes("timeout")) {
        return;
      }
      console.error("🌐 [Domain Expiry Daemon] Error:", daemonErr);
    }
  }, 60000);
}

async function ensureDomainRecordTable() {
  try {
    await safeAuthenticate(5000);
    await DomainRecord.sync({ alter: true });
  } catch (err: any) {
    console.warn("[/api/domain-records] DomainRecord.sync warning, falling back to basic sync():", err?.message);
    try {
      await DomainRecord.sync();
    } catch (sErr: any) {
      console.error("[/api/domain-records] DomainRecord sync failed:", sErr?.message);
    }
  }
}

function cleanDate(val: any): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === "Invalid date" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return trimmed;
  }
  const dateObj = new Date(trimmed);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}

function cleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || isNaN(Number(trimmed))) return null;
    return parseFloat(trimmed);
  }
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  return null;
}

function cleanString(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") val = String(val);
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    await ensureDomainRecordTable();

    // Optional query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const type = searchParams.get("type")?.trim();
    const status = searchParams.get("status")?.trim();

    const where: any = {};
    if (type && type !== "all") {
      where.recordType = type;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { platform: { [Op.like]: `%${search}%` } },
        { attachedEmail: { [Op.like]: `%${search}%` } },
        { userId: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { remarks: { [Op.like]: `%${search}%` } }
      ];
    }

    let records: any[] = [];
    try {
      records = await DomainRecord.findAll({
        where,
        order: [["createdAt", "DESC"]]
      });
    } catch (dbErr: any) {
      console.warn("[/api/domain-records GET] Table/Column query issue detected, attempting sync & retry...", dbErr?.message);
      await DomainRecord.sync({ alter: true });
      records = await DomainRecord.findAll({
        where,
        order: [["createdAt", "DESC"]]
      });
    }

    return NextResponse.json({
      success: true,
      records: records || []
    });
  } catch (error: any) {
    console.error("[/api/domain-records GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch domain records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    await ensureDomainRecordTable();

    const body = await request.json();
    const {
      recordType,
      name,
      platform,
      status,
      purchaseDate,
      expiryDate,
      renewalDate,
      attachedEmail,
      userId,
      password,
      authCode,
      phoneNumber,
      cost,
      url,
      remarks,
      customFields
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Record Name/Domain Name is required" }, { status: 400 });
    }

    const validRecordType = recordType || "Domain Record";

    // Auto-generate ID prefix based on category
    let prefix = "DOM";
    if (validRecordType === "Cloud Platform") prefix = "CLD";
    else if (validRecordType === "Gmail") prefix = "GML";
    else if (validRecordType === "GitHub Repo") prefix = "GIT";

    let count = 0;
    try {
      count = await DomainRecord.count({ where: { recordType: validRecordType } });
    } catch (_) {
      await DomainRecord.sync({ alter: true });
      count = await DomainRecord.count({ where: { recordType: validRecordType } });
    }

    const id = `${prefix}-${String(1001 + count).padStart(4, "0")}`;

    const recordData = {
      id,
      recordType: validRecordType,
      name: name.trim(),
      platform: cleanString(platform),
      status: status || "In Use",
      purchaseDate: cleanDate(purchaseDate),
      expiryDate: cleanDate(expiryDate),
      renewalDate: cleanDate(renewalDate),
      attachedEmail: cleanString(attachedEmail),
      userId: cleanString(userId),
      password: cleanString(password),
      authCode: cleanString(authCode),
      phoneNumber: cleanString(phoneNumber),
      cost: cleanNumber(cost),
      url: cleanString(url),
      remarks: cleanString(remarks),
      customFields: customFields ? (typeof customFields === "object" ? JSON.stringify(customFields) : customFields) : null,
      createdById: String((auth.session as any)?.user?.id || (auth.session as any)?.user?.email || "SYSTEM"),
      createdByName: String((auth.session as any)?.user?.name || (auth.session as any)?.user?.email || "Admin User")
    };

    let created;
    try {
      created = await DomainRecord.create(recordData);
    } catch (cErr: any) {
      console.warn("[/api/domain-records POST] Create failed, attempting sync & retry...", cErr?.message);
      await DomainRecord.sync({ alter: true });
      created = await DomainRecord.create(recordData);
    }

    return NextResponse.json({
      success: true,
      record: created,
      message: `${validRecordType} registered successfully`
    });
  } catch (error: any) {
    console.error("[/api/domain-records POST]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create domain record" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    await ensureDomainRecordTable();

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required for update" }, { status: 400 });
    }

    let record;
    try {
      record = await DomainRecord.findByPk(id);
    } catch (_) {
      await DomainRecord.sync({ alter: true });
      record = await DomainRecord.findByPk(id);
    }

    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    const updateFields: any = {};
    if ("recordType" in body) updateFields.recordType = body.recordType || "Domain Record";
    if ("name" in body) updateFields.name = (body.name || "").trim();
    if ("platform" in body) updateFields.platform = cleanString(body.platform);
    if ("status" in body) updateFields.status = body.status || "In Use";
    if ("purchaseDate" in body) updateFields.purchaseDate = cleanDate(body.purchaseDate);
    if ("expiryDate" in body) updateFields.expiryDate = cleanDate(body.expiryDate);
    if ("renewalDate" in body) updateFields.renewalDate = cleanDate(body.renewalDate);
    if ("attachedEmail" in body) updateFields.attachedEmail = cleanString(body.attachedEmail);
    if ("userId" in body) updateFields.userId = cleanString(body.userId);
    if ("password" in body) updateFields.password = cleanString(body.password);
    if ("authCode" in body) updateFields.authCode = cleanString(body.authCode);
    if ("phoneNumber" in body) updateFields.phoneNumber = cleanString(body.phoneNumber);
    if ("cost" in body) updateFields.cost = cleanNumber(body.cost);
    if ("url" in body) updateFields.url = cleanString(body.url);
    if ("remarks" in body) updateFields.remarks = cleanString(body.remarks);
    if ("customFields" in body) {
      updateFields.customFields = typeof body.customFields === "object" ? JSON.stringify(body.customFields) : body.customFields;
    }

    await record.update(updateFields);

    return NextResponse.json({
      success: true,
      record,
      message: "Record updated successfully"
    });
  } catch (error: any) {
    console.error("[/api/domain-records PUT]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    await ensureDomainRecordTable();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required" }, { status: 400 });
    }

    let record;
    try {
      record = await DomainRecord.findByPk(id);
    } catch (_) {
      await DomainRecord.sync({ alter: true });
      record = await DomainRecord.findByPk(id);
    }

    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    await record.destroy();

    return NextResponse.json({
      success: true,
      message: "Record deleted successfully"
    });
  } catch (error: any) {
    console.error("[/api/domain-records DELETE]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete record" }, { status: 500 });
  }
}
