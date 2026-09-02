import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";
import { sendEmail } from "@/lib/email";

export async function sendRequestNotification({
  applicantId,
  requestType,
  action,
  details,
  fallbackDepartment,
}: {
  applicantId: string;
  requestType: string;
  action:
    | "created"
    | "approved_by_manager"
    | "approved_by_hr"
    | "rejected_by_manager"
    | "rejected_by_hr"
    | "approved"
    | "rejected"
    | "dispatched"
    | "hold"
    | "sourcing_reviewed"
    | "accounts_reviewed";
  details: string;
  fallbackDepartment?: string;
}) {
  try {
    await Notification.sync();

    // Find applicant and their department ID
    let departmentId = "";
    if (applicantId) {
      const profile = await EmployeeProfile.findOne({ where: { user: applicantId } });
      if (profile && profile.department) {
        departmentId = profile.department;
      }
    }

    if (!departmentId && fallbackDepartment) {
      const deptDoc = await Department.findOne({ where: { name: fallbackDepartment } });
      if (deptDoc) {
        departmentId = deptDoc.id;
      }
    }

    // Find Owners (case-insensitive role check)
    const allActiveUsers = await User.findAll({
      where: { status: "active" },
      attributes: ["id", "name", "role", "email"],
      raw: true
    });
    const owners = allActiveUsers.filter((u: any) => String(u.role || "").toLowerCase().includes("owner"));

    // Find Department Managers of applicant's department
    const managers: any[] = [];
    if (departmentId) {
      const allManagers = await User.findAll({
        where: {
          role: { [Op.in]: ["Department Manager", "department manager", "department-manager"] },
          status: "active"
        }
      });
      for (const m of allManagers) {
        const mProfile = await EmployeeProfile.findOne({ where: { user: m.id } });
        if (mProfile && mProfile.department === departmentId && m.id !== applicantId) {
          managers.push(m);
        }
      }
    }

    // Unique recipients list
    const recipientIds = new Set<string>();

    // 1. Owner gets notified of ALL request activities
    owners.forEach(owner => {
      if (owner.id !== applicantId) {
        recipientIds.add(owner.id);
      }
    });

    // 2. Department Manager gets notified of department activity
    managers.forEach(manager => {
      recipientIds.add(manager.id);
    });

    // 3. Applicant gets notified for status updates (approvals, rejections, hold, dispatch, etc.)
    const isStatusUpdate = action !== "created";
    if (isStatusUpdate && applicantId) {
      recipientIds.add(applicantId);
    }

    const titleMap: Record<string, string> = {
      created: `New ${requestType} Request`,
      approved: `${requestType} Request Approved`,
      rejected: `${requestType} Request Rejected`,
      approved_by_manager: `${requestType} Approved by Manager`,
      approved_by_hr: `${requestType} Approved by HR`,
      rejected_by_manager: `${requestType} Rejected by Manager`,
      rejected_by_hr: `${requestType} Rejected by HR`,
      dispatched: `${requestType} Dispatched`,
      hold: `${requestType} On Hold`,
      sourcing_reviewed: `${requestType} Sourcing Reviewed`,
      accounts_reviewed: `${requestType} Accounts Reviewed`
    };

    const title = titleMap[action] || `${requestType} Request Update`;

    for (const recipientId of recipientIds) {
      await Notification.create({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        recipient: recipientId,
        title,
        message: details,
        read: false
      });
    }

    const ownerEmails = [...new Set(owners.map((owner: any) => String(owner.email || "").trim()).filter(Boolean))];
    if (ownerEmails.length) {
      const emailResult = await sendEmail({
        to: ownerEmails,
        subject: `RS9 HRMS — ${title}`,
        html: `<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6"><h2>${title}</h2><p>${String(details).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p><p style="font-size:12px;color:#64748b">RS9 Group HRMS · Automated notification</p></div>`,
      });
      if (!emailResult.success) console.error("[sendRequestNotification] Owner email failed:", emailResult.error);
    }

  } catch (err) {
    console.error("[sendRequestNotification] Error:", err);
  }
}
