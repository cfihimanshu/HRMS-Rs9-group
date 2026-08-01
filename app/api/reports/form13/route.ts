import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import ExitForm from "@/models/sequelize/ExitForm";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { DataTypes, Op } from "sequelize";

async function initDB() {
  await sequelize.authenticate();
  await ExitForm.sync();
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc: any = await queryInterface.describeTable("exitforms");
    if (tableDesc) {
      const columnsToAdd: { [key: string]: any } = {
        resignationDate: { type: DataTypes.STRING, allowNull: true },
        handoverTo: { type: DataTypes.STRING, allowNull: true },
        department: { type: DataTypes.STRING, allowNull: true },
        company: { type: DataTypes.STRING, allowNull: true },
        dataAudit: { type: DataTypes.BOOLEAN, allowNull: true },
        clientTransfer: { type: DataTypes.BOOLEAN, allowNull: true },
        ndaReminder: { type: DataTypes.BOOLEAN, allowNull: true },
        postExitWatch: { type: DataTypes.BOOLEAN, allowNull: true },
        finalSettlementStatus: { type: DataTypes.STRING, defaultValue: "Pending Audit" },
        approvalStage: { type: DataTypes.STRING, defaultValue: "Pending Manager" },
        exitType: { type: DataTypes.STRING, allowNull: true },
        noticePeriodDays: { type: DataTypes.INTEGER, allowNull: true },
        lastWorkingDay: { type: DataTypes.STRING, allowNull: true },
        managerId: { type: DataTypes.STRING, allowNull: true },
        managerName: { type: DataTypes.STRING, allowNull: true },
        managerEmail: { type: DataTypes.STRING, allowNull: true },
        managerApprovalStatus: { type: DataTypes.STRING, defaultValue: "Pending" },
        managerRemarks: { type: DataTypes.TEXT, allowNull: true },
        managerApprovedAt: { type: DataTypes.DATE, allowNull: true },
        ownerApprovalStatus: { type: DataTypes.STRING, defaultValue: "Pending" },
        ownerRemarks: { type: DataTypes.TEXT, allowNull: true },
        ownerApprovedAt: { type: DataTypes.DATE, allowNull: true },
        hrApprovalStatus: { type: DataTypes.STRING, defaultValue: "Pending" },
        hrRemarks: { type: DataTypes.TEXT, allowNull: true },
        hrApprovedAt: { type: DataTypes.DATE, allowNull: true },
        rejectionReason: { type: DataTypes.TEXT, allowNull: true }
      };

      for (const [colName, colSpec] of Object.entries(columnsToAdd)) {
        if (!tableDesc[colName]) {
          await queryInterface.addColumn("exitforms", colName, colSpec).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("Auto-migration error in exitforms:", err);
  }
}

// POST: Submit FORM-13 Exit Form
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await initDB();

    const submittedBy = (session.user as any).id;
    const body = await req.json();

    const {
      name,
      category,
      exitReason,
      resignationDate,
      handoverTo,
      department,
      company,
      assetReturn,
      accessRevoke,
      handover,
      finalSettlement,
      dataAudit,
      clientTransfer,
      ndaReminder,
      postExitWatch,
      finalSettlementStatus,
      exitFeedback,
      postExitRisk,
    } = body;

    const empName = name || (session.user as any).name || "Employee";

    if (!exitReason) {
      return NextResponse.json({ success: false, error: "Please provide an exit reason" }, { status: 400 });
    }

    // Find Employee Profile & Department Reporting Manager
    const profile = await EmployeeProfile.findOne({ where: { user: submittedBy }, raw: true });
    let reportingManagerName = profile?.reportingManager || "";
    let managerUser: any = null;

    if (reportingManagerName) {
      managerUser = await User.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${reportingManagerName}%` } },
            { email: { [Op.like]: `%${reportingManagerName}%` } }
          ]
        },
        raw: true
      });
    }

    if (!managerUser) {
      // Fallback to any Manager in the system
      managerUser = await User.findOne({
        where: {
          role: { [Op.in]: ["Department Manager", "HR Head", "Director", "Owner"] }
        },
        raw: true
      });
    }

    const formId = "EXIT-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

    const record = await ExitForm.create({
      id: formId,
      submittedBy,
      name: empName,
      category: category || "Employee",
      exitReason,
      resignationDate: resignationDate || new Date().toISOString().split("T")[0],
      handoverTo: handoverTo || "",
      department: department || profile?.department || "",
      company: company || (profile as any)?.company || "",
      assetReturn: assetReturn || false,
      accessRevoke: accessRevoke || false,
      handover: handover || false,
      finalSettlement: finalSettlement || false,
      dataAudit: dataAudit || false,
      clientTransfer: clientTransfer || false,
      ndaReminder: ndaReminder || false,
      postExitWatch: postExitWatch || false,
      finalSettlementStatus: finalSettlementStatus || "Pending Audit",
      exitFeedback: exitFeedback || "",
      postExitRisk: postExitRisk || "Low",
      approvalStage: "Pending Manager",
      managerId: managerUser?.id || null,
      managerName: managerUser?.name || reportingManagerName || "Department Manager",
      managerEmail: managerUser?.email || null,
      managerApprovalStatus: "Pending",
      ownerApprovalStatus: "Pending",
      hrApprovalStatus: "Pending"
    });

    await logAudit({
      userId: submittedBy,
      action: "SUBMIT_FORM_13",
      entity: "ExitForm",
      details: `Submitted exit form ${formId} for ${empName} — Reason: ${exitReason}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // EMAIL 1: Send notification email to BOTH Department Reporting Manager & Owner
    const recipientEmails: string[] = [];
    if (managerUser?.email) {
      recipientEmails.push(managerUser.email);
    }

    try {
      const ownerUsers = await User.findAll({
        where: {
          role: { [Op.or]: [{ [Op.like]: "%Owner%" }, { [Op.like]: "%Director%" }] }
        },
        raw: true
      });
      ownerUsers.forEach((o: any) => {
        if (o.email && !recipientEmails.includes(o.email)) {
          recipientEmails.push(o.email);
        }
      });
    } catch (e) {
      console.error("Error fetching owners for exit email:", e);
    }

    if (recipientEmails.length > 0) {
      const notificationEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="background-color: #714B67; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">RS9 Group HR Governance System</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">New Exit & Separation Clearance Request</p>
          </div>
          <div style="padding: 20px; color: #333; line-height: 1.6;">
            <p>Dear <strong>Management & Department Manager</strong>,</p>
            <p>Employee <strong>${empName}</strong> (${(session.user as any).email || "Staff"}) has submitted a new <strong>Exit & Separation Clearance Request</strong>.</p>
            
            <div style="background-color: #f9f8fb; border-left: 4px solid #714B67; padding: 12px; margin: 15px 0;">
              <p style="margin: 0; font-size: 13px;"><strong>Employee Name:</strong> ${empName}</p>
              <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Department:</strong> ${department || profile?.department || "N/A"}</p>
              <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Resignation Date:</strong> ${resignationDate || "Today"}</p>
              <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Exit Reason:</strong> ${exitReason}</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Form ID: ${formId}</p>
            </div>
            
            <p><strong>Action Required:</strong> Department Reporting Manager (<strong>${managerUser?.name || reportingManagerName || "Manager"}</strong>) & Owner can log in to the HRMS Dashboard under <em>Exit & Separation Clearance</em> to review and process approval (Direct Exit vs Notice Period).</p>
          </div>
          <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
            RS9 Group Enterprise HR & Governance System
          </div>
        </div>
      `;

      sendEmail({
        to: recipientEmails,
        subject: `[Action Required] New Exit Request Submitted by ${empName}`,
        html: notificationEmailHtml
      }).catch(err => console.error("Error sending email to manager & owner:", err));
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    console.error("FORM-13 Submission Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Fetch FORM-13 records
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await initDB();

    const currentUserId = (session.user as any).id;
    const dbUser: any = await User.findByPk(currentUserId, { raw: true });
    const userRole = dbUser?.role || (session.user as any).role || "Employee";
    const userName = dbUser?.name || (session.user as any).name || "";

    const isManager = userRole !== "Employee" || userRole.toLowerCase().includes("manager");

    const records = await ExitForm.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    const userIds = Array.from(new Set(records.map(r => (r as any).submittedBy).filter(Boolean)));
    let userMap: any = {};

    if (userIds.length > 0) {
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'name', 'email', 'role']
      });

      userMap = users.reduce((acc: any, u: any) => {
        acc[u.id] = u.toJSON();
        return acc;
      }, {});
    }

    const data = records.map(r => {
      const rJson = r.toJSON() as any;
      rJson.submittedByUser = userMap[rJson.submittedBy] || null;
      return rJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Process Exit Clearance Decision (Manager, Owner, HR)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await initDB();

    const userId = (session.user as any).id;
    const dbUser: any = await User.findByPk(userId, { raw: true });
    const userName = dbUser?.name || (session.user as any).name || "Manager";
    const userRole = dbUser?.role || (session.user as any).role || "Employee";
    const userRoleLower = userRole.toLowerCase().trim();

    const body = await req.json();
    const {
      formId,
      action, // "manager_decision" | "owner_decision" | "hr_decision"
      decision, // "approve" | "reject"
      exitType, // "Direct Exit" | "Notice Period"
      noticePeriodDays,
      lastWorkingDay,
      remarks,
      assetReturn,
      accessRevoke,
      handover,
      finalSettlement,
      exitFeedback
    } = body;

    if (!formId) {
      return NextResponse.json({ success: false, error: "Missing formId" }, { status: 400 });
    }

    const exitForm = await ExitForm.findByPk(formId);
    if (!exitForm) {
      return NextResponse.json({ success: false, error: "Exit form record not found" }, { status: 404 });
    }

    // Submitter user details for sending emails
    const submitter = await User.findByPk(exitForm.submittedBy, { raw: true });
    const empEmail = submitter?.email || null;
    const empName = exitForm.name || submitter?.name || "Employee";

    const isApprove = decision === "approve";
    const now = new Date();

    if (exitForm.submittedBy === userId) {
      return NextResponse.json({ success: false, error: "You cannot approve your own exit request" }, { status: 403 });
    }

    if (action === "manager_decision") {
      // Stage 1: Department Reporting Manager decision

      if (isApprove) {
        await exitForm.update({
          approvalStage: "Pending Owner",
          exitType: exitType || "Direct Exit",
          noticePeriodDays: exitType === "Notice Period" ? Number(noticePeriodDays || 30) : 0,
          lastWorkingDay: exitType === "Notice Period" ? (lastWorkingDay || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
          managerApprovalStatus: "Approved",
          managerRemarks: remarks || "Approved by Department Manager",
          managerApprovedAt: now,
          managerName: userName
        });

        // Send Email 2A to Employee
        if (empEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="background-color: #2e7d32; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Exit Request Status Update</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Approved by Department Manager</p>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear <strong>${empName}</strong>,</p>
                <p>Your Department Reporting Manager <strong>${userName}</strong> has <strong>APPROVED</strong> your Exit Request.</p>
                
                <div style="background-color: #f1f8e9; border-left: 4px solid #2e7d32; padding: 12px; margin: 15px 0;">
                  <p style="margin: 0;"><strong>Exit Mode Selected:</strong> ${exitType || "Direct Exit"}</p>
                  ${exitType === "Notice Period" ? `<p style="margin: 5px 0 0 0;"><strong>Notice Period Days:</strong> ${noticePeriodDays || 30} days</p>` : ''}
                  <p style="margin: 5px 0 0 0;"><strong>Last Working Day:</strong> ${lastWorkingDay || "Immediate"}</p>
                  ${remarks ? `<p style="margin: 5px 0 0 0;"><strong>Manager Remarks:</strong> ${remarks}</p>` : ''}
                </div>

                <p>Your request has now been forwarded to the <strong>Owner & Executive Management Board</strong> for Stage 2 Executive Approval.</p>
              </div>
              <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
                RS9 Group Enterprise HR & Governance System
              </div>
            </div>
          `;
          sendEmail({ to: empEmail, subject: `Exit Request Update — Approved by Department Manager (${exitType})`, html: emailHtml }).catch(e => console.error("Email err:", e));
        }

      } else {
        await exitForm.update({
          approvalStage: "Rejected",
          managerApprovalStatus: "Rejected",
          managerRemarks: remarks || "Rejected by Department Manager",
          rejectionReason: remarks || "Rejected by Department Manager",
          managerApprovedAt: now,
          managerName: userName
        });

        // Send Email 2B to Employee (Rejection)
        if (empEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="background-color: #c62828; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Exit Request Status Update</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Rejected by Department Manager</p>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear <strong>${empName}</strong>,</p>
                <p>Your Department Reporting Manager <strong>${userName}</strong> has <strong>REJECTED</strong> your Exit Request.</p>
                
                <div style="background-color: #ffebee; border-left: 4px solid #c62828; padding: 12px; margin: 15px 0;">
                  <p style="margin: 0;"><strong>Rejection Reason / Remarks:</strong> ${remarks || "Request rejected by manager."}</p>
                </div>
              </div>
              <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
                RS9 Group Enterprise HR & Governance System
              </div>
            </div>
          `;
          sendEmail({ to: empEmail, subject: `Exit Request Update — Rejected by Department Manager`, html: emailHtml }).catch(e => console.error("Email err:", e));
        }
      }

    } else if (action === "owner_decision") {
      // Stage 2: Owner / Executive Board
      const isAllowedOwner = userRoleLower.includes("owner") || ["director", "manager", "hr", "admin", "head"].some(r => userRoleLower.includes(r));
      if (!isAllowedOwner) {
        return NextResponse.json({ success: false, error: "Unauthorized owner decision role" }, { status: 403 });
      }

      if (isApprove) {
        await exitForm.update({
          approvalStage: "Pending HR",
          ownerApprovalStatus: "Approved",
          ownerRemarks: remarks || "Approved by Executive Management",
          ownerApprovedAt: now
        });

        // Send Email 3A to Employee
        if (empEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="background-color: #1565c0; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Executive Exit Approval</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Approved by Owner / Director Board</p>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear <strong>${empName}</strong>,</p>
                <p>Executive Management (Owner/Director) has <strong>APPROVED</strong> your exit request.</p>
                
                <div style="background-color: #e3f2fd; border-left: 4px solid #1565c0; padding: 12px; margin: 15px 0;">
                  <p style="margin: 0;"><strong>Executive Remarks:</strong> ${remarks || "Approved by Owner"}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Exit Mode:</strong> ${exitForm.exitType || "Direct Exit"}</p>
                </div>

                <p>Your file is now in Stage 3 with the <strong>HR Department</strong> for final checklist clearance, IT asset handovers, and final financial settlement.</p>
              </div>
              <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
                RS9 Group Enterprise HR & Governance System
              </div>
            </div>
          `;
          sendEmail({ to: empEmail, subject: `Exit Request Update — Approved by Management / Owner`, html: emailHtml }).catch(e => console.error("Email err:", e));
        }

      } else {
        await exitForm.update({
          approvalStage: "Rejected",
          ownerApprovalStatus: "Rejected",
          ownerRemarks: remarks || "Rejected by Owner",
          rejectionReason: remarks || "Rejected by Owner",
          ownerApprovedAt: now
        });

        if (empEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="background-color: #c62828; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Executive Exit Update</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Rejected by Executive Board</p>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear <strong>${empName}</strong>,</p>
                <p>Executive Management (Owner/Director) has <strong>REJECTED</strong> your exit request.</p>
                
                <div style="background-color: #ffebee; border-left: 4px solid #c62828; padding: 12px; margin: 15px 0;">
                  <p style="margin: 0;"><strong>Remarks:</strong> ${remarks || "Rejected by Owner"}</p>
                </div>
              </div>
              <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
                RS9 Group Enterprise HR & Governance System
              </div>
            </div>
          `;
          sendEmail({ to: empEmail, subject: `Exit Request Update — Rejected by Executive Management`, html: emailHtml }).catch(e => console.error("Email err:", e));
        }
      }

    } else if (action === "hr_decision") {
      // Stage 3: HR Department Final Clearance
      const isAllowedHR = userRoleLower.includes("hr") || ["admin", "owner", "director", "manager", "head"].some(r => userRoleLower.includes(r));
      if (!isAllowedHR) {
        return NextResponse.json({ success: false, error: "Unauthorized HR decision role" }, { status: 403 });
      }

      if (isApprove) {
        await exitForm.update({
          approvalStage: "Approved",
          hrApprovalStatus: "Approved",
          hrRemarks: remarks || "Final clearance granted by HR Department",
          hrApprovedAt: now,
          assetReturn: assetReturn !== undefined ? assetReturn : exitForm.assetReturn,
          accessRevoke: accessRevoke !== undefined ? accessRevoke : exitForm.accessRevoke,
          handover: handover !== undefined ? handover : exitForm.handover,
          finalSettlement: finalSettlement !== undefined ? finalSettlement : exitForm.finalSettlement,
          exitFeedback: exitFeedback || exitForm.exitFeedback
        });

        // Soft-update employee status in User table
        if (submitter) {
          const newStatus = exitForm.exitType === "Direct Exit" ? "inactive" : "on notice";
          await User.update({ status: newStatus }, { where: { id: submitter.id } }).catch(() => {});
        }

        // Send Email 4A to Employee
        if (empEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="background-color: #714B67; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Exit & Separation Clearance Complete</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Fully Approved by HR Department</p>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear <strong>${empName}</strong>,</p>
                <p>Your <strong>Exit & Separation Clearance</strong> is now <strong>FULLY APPROVED & COMPLETED</strong> by the HR Department.</p>
                
                <div style="background-color: #f9f8fb; border-left: 4px solid #714B67; padding: 12px; margin: 15px 0;">
                  <p style="margin: 0;"><strong>Final Settlement Status:</strong> Approved & Processed</p>
                  <p style="margin: 5px 0 0 0;"><strong>HR Remarks:</strong> ${remarks || "Clearance completed"}</p>
                </div>

                <p>We thank you for your contributions to RS9 Group and wish you success in your future endeavors.</p>
              </div>
              <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
                RS9 Group Enterprise HR & Governance System
              </div>
            </div>
          `;
          sendEmail({ to: empEmail, subject: `Exit & Separation Clearance — Fully Approved`, html: emailHtml }).catch(e => console.error("Email err:", e));
        }

      } else {
        await exitForm.update({
          approvalStage: "Rejected",
          hrApprovalStatus: "Rejected",
          hrRemarks: remarks || "Rejected by HR",
          rejectionReason: remarks || "Rejected by HR",
          hrApprovedAt: now
        });

        if (empEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <div style="background-color: #c62828; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Exit Clearance Update</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Rejected by HR Department</p>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear <strong>${empName}</strong>,</p>
                <p>Your exit clearance request was rejected during HR review.</p>
                <p><strong>HR Remarks:</strong> ${remarks || "Clearance rejected."}</p>
              </div>
              <div style="text-align: center; padding: 15px; font-size: 11px; color: #888; border-top: 1px solid #eee;">
                RS9 Group Enterprise HR & Governance System
              </div>
            </div>
          `;
          sendEmail({ to: empEmail, subject: `Exit Request Update — Rejected by HR Department`, html: emailHtml }).catch(e => console.error("Email err:", e));
        }
      }
    }

    await logAudit({
      userId,
      action: "PROCESS_EXIT_FORM_DECISION",
      entity: "ExitForm",
      details: `${action} decision: ${decision} for form ${formId}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, data: exitForm });
  } catch (error: any) {
    console.error("Error processing exit decision:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
