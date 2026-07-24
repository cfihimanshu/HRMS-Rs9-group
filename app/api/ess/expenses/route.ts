import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Expense from "@/models/sequelize/Expense";
import User from "@/models/sequelize/User";
import Notification from "@/models/sequelize/Notification";
import { sendEmail } from "@/lib/email";

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://hrms.cfi247.com/";

// GET: Fetch expense claims for current user or all if Owner/Admin/HR
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";

    await sequelize.authenticate();
    await Expense.sync({ alter: true });

    const { isUserAuthorizedApprover } = await import("@/lib/approvalRouting");
    let whereClause: any = {};
    const isApproverRole = await isUserAuthorizedApprover("expense_claims", userId, userRole);
    if (!isApproverRole) {
      whereClause.employee = userId;
    }

    const claims = await Expense.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    const empIds = Array.from(new Set(claims.map((c: any) => c.employee).filter(Boolean)));
    let userMap = new Map();
    if (empIds.length > 0) {
      const users = await User.findAll({
        where: { id: empIds },
        attributes: ["id", "name", "email", "role"],
        raw: true,
      }) as any[];
      userMap = new Map(users.map((u: any) => [u.id, u.name || u.email || "Employee"]));
    }

    const hydratedClaims = claims.map((c: any) => {
      const plain = c.toJSON();
      plain.employeeName = userMap.get(plain.employee) || "Employee";
      return plain;
    });

    return NextResponse.json({ success: true, data: hydratedClaims });
  } catch (error: any) {
    console.error("[/api/ess/expenses GET] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit a new expense claim and send email to Owner
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Employee";

    const body = await request.json();
    const {
      amount,
      category,
      customCategory,
      dateIncurred,
      description,
      vendorName,
      paymentMode,
      receiptUrl,
      advanceAmount,
    } = body;

    if (!amount || !category) {
      return NextResponse.json({ success: false, error: "Missing required fields (Amount, Category)" }, { status: 400 });
    }

    await sequelize.authenticate();
    await Expense.sync({ alter: true });

    const finalCategory = category === "Other" && customCategory ? customCategory : category;
    const numAmount = parseFloat(amount) || 0;
    const numAdvance = parseFloat(advanceAmount) || 0;
    const numNet = Math.max(0, numAmount - numAdvance);

    const nextId = "EXP-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

    const newExpense = await Expense.create({
      id: nextId,
      employee: userId,
      amount: numAmount,
      category: finalCategory,
      dateIncurred: dateIncurred ? new Date(dateIncurred) : new Date(),
      description: description || "",
      vendorName: vendorName || "",
      paymentMode: paymentMode || "Cash",
      receiptUrl: receiptUrl || null,
      advanceAmount: numAdvance,
      netPayable: numNet,
      status: "Pending",
      remarks: `Submitted by ${userName}`,
    });

    // Notify designated Approver users via In-App Notification and Email (Dynamic Routing Matrix)
    try {
      const { getApproversForWorkflow } = await import("@/lib/approvalRouting");
      const routing = await getApproversForWorkflow("expense_claims");

      if (routing.notifyApp && routing.approverUserIds.length > 0) {
        await Notification.sync();
        for (const recipientId of routing.approverUserIds) {
          await Notification.create({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
            recipient: recipientId,
            title: "New Expense Reimbursement Claim",
            message: `${userName} submitted a claim of ₹${numNet.toLocaleString("en-IN")} for "${finalCategory}".`,
            read: false,
          });
        }
      }

      // Send Email to assigned Approver(s) if enabled
      if (routing.notifyEmail && routing.approverEmails.length > 0) {
        const ownerEmails = routing.approverEmails;
        const dateStr = new Date(dateIncurred || Date.now()).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });

        const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#d97706 0%,#b45309 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#fef3c7;color:#92400e;margin-bottom:12px}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0}
  .row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
  .label{color:#64748b;font-weight:600}
  .val{color:#0f172a;font-weight:700}
  .amount{font-size:22px;color:#047857;font-weight:800;margin:12px 0 4px}
  .btn{display:inline-block;background:#d97706;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;margin-top:16px}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>💳 New Expense Reimbursement Claim</h1>
    <p>A new employee reimbursement request requires your approval</p>
  </div>
  <div class="body">
    <span class="badge">Claim ID: ${nextId}</span>
    <p><strong>${userName}</strong> has submitted an expense reimbursement claim for approval.</p>
    
    <div class="box">
      <div class="row"><span class="label">Employee Name:</span><span class="val">${userName}</span></div>
      <div class="row"><span class="label">Expense Category:</span><span class="val">${finalCategory}</span></div>
      <div class="row"><span class="label">Date Incurred:</span><span class="val">${dateStr}</span></div>
      <div class="row"><span class="label">Merchant / Vendor:</span><span class="val">${vendorName || "N/A"}</span></div>
      <div class="row"><span class="label">Payment Mode:</span><span class="val">${paymentMode || "Cash"}</span></div>
      <div class="row"><span class="label">Claim Amount:</span><span class="val">₹${numAmount.toLocaleString("en-IN")}</span></div>
      ${numAdvance > 0 ? `<div class="row"><span class="label">Advance Received:</span><span class="val">₹${numAdvance.toLocaleString("en-IN")}</span></div>` : ""}
      
      <div style="border-t: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px;">
        <span class="label">Net Payable Amount:</span>
        <div class="amount">₹${numNet.toLocaleString("en-IN")}</div>
      </div>
      
      <p style="margin: 12px 0 0; font-size: 12px; color: #475569;"><strong>Business Purpose:</strong> ${description}</p>
    </div>

    <p style="text-align:center">
      <a href="${PORTAL_URL}" class="btn">Review &amp; Approve Claim →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • Automated Expense Notification</div>
</div>
</body>
</html>`;

        await sendEmail({
          to: ownerEmails,
          subject: `💳 Expense Claim Submitted by ${userName} – ₹${numNet.toLocaleString("en-IN")}`,
          html: htmlContent,
        });
      }
    } catch (err) {
      console.error("Failed to send expense email to owner:", err);
    }

    return NextResponse.json({ success: true, data: newExpense });
  } catch (error: any) {
    console.error("[/api/ess/expenses POST] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update status of expense claim (Approve / Reject) and email employee
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    const userName = session.user.name || "Owner";

    const body = await request.json();
    const { id, status, remarks } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing ID or status" }, { status: 400 });
    }

    await sequelize.authenticate();
    await Expense.sync({ alter: true });

    const claim = await Expense.findByPk(id);
    if (!claim) {
      return NextResponse.json({ success: false, error: "Claim record not found" }, { status: 404 });
    }

    const { isUserAuthorizedApprover } = await import("@/lib/approvalRouting");
    const isAuthorized = await isUserAuthorizedApprover("expense_claims", userId, userRole, claim.employee);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: "Forbidden: You are not an authorized approver for expense claims." }, { status: 403 });
    }

    claim.status = status;
    if (remarks !== undefined) claim.remarks = remarks;
    if (status === "Approved" || status === "Reimbursed") {
      claim.approvedBy = userName;
    }

    await claim.save();

    // Fetch employee details to send notification & email
    try {
      await Notification.sync();
      const empUser = await User.findOne({ where: { id: claim.employee }, raw: true }) as any;

      const claimNet = claim.netPayable || claim.amount || 0;
      const isApproved = status === "Approved" || status === "Reimbursed";

      await Notification.create({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        recipient: claim.employee,
        title: `Expense Claim ${status}`,
        message: `Your expense claim (${claim.id}) for ₹${Number(claimNet).toLocaleString("en-IN")} was ${status.toLowerCase()} by ${userName}.`,
        read: false,
      });

      if (empUser && empUser.email) {
        const statusBadgeBg = isApproved ? "#dcfce7" : "#ffe4e6";
        const statusBadgeColor = isApproved ? "#15803d" : "#be123c";
        const icon = isApproved ? "✅" : "❌";

        const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg, ${isApproved ? "#059669 0%, #047857 100%" : "#e11d48 0%, #be123c 100%"});padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .status-badge{display:inline-block;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;background:${statusBadgeBg};color:${statusBadgeColor};margin-bottom:12px}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0}
  .row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
  .label{color:#64748b;font-weight:600}
  .val{color:#0f172a;font-weight:700}
  .btn{display:inline-block;background:${isApproved ? "#059669" : "#e11d48"};color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;margin-top:16px}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>${icon} Expense Claim ${status}</h1>
    <p>Your reimbursement request status has been updated</p>
  </div>
  <div class="body">
    <div class="status-badge">${status}</div>
    <p>Hi <strong>${empUser.name || "Employee"}</strong>,</p>
    <p>Your reimbursement request (<strong>${claim.id}</strong>) has been <strong>${status.toLowerCase()}</strong> by <strong>${userName}</strong>.</p>
    
    <div class="box">
      <div class="row"><span class="label">Claim ID:</span><span class="val">${claim.id}</span></div>
      <div class="row"><span class="label">Category:</span><span class="val">${claim.category}</span></div>
      <div class="row"><span class="label">Net Amount:</span><span class="val">₹${Number(claimNet).toLocaleString("en-IN")}</span></div>
      <div class="row"><span class="label">Status:</span><span class="val" style="color:${statusBadgeColor}">${status}</span></div>
      <div class="row"><span class="label">Processed By:</span><span class="val">${userName}</span></div>
      ${remarks ? `<p style="margin:8px 0 0;font-size:12px;color:#475569"><strong>Remarks:</strong> ${remarks}</p>` : ""}
    </div>

    <p style="text-align:center">
      <a href="${PORTAL_URL}" class="btn">View My Expense Claims →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • Automated Expense Notification</div>
</div>
</body>
</html>`;

        await sendEmail({
          to: empUser.email,
          subject: `${icon} Your Expense Claim (${claim.id}) has been ${status}`,
          html: htmlContent,
        });
      }
    } catch (err) {
      console.error("Failed to send status update email to employee:", err);
    }

    return NextResponse.json({ success: true, data: claim });
  } catch (error: any) {
    console.error("[/api/ess/expenses PUT] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
