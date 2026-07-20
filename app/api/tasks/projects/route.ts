import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import ProjectMaster from "@/models/sequelize/ProjectMaster";

// GET: Fetch all project masters. Seed default projects if missing.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await ProjectMaster.sync({ alter: true });
    } catch (_) {}

    let records = await ProjectMaster.findAll({ order: [["id", "ASC"]] });

    // Seed default projects if missing
    const defaults = ["HRMS", "RRR"];
    for (const name of defaults) {
      const exists = records.find((r: any) => r.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        try {
          await ProjectMaster.create({ name });
        } catch (e) {
          console.error(`Failed to seed default project ${name}:`, e);
        }
      }
    }
    records = await ProjectMaster.findAll({ order: [["id", "ASC"]] });

    return NextResponse.json({
      success: true,
      data: records.map(r => ({ id: r.id, name: r.name }))
    });
  } catch (error: any) {
    console.error("[/api/tasks/projects GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new custom project master
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await ProjectMaster.sync({ alter: true });
    } catch (_) {}

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Project name is required" }, { status: 400 });
    }

    const trimmed = name.trim();
    const existing = await ProjectMaster.findOne({ where: { name: trimmed } });
    if (existing) {
      return NextResponse.json({
        success: true,
        data: { id: existing.id, name: existing.name },
        message: "Project already exists"
      });
    }

    const created = await ProjectMaster.create({ name: trimmed });
    return NextResponse.json({
      success: true,
      data: { id: created.id, name: created.name }
    });
  } catch (error: any) {
    console.error("[/api/tasks/projects POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
