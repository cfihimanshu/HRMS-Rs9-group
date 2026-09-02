import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { DataTypes } from "sequelize";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalGuard from "@/models/sequelize/LegalGuard";

let guardSchemaReady = false;

async function ensureGuardSchema() {
  if (guardSchemaReady) return;
  await sequelize.authenticate();
  await LegalGuard.sync();
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable("legal_guards");
  if (!columns.monthlySalary) {
    await queryInterface.addColumn("legal_guards", "monthlySalary", {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
  }
  guardSchemaReady = true;
}

// GET: Fetch all registered guards
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await ensureGuardSchema();

    const guards = await LegalGuard.findAll({
      order: [["name", "ASC"]],
      raw: true,
    });

    return NextResponse.json({ success: true, data: guards });
  } catch (error: any) {
    console.error("[/api/legal-recovery/guards GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add / Register a new Guard in DB
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await ensureGuardSchema();

    const body = await req.json();
    const { name, phone, photoUrl, monthlySalary } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Guard Name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const [guard, created] = await LegalGuard.findOrCreate({
      where: { name: cleanName },
      defaults: {
        name: cleanName,
        phone: phone || "",
        monthlySalary: Math.max(0, Number(monthlySalary) || 0),
        photoUrl: photoUrl || "",
        status: "Active",
      },
    });

    if (!created) {
      const updateData: any = {};
      if (phone !== undefined && phone !== null) updateData.phone = phone;
      if (photoUrl !== undefined && photoUrl !== null && photoUrl !== "") updateData.photoUrl = photoUrl;
      if (monthlySalary !== undefined) updateData.monthlySalary = Math.max(0, Number(monthlySalary) || 0);
      if (Object.keys(updateData).length > 0) {
        await guard.update(updateData);
      }
    }

    return NextResponse.json({ success: true, data: guard, created });
  } catch (error: any) {
    console.error("[/api/legal-recovery/guards POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ensureGuardSchema();
    const body = await req.json();
    const guard = await LegalGuard.findByPk(Number(body.id));
    if (!guard) return NextResponse.json({ success: false, error: "Guard not found" }, { status: 404 });
    if (!String(body.name || "").trim()) return NextResponse.json({ success: false, error: "Guard name is required" }, { status: 400 });
    await guard.update({
      name: String(body.name).trim(),
      phone: String(body.phone || "").trim(),
      monthlySalary: Math.max(0, Number(body.monthlySalary) || 0),
      status: body.status || "Active",
    });
    return NextResponse.json({ success: true, data: guard });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Guard could not be updated" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await ensureGuardSchema();
    const id = Number(new URL(req.url).searchParams.get("id"));
    const guard = await LegalGuard.findByPk(id);
    if (!guard) return NextResponse.json({ success: false, error: "Guard not found" }, { status: 404 });
    await guard.update({ status: "Inactive" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Guard could not be disabled" }, { status: 500 });
  }
}
