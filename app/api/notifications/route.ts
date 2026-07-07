import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Notification from "@/models/sequelize/Notification";

// GET /api/notifications - Get all notifications for the logged in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await sequelize.authenticate();
    await Notification.sync({ alter: true });

    const records = await Notification.findAll({
      where: { recipient: userId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("[/api/notifications GET] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { id, markAllAsRead } = body;

    await sequelize.authenticate();

    if (markAllAsRead) {
      await Notification.update(
        { read: true },
        { where: { recipient: userId, read: false } }
      );
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing notification id" }, { status: 400 });
    }

    const notification = await Notification.findOne({
      where: { id, recipient: userId }
    });

    if (!notification) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    notification.read = true;
    await notification.save();

    return NextResponse.json({ success: true, message: "Notification marked as read" });
  } catch (error: any) {
    console.error("[/api/notifications PUT] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
