import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AssetPurchaseRequest from "@/models/sequelize/AssetPurchaseRequest";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try { await AssetPurchaseRequest.sync({ alter: true }); } catch (_) {}

    const userId = (session.user as any).id;
    // Fetch live user role to avoid session caching issues
    const dbUser = await User.findByPk(userId, { raw: true });
    const rawRole = dbUser?.role || "Employee";
    const userRole = rawRole.toLowerCase();

    const isOwnerOrDirector = ["owner", "director"].includes(userRole);

    let whereClause: any = {};
    if (!isOwnerOrDirector) {
      // Admin/Employees only see requests they submitted
      whereClause.requested_by = userId;
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    if (companyId) {
      whereClause.company_id = companyId;
    }

    const records = await AssetPurchaseRequest.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]]
    });

    // Resolve requester names
    const resolvedRecords = [];
    for (const r of records) {
      const plain = r.get({ plain: true });
      const reqUser = await User.findByPk(plain.requested_by, { attributes: ["name"], raw: true });
      plain.requester = reqUser ? reqUser.name : "Unknown Employee";
      resolvedRecords.push(plain);
    }

    return NextResponse.json({ success: true, data: resolvedRecords });
  } catch (error: any) {
    console.error("[/api/assets/purchase GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try { await AssetPurchaseRequest.sync({ alter: true }); } catch (_) {}

    const userId = (session.user as any).id;
    // Fetch live user role to avoid session caching issues
    const dbUser = await User.findByPk(userId, { raw: true });
    const rawRole = dbUser?.role || "Employee";
    const userRole = rawRole.toLowerCase();

    const isOwnerOrDirector = ["owner", "director"].includes(userRole);

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { asset_type, asset_detail, estimated_cost, vendor_details, justification, company_id } = body;

      if (!asset_type || !asset_detail || !estimated_cost || !vendor_details) {
        return NextResponse.json({ success: false, error: "Asset Type, Details, Cost, and Vendor Details are required." }, { status: 400 });
      }

      const newRequest = await AssetPurchaseRequest.create({
        requested_by: userId,
        asset_type,
        asset_detail,
        estimated_cost,
        vendor_details,
        justification: justification || "",
        company_id: company_id || null,
        status: "Pending Owner Approval"
      });

      return NextResponse.json({
        success: true,
        message: "Purchase request submitted successfully.",
        data: newRequest
      });

    } else if (action === "update-status") {
      if (!isOwnerOrDirector) {
        return NextResponse.json({ success: false, error: "Forbidden. Only Owners/Directors can approve/reject purchase requests." }, { status: 403 });
      }

      const { requestId, status, owner_remarks } = body;

      if (!requestId || !status) {
        return NextResponse.json({ success: false, error: "Request ID and status are required." }, { status: 400 });
      }

      const request = await AssetPurchaseRequest.findByPk(requestId);
      if (!request) {
        return NextResponse.json({ success: false, error: "Purchase request not found." }, { status: 404 });
      }

      if (!["Approved", "Rejected", "Registered"].includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status update value." }, { status: 400 });
      }

      await request.update({
        status,
        owner_remarks: owner_remarks !== undefined ? owner_remarks : request.owner_remarks
      });

      return NextResponse.json({
        success: true,
        message: `Purchase request status updated to ${status}.`,
        data: request
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[/api/assets/purchase POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
