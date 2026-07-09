import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Notification from "@/models/sequelize/Notification";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await sequelize.authenticate();
    await Notification.sync({ alter: true });

    const notifications = await Notification.findAll({
      where: { recipient: userId },
      order: [["createdAt", "DESC"]],
      limit: 20
    });

    const unreadCount = await Notification.count({
      where: { recipient: userId, read: false }
    });

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error: any) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    
    await sequelize.authenticate();
    await Notification.sync({ alter: true });

    // Mark all as read for this user
    await Notification.update(
      { read: true },
      { where: { recipient: userId, read: false } }
    );

    return NextResponse.json({ success: true, message: "Marked all as read" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
