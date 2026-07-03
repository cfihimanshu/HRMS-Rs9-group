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

      if (type !== "Unpaid Leave" && balance < days) {
        return NextResponse.json({ success: false, error: `Insufficient ${type} balance. (Available: ${balance})` }, { status: 400 });
      }
    }

    // Determine initial approval status based on roles and reporting structure
    let initialStatus = "Pending Manager Approval";

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
          const companyManagers = allUsers.filter((u: any) => {
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
      status: initialStatus
    });

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

    let filter: any = {};

    if (userRole === "Employee") {
      filter = { employee: userId };
    } else if (userRole === "Department Manager") {
      // Get manager's department
      const managerProfile = await EmployeeProfile.findOne({ where: { user: userId } });
      if (managerProfile && managerProfile.department) {
        // Find users in the same department
        const profilesInDept = await EmployeeProfile.findAll({
          where: { department: managerProfile.department },
          attributes: ["user"]
        });
        const deptUserIds = profilesInDept.map((p: any) => p.user).filter(Boolean);

        // Manager sees their own leaves plus their department's leaves
        filter = {
          [Op.or]: [
            { employee: userId },
            { employee: { [Op.in]: deptUserIds } }
          ]
        };
      } else {
        filter = { employee: userId };
      }
    } else {
      // HR/Owner/Director sees leaves from the same company
      if (loggedInUserCompanies.length > 0) {
        filter = {
          employee: { [Op.in]: sameCompanyUserIds }
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

    // Check privileges
    const isPrivileged = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(loggedInUserRole);
    if (!isPrivileged) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

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

    if (currentStatus === "Pending Manager Approval" || currentStatus === "Pending") {
      // Who can approve Manager stage?
      // 1. Department Manager (same department, same company)
      // 2. Company Manager (Owner, Director, or role containing "manager", same company)
      const isDeptManager = loggedInUserRole === "Department Manager";
      const isCompanyManager = ["Owner", "Director"].includes(loggedInUserRole) || (loggedInUserRole || "").toLowerCase().includes("manager");

      if (loggedInUserCompanies.length > 0 && !isSameCompany) {
        return NextResponse.json({ success: false, error: "Access Denied: Applicant belongs to a different company." }, { status: 403 });
      }

      if (isDeptManager) {
        const managerProfile = await EmployeeProfile.findOne({ where: { user: loggedInUserId } });
        if (!applicantProfile || !managerProfile || applicantProfile.department !== managerProfile.department) {
          return NextResponse.json({ success: false, error: "Access Denied: You are not the manager of this department." }, { status: 403 });
        }
      } else if (!isCompanyManager) {
        return NextResponse.json({ success: false, error: "Access Denied: Only managers can approve at this stage." }, { status: 403 });
      }

      // If approved, proceed to Pending HR Approval. If rejected, set to Rejected.
      finalStatus = status === "Approved" ? "Pending HR Approval" : "Rejected";
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
    } else {
      return NextResponse.json({ success: false, error: "This leave request cannot be processed in its current state." }, { status: 400 });
    }

    (leave as any).status = finalStatus;
    (leave as any).approvedBy = loggedInUserId;
    if (remarks) (leave as any).remarks = remarks;

    await leave.save();

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
