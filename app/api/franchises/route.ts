import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import FranchiseRegistration, { ensureFranchiseRegistrationSchema } from "@/models/sequelize/FranchiseRegistration";
import { logAudit } from "@/lib/audit";
import User from "@/models/sequelize/User";

// GET: Retrieve franchise partners list
export async function GET() {
  try {
    await sequelize.authenticate();
    await FranchiseRegistration.sync({ alter: true });
    await ensureFranchiseRegistrationSchema();

    const franchises = await FranchiseRegistration.findAll({
      order: [['createdAt', 'DESC']]
    });

    const userIds = franchises.map(f => (f as any).registeredBy).filter(Boolean);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'email', 'mobile', 'status']
    }).catch(() => []);

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = u.toJSON();
      return acc;
    }, {});

    const data = franchises.map(f => {
      const fJson = f.toJSON() as any;
      fJson.user = userMap[fJson.registeredBy] || {
        id: fJson.registeredBy || fJson.id,
        name: fJson.contactPerson || fJson.partnerName || "Franchise Partner",
        email: fJson.email || "N/A",
        mobile: fJson.mobile || "N/A"
      };
      return fJson;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Franchises Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update Franchise profile
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await FranchiseRegistration.sync({ alter: true });
    await ensureFranchiseRegistrationSchema();

    const body = await req.json();
    const { partnerName, territory, email, mobile, contactPerson, status } = body;

    const record = await FranchiseRegistration.create({
      id: Date.now().toString(),
      registeredBy: (session.user as any).id,
      partnerName: partnerName || contactPerson || "Franchise Partner",
      contactPerson: contactPerson || partnerName,
      email: email || "",
      mobile: mobile || "",
      territory: territory || "General",
      status: status || "Pending"
    });

    await logAudit({
      userId: (session.user as any).id,
      action: "REGISTER_FRANCHISE",
      entity: "FranchiseRegistration",
      entityId: record.id,
      details: `Registered Franchise profile: ${partnerName || contactPerson}`,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("POST Franchise Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
