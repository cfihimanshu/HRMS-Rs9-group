import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadPlatform from "@/models/sequelize/LeadPlatform";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await LeadPlatform.sync({ alter: true });

    const defaults = [
      { id: "indeed-391", name: "Indeed", prefix: "IND", tableName: "leads_indeed" },
      { id: "workindia-284", name: "WorkIndia", prefix: "WIN", tableName: "leads_workindia" },
      { id: "linkedin-581", name: "LinkedIn", prefix: "LNK", tableName: "leads_linkedin" }
    ];

    for (const d of defaults) {
      const [record, created] = await LeadPlatform.findOrCreate({
        where: { id: d.id },
        defaults: d
      });

      if (created) {
        const safeTableName = d.tableName;
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS ${safeTableName} (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NULL,
            email VARCHAR(255) NULL,
            phone VARCHAR(50) NULL,
            company VARCHAR(255) NULL,
            status VARCHAR(50) DEFAULT 'New',
            notes TEXT NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          ) ENGINE=InnoDB;
        `);
      }
    }

    const platforms = await LeadPlatform.findAll({ order: [["name", "ASC"]] });

    return NextResponse.json({ success: true, data: platforms });
  } catch (error: any) {
    console.error("Failed to fetch lead platforms:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, prefix } = await req.json();
    if (!name || !prefix) {
      return NextResponse.json({ success: false, error: "Name and Prefix are required." }, { status: 400 });
    }

    const cleanedName = name.trim();
    const cleanedPrefix = prefix.trim().toUpperCase();
    const id = cleanedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.floor(100 + Math.random() * 900);
    const tableName = `leads_${id.replace(/-/g, "_")}`;

    await sequelize.authenticate();
    await LeadPlatform.sync({ alter: true });

    // Check if duplicate
    const exists = await LeadPlatform.findOne({ where: { id } });
    if (exists) {
      return NextResponse.json({ success: false, error: `Platform '${cleanedName}' already exists.` }, { status: 400 });
    }

    const record = await LeadPlatform.create({
      id,
      name: cleanedName,
      prefix: cleanedPrefix,
      tableName
    });

    // Create the physical table dynamically in MySQL
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        company VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'New',
        notes TEXT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("Failed to create lead platform:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
