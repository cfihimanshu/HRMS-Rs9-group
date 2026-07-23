import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskMode from "@/models/sequelize/TaskMode";

// GET: Fetch all modes. Seed default modes if missing.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await TaskMode.sync({ alter: true });
    } catch (_) {}

    let records: any[] = [];
    try {
      records = await TaskMode.findAll({ order: [["id", "ASC"]] });
    } catch (_) {
      records = [];
    }

    // Seed default modes if missing
    const defaults = ["Call", "Meeting", "Email", "WhatsApp", "SMS", "Field Visit", "Social Media"];
    for (const name of defaults) {
      const exists = records.find((r: any) => r.name && r.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        try {
          const created = await TaskMode.create({ name });
          records.push(created);
        } catch (e) {
          console.error(`Failed to seed default task mode ${name}:`, e);
        }
      }
    }

    const result = records.length > 0 
      ? records.map(r => ({ id: r.id, name: r.name })) 
      : defaults.map((d, i) => ({ id: i + 1, name: d }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[/api/tasks/modes GET]", error.message);
    const fallbackDefaults = ["Call", "Meeting", "Email", "WhatsApp", "SMS", "Field Visit", "Social Media"].map((d, i) => ({ id: i + 1, name: d }));
    return NextResponse.json({ success: true, data: fallbackDefaults });
  }
}

// POST: Add a new custom mode
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    try {
      await TaskMode.sync({ alter: true });
    } catch (_) {}

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Mode name is required" }, { status: 400 });
    }

    const cleanName = name.trim();

    // Check if it already exists
    const existing = await TaskMode.findOne({ where: { name: cleanName } });
    if (existing) {
      return NextResponse.json({ success: true, data: { id: existing.id, name: existing.name } });
    }

    const record = await TaskMode.create({ name: cleanName });
    return NextResponse.json({ success: true, data: { id: record.id, name: record.name } });
  } catch (error: any) {
    console.error("[/api/tasks/modes POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
