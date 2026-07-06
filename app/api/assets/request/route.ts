import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import AssetRequest from "@/models/sequelize/AssetRequest";
import Notification from "@/models/sequelize/Notification";
import { sendEmail } from "@/lib/email";
import { Op } from "sequelize";
import Department from "@/models/sequelize/Department";
import AssetPurchaseRequest from "@/models/sequelize/AssetPurchaseRequest";

// ─── Asset Request Approval Helper Functions ───────────────────────────────

function getUserCompanies(user: any): string[] {
  if (!user || !user.companies) return [];
  try {
    const parsed = typeof user.companies === "string" ? JSON.parse(user.companies) : user.companies;
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed) return [String(parsed)];
    return [];
  } catch {
    return [String(user.companies)];
  }
}

async function findDepartmentManagers(applicantId: string, department: string) {
  const applicantUser = await User.findByPk(applicantId);
  if (!applicantUser) return [];
  const applicantCompanies = getUserCompanies(applicantUser);

  const managers = await User.findAll({
    where: {
      role: { [Op.in]: ["Department Manager", "department manager", "department-manager"] },
      status: "active"
    }
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

function getAssetRequestEmailHtml(params: {
  applicantName: string;
  department: string;
  assetType: string;
  priority: string;
  reason: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#1e293b}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 24px;color:#fff;text-align:center}
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
    <h1>💻 New Asset Request</h1>
    <p>Approval is required for this asset request</p>
  </div>
  <div class="body">
    <p>Hello,</p>
    <p>A new asset request has been submitted and is pending your review:</p>
    <table class="field-table">
      <tr><td class="label">Requester</td><td><strong>${params.applicantName}</strong> (${params.department})</td></tr>
      <tr><td class="label">Asset Type</td><td><span style="background:#ccfbf1;color:#0f766e;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.assetType}</span></td></tr>
      <tr><td class="label">Priority</td><td><span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">${params.priority}</span></td></tr>
    </table>
    <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:16px">Reason / Justification:</div>
    <div class="reason-box">"${params.reason}"</div>
    <p style="text-align:center;margin-top:24px">
      <a href="https://hrms.cfi247.com/" style="background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">Review Request →</a>
    </p>
  </div>
  <div class="footer">RS9 Group HRMS • This is an automated notification</div>
</div>
</body></html>`;
}


export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await AssetRequest.sync({ alter: true });

    const userId = (session.user as any).id;

    // Fetch live user role to avoid session caching issues
    const dbUser = await User.findByPk(userId, { raw: true });
    const rawRole = dbUser?.role || "Employee";
    const userRole = rawRole.toLowerCase();

    const isOwnerOrDirector = ["owner", "director"].includes(userRole);
    const isHR = ["hr head", "hr-head", "hr executive", "hr-executive"].includes(userRole);
    const isDeptManager = userRole === "department manager" || userRole === "department-manager";

    // Fetch live department name to see if user is in Administration department
    let isAdministration = false;
    const userProfile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
    if (userProfile && userProfile.department) {
      const dept = await Department.findByPk(userProfile.department, { raw: true });
      if (dept && dept.name) {
        isAdministration = dept.name.toLowerCase().includes("administration");
      }
    }

    let whereClause: any = {};
    if (isOwnerOrDirector || isHR) {
      whereClause = {};
    } else if (isAdministration) {
      // Administration can see approved/dispatched requests + their own requests
      whereClause = {
        [Op.or]: [
          { status: { [Op.in]: ["Approved", "Dispatched", "Dispatched (Inventory)", "Dispatched (New Purchase)"] } },
          { employee_id: userId }
        ]
      };
    } else if (isDeptManager) {
      // Find manager's company and department
      const loggedInUser = await User.findByPk(userId, { raw: true });
      let managerCompanies: string[] = [];
      if (loggedInUser && loggedInUser.companies) {
        if (Array.isArray(loggedInUser.companies)) {
          managerCompanies = loggedInUser.companies;
        } else if (typeof loggedInUser.companies === 'string') {
          try { managerCompanies = JSON.parse(loggedInUser.companies); } catch(e) {}
        }
      }

      const managerProfile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
      const managerDept = managerProfile?.department || null;

      // Fetch all users who belong to the same companies as the manager
      const sameCompanyUsers = await User.findAll({
        attributes: ["id", "companies"],
        raw: true
      });

      const sameCompUserIds = sameCompanyUsers.filter((u: any) => {
        const uComps = getUserCompanies(u);
        return uComps.some(c => managerCompanies.includes(c));
      }).map((u: any) => u.id);

      if (managerDept) {
        const sameDeptProfiles = await EmployeeProfile.findAll({
          where: { department: managerDept },
          attributes: ["user"],
          raw: true
        });
        const sameDeptUserIds = sameDeptProfiles.map(p => p.user);
        whereClause.employee_id = sameCompUserIds.filter(id => sameDeptUserIds.includes(id));
      } else {
        whereClause.employee_id = sameCompUserIds;
      }
    } else {
      // Employees can only see their own requests
      whereClause.employee_id = userId;
    }

    const requests = await AssetRequest.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      raw: true
    });

    // Resolve employee details to attach to requests
    const users = await User.findAll({
      attributes: ["id", "name", "email"],
      raw: true
    });
    const profiles = await EmployeeProfile.findAll({
      attributes: ["user", "department"],
      raw: true
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = { name: u.name, email: u.email };
      return acc;
    }, {});

    const profileMap = profiles.reduce((acc: any, p: any) => {
      acc[p.user] = p.department;
      return acc;
    }, {});

    const enrichedRequests = requests.map((r: any) => {
      const rJson = { ...r };
      const emp = userMap[rJson.employee_id] || { name: "Unknown", email: "" };
      return {
        ...rJson,
        employee: {
          ...emp,
          department: profileMap[rJson.employee_id] || "General"
        }
      };
    });

    let allRequests = [...enrichedRequests];

    // Fetch and merge purchase requests if the logged-in user is Owner/Director
    if (isOwnerOrDirector) {
      try {
        await AssetPurchaseRequest.sync({ alter: true });
        const purchaseReqs = await AssetPurchaseRequest.findAll({
          order: [["createdAt", "DESC"]]
        });
        
        for (const pr of purchaseReqs) {
          const plain = pr.get({ plain: true });
          const reqUser = await User.findByPk(plain.requested_by, { attributes: ["name"], raw: true });
          allRequests.push({
            id: `purchase-${plain.id}`,
            employee_id: plain.requested_by,
            asset_type: `New Purchase: ${plain.asset_type}`,
            reason: `Specifications: ${plain.asset_detail}\nEstimated Cost: ₹${plain.estimated_cost}\nVendor: ${plain.vendor_details}\nJustification: ${plain.justification || 'None'}`,
            priority: "High",
            status: plain.status === "Pending Owner Approval" ? "Pending" : plain.status, // Map to Pending so Approve/Reject panel shows up!
            admin_remarks: plain.owner_remarks,
            createdAt: plain.createdAt,
            isPurchaseRequest: true,
            originalPurchaseId: plain.id,
            employee: {
              name: reqUser ? reqUser.name : "Admin Department",
              department: "Administration"
            }
          });
        }
      } catch (err) {
        console.error("Error fetching purchase requests inside request GET:", err);
      }
    }

    // Sort combined list by date
    allRequests.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: allRequests
    });
  } catch (error: any) {
    console.error("Error in GET /api/assets/request:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch live user role to avoid session caching issues
    const dbUser = await User.findByPk(userId, { raw: true });
    const rawRole = dbUser?.role || "Employee";
    const userRole = rawRole.toLowerCase();

    const isOwnerOrDirector = ["owner", "director"].includes(userRole);
    const isDeptManager = userRole === "department manager" || userRole === "department-manager";

    // Fetch live department name to see if user is in Administration department
    let isAdministration = false;
    const userProfile = await EmployeeProfile.findOne({ where: { user: userId }, raw: true });
    if (userProfile && userProfile.department) {
      const dept = await Department.findByPk(userProfile.department, { raw: true });
      if (dept && dept.name) {
        isAdministration = dept.name.toLowerCase().includes("administration");
      }
    }

    const body = await req.json();
    const { action } = body;

    await sequelize.authenticate();
    await AssetRequest.sync({ alter: true });

    if (action === "create") {
      const { asset_type, reason, priority } = body;

      if (!asset_type || !reason) {
        return NextResponse.json({ success: false, error: "Asset Type and Reason are required." }, { status: 400 });
      }

      const newRequest = await AssetRequest.create({
        employee_id: userId,
        asset_type,
        reason,
        priority: priority || "Medium",
        status: "Pending Manager Approval"
      });

      // --- Send Notification to Admins ---
      try {
        await Notification.sync({ alter: true });
        const requester = await User.findByPk(userId);
        const requesterProfile = await EmployeeProfile.findOne({ where: { user: userId } });
        const requesterCompanies = getUserCompanies(requester);
        const requesterName = requester?.name || "An employee";
        const dept = requesterProfile?.department || "General";

        // Find active department managers for this user
        let matchedApprovers: any[] = [];
        if (requesterProfile?.department) {
          matchedApprovers = await findDepartmentManagers(userId, requesterProfile.department);
        }

        // Fallback: If no department manager, notify general company HRs / Owners / Directors
        if (matchedApprovers.length === 0) {
          const admins = await User.findAll({
            where: {
              role: { [Op.in]: ["Owner", "Director", "HR Head", "HR Executive"] },
              status: "active"
            }
          });
          matchedApprovers = admins.filter((admin: any) => {
            if (admin.role === "Owner" || admin.role === "Director") return true;
            const adminComps = getUserCompanies(admin);
            return adminComps.some((c: string) => requesterCompanies.includes(c));
          });
        }

        // Create a notification in portal for each matched approver
        const adminEmails: string[] = [];
        for (const admin of matchedApprovers) {
          if (admin.id === userId) continue;
          if (admin.email) adminEmails.push(admin.email);
          await Notification.create({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
            recipient: admin.id,
            title: "New Asset Request",
            message: `${requesterName} has requested a new asset: ${asset_type}`,
            read: false
          });
        }

        // Send Email to matched Approvers
        if (adminEmails.length > 0) {
          const emailHtml = getAssetRequestEmailHtml({
            applicantName: requesterName,
            department: dept,
            assetType: asset_type,
            priority: priority || "Medium",
            reason: reason,
          });

          await sendEmail({
            to: adminEmails,
            subject: `💻 Asset Request Approval Required: ${requesterName} – ${asset_type}`,
            html: emailHtml,
          });
        }
      } catch (notifErr) {
        console.error("Error creating notifications:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Asset request submitted successfully.",
        data: newRequest
      });

    } else if (action === "update-status") {
      const { requestId, status, admin_remarks } = body;

      if (!requestId || !status) {
        return NextResponse.json({ success: false, error: "Request ID and status are required." }, { status: 400 });
      }

      // Check if this is a purchase request
      if (String(requestId).startsWith("purchase-")) {
        if (!isOwnerOrDirector) {
          return NextResponse.json({ success: false, error: "Forbidden. Only Owners can approve/reject purchase requests." }, { status: 403 });
        }
        const purchaseId = parseInt(String(requestId).replace("purchase-", ""), 10);
        const purchaseRequest = await AssetPurchaseRequest.findByPk(purchaseId);
        if (!purchaseRequest) {
          return NextResponse.json({ success: false, error: "Purchase request not found." }, { status: 404 });
        }
        
        let targetStatus = status;
        if (status === "Approved") {
          targetStatus = "Approved";
        } else if (status === "Rejected") {
          targetStatus = "Rejected";
        }

        await purchaseRequest.update({
          status: targetStatus,
          owner_remarks: admin_remarks || purchaseRequest.owner_remarks
        });

        return NextResponse.json({
          success: true,
          message: `Purchase request status updated to ${targetStatus}.`,
          data: purchaseRequest
        });
      }

      const request = await AssetRequest.findByPk(requestId);
      if (!request) {
        return NextResponse.json({ success: false, error: "Asset request not found." }, { status: 404 });
      }

      // Enforce approval/dispatch workflows
      if (status === "Approved" || status === "Rejected") {
        if (!isOwnerOrDirector && !isDeptManager) {
          return NextResponse.json({ success: false, error: "Forbidden. Only Department Managers or Owners can Approve/Reject requests." }, { status: 403 });
        }
      } else if (status === "Dispatched" || status === "Dispatched (Inventory)" || status === "Dispatched (New Purchase)") {
        if (!isOwnerOrDirector && !isAdministration) {
          return NextResponse.json({ success: false, error: "Forbidden. Only Administration department users or Owners can dispatch assets." }, { status: 403 });
        }
      } else {
        return NextResponse.json({ success: false, error: "Invalid status update." }, { status: 400 });
      }

      let nextStatus = status;
      if (status === "Approved") {
        if (isDeptManager && !isOwnerOrDirector) {
          nextStatus = "Pending Owner Approval";
        } else {
          nextStatus = "Approved";
        }
      }

      await request.update({
        status: nextStatus,
        admin_remarks: admin_remarks || request.admin_remarks
      });

      return NextResponse.json({
        success: true,
        message: `Asset request status updated to ${nextStatus}.`,
        data: request
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in POST /api/assets/request:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
