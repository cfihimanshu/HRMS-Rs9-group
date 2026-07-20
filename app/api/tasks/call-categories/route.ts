import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import TaskCallCategory from "@/models/sequelize/TaskCallCategory";
import { Op } from "sequelize";

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

    // Clean up obsolete / duplicate categories from DB
    try {
      await TaskCallCategory.destroy({
        where: {
          name: { [Op.in]: ["Other", "General Call", "Operation", "Business Development"] }
        }
      });
    } catch (_) {}

    let records = await TaskCallCategory.findAll({ order: [["name", "ASC"]] });

    // Seed default categories if missing
    const defaults = ["Bank", "General", "Interview", "IT", "Legal", "Others"];
    for (const name of defaults) {
      const exists = records.find((r: any) => r.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        try {
          await TaskCallCategory.create({ name });
        } catch (e) {
          console.error(`Failed to seed default category ${name}:`, e);
        }
      }
    }
    records = await TaskCallCategory.findAll({ order: [["name", "ASC"]] });

    // Deduplicate and filter out obsolete names
    const obsolete = new Set(["other", "general call", "operation", "business development"]);
    const cleanList: string[] = [];
    const seen = new Set<string>();

    for (const r of records) {
      const lower = (r.name || "").trim().toLowerCase();
      if (!lower || obsolete.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      cleanList.push(r.name.trim());
    }

    // Sort alphabetically with "Others" at the very end
    cleanList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const othersIdx = cleanList.findIndex(c => c.toLowerCase() === "others");
    if (othersIdx !== -1) {
      const [othersItem] = cleanList.splice(othersIdx, 1);
      cleanList.push(othersItem);
    }

    return NextResponse.json({ success: true, data: cleanList });
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
