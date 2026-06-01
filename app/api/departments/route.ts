import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Department from "@/models/Department";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    const query: any = { status: "active" };
    if (companyId) {
      query.company = companyId;
    }

    const departments = await Department.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
