import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Company from "@/models/sequelize/Company";
import User from "@/models/sequelize/User";
import Attendance from "@/models/sequelize/Attendance";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Leave from "@/models/sequelize/Leave";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";
import "@/models/sequelize/associations";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    await sequelize.authenticate();

    const loggedInUserRole = (session.user as any).role || "Employee";
    const loggedInUserId = (session.user as any).id;

    // Check if user is a Reporting Manager
    let isReportingManager = false;
    let selfUser: any = null;
    try {
      selfUser = await User.findByPk(loggedInUserId, { attributes: ["name", "role"] });
      if (selfUser && selfUser.name) {
        const subordinateCount = await EmployeeProfile.count({
          where: {
            [Op.or]: [
              { reportingManager: selfUser.name },
              { reportingManager: { [Op.like]: `%${selfUser.name.trim()}%` } }
            ]
          }
        });
        isReportingManager = subordinateCount > 0;
      }
    } catch (_) {}

    // If targetUserId is provided, fetch calendar details for that user
    if (targetUserId) {
      const isGlobalManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(loggedInUserRole);
      let allowed = isGlobalManager || targetUserId === loggedInUserId;
      if (!allowed) {
        try {
          const targetProfile = await EmployeeProfile.findOne({ where: { user: targetUserId } });
          const selfProfile = await EmployeeProfile.findOne({ where: { user: loggedInUserId } });
          const isDeptSubordinate = loggedInUserRole === "Department Manager" && selfProfile?.department && targetProfile?.department === selfProfile.department;
          const isDirectSubordinate = targetProfile?.reportingManager && selfUser?.name && (
            targetProfile.reportingManager === selfUser.name || targetProfile.reportingManager.includes(selfUser.name)
          );
          allowed = !!(isDeptSubordinate || isDirectSubordinate);
        } catch (_) {}
      }

      if (!allowed) {
        return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
      }

      const [attendance, leaves, sods, eods] = await Promise.all([
        Attendance.findAll({ where: { employee: targetUserId } }).catch(() => []),
        Leave.findAll({ where: { employee: targetUserId, status: "Approved" } }).catch(() => []),
        SodReport.findAll({ where: { employee: targetUserId } }).catch(() => []),
        EodReport.findAll({ where: { employee: targetUserId } }).catch(() => []),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          attendance,
          leaves,
          sods,
          eods,
        },
      });
    }

    // Otherwise, fetch metadata (Companies and Users list)
    let companies: any[] = [];
    let users: any[] = [];

    const isGlobalManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(loggedInUserRole);

    if (isGlobalManager) {
      companies = await Company.findAll({ where: { status: "active" }, raw: true }).catch(() => []);
      users = await User.findAll({
        attributes: ["id", "name", "email", "role", "status", "companies"]
      }).catch(() => []);
    } else if (loggedInUserRole === "Department Manager" || isReportingManager) {
      const managedUserIds = [loggedInUserId];
      try {
        const selfProfile = await EmployeeProfile.findOne({ where: { user: loggedInUserId } });
        if (loggedInUserRole === "Department Manager" && selfProfile?.department) {
          const deptProfiles = await EmployeeProfile.findAll({
            where: { department: selfProfile.department },
            attributes: ["user"],
            raw: true
          });
          deptProfiles.forEach((p: any) => {
            if (p.user && !managedUserIds.includes(p.user)) managedUserIds.push(p.user);
          });
        }
        if (selfUser && selfUser.name) {
          const reportProfiles = await EmployeeProfile.findAll({
            where: {
              [Op.or]: [
                { reportingManager: selfUser.name },
                { reportingManager: { [Op.like]: `%${selfUser.name.trim()}%` } }
              ]
            },
            attributes: ["user"],
            raw: true
          });
          reportProfiles.forEach((p: any) => {
            if (p.user && !managedUserIds.includes(p.user)) managedUserIds.push(p.user);
          });
        }
      } catch (_) {}

      users = await User.findAll({
        where: { id: { [Op.in]: managedUserIds } },
        attributes: ["id", "name", "email", "role", "status", "companies"]
      }).catch(() => []);

      const companyIds = new Set<string>();
      users.forEach((u: any) => {
        if (u.companies) {
          try {
            const parsed = typeof u.companies === 'string' ? JSON.parse(u.companies) : u.companies;
            if (Array.isArray(parsed)) {
              parsed.forEach((cid: any) => {
                const str = typeof cid === 'object' ? String(cid.id || cid) : String(cid);
                if (str) companyIds.add(str);
              });
            }
          } catch (e) {}
        }
      });

      if (companyIds.size > 0) {
        companies = await Company.findAll({
          where: { id: { [Op.in]: Array.from(companyIds) }, status: "active" },
          raw: true
        }).catch(() => []);
      } else {
        companies = await Company.findAll({ where: { status: "active" }, raw: true }).catch(() => []);
      }
    } else {
      const selfUserObj = await User.findByPk(loggedInUserId, {
        attributes: ["id", "name", "email", "role", "companies"]
      }).catch(() => null);

      if (selfUserObj) {
        users = [selfUserObj];
        let rawCompList: any[] = [];
        if (selfUserObj.companies) {
          try {
            const parsed = typeof selfUserObj.companies === 'string' ? JSON.parse(selfUserObj.companies) : selfUserObj.companies;
            if (Array.isArray(parsed)) {
              rawCompList = parsed.map((c: any) => typeof c === 'object' ? String(c.id || c) : String(c)).filter(Boolean);
            }
          } catch (e) {}
        }

        if (rawCompList.length > 0) {
          companies = await Company.findAll({ where: { id: { [Op.in]: rawCompList }, status: "active" }, raw: true }).catch(() => []);
        } else {
          companies = await Company.findAll({ where: { status: "active" }, raw: true }).catch(() => []);
        }
      }
    }

    if (companies.length === 0) {
      companies = await Company.findAll({ where: { status: "active" }, raw: true }).catch(() => []);
    }

    // Map department names onto user list
    let mappedUsers = [];
    if (users.length > 0) {
      const userIds = users.map((u: any) => u.id);
      
      const userProfiles = await EmployeeProfile.findAll({
        where: { user: userIds },
        attributes: ["user", "department"],
        raw: true
      }).catch(() => []);

      const deptIds = Array.from(new Set(userProfiles.map((p: any) => p.department).filter(Boolean)));
      let deptNameMap: any = {};
      if (deptIds.length > 0) {
        const depts = await Department.findAll({
          where: { id: { [Op.in]: deptIds } },
          attributes: ["id", "name"],
          raw: true
        }).catch(() => []);
        depts.forEach((d: any) => {
          deptNameMap[d.id] = d.name;
        });
      }

      const userDeptMap: any = {};
      userProfiles.forEach((p: any) => {
        userDeptMap[p.user] = deptNameMap[p.department] || p.department || "General";
      });

      mappedUsers = users.map((u: any) => {
        const json = u.toJSON ? u.toJSON() : u;
        json.department = userDeptMap[u.id] || "General";
        return json;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        companies,
        users: mappedUsers,
      },
    });
  } catch (error: any) {
    console.error("Calendar data API error:", error);
    return NextResponse.json({ success: true, data: { companies: [], users: [] } });
  }
}
