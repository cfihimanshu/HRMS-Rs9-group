import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncUnsyncedSalesTasks } from "@/lib/syncSalesTask";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const result = await syncUnsyncedSalesTasks();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[sync-task-calls]", error);
    return NextResponse.json({ success: false, error: error.message || "Sales task sync failed" }, { status: 500 });
  }
}
