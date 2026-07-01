// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Grievance from "@/models/sequelize/Grievance";
import User from "@/models/sequelize/User";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// GET: Fetch all active grievances
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const isHrOrOwner = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive"].includes(role);

    await sequelize.authenticate();

    let query: any = { status: { [Op.ne]: "inactive" } };

    // If not HR or Owner, only return grievances raised by this user
    if (!isHrOrOwner) {
      query.raisedBy = userId;
    }

    const items = await Grievance.findAll({ 
      where: query,
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const userIds = [...new Set([
      ...items.map((i: any) => i.raisedBy),
      ...items.map((i: any) => i.assignedTo)
    ].filter(Boolean))];

    let userMap: any = {};
    if (userIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, raw: true });
      users.forEach((u: any) => {
        userMap[u.id] = { name: u.name, email: u.email, role: u.role };
      });
    }

    // Privacy Protection: Mask raisedBy if submitted anonymously
    const maskedItems = items.map((item: any) => {
      const doc = { 
        ...item,
        raisedBy: userMap[item.raisedBy] || null,
        assignedTo: userMap[item.assignedTo] || null
      };
      if (doc.anonymous && !isHrOrOwner) {
        doc.raisedBy = { name: "Anonymous Employee", email: "hidden", role: "Employee" };
      } else if (doc.anonymous && isHrOrOwner) {
        // HR/Owners can see who raised it for auditing but let's label it clearly
        doc.raisedBy = { 
          name: `Anonymous [Auditable: ${(doc.raisedBy as any)?.name || "Unknown"}]`,
          email: (doc.raisedBy as any)?.email,
          role: (doc.raisedBy as any)?.role 
        };
      }
      return doc;
    });

    return NextResponse.json({ success: true, data: maskedItems });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit a new grievance ticket
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { category, priority, anonymous, description } = body;

    if (!category || !priority || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await sequelize.authenticate();

    const record = await Grievance.create({
      id: Date.now().toString(),
      raisedBy: userId,
      category,
      priority,
      anonymous: !!anonymous,
      description,
      status: "Open",
    });

    await logAudit({
      userId,
      action: "GRIEVANCE_FILED",
      entity: "Grievance",
      entityId: (record as any).id ? (record as any).id.toString() : record.id,
      details: `Grievance ticket filed. Category: ${category}, Priority: ${priority}, Anonymous: ${!!anonymous}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Grievance submission failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Resolve or update ticket status (HR & Managers only)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "IT Admin", "HR Head", "HR Executive", "Department Manager"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { grievanceId, status, resolutionReport } = body;

    if (!grievanceId || !status) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await sequelize.authenticate();

    const record = await Grievance.findByPk(grievanceId);
    if (!record) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    record.status = status;
    if (resolutionReport) {
      record.resolutionReport = resolutionReport;
    }
    record.assignedTo = userId;
    await record.save();

    await logAudit({
      userId,
      action: "GRIEVANCE_RESOLVED",
      entity: "Grievance",
      entityId: (record as any).id ? (record as any).id.toString() : record.id,
      details: `Grievance ticket ID ${(record as any).id ? (record as any).id.toString() : record.id} updated to status ${status}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Grievance update failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
