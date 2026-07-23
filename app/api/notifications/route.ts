import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
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

    try {
      await sequelize.authenticate();
      await Notification.sync();
    } catch (syncErr: any) {
      console.warn("Notification sync warning:", syncErr.message);
    }

    let records: any[] = [];
    let unreadCount = 0;
    try {
      records = await Notification.findAll({
        where: { recipient: userId },
        order: [["createdAt", "DESC"]],
        limit: 50,
      });

      unreadCount = await Notification.count({
        where: { recipient: userId, read: false }
      });
    } catch (dbErr: any) {
      console.warn("Notification query error:", dbErr.message);
    }

    return NextResponse.json({ success: true, data: records || [], unreadCount });
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
    
    // Safely parse body if present
    let id = null;
    let markAllAsRead = false;
    try {
      const body = await req.json();
      id = body?.id;
      markAllAsRead = !!body?.markAllAsRead;
    } catch (e) {
      // Body is empty or not JSON, default to marking all as read
      markAllAsRead = true;
    }

    await sequelize.authenticate();
    await Notification.sync({ alter: true });

    if (markAllAsRead || !id) {
      await Notification.update(
        { read: true },
        { where: { recipient: userId, read: false } }
      );
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
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

// DELETE /api/notifications - Clear single or all notifications
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    let id = null;
    try {
      const body = await req.json();
      id = body?.id;
    } catch (_) {}

    await sequelize.authenticate();

    if (id) {
      await Notification.destroy({ where: { id, recipient: userId } });
      return NextResponse.json({ success: true, message: "Notification cleared" });
    } else {
      await Notification.destroy({ where: { recipient: userId } });
      return NextResponse.json({ success: true, message: "All notifications cleared" });
    }
  } catch (error: any) {
    console.error("[/api/notifications DELETE] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
