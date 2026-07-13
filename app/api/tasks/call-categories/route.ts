import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskCallCategory from "@/models/sequelize/TaskCallCategory";

// GET: Fetch all categories. Seed if empty.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await TaskCallCategory.sync({ alter: true });
    } catch (_) {}

    let records = await TaskCallCategory.findAll({ order: [["name", "ASC"]] });

    // Seed default categories if table is empty
    if (records.length === 0) {
      const defaults = ["Operation", "Business Development", "General Call", "Other"];
      for (const name of defaults) {
        try {
          await TaskCallCategory.create({ name });
        } catch (e) {
          console.error(`Failed to create default category ${name}:`, e);
        }
      }
      records = await TaskCallCategory.findAll({ order: [["name", "ASC"]] });
    }

    return NextResponse.json({ success: true, data: records.map(r => r.name) });
  } catch (error: any) {
    console.error("[/api/tasks/call-categories GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new custom category
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await TaskCallCategory.sync({ alter: true });
    } catch (_) {}

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const cleanName = name.trim();

    // Check if it already exists
    const existing = await TaskCallCategory.findOne({ where: { name: cleanName } });
    if (existing) {
      return NextResponse.json({ success: true, data: existing.name });
    }

    const record = await TaskCallCategory.create({ name: cleanName });
    return NextResponse.json({ success: true, data: record.name });
  } catch (error: any) {
    console.error("[/api/tasks/call-categories POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
