import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Leave from "@/models/sequelize/Leave";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";
import { sendEmail } from "@/lib/email";
import Notification from "@/models/sequelize/Notification";
import { sendRequestNotification } from "@/lib/notificationHelper";

// ─── Leave Approval Notification Helpers ─────────────────────────────────────

function getUserCompanies(user: any): string[] {
  if (!user || !user.companies) return [];
  let comps = user.companies;
  while (typeof comps === "string") {
    try {
      const parsed = JSON.parse(comps);
      if (parsed === comps) {
        comps = [parsed];
        break;
      }
      comps = parsed;
    } catch {
      if (comps.startsWith("[") && comps.endsWith("]")) {
        comps = [comps];
      } else {
        return comps.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      break;
    }
  }
  if (Array.isArray(comps)) return comps.map(String);
  if (comps) return [String(comps)];
  return [];
}

async function findDepartmentManagers(applicantId: string, department: string) {
  const applicantUser = await User.findByPk(applicantId);
  if (!applicantUser) return [];
  const applicantCompanies = getUserCompanies(applicantUser);

  const managers = await User.findAll({
    where: { role: "Department Manager", status: "active" }
  });

  const matched: any[] = [];
  for (const m of managers) {
    const mComps = getUserCompanies(m);
    const sharesCompany = mComps.some(c => applicantCompanies.includes(c));
    if (!sharesCompany) continue;

    const mProfile = await EmployeeProfile.findOne({ where: { user: m.id } });
    if (mProfile && mProfile.department === department) {
      matched.push(m);
    }
  }
  return matched;
}

async function findHRUsers(applicantId: string) {
  const applicantUser = await User.findByPk(applicantId);
  if (!applicantUser) return [];
  const applicantCompanies = getUserCompanies(applicantUser);

  const hrUsers = await User.findAll({
    where: {
      role: { [Op.in]: ["HR Head", "HR Executive", "Owner", "Director"] },
      status: "active"
    }
  });

  const matched: any[] = [];
  for (const hr of hrUsers) {
    if (hr.id === applicantId) continue;
    const hrComps = getUserCompanies(hr);
    const sharesCompany = hrComps.some(c => applicantCompanies.includes(c));
    if (sharesCompany) {
      matched.push(hr);
    }
  }
  return matched;
}

function getLeaveAppliedEmailHtml(params: {
  applicantName: string;
  applicantRole: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  pendingStatus: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.9}
  .body{padding:28px 24px}
  .field-table{width:100%;border-collapse:collapse;margin:16px 0}
  .field-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .field-table td.label{font-weight:700;color:#64748b;width:130px}
  .reason-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;color:#475569;line-height:1.6}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🌴 New Leave Application</h1>
    <p>Approval is required for this request</p>
  </div>
  <div class="body">
    <p>Hello,</p>
    <p>A new leave application has been submitted and is pending your review:</p>
    <table class="field-table">
      <tr><td class="label">Applicant</td><td><strong>${params.applicantName}</strong> (${params.applicantRole})</td></tr>
      <tr><td class="label">Leave Type</td><td><span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.leaveType}</span></td></tr>
      <tr><td class="label">Duration</td><td>${params.startDate} to ${params.endDate} (${params.days} days)</td></tr>
      <tr><td class="label">Status</td><td><span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.pendingStatus}</span></td></tr>
    </table>
    <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:16px">Reason for Leave:</div>
    <div class="reason-box">"${params.reason}"</div>
    <p style="text-align:center;margin-top:24px">
      <a href="https://hrms.cfi247.com/" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">Review Application →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated notification</div>
</div>
</body></html>`;
}

function getLeaveStatusEmailHtml(params: {
  applicantName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  isApproved: boolean;
  processedByName: string;
  remarks?: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header-approved{background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:28px 24px;color:#fff;text-align:center}
  .header-rejected{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:28px 24px;color:#fff;text-align:center}
  .header h1{margin:0;font-size:20px;font-weight:700}
  .body{padding:28px 24px}
  .field-table{width:100%;border-collapse:collapse;margin:16px 0}
  .field-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .field-table td.label{font-weight:700;color:#64748b;width:130px}
  .remarks-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;color:#475569;line-height:1.6}
  .footer{background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="wrap">
  <div class="header ${params.isApproved ? 'header-approved' : 'header-rejected'}">
    <h1>${params.isApproved ? '🎉 Leave Approved' : '❌ Leave Rejected'}</h1>
  </div>
  <div class="body">
    <p>Hello <strong>${params.applicantName}</strong>,</p>
    <p>Your leave request has been processed:</p>
    <table class="field-table">
      <tr><td class="label">Leave Type</td><td><span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.leaveType}</span></td></tr>
      <tr><td class="label">Duration</td><td>${params.startDate} to ${params.endDate} (${params.days} days)</td></tr>
      <tr><td class="label">Status</td><td>
        <span style="background:${params.isApproved ? '#d1fae5;color:#065f46' : '#fee2e2;color:#991b1b'};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.status}</span>
      </td></tr>
      <tr><td class="label">Processed By</td><td>${params.processedByName}</td></tr>
    </table>
    ${params.remarks ? `
      <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:16px">Remarks / Comments:</div>
      <div class="remarks-box">"${params.remarks}"</div>
    ` : ''}
    <p style="text-align:center;margin-top:24px">
      <a href="https://hrms.cfi247.com/" style="background:${params.isApproved ? '#059669' : '#dc2626'};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">Open Portal →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated notification</div>
</div>
</body></html>`;
}


// POST: Apply for a new leave
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const { type, startDate, endDate, days, reason } = await req.json();

    if (!type || !startDate || !endDate || !days || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const applicantId = (session.user as any).id;
    const applicantRole = (session.user as any).role;

    // Validate leave balances (if EmployeeProfile exists)
    const profile = await EmployeeProfile.findOne({ where: { user: applicantId } });
    if (profile) {
      const casualVal = (profile.get("leaveBalances.casualLeave") as number) || 0;
      const sickVal = (profile.get("leaveBalances.sickLeave") as number) || 0;
      const earnedVal = (profile.get("leaveBalances.earnedLeave") as number) || 0;

      const balance = type === "Casual Leave" ? casualVal :
        type === "Sick Leave" ? sickVal :
          type === "Earned Leave" ? earnedVal : 999;

      // Allow all leaves without balance check
      /*
      if (type !== "Unpaid Leave" && balance < days) {
        return NextResponse.json({ success: false, error: `Insufficient ${type} balance. (Available: ${balance})` }, { status: 400 });
      }
      */
    }

    // Determine initial approval status based on roles and reporting structure
    let initialStatus = "Pending Manager Approval";
    let companyManagers: any[] = [];

    if (["Owner", "Director", "HR Head", "HR Executive"].includes(applicantRole)) {
      // Management/HR leaves bypass Manager approval and go directly to Pending HR Approval
      initialStatus = "Pending HR Approval";
    } else if (profile && profile.department) {
      // 1. Find if there is any active "Department Manager" in the applicant's department
      const departmentManagers = await User.findAll({
        where: { role: "Department Manager", status: "active" },
        attributes: ["id"]
      });
      const managerUserIds = departmentManagers.map((m: any) => m.id);

      let activeDeptManagerProfile = null;
      if (managerUserIds.length > 0) {
        activeDeptManagerProfile = await EmployeeProfile.findOne({
          where: {
            department: profile.department,
            user: { [Op.in]: managerUserIds }
          }
        });
      }

      if (activeDeptManagerProfile) {
        initialStatus = "Pending Manager Approval";
      } else {
        // 2. Department Manager does not exist. Check if any Company Manager/Owner/Director exists for this company
        const applicantUser = await User.findByPk(applicantId);
        let companyId = null;
        if (applicantUser && applicantUser.companies) {
          try {
            const parsed = typeof applicantUser.companies === 'string' ? JSON.parse(applicantUser.companies) : applicantUser.companies;
            if (Array.isArray(parsed) && parsed.length > 0) {
              companyId = parsed[0];
            }
          } catch (e) {}
        }

        if (companyId) {
          // Find any active user in same company with Owner/Director or role containing Manager
          const allUsers = await User.findAll({ where: { status: "active" }, raw: true });
          companyManagers = allUsers.filter((u: any) => {
            let comps = [];
            try {
              comps = typeof u.companies === 'string' ? JSON.parse(u.companies) : u.companies;
            } catch (e) {}
            if (!Array.isArray(comps)) comps = [];

            const hasCompany = comps.some((cid: any) => cid.toString() === companyId.toString());
            const isManager = ["Owner", "Director", "Department Manager"].includes(u.role) || (u.role || "").toLowerCase().includes("manager");
            return hasCompany && isManager && u.id !== applicantId;
          });

          if (companyManagers.length > 0) {
            initialStatus = "Pending Manager Approval";
          } else {
            initialStatus = "Pending HR Approval";
          }
        } else {
          initialStatus = "Pending HR Approval";
        }
      }
    } else {
      initialStatus = "Pending HR Approval";
    }

    const leave = await Leave.create({
      id: Date.now().toString(),
      employee: applicantId,
      type,
      startDate,
      endDate,
      days,
      reason,
      status: initialStatus,
      managerStatus: initialStatus === "Pending Manager Approval" ? "Pending" : "Approved",
      hrStatus: "Pending",
    });

    // In-app notifications
    try {
      const applicantUser = await User.findByPk(applicantId);
      await sendRequestNotification({
        applicantId,
        requestType: "Leave",
        action: "created",
        details: `${applicantUser?.name || "An employee"} has applied for a ${days}-day ${type} leave (Status: ${initialStatus}).`
      });
    } catch (notifErr) {
      console.error("Error creating leave notifications:", notifErr);
    }

    // ── Email Notification dispatch for new leave application
    try {
      const applicantUser = await User.findByPk(applicantId);
      if (applicantUser) {
        const formattedStart = new Date(startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const formattedEnd = new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

        const emailHtml = getLeaveAppliedEmailHtml({
          applicantName: applicantUser.name || "Employee",
          applicantRole: applicantRole || "Employee",
          leaveType: type,
          startDate: formattedStart,
          endDate: formattedEnd,
          days,
          reason,
          pendingStatus: initialStatus,
        });

        const targetEmails: string[] = [];

        // Try to fetch applicant's reporting manager email from EmployeeProfile
        if (profile?.reportingManager) {
          const repManager = await User.findOne({
            where: { name: profile.reportingManager, status: "active" },
            attributes: ["email"]
          });
          if (repManager?.email) {
            targetEmails.push(repManager.email);
          }
        }

        if (initialStatus === "Pending Manager Approval" && profile?.department) {
          const deptManagers = await findDepartmentManagers(applicantId, profile.department);
          deptManagers.forEach((m: any) => {
            if (m.email && !targetEmails.includes(m.email)) {
              targetEmails.push(m.email);
            }
          });
          
          if (targetEmails.length > 0) {
            await sendEmail({
              to: targetEmails,
              subject: `🌴 Leave Approval Required: ${applicantUser.name} – ${type}`,
              html: emailHtml,
            });
          }
        } else if (initialStatus === "Pending HR Approval") {
          const hrUsers = await findHRUsers(applicantId);
          hrUsers.forEach((h: any) => {
            if (h.email && !targetEmails.includes(h.email)) {
              targetEmails.push(h.email);
            }
          });
          
          if (targetEmails.length > 0) {
            await sendEmail({
              to: targetEmails,
              subject: `🌴 Leave Approval Required (HR): ${applicantUser.name} – ${type}`,
              html: emailHtml,
            });
          }
        } else {
          // Fallback if initialStatus is different but reporting manager or target exists
          if (targetEmails.length > 0) {
            await sendEmail({
              to: targetEmails,
              subject: `🌴 Leave Request Submitted: ${applicantUser.name} – ${type}`,
              html: emailHtml,
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("Leave apply email dispatch error:", emailErr);
    }

    return NextResponse.json({ success: true, data: leave });
  } catch (error: any) {
    console.error("Leave creation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Fetch leave history
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Get mapped company IDs of the logged-in user
    const loggedInUser = await User.findByPk(userId);
    let loggedInUserCompanies: any[] = [];
    if (loggedInUser && loggedInUser.companies) {
      try {
        loggedInUserCompanies = typeof loggedInUser.companies === 'string' ? JSON.parse(loggedInUser.companies) : loggedInUser.companies;
      } catch (e) {}
    }
    if (!Array.isArray(loggedInUserCompanies)) loggedInUserCompanies = [];

    // Find other users belonging to the same companies
    const companyUsers = await User.findAll({
      attributes: ["id", "companies"],
      raw: true
    });
    const sameCompanyUserIds = companyUsers.filter((u: any) => {
      let comps = [];
      try { comps = typeof u.companies === 'string' ? JSON.parse(u.companies) : u.companies; } catch(e) {}
      if (!Array.isArray(comps)) comps = [];
      return comps.some((id: any) => loggedInUserCompanies.some((cid: any) => cid.toString() === id.toString()));
    }).map((u: any) => u.id);

    // Find direct reports of this user (even if reporting manager is in a different department/role)
    let directReportUserIds: string[] = [];
    if (loggedInUser && loggedInUser.name) {
      const reports = await EmployeeProfile.findAll({
        where: { reportingManager: loggedInUser.name },
        attributes: ["user"]
      });
      directReportUserIds = reports.map((p: any) => p.user).filter(Boolean);
    }

    let filter: any = {};

    if (userRole === "Employee") {
      // If employee role user has direct reports, let them see their reports' leaves too
      if (directReportUserIds.length > 0) {
        filter = {
          [Op.or]: [
            { employee: userId },
            { employee: { [Op.in]: directReportUserIds } }
          ]
        };
      } else {
        filter = { employee: userId };
      }
    } else if (userRole === "Department Manager") {
      // Get manager's department
      const managerProfile = await EmployeeProfile.findOne({ where: { user: userId } });
      let deptUserIds: string[] = [];
      if (managerProfile && managerProfile.department) {
        // Find users in the same department
        const profilesInDept = await EmployeeProfile.findAll({
          where: { department: managerProfile.department },
          attributes: ["user"]
        });
        deptUserIds = profilesInDept.map((p: any) => p.user).filter(Boolean);
      }
      
      const allTargetUserIds = Array.from(new Set([...deptUserIds, ...directReportUserIds]));
      filter = {
        [Op.or]: [
          { employee: userId },
          { employee: { [Op.in]: allTargetUserIds } }
        ]
      };
    } else {
      // HR/Owner/Director sees leaves from the same company (or direct reports if any)
      const allTargetUserIds = Array.from(new Set([...sameCompanyUserIds, ...directReportUserIds]));
      if (loggedInUserCompanies.length > 0) {
        filter = {
          employee: { [Op.in]: allTargetUserIds }
        };
      } else {
        filter = {}; // Global admin sees everything
      }
    }

    const leaves = await Leave.findAll({ 
      where: filter,
      order: [['createdAt', 'DESC']]
    });

    const userIds = Array.from(new Set([
      ...leaves.map(l => (l as any).employee).filter(Boolean),
      ...leaves.map(l => (l as any).approvedBy).filter(Boolean)
    ]));

    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'email']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = u.toJSON();
      return acc;
    }, {});

    const data = leaves.map(l => {
      const lJson = l.toJSON() as any;
      lJson.employee = userMap[lJson.employee] || null;
      lJson.approvedBy = userMap[lJson.approvedBy] || null;
      return lJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update leave status (Approve / Reject)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const loggedInUserRole = (session.user as any).role;
    const loggedInUserId = (session.user as any).id;

    await sequelize.authenticate();
    const { leaveId, status, remarks } = await req.json();

    if (!leaveId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const leave = await Leave.findByPk(leaveId);
    if (!leave) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    // Verify current state before modifying
    const currentStatus = (leave as any).status;
    if (currentStatus === "Approved" || currentStatus === "Rejected") {
      return NextResponse.json({ success: false, error: "Leave has already been processed" }, { status: 400 });
    }

    let finalStatus = currentStatus;

    const applicantId = (leave as any).employee;
    const applicantProfile = await EmployeeProfile.findOne({ where: { user: applicantId } });
    const applicantUser = await User.findByPk(applicantId);

    // Get applicant company ID
    let applicantCompanyId = null;
    if (applicantUser && applicantUser.companies) {
      try {
        const parsed = typeof applicantUser.companies === 'string' ? JSON.parse(applicantUser.companies) : applicantUser.companies;
        if (Array.isArray(parsed) && parsed.length > 0) {
          applicantCompanyId = parsed[0];
        }
      } catch (e) {}
    }

    // Get logged-in user company IDs
    const loggedInUser = await User.findByPk(loggedInUserId);
    let loggedInUserCompanies: any[] = [];
    if (loggedInUser && loggedInUser.companies) {
      try {
        loggedInUserCompanies = typeof loggedInUser.companies === 'string' ? JSON.parse(loggedInUser.companies) : loggedInUser.companies;
      } catch (e) {}
    }
    if (!Array.isArray(loggedInUserCompanies)) loggedInUserCompanies = [];

    // Verify same company alignment
    const isSameCompany = applicantCompanyId && loggedInUserCompanies.some((cid: any) => cid.toString() === applicantCompanyId.toString());

    // Check if logged-in user is explicitly the direct reporting manager of applicant
    const isDirectReportManager = applicantProfile?.reportingManager && loggedInUser?.name && applicantProfile.reportingManager === loggedInUser.name;

    // Check privileges
    const isPrivileged = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(loggedInUserRole) || isDirectReportManager;
    if (!isPrivileged) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    if (currentStatus === "Pending Manager Approval" || currentStatus === "Pending") {
      // Who can approve Manager stage?
      // 1. Assigned Direct Reporting Manager (bypass department match)
      // 2. Department Manager (same department, same company)
      // 3. Company Manager (Owner, Director, or role containing "manager", same company)
      const isDeptManager = loggedInUserRole === "Department Manager";
      const isCompanyManager = ["Owner", "Director"].includes(loggedInUserRole) || (loggedInUserRole || "").toLowerCase().includes("manager");

      if (loggedInUserCompanies.length > 0 && !isSameCompany && !isDirectReportManager) {
        return NextResponse.json({ success: false, error: "Access Denied: Applicant belongs to a different company." }, { status: 403 });
      }

      if (isDirectReportManager) {
        // Explicitly authorized direct reporting manager, bypass department checks
      } else if (isDeptManager) {
        const managerProfile = await EmployeeProfile.findOne({ where: { user: loggedInUserId } });
        if (!applicantProfile || !managerProfile || applicantProfile.department !== managerProfile.department) {
          return NextResponse.json({ success: false, error: "Access Denied: You are not the manager of this department." }, { status: 403 });
        }
      } else if (!isCompanyManager) {
        return NextResponse.json({ success: false, error: "Access Denied: Only managers can approve at this stage." }, { status: 403 });
      }

      // If approved, proceed to Pending HR Approval. If rejected, set to Rejected.
      finalStatus = status === "Approved" ? "Pending HR Approval" : "Rejected";
      
      // Update Manager fields
      (leave as any).managerStatus = status; // Approved / Rejected
      if (remarks) (leave as any).managerRemarks = remarks;
    } else if (currentStatus === "Pending HR Approval") {
      // Who can approve HR stage?
      // HR Head, HR Executive, or Owner/Director of same company
      const isHR = ["HR Head", "HR Executive", "Owner", "Director"].includes(loggedInUserRole);

      if (loggedInUserCompanies.length > 0 && !isSameCompany) {
        return NextResponse.json({ success: false, error: "Access Denied: Applicant belongs to a different company." }, { status: 403 });
      }

      if (!isHR) {
        return NextResponse.json({ success: false, error: "Access Denied: Only HR or Admin can approve at this stage." }, { status: 403 });
      }

      finalStatus = status === "Approved" ? "Approved" : "Rejected";
      
      // Update HR fields
      (leave as any).hrStatus = status; // Approved / Rejected
      if (remarks) (leave as any).hrRemarks = remarks;
    } else {
      return NextResponse.json({ success: false, error: "This leave request cannot be processed in its current state." }, { status: 400 });
    }

    (leave as any).status = finalStatus;
    (leave as any).approvedBy = loggedInUserId;
    if (remarks) (leave as any).remarks = remarks;

    await leave.save();

    // In-app notifications for leave status updates
    try {
      if (currentStatus === "Pending Manager Approval" && finalStatus === "Pending HR Approval") {
        await sendRequestNotification({
          applicantId,
          requestType: "Leave",
          action: "approved_by_manager",
          details: `Leave request by ${applicantUser?.name || "Employee"} is approved by Manager and is now pending HR approval. Remarks: ${remarks || "None"}`
        });
      } else if (finalStatus === "Approved") {
        await sendRequestNotification({
          applicantId,
          requestType: "Leave",
          action: "approved",
          details: `Leave request by ${applicantUser?.name || "Employee"} is fully approved. Remarks: ${remarks || "None"}`
        });
      } else if (finalStatus === "Rejected") {
        await sendRequestNotification({
          applicantId,
          requestType: "Leave",
          action: currentStatus === "Pending Manager Approval" ? "rejected_by_manager" : "rejected_by_hr",
          details: `Leave request by ${applicantUser?.name || "Employee"} has been rejected. Remarks: ${remarks || "None"}`
        });
      }
    } catch (notifErr) {
      console.error("Error creating leave status update notifications:", notifErr);
    }

    // ── Email notification dispatch for Leave approval updates
    try {
      const formattedStart = new Date((leave as any).startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const formattedEnd = new Date((leave as any).endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      if (currentStatus === "Pending Manager Approval" && finalStatus === "Pending HR Approval") {
        // 1. Manager Approved: Email HR for next approval stage
        const hrUsers = await findHRUsers(applicantId);
        const emails = hrUsers.map((h: any) => h.email).filter(Boolean);
        if (emails.length > 0) {
          const emailHtml = getLeaveAppliedEmailHtml({
            applicantName: applicantUser?.name || "Employee",
            applicantRole: applicantUser?.role || "Employee",
            leaveType: (leave as any).type,
            startDate: formattedStart,
            endDate: formattedEnd,
            days: (leave as any).days,
            reason: (leave as any).reason || "",
            pendingStatus: finalStatus,
          });

          await sendEmail({
            to: emails,
            subject: `🌴 Leave Approval Required (HR): ${applicantUser?.name} – ${(leave as any).type}`,
            html: emailHtml,
          });
        }
      } else if (
        (currentStatus === "Pending Manager Approval" && finalStatus === "Rejected") ||
        (currentStatus === "Pending HR Approval" && (finalStatus === "Approved" || finalStatus === "Rejected"))
      ) {
        // 2. Request finalized: Email applicant
        if (applicantUser && applicantUser.email) {
          const processedUser = await User.findByPk(loggedInUserId);
          const emailHtml = getLeaveStatusEmailHtml({
            applicantName: applicantUser.name || "Employee",
            leaveType: (leave as any).type,
            startDate: formattedStart,
            endDate: formattedEnd,
            days: (leave as any).days,
            status: finalStatus,
            isApproved: finalStatus === "Approved",
            processedByName: processedUser?.name || "HR/Manager",
            remarks: remarks || undefined,
          });

          await sendEmail({
            to: applicantUser.email,
            subject: `🌴 Leave Request ${finalStatus === "Approved" ? "Approved" : "Rejected"} – ${(leave as any).type}`,
            html: emailHtml,
          });
        }
      }
    } catch (emailErr) {
      console.error("Leave update email dispatch error:", emailErr);
    }

    // Log Audit Entry
    await logAudit({
      userId: loggedInUserId,
      action: `${status.toUpperCase()}_LEAVE`,
      entity: "Leave",
      entityId: (leave as any).id,
      details: `Leave request for ${(leave as any).type} (${(leave as any).days} days) has been processed as '${finalStatus}' by ${loggedInUserRole}.`
    });

    await logHRActivity({
      userId: loggedInUserId,
      userRole: loggedInUserRole,
      action: `${status.toUpperCase()}_LEAVE`,
      details: `Leave request for ${(leave as any).type} (${(leave as any).days} days) has been processed as '${finalStatus}' by ${loggedInUserRole}.`
    });

    // If final status is Approved, deduct leave balance
    if (finalStatus === "Approved") {
      const profile = await EmployeeProfile.findOne({ where: { user: (leave as any).employee } });
      if (profile) {
        if ((leave as any).type === "Casual Leave") {
          const balance = (profile.get("leaveBalances.casualLeave") as number) || 0;
          profile.set("leaveBalances.casualLeave", Math.max(0, balance - (leave as any).days));
        } else if ((leave as any).type === "Sick Leave") {
          const balance = (profile.get("leaveBalances.sickLeave") as number) || 0;
          profile.set("leaveBalances.sickLeave", Math.max(0, balance - (leave as any).days));
        } else if ((leave as any).type === "Earned Leave") {
          const balance = (profile.get("leaveBalances.earnedLeave") as number) || 0;
          profile.set("leaveBalances.earnedLeave", Math.max(0, balance - (leave as any).days));
        }
        await profile.save();
      }
    }

    return NextResponse.json({ success: true, data: leave });
  } catch (error: any) {
    console.error("Leave update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
