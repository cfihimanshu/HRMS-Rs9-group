import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AuditLog from "@/models/sequelize/AuditLog";
import User from "@/models/sequelize/User";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    // Fetch last 15 audit logs
    const logs: any[] = await AuditLog.findAll({
      order: [['timestamp', 'DESC']],
      limit: 15,
      raw: true
    });

    const userIds = Array.from(new Set(logs.map(log => log.user).filter(Boolean)));
    let userMap: any = {};
    if (userIds.length > 0) {
      const users: any[] = await User.findAll({
        where: { mongo_id: userIds },
        attributes: ['mongo_id', 'name', 'role'],
        raw: true
      });
      userMap = users.reduce((acc: any, user: any) => {
        acc[user.mongo_id] = { name: user.name, role: user.role };
        return acc;
      }, {});
    }

    const data = logs.map(log => ({
      ...log,
      user: userMap[log.user as string] || { name: 'Unknown', role: 'Unknown' }
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
