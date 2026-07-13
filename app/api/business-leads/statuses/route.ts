import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadStatus from "@/models/sequelize/LeadStatus";

const defaultStatuses = [
  { name: "No Answer", hasScreenshot: true },
  { name: "Busy", hasScreenshot: true },
  { name: "Connected & Interested", hasAudio: true },
  { name: "Not Interested", hasAudio: true },
  { name: "Interview Scheduled", hasSchedule: true },
  { name: "Rejected" }
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
      for (const item of defaultStatuses) {
        const id = "status_" + item.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        await LeadStatus.create({ 
          id, 
          name: item.name, 
          status: "Active",
          hasScreenshot: !!item.hasScreenshot,
          hasAudio: !!item.hasAudio,
          hasSchedule: !!item.hasSchedule
        });
      }
      statuses = await LeadStatus.findAll({ order: [["createdAt", "ASC"]] });
    } else {
      // One-time upgrade migration for existing database status records
      let updatedAny = false;
      for (const st of statuses) {
        let needsSave = false;
        if (st.name === "No Answer" || st.name === "Busy") {
          if (!st.hasScreenshot) { st.hasScreenshot = true; needsSave = true; }
        }
        if (st.name === "Connected & Interested" || st.name === "Not Interested" || st.name === "Connected") {
          if (!st.hasAudio) { st.hasAudio = true; needsSave = true; }
        }
        if (st.name === "Interview Scheduled") {
          if (!st.hasSchedule) { st.hasSchedule = true; needsSave = true; }
        }
        if (needsSave) {
          await st.save();
          updatedAny = true;
        }
      }
      if (updatedAny) {
        statuses = await LeadStatus.findAll({ order: [["createdAt", "ASC"]] });
      }
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

    const { name, hasSchedule, hasScreenshot, hasAudio } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Status name is required" }, { status: 400 });
    }

    await sequelize.authenticate();
    await LeadStatus.sync({ alter: true });

    const id = "status_" + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const [status, created] = await LeadStatus.findOrCreate({
      where: { name: name.trim() },
      defaults: { 
        id, 
        name: name.trim(), 
        status: "Active",
        hasSchedule: !!hasSchedule,
        hasScreenshot: !!hasScreenshot,
        hasAudio: !!hasAudio
      }
    });

    if (!created) {
      status.hasSchedule = !!hasSchedule;
      status.hasScreenshot = !!hasScreenshot;
      status.hasAudio = !!hasAudio;
      await status.save();
    }

    return NextResponse.json({ success: true, data: status, created });
  } catch (error: any) {
    console.error("Failed to create lead status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
