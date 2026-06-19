import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import AssetRequest from "@/models/sequelize/AssetRequest";

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
    const isManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(userRole);

    let whereClause: any = {};
    if (!isManager) {
      // Employees can only see their own requests
      whereClause.employee_id = userId;
    }

    const requests = await AssetRequest.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]]
    });

    // Resolve employee details to attach to requests
    const users = await User.findAll({
      attributes: ["mongo_id", "name", "email"]
    });
    const profiles = await EmployeeProfile.findAll({
      attributes: ["user", "department"]
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.mongo_id] = { name: u.name, email: u.email };
      return acc;
    }, {});

    const profileMap = profiles.reduce((acc: any, p: any) => {
      acc[p.user] = p.department;
      return acc;
    }, {});

    const enrichedRequests = requests.map((r: any) => {
      const rJson = r.toJSON();
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
        status: "Pending"
      });

      return NextResponse.json({
        success: true,
        message: "Asset request submitted successfully.",
        data: newRequest
      });

    } else if (action === "update-status") {
      // Only HR / Owners can update the status
      const isManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(userRole);
      if (!isManager) {
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

      await request.update({
        status,
        admin_remarks: admin_remarks || request.admin_remarks
      });

      return NextResponse.json({
        success: true,
        message: `Asset request status updated to ${status}.`,
        data: request
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in POST /api/assets/request:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
