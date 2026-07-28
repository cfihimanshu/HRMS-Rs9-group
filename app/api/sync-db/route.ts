import { NextResponse } from "next/server";
import Leave from "@/models/sequelize/Leave";
import { requireApiSession, ADMIN_ROLES } from "@/lib/apiAuth";

export async function POST() {
  try {
    const auth = await requireApiSession(ADMIN_ROLES);
    if (auth.response) return auth.response;
    await Leave.sync();
    return NextResponse.json({ success: true, message: "Database connectivity/schema presence verified" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
