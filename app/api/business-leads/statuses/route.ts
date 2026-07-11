import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadStatus from "@/models/sequelize/LeadStatus";

const defaultStatuses = [
  "No Answer",
  "Busy",
  "Connected & Interested",
  "Not Interested",
  "Interview Scheduled",
  "Rejected"
];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await LeadStatus.sync({ alter: true });

    let statuses = await LeadStatus.findAll({ order: [["createdAt", "ASC"]] });

    if (statuses.length === 0) {
      for (const name of defaultStatuses) {
        const id = "status_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        await LeadStatus.create({ id, name, status: "Active" });
      }
      statuses = await LeadStatus.findAll({ order: [["createdAt", "ASC"]] });
    }

    return NextResponse.json({ success: true, data: statuses });
  } catch (error: any) {
    console.error("Failed to fetch lead statuses:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Status name is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LeadStatus.sync({ alter: true });

    const id = "status_" + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const [status, created] = await LeadStatus.findOrCreate({
      where: { name: name.trim() },
      defaults: { id, name: name.trim(), status: "Active" }
    });

    return NextResponse.json({ success: true, data: status, created });
  } catch (error: any) {
    console.error("Failed to create lead status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
