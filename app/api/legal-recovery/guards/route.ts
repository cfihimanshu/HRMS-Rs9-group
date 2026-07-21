import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LegalGuard from "@/models/sequelize/LegalGuard";

// GET: Fetch all registered guards
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
      await sequelize.authenticate();
      await LegalGuard.sync();
      try {
        await sequelize.query("ALTER TABLE legal_guards MODIFY COLUMN photoUrl LONGTEXT;");
      } catch (e) {}
    } catch (syncErr: any) {
      console.warn("LegalGuard sync warning:", syncErr.message);
    }

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

    try {
      await sequelize.authenticate();
      await LegalGuard.sync();
      try {
        await sequelize.query("ALTER TABLE legal_guards MODIFY COLUMN photoUrl LONGTEXT;");
      } catch (alterErr: any) {
        // Table or column already modified or not needing alter
      }
    } catch (syncErr: any) {
      console.warn("LegalGuard sync warning:", syncErr.message);
    }

    const body = await req.json();
    const { name, phone, photoUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Guard Name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const [guard, created] = await LegalGuard.findOrCreate({
      where: { name: cleanName },
      defaults: {
        name: cleanName,
        phone: phone || "",
        photoUrl: photoUrl || "",
        status: "Active",
      },
    });

    if (!created) {
      const updateData: any = {};
      if (phone !== undefined && phone !== null) updateData.phone = phone;
      if (photoUrl !== undefined && photoUrl !== null && photoUrl !== "") updateData.photoUrl = photoUrl;
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
