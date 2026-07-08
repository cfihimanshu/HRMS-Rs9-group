import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import AuditLog from "@/models/sequelize/AuditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sequelize.authenticate();
    const logs = await AuditLog.findAll({ raw: true, limit: 5 });
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
