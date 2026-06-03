import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import SodReport from "@/models/SodReport";
import EodReport from "@/models/EodReport";
import TaskLog from "@/models/TaskLog";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const isOwner = role === "Owner";

    await dbConnect();

    const filter = isOwner ? {} : { employee: userId };

    const sods = await SodReport.find(filter)
      .populate("employee", "name email role companies")
      .sort({ createdAt: -1 });

    const eods = await EodReport.find(filter)
      .populate("employee", "name email role companies")
      .sort({ createdAt: -1 });

    const tasks = await TaskLog.find(filter)
      .populate("employee", "name email role companies")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: {
        sod: sods,
        eod: eods,
        tasks: tasks
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

