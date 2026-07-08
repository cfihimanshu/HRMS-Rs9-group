import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AuditLog from "@/models/sequelize/AuditLog";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    await sequelize.authenticate();

    let auditLogFilter: any = {};

    if (companyId) {
      const usersOfCompany = await User.findAll({
        where: {
          companies: {
            [Op.like]: `%${companyId}%`
          }
        },
        attributes: ['id'],
        raw: true
      });
      const targetUserIds = usersOfCompany.map((u: any) => u.id);
      
      auditLogFilter.user = {
        [Op.in]: targetUserIds
      };
    }

    // Fetch last 100 audit logs
    const logs: any[] = await AuditLog.findAll({
      where: auditLogFilter,
      order: [['createdAt', 'DESC']],
      limit: 100,
      raw: true
    });

    const userIds = Array.from(new Set(logs.map(log => log.user).filter(Boolean)));
    let userMap: any = {};
    if (userIds.length > 0) {
      const users: any[] = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'name', 'role'],
        raw: true
      });
      userMap = users.reduce((acc: any, user: any) => {
        acc[user.id] = { name: user.name, role: user.role };
        return acc;
      }, {});
    }

    const data = logs.map(log => ({
      ...log,
      timestamp: log.createdAt || log.timestamp,
      user: userMap[log.user as string] || { name: 'Unknown', role: 'Unknown' }
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
