import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";

export async function GET() {
  try {
    await dbConnect();
    const companies = await Company.find({ status: "active" }).sort({ name: 1 });
    return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
