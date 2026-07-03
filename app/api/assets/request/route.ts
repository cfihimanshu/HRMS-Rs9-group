import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import AssetRequest from "@/models/sequelize/AssetRequest";
import Notification from "@/models/sequelize/Notification";
import { sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await AssetRequest.sync({ alter: true });

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Check if user has HR Admin/Owner role
    const isOwnerOrHR = ["Owner", "Director", "HR Head", "HR Executive"].includes(userRole);
    const isDeptManager = userRole === "Department Manager";

    let whereClause: any = {};
    if (isOwnerOrHR) {
      whereClause = {};
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
        let uComps: string[] = [];
        if (Array.isArray(u.companies)) uComps = u.companies;
        else if (typeof u.companies === 'string') {
          try { uComps = JSON.parse(u.companies); } catch(e) {}
        }
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

    return NextResponse.json({
      success: true,
      data: enrichedRequests
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

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
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
        const requesterCompanies = requester?.companies || [];
        const requesterName = requester?.name || "An employee";

        const admins = await User.findAll({
          where: {
            role: ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"]
          },
          raw: true
        });

        // Filter admins who belong to the same company, plus Owners who see everything
        const targetAdmins = admins.filter((admin: any) => {
          if (admin.role === "Owner" || admin.role === "Director") return true;
          const adminComps = admin.companies || [];
          return adminComps.some((c: string) => requesterCompanies.includes(c));
        });

        // Create a notification for each admin
        const adminEmails: string[] = [];
        for (const admin of targetAdmins) {
          if (admin.email) adminEmails.push(admin.email);
          await Notification.create({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
            recipient: admin.id,
            title: "New Asset Request",
            message: `${requesterName} has requested a new asset: ${asset_type}`,
            read: false
          });
        }

        // Send Email to all Admins
        if (adminEmails.length > 0) {
          await sendEmail({
            to: adminEmails,
            subject: `New Asset Request from ${requesterName}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #333;">New Asset Request</h2>
                <p><strong>Employee:</strong> ${requesterName}</p>
                <p><strong>Asset Type:</strong> ${asset_type}</p>
                <p><strong>Priority:</strong> ${priority || "Medium"}</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <br />
                <p>Please log in to the HR Management portal to approve or reject this request.</p>
              </div>
            `
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
      const isManagerOrOwner = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);
      if (!isManagerOrOwner) {
        return NextResponse.json({ success: false, error: "Forbidden. Managers only." }, { status: 403 });
      }

      const { requestId, status, admin_remarks } = body;

      if (!requestId || !status) {
        return NextResponse.json({ success: false, error: "Request ID and status are required." }, { status: 400 });
      }

      const request = await AssetRequest.findByPk(requestId);
      if (!request) {
        return NextResponse.json({ success: false, error: "Asset request not found." }, { status: 404 });
      }

      let nextStatus = status;
      if (status === "Approved") {
        if (userRole === "Department Manager") {
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
