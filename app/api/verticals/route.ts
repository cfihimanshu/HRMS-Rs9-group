import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Vertical from "@/models/sequelize/Vertical";
import { requireApiSession, MANAGEMENT_ROLES } from "@/lib/apiAuth";

const DEFAULT_VERTICALS = [
  { id: "vert_legal_recovery", name: "Legal Recovery", code: "LR", description: "Legal recovery, debt resolution & asset recovery operations", status: "active" },
  { id: "vert_security", name: "Security", code: "SEC", description: "Manned guarding, physical security, surveillance & protection services", status: "active" },
  { id: "vert_media_gpde", name: "Media GPDE", code: "MGPDE", description: "Media, digital presence, communication & broadcasting vertical", status: "active" },
  { id: "vert_startup_consultancy", name: "Startup / Business Consultancy", code: "SBC", description: "Startup incubation, enterprise advisory & business acceleration", status: "active" },
  { id: "vert_delivery_courier", name: "Delivery / Courier", code: "DEL", description: "Logistics, last-mile delivery, express dispatch & courier network", status: "active" }
];

async function seedDefaultVerticals() {
  try {
    await Vertical.sync();
    const count = await Vertical.count();
    if (count === 0) {
      for (const item of DEFAULT_VERTICALS) {
        await Vertical.findOrCreate({
          where: { id: item.id },
          defaults: item
        });
      }
    }
  } catch (err) {
    console.error("Error seeding verticals:", err);
  }
}

export async function GET() {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    await sequelize.authenticate();
    await seedDefaultVerticals();

    const verticals = await Vertical.findAll({
      where: { status: "active" },
      order: [["name", "ASC"]]
    });
    return NextResponse.json({ success: true, data: verticals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    await sequelize.authenticate();
    await seedDefaultVerticals();

    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Vertical name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await Vertical.findOne({
      where: { name: trimmedName }
    });

    if (existing) {
      if (existing.status !== "active") {
        existing.status = "active";
        await existing.save();
        return NextResponse.json({ success: true, data: existing, message: "Vertical reactivated" });
      }
      return NextResponse.json({ success: true, data: existing, message: "Vertical already exists" });
    }

    const newVertical = await Vertical.create({
      id: "vert_" + Date.now(),
      name: trimmedName,
      code: code ? code.trim().toUpperCase() : trimmedName.substring(0, 4).toUpperCase(),
      description: description || "",
      status: "active"
    });

    return NextResponse.json({ success: true, data: newVertical, message: "Vertical created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    await sequelize.authenticate();
    const body = await req.json();
    const { id, name, code, description, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing vertical ID" }, { status: 400 });
    }

    const vertical = await Vertical.findByPk(id);
    if (!vertical) {
      return NextResponse.json({ success: false, error: "Vertical not found" }, { status: 404 });
    }

    if (name !== undefined) vertical.name = name.trim();
    if (code !== undefined) vertical.code = code.trim().toUpperCase();
    if (description !== undefined) vertical.description = description;
    if (status !== undefined) vertical.status = status;

    await vertical.save();
    return NextResponse.json({ success: true, data: vertical, message: "Vertical updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    await sequelize.authenticate();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing vertical ID" }, { status: 400 });
    }

    const vertical = await Vertical.findByPk(id);
    if (!vertical) {
      return NextResponse.json({ success: false, error: "Vertical not found" }, { status: 404 });
    }

    // Soft delete by setting status to inactive
    vertical.status = "inactive";
    await vertical.save();

    return NextResponse.json({ success: true, message: "Vertical deactivated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
