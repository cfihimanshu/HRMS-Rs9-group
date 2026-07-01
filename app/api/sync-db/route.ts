import { NextResponse } from "next/server";
import Leave from "@/models/sequelize/Leave";

export async function GET() {
  try {
    await Leave.sync({ alter: true });
    return NextResponse.json({ success: true, message: "Leave table synced successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
