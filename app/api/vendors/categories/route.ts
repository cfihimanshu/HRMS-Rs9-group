import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import VendorCategory from "@/models/sequelize/VendorCategory";

const DEFAULT_CATEGORIES = [
  "IT & Software",
  "Advocate / Legal",
  "CA / CS Consultancy",
  "Hotel / Guest House",
  "Tiffin / Catering",
  "CCTV & Security",
  "Courier / Cab / Delivery",
  "Infrastructure & Office",
  "Equipment & AMC",
];

async function ensureTableAndSeed() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await VendorCategory.sync();
    
    const count = await VendorCategory.count();
    if (count === 0) {
      for (const catName of DEFAULT_CATEGORIES) {
        await VendorCategory.create({
          id: "VCAT-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          name: catName,
        });
      }
    }
  } catch (err) {
    console.error("VendorCategory sync/seed error:", err);
  }
}

// GET: Fetch all vendor categories
export async function GET() {
  try {
    await sequelize.authenticate();
    await ensureTableAndSeed();

    const categories = await VendorCategory.findAll({
      order: [["name", "ASC"]],
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new category directly to database
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await ensureTableAndSeed();

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    // Check if category already exists
    const existing = await VendorCategory.findOne({ where: { name } });
    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: "Category already exists" });
    }

    const newCategory = await VendorCategory.create({
      id: "VCAT-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      name,
    });

    return NextResponse.json({ success: true, data: newCategory });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
