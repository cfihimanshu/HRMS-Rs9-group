import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import DisciplinaryWarning from "@/models/sequelize/DisciplinaryWarning";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";
import Notification from "@/models/sequelize/Notification";
import Company from "@/models/sequelize/Company";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { Op } from "sequelize";

// Branded HTML warning email template
// Branded HTML warning email template (Priscilla Memo Design)
// Branded HTML warning email template (Priscilla Memo Design)
function getWarningEmailHtml({ 
  employeeName, 
  employeeRole = "Employee", 
  employeeDept = "N/A", 
  warningId, 
  warningLevel, 
  reason, 
  description, 
  improvementPeriodDays, 
  pipPlan,
  salaryHold,
  promotionHold,
  bonusHold,
  issuerName = "Authorized Manager",
  issuerRole = "Authorized Manager",
  companyName = "RS9 GROUP"
}: any) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #d1d5db; padding: 40px; background-color: #ffffff; color: #000000; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: left;">
      
      <!-- Memo Header -->
      <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 15px; margin-bottom: 25px;">
        <h2 style="font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; color: #000000; font-family: sans-serif;">${companyName.toUpperCase()}</h2>
        <p style="font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0 0; color: #4b5563;">HUMAN RESOURCES & DISCIPLINARY COMPLIANCE BOARD</p>
      </div>

      <!-- Memo Details table -->
      <table style="width: 100%; font-size: 12px; font-family: sans-serif; border-collapse: collapse; margin-bottom: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; color: #000000;">
        <tr>
          <td style="width: 50%; vertical-align: top; line-height: 1.8; text-align: left; padding-bottom: 10px;">
            <strong>DATE:</strong> ${new Date().toLocaleDateString()}<br />
            <strong>TO:</strong> ${employeeName} <span style="color: #6b7280;">(${employeeRole})</span><br />
            <strong>DEPARTMENT:</strong> ${employeeDept}
          </td>
          <td style="width: 50%; vertical-align: top; line-height: 1.8; text-align: right; padding-bottom: 10px;">
            <strong>MEMO REF:</strong> ${warningId}<br />
            <strong>FROM:</strong> ${issuerName} <span style="color: #6b7280;">(${issuerRole})</span><br />
            <strong>COMPANY:</strong> ${companyName}
          </td>
        </tr>
      </table>

      <!-- Subject divider -->
      <div style="border-top: 1px solid #000000; border-bottom: 1px solid #000000; padding: 10px 0; margin: 20px 0; text-align: center;">
        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0; color: #000000;">
          SUBJECT: OFFICIAL DISCIPLINARY DIRECTIVE — WARNING ${warningLevel}
        </h3>
      </div>

      <!-- Salutation -->
      <p style="font-weight: bold; margin-top: 20px; margin-bottom: 16px; font-size: 13px;">Dear ${employeeName},</p>

      <!-- Letter Body -->
      <p style="margin-bottom: 16px; line-height: 1.6; font-size: 13px;">
        This memorandum serves as an official notice of disciplinary action directive issued in accordance with Company Professional Policies. A formal complaint and subsequent administrative review have recorded a misconduct violation of category <strong>"${reason}"</strong>.
      </p>
      <p style="margin-bottom: 16px; line-height: 1.6; font-size: 13px;">
        The specific incident rationale and details filed by the complainant are documented below:
      </p>
      
      <!-- Incident rationale -->
      <div style="margin: 20px 0; padding-left: 20px; border-left: 2px solid #000000; font-style: italic; white-space: pre-wrap; line-height: 1.6; font-size: 13px; color: #000000;">
        "${description}"
      </div>

      <!-- Holds -->
      ${warningLevel === 2 ? `
        <div style="margin: 25px 0; padding: 20px; border: 1px solid #d1d5db; border-radius: 8px; background-color: #f9fafb; font-family: sans-serif;">
          <h5 style="font-weight: bold; text-transform: uppercase; font-size: 11px; margin: 0 0 12px 0; color: #000000; letter-spacing: 0.5px;">Warning 2 Final Warning Holds & PIP Activated:</h5>
          <ul style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6; color: #374151;">
            ${salaryHold && Number(salaryHold) > 0 ? `<li><strong>Salary increment hold:</strong> Active (${salaryHold} Months)</li>` : ''}
            ${promotionHold ? '<li><strong>Promotion eligibility hold:</strong> Active (3 to 6 Months)</li>' : ''}
            ${bonusHold ? '<li><strong>Performance bonus payout hold:</strong> Active (3 to 6 Months)</li>' : ''}
          </ul>
          ${pipPlan ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <p style="font-weight: bold; font-size: 10px; text-transform: uppercase; margin: 0 0 6px 0; color: #000000;">Performance Improvement Plan Targets:</p>
              <p style="margin: 0; font-style: italic; color: #4b5563; font-size: 12px;">"${pipPlan}"</p>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <p style="margin-bottom: 30px; line-height: 1.6; font-size: 13px;">
        Please be advised that failure to show required improvements, or any subsequent recurrence of company policy violations, will result in immediate escalation to the next disciplinary severity tier, <strong>up to and including service contract termination</strong>.
      </p>

      <!-- Signature block -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px; font-size: 11px; font-family: sans-serif; color: #000000;">
        <tr>
          <td style="width: 50%; text-align: left; line-height: 1.6; vertical-align: top; padding-top: 10px;">
            <span style="color: #6b7280; text-transform: uppercase; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">Issued By Authority:</span><br />
            <strong style="font-size: 12px; display: block; margin-top: 4px;">${issuerName}</strong>
            <span style="color: #4b5563;">${issuerRole}</span><br />
            <span style="color: #9ca3af; font-family: monospace; font-size: 9px;">${companyName}</span>
          </td>
          <td style="width: 50%; text-align: right; line-height: 1.6; vertical-align: top; padding-top: 10px;">
            <span style="color: #6b7280; text-transform: uppercase; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">Target Recipient:</span><br />
            <strong style="font-size: 12px; display: block; margin-top: 4px;">${employeeName}</strong>
            <span style="color: #4b5563;">${employeeRole}</span><br />
            <span style="color: #9ca3af; font-family: monospace; font-size: 9px;">${companyName}</span>
          </td>
        </tr>
      </table>

    </div>
  `;
}

// Helper to check if role matches any manager
const isManagerRole = (role: string) => {
  const r = (role || "").toLowerCase();
  return r === "department manager" || r.includes("manager") || r === "dsm" || r === "owner" || r === "director" || r === "hr head" || r === "hr executive";
};

// GET: Fetch warnings list
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    try { await DisciplinaryWarning.sync({ alter: true }); } catch (_) {}

    const dbUser = await User.findByPk(userId, { raw: true });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const role = dbUser.role || "Employee";
    const profile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
    const designation = profile?.designation || "";

    const isGlobal = ["Owner", "Director", "HR Head", "HR Executive"].includes(role);
    const isManager = isManagerRole(role) || isManagerRole(designation);

    let warnings: any[] = [];

    if (isGlobal) {
      // Owner/HR see all warnings
      warnings = await DisciplinaryWarning.findAll({
        order: [['createdAt', 'DESC']],
        raw: true
      });
    } else if (isManager) {
      // Managers only see warnings of employees they have personally issued a warning to
      const myIssuedWarnings = await DisciplinaryWarning.findAll({
        where: { issuedBy: userId },
        attributes: ["employeeId"],
        raw: true
      });
      const warnedUserIds = [...new Set(myIssuedWarnings.map((w: any) => w.employeeId).filter(Boolean))];

      warnings = await DisciplinaryWarning.findAll({
        where: {
          employeeId: { [Op.in]: warnedUserIds }
        },
        order: [['createdAt', 'DESC']],
        raw: true
      });
    } else {
      // Regular employees only see warnings issued to them (excluding pending, rejected, and resolved warnings)
      warnings = await DisciplinaryWarning.findAll({
        where: {
          employeeId: userId,
          status: { [Op.notIn]: ["Pending Approval", "Rejected", "Resolved"] }
        },
        order: [['createdAt', 'DESC']],
        raw: true
      });
    }

    // Merge User profile details for target employee and issuer
    const userIds = [...new Set([
      ...warnings.map((w: any) => w.employeeId),
      ...warnings.map((w: any) => w.issuedBy)
    ].filter(Boolean))];

    let userMap: any = {};
    if (userIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, raw: true });
      const profiles = await EmployeeProfile.findAll({ where: { user: { [Op.in]: userIds } }, raw: true });
      const departments = await Department.findAll({ raw: true });

      const deptMap = departments.reduce((acc: any, d: any) => {
        acc[d.id] = d.name;
        return acc;
      }, {});

      users.forEach((u: any) => {
        const p = profiles.find((prof: any) => prof.user === u.id);
        userMap[u.id] = {
          name: u.name,
          email: u.email,
          role: u.role,
          department: p ? (deptMap[p.department] || p.department) : "N/A"
        };
      });
    }

    const merged = warnings.map((w: any) => ({
      ...w,
      employeeDetails: userMap[w.employeeId] || null,
      issuedByDetails: userMap[w.issuedBy] || null
    }));

    return NextResponse.json({ success: true, data: merged });
  } catch (error: any) {
    console.error("Fetch warnings failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Issue new warning
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    await DisciplinaryWarning.sync({ alter: true });

    const dbUser = await User.findByPk(userId, { raw: true });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const role = dbUser.role || "Employee";
    const profile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
    const designation = profile?.designation || "";

    if (!isManagerRole(role) && !isManagerRole(designation)) {
      return NextResponse.json({ success: false, error: "Forbidden: Only managers and HR can issue warnings" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, reason, description, incidentDate, improvementPeriodDays = 7, pipPlan, salaryHold, promotionHold, bonusHold } = body;

    if (!employeeId || !reason || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const targetUser = await User.findByPk(employeeId, { raw: true });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target employee not found" }, { status: 404 });
    }

    // Auto-calculate warning level based on existing warnings count (active/final/pip/termination review)
    const existingCount = await DisciplinaryWarning.count({
      where: {
        employeeId,
        status: { [Op.notIn]: ["Rejected"] }
      }
    });

    let warningLevel = 1;
    if (existingCount === 1) {
      warningLevel = 2;
    } else if (existingCount >= 2) {
      warningLevel = 3;
    }

    // Determine initial status based on issuer
    const isGlobal = ["Owner", "Director", "HR Head", "HR Executive"].includes(role);
    let status = "Pending Approval";
    if (isGlobal) {
      status = warningLevel === 1 ? "Active Warning" : (warningLevel === 2 ? "Final Warning" : "Termination Review");
    }

    const impDays = null;
    const impEnd = null;

    const warningId = "WRN-" + Date.now();

    const record = await DisciplinaryWarning.create({
      id: warningId,
      employeeId,
      warningLevel,
      reason,
      description,
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      status,
      issuedBy: userId,
      improvementPeriodDays: impDays,
      improvementPeriodEnd: impEnd,
      pipPlan: warningLevel === 2 ? pipPlan : null,
      salaryHold: warningLevel === 2 ? Number(salaryHold) : 0,
      promotionHold: warningLevel === 2 ? !!promotionHold : false,
      bonusHold: warningLevel === 2 ? !!bonusHold : false,
    });

    // If active immediately (issued by Owner/HR), send portal notification and HTML email
    if (status !== "Pending Approval") {
      await Notification.create({
        id: Date.now().toString(),
        employee: employeeId,
        title: `Disciplinary Warning ${warningLevel}`,
        message: `A warning has been issued to you for: ${reason}.`,
        type: "alert",
        read: false
      });

      if (targetUser.email) {
        const targetProfile = await EmployeeProfile.findOne({ where: { user: employeeId }, raw: true });
        let targetDeptName = "N/A";
        if (targetProfile && targetProfile.department) {
          const dept = await Department.findByPk(targetProfile.department, { raw: true });
          targetDeptName = dept ? dept.name : targetProfile.department;
        }

        let targetCompanyName = "RS9 GROUP";
        if (targetUser.companies) {
          try {
            let parsedComps = [];
            if (typeof targetUser.companies === "string") {
              parsedComps = JSON.parse(targetUser.companies);
            } else if (Array.isArray(targetUser.companies)) {
              parsedComps = targetUser.companies;
            }
            if (Array.isArray(parsedComps) && parsedComps.length > 0) {
              const comp = await Company.findByPk(parsedComps[0], { raw: true });
              if (comp && comp.name) {
                targetCompanyName = comp.name;
              }
            }
          } catch (e) {
            console.error("Error parsing user companies for email:", e);
          }
        }

        const issuerUser = await User.findByPk(userId, { raw: true });
        const issuerProfile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });

        const html = getWarningEmailHtml({
          employeeName: targetUser.name,
          employeeRole: targetUser.role || "Employee",
          employeeDept: targetDeptName,
          warningId,
          warningLevel,
          reason,
          description,
          improvementPeriodDays: impDays,
          pipPlan: warningLevel === 2 ? pipPlan : null,
          salaryHold: warningLevel === 2 ? Number(salaryHold) : 0,
          promotionHold: warningLevel === 2 ? !!promotionHold : false,
          bonusHold: warningLevel === 2 ? !!bonusHold : false,
          issuerName: issuerUser?.name || "Authorized Manager",
          issuerRole: issuerProfile?.designation || issuerUser?.role || "Authorized Manager",
          companyName: targetCompanyName
        });

        await sendEmail({
          to: targetUser.email,
          subject: `[HR PORTAL] Disciplinary Warning Level ${warningLevel} Issued`,
          html
        });
      }
    }

    await logAudit({
      userId,
      action: status === "Pending Approval" ? "WARNING_REQUESTED" : "WARNING_ISSUED",
      entity: "DisciplinaryWarning",
      entityId: warningId,
      details: `Warning level ${warningLevel} created for employee ${targetUser.name}. Status: ${status}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Submit warning failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Actions (Approve/Reject by Owner, Acknowledge by Employee, Approvals for Level 3 Review)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    await DisciplinaryWarning.sync({ alter: true });

    const dbUser = await User.findByPk(userId, { raw: true });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const role = dbUser.role || "Employee";
    const userRoleLower = role.toLowerCase();

    const body = await req.json();
    const { warningId, action } = body;

    if (!warningId || !action) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }



    const warning = await DisciplinaryWarning.findByPk(warningId);
    if (!warning) {
      return NextResponse.json({ success: false, error: "Warning record not found" }, { status: 404 });
    }

    const targetUser = await User.findByPk(warning.employeeId);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target employee not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Must be Owner, Director, HR Head
      const isGlobal = ["owner", "director", "hr head", "hr executive"].includes(userRoleLower);
      if (!isGlobal) {
        return NextResponse.json({ success: false, error: "Forbidden: Only Owner/HR can approve warnings" }, { status: 403 });
      }

      const warningLevel = warning.warningLevel;
      const activeStatus = warningLevel === 1 ? "Active Warning" : (warningLevel === 2 ? "Final Warning" : "Termination Review");
      
      const impDays = null;
      const impEnd = null;

      warning.status = activeStatus;
      warning.improvementPeriodDays = impDays;
      warning.improvementPeriodEnd = impEnd;
      await warning.save();

      // Trigger Portal Notification
      await Notification.create({
        id: Date.now().toString(),
        employee: warning.employeeId,
        title: `Disciplinary Warning ${warningLevel}`,
        message: `A warning has been approved and issued to you for: ${warning.reason}.`,
        type: "alert",
        read: false
      });

      // Send HTML Email
      if (targetUser.email) {
        const targetProfile = await EmployeeProfile.findOne({ where: { user: warning.employeeId }, raw: true });
        let targetDeptName = "N/A";
        if (targetProfile && targetProfile.department) {
          const dept = await Department.findByPk(targetProfile.department, { raw: true });
          targetDeptName = dept ? dept.name : targetProfile.department;
        }

        let targetCompanyName = "RS9 GROUP";
        if (targetUser.companies) {
          try {
            let parsedComps = [];
            if (typeof targetUser.companies === "string") {
              parsedComps = JSON.parse(targetUser.companies);
            } else if (Array.isArray(targetUser.companies)) {
              parsedComps = targetUser.companies;
            }
            if (Array.isArray(parsedComps) && parsedComps.length > 0) {
              const comp = await Company.findByPk(parsedComps[0], { raw: true });
              if (comp && comp.name) {
                targetCompanyName = comp.name;
              }
            }
          } catch (e) {
            console.error("Error parsing user companies for email:", e);
          }
        }

        const issuerUser = await User.findByPk(warning.issuedBy, { raw: true });
        const issuerProfile = await EmployeeProfile.findOne({ where: { user: warning.issuedBy }, raw: true });

        const html = getWarningEmailHtml({
          employeeName: targetUser.name,
          employeeRole: targetUser.role || "Employee",
          employeeDept: targetDeptName,
          warningId: warning.id,
          warningLevel,
          reason: warning.reason,
          description: warning.description,
          improvementPeriodDays: impDays,
          pipPlan: warning.pipPlan,
          salaryHold: warning.salaryHold,
          promotionHold: warning.promotionHold,
          bonusHold: warning.bonusHold,
          issuerName: issuerUser?.name || "Authorized Manager",
          issuerRole: issuerProfile?.designation || issuerUser?.role || "Authorized Manager",
          companyName: targetCompanyName
        });

        await sendEmail({
          to: targetUser.email,
          subject: `[HR PORTAL] Disciplinary Warning Level ${warningLevel} Issued`,
          html
        });
      }

      await logAudit({
        userId,
        action: "WARNING_APPROVED",
        entity: "DisciplinaryWarning",
        entityId: warning.id,
        details: `Warning level ${warningLevel} approved by Owner/HR.`,
      });

    } else if (action === "reject") {
      const isGlobal = ["owner", "director", "hr head", "hr executive"].includes(userRoleLower);
      if (!isGlobal) {
        return NextResponse.json({ success: false, error: "Forbidden: Only Owner/HR can reject warnings" }, { status: 403 });
      }

      warning.status = "Rejected";
      await warning.save();

      await logAudit({
        userId,
        action: "WARNING_REJECTED",
        entity: "DisciplinaryWarning",
        entityId: warning.id,
        details: `Warning level ${warning.warningLevel} rejected by Owner/HR.`,
      });

    } else if (action === "acknowledge") {
      // Must be target employee
      if (userId !== warning.employeeId) {
        return NextResponse.json({ success: false, error: "Forbidden: Only the target employee can acknowledge this warning" }, { status: 403 });
      }

      warning.status = "Acknowledged";
      warning.acknowledgedAt = new Date();
      await warning.save();

      await logAudit({
        userId,
        action: "WARNING_ACKNOWLEDGED",
        entity: "DisciplinaryWarning",
        entityId: warning.id,
        details: `Warning level ${warning.warningLevel} acknowledged by employee.`,
      });

    } else if (action === "approve_termination") {
      // Verify role
      const isHR = ["hr head", "hr executive"].includes(userRoleLower);
      const isOwner = ["owner", "director"].includes(userRoleLower);

      let isDeptHead = false;
      const managerProfile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
      const targetProfile = await EmployeeProfile.findOne({ where: { user: warning.employeeId }, raw: true });
      if (managerProfile && targetProfile && managerProfile.department === targetProfile.department) {
        isDeptHead = isManagerRole(role) || isManagerRole(managerProfile.designation);
      }

      if (!isHR && !isOwner && !isDeptHead) {
        return NextResponse.json({ success: false, error: "Forbidden: Only HR, Department Head, or Owner can approve termination review" }, { status: 403 });
      }

      if (isHR) warning.hrApproved = true;
      if (isOwner) warning.directorApproved = true;
      if (isDeptHead) warning.deptHeadApproved = true;

      await warning.save();

      // Check if review approvals are complete
      // Complete when hrApproved === true AND deptHeadApproved === true
      if (warning.hrApproved && warning.deptHeadApproved) {
        warning.status = "Terminated";
        warning.terminatedAt = new Date();
        warning.terminationLetterUrl = "Generated";
        await warning.save();

        // Update User status to terminated
        targetUser.status = "terminated";
        await targetUser.save();

        // Send termination email
        if (targetUser.email) {
          await sendEmail({
            to: targetUser.email,
            subject: "[HR PORTAL] Disciplinary Review - Service Termination Notice",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%); padding: 24px; text-align: center; color: white;">
                  <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Service Termination Notice</h2>
                  <p style="margin: 4px 0 0 0; opacity: 0.85; font-size: 13px;">Grievance Disciplinary Action Review</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff; color: #334155;">
                  <p style="font-size: 15px; margin-top: 0;">Dear <strong>${targetUser.name}</strong>,</p>
                  <p style="font-size: 14px; line-height: 1.6;">Following the disciplinary review board's evaluation regarding repeated misconduct and three warnings recorded, we regret to inform you that your employment services have been terminated.</p>
                  <p style="font-size: 14px; line-height: 1.6;">Your termination letter has been generated inside the HR Portal. Please contact the HR department to initiate the compliance clearance and exit formalities.</p>
                  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    This is an official HR service termination notification.
                  </p>
                </div>
              </div>
            `
          });
        }

        await logAudit({
          userId,
          action: "EMPLOYEE_TERMINATED",
          entity: "User",
          entityId: warning.employeeId,
          details: `Employee ${targetUser.name} terminated following disciplinary review approvals.`,
        });
      }

    } else if (action === "fire_employee") {
      // Owner-only: direct termination without board approval required
      const isOwnerRole = ["owner", "director"].includes(userRoleLower);
      if (!isOwnerRole) {
        return NextResponse.json({ success: false, error: "Forbidden: Only Owner/Director can directly fire an employee" }, { status: 403 });
      }
      if (warning.warningLevel !== 3) {
        return NextResponse.json({ success: false, error: "Direct termination is only allowed on Warning 3 cases" }, { status: 400 });
      }
      if (warning.status === "Terminated") {
        return NextResponse.json({ success: false, error: "Employee is already terminated" }, { status: 400 });
      }

      warning.status = "Terminated";
      warning.terminatedAt = new Date();
      warning.terminationLetterUrl = "Generated";
      warning.hrApproved = true;
      warning.deptHeadApproved = true;
      warning.directorApproved = true;
      await warning.save();

      // Update User status to terminated
      targetUser.status = "terminated";
      await targetUser.save();

      // Fetch details for email
      const issuerProfile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
      const targetProfile = await EmployeeProfile.findOne({ where: { user: warning.employeeId }, raw: true });
      let targetDeptName = "N/A";
      if (targetProfile && targetProfile.department) {
        const dept = await Department.findByPk(targetProfile.department, { raw: true });
        targetDeptName = dept ? dept.name : targetProfile.department;
      }

      let targetCompanyName = "RS9 GROUP";
      if (targetUser.companies) {
        try {
          let parsedComps = [];
          if (typeof targetUser.companies === "string") {
            parsedComps = JSON.parse(targetUser.companies);
          } else if (Array.isArray(targetUser.companies)) {
            parsedComps = targetUser.companies;
          }
          if (Array.isArray(parsedComps) && parsedComps.length > 0) {
            const comp = await Company.findByPk(parsedComps[0], { raw: true });
            if (comp && comp.name) {
              targetCompanyName = comp.name;
            }
          }
        } catch (e) {
          console.error("Error parsing user companies for email:", e);
        }
      }

      const issuerUser = await User.findByPk(userId, { raw: true });
      const terminationDate = new Date().toLocaleDateString();
      const terminationId = "TRM-" + Date.now();

      // Send professional corporate memo termination email
      if (targetUser.email) {
        await sendEmail({
          to: targetUser.email,
          subject: `[${targetCompanyName.toUpperCase()}] Official Service Termination Notice — ${terminationId}`,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #d1d5db; padding: 40px; background-color: #ffffff; color: #000000; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: left;">
              
              <!-- Memo Header -->
              <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 15px; margin-bottom: 25px;">
                <h2 style="font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; color: #000000; font-family: sans-serif;">${targetCompanyName.toUpperCase()}</h2>
                <p style="font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0 0; color: #4b5563;">HUMAN RESOURCES &amp; DISCIPLINARY COMPLIANCE BOARD</p>
              </div>

              <!-- Memo Details table -->
              <table style="width: 100%; font-size: 12px; font-family: sans-serif; border-collapse: collapse; margin-bottom: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; color: #000000;">
                <tr>
                  <td style="width: 50%; vertical-align: top; line-height: 1.8; text-align: left; padding-bottom: 10px;">
                    <strong>DATE:</strong> ${terminationDate}<br />
                    <strong>TO:</strong> ${targetUser.name} <span style="color: #6b7280;">(${targetUser.role || "Employee"})</span><br />
                    <strong>DEPARTMENT:</strong> ${targetDeptName}
                  </td>
                  <td style="width: 50%; vertical-align: top; line-height: 1.8; text-align: right; padding-bottom: 10px;">
                    <strong>MEMO REF:</strong> ${terminationId}<br />
                    <strong>FROM:</strong> ${issuerUser?.name || "Owner"} <span style="color: #6b7280;">(${issuerProfile?.designation || issuerUser?.role || "Owner"})</span><br />
                    <strong>COMPANY:</strong> ${targetCompanyName}
                  </td>
                </tr>
              </table>

              <!-- Subject divider -->
              <div style="border-top: 1px solid #000000; border-bottom: 1px solid #000000; padding: 10px 0; margin: 20px 0; text-align: center;">
                <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0; color: #000000;">
                  SUBJECT: OFFICIAL NOTICE OF SERVICE TERMINATION
                </h3>
              </div>

              <!-- Salutation -->
              <p style="font-weight: bold; margin-top: 20px; margin-bottom: 16px; font-size: 13px;">Dear ${targetUser.name},</p>

              <!-- Letter Body -->
              <p style="margin-bottom: 16px; line-height: 1.6; font-size: 13px;">
                This memorandum serves as an official notice issued by the ${targetCompanyName} Disciplinary Compliance Board and authorized by the Owner/Director. Following a disciplinary review process, including the issuance of <strong>Warning 3 (Termination Review)</strong> for the reason of <strong>"${warning.reason}"</strong>, and after careful evaluation of your conduct and compliance record, the management has decided to terminate your employment contract with ${targetCompanyName}.
              </p>

              <!-- Incident ref -->
              <div style="margin: 20px 0; padding-left: 20px; border-left: 2px solid #000000; font-style: italic; white-space: pre-wrap; line-height: 1.6; font-size: 13px; color: #000000;">
                "${warning.description}"
              </div>

              <p style="margin-bottom: 16px; line-height: 1.6; font-size: 13px;">
                Your employment services with ${targetCompanyName} are hereby <strong>terminated effective ${terminationDate}</strong>. You are requested to contact the HR department to complete all exit formalities, clearance procedures, and return of company assets.
              </p>

              <p style="margin-bottom: 30px; line-height: 1.6; font-size: 13px;">
                All dues, settlements, and clearance documentation will be processed as per the company's exit policy. Please note that your access to company systems and premises has been revoked with immediate effect.
              </p>

              <!-- Signature block -->
              <table style="width: 100%; border-collapse: collapse; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px; font-size: 11px; font-family: sans-serif; color: #000000;">
                <tr>
                  <td style="width: 50%; text-align: left; line-height: 1.6; vertical-align: top; padding-top: 10px;">
                    <span style="color: #6b7280; text-transform: uppercase; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">Authorized By:</span><br />
                    <strong style="font-size: 12px; display: block; margin-top: 4px;">${issuerUser?.name || "Owner"}</strong>
                    <span style="color: #4b5563;">${issuerProfile?.designation || issuerUser?.role || "Owner"}</span><br />
                    <span style="color: #9ca3af; font-family: monospace; font-size: 9px;">${targetCompanyName}</span>
                  </td>
                  <td style="width: 50%; text-align: right; line-height: 1.6; vertical-align: top; padding-top: 10px;">
                    <span style="color: #6b7280; text-transform: uppercase; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">Notified To:</span><br />
                    <strong style="font-size: 12px; display: block; margin-top: 4px;">${targetUser.name}</strong>
                    <span style="color: #4b5563;">${targetUser.role || "Employee"}</span><br />
                    <span style="color: #9ca3af; font-family: monospace; font-size: 9px;">${targetCompanyName}</span>
                  </td>
                </tr>
              </table>

            </div>
          `
        });
      }

      // Portal notification for the employee
      await Notification.create({
        id: Date.now().toString(),
        employee: warning.employeeId,
        title: `Service Termination Notice`,
        message: `Your employment at RS9 Group has been terminated. Please contact HR for exit formalities.`,
        type: "alert",
        read: false
      });

      await logAudit({
        userId,
        action: "EMPLOYEE_FIRED_BY_OWNER",
        entity: "User",
        entityId: warning.employeeId,
        details: `Employee ${targetUser.name} directly terminated by Owner/Director.`,
      });
    }

    return NextResponse.json({ success: true, data: warning });
  } catch (error: any) {
    console.error("Update warning failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a warning (manual removal by Owner)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();

    const dbUser = await User.findByPk(userId, { raw: true });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const roleLower = (dbUser.role || "").toLowerCase();
    const isGlobal = ["owner", "director", "hr head", "hr executive"].includes(roleLower);

    const { searchParams } = new URL(req.url);
    const warningId = searchParams.get("id");
    if (!warningId) {
      return NextResponse.json({ success: false, error: "Warning ID is required" }, { status: 400 });
    }

    const warning = await DisciplinaryWarning.findByPk(warningId);
    if (!warning) {
      return NextResponse.json({ success: false, error: "Warning not found" }, { status: 404 });
    }

    const isIssuer = warning.issuedBy?.toString() === userId?.toString();
    if (!isGlobal && !isIssuer) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only delete warnings issued by you or if you are an Administrator" }, { status: 403 });
    }

    await warning.destroy();

    await logAudit({
      userId,
      action: "WARNING_DELETED",
      entity: "DisciplinaryWarning",
      entityId: warningId,
      details: `Warning WRN-${warningId} deleted by ${dbUser.name}.`,
    });

    return NextResponse.json({ success: true, message: "Warning removed successfully" });
  } catch (error: any) {
    console.error("Delete warning failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
