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
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    await sequelize.authenticate();

    const loggedInUserRole = (session.user as any).role;
    const loggedInUserId = (session.user as any).id;

    // Check if user is a Reporting Manager
    const selfUser = await User.findByPk(loggedInUserId, { attributes: ["name", "role"] });
    let isReportingManager = false;
    if (selfUser && selfUser.name) {
      const subordinateCount = await EmployeeProfile.count({ where: { reportingManager: selfUser.name } });
      isReportingManager = subordinateCount > 0;
    }

    const isPrivileged = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(loggedInUserRole) || isReportingManager;

    // If targetUserId is provided, fetch calendar details for that user
    if (targetUserId) {
      // Security check: non-global managers can only view their own or their subordinates' calendar
      const isGlobalManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(loggedInUserRole);
      let allowed = isGlobalManager || targetUserId === loggedInUserId;
      if (!allowed) {
        // Check if subordinate
        const targetProfile = await EmployeeProfile.findOne({ where: { user: targetUserId } });
        const selfProfile = await EmployeeProfile.findOne({ where: { user: loggedInUserId } });
        const isDeptSubordinate = loggedInUserRole === "Department Manager" && selfProfile?.department && targetProfile?.department === selfProfile.department;
        const isDirectSubordinate = targetProfile?.reportingManager && selfUser?.name && targetProfile.reportingManager === selfUser.name;
        allowed = !!(isDeptSubordinate || isDirectSubordinate);
      }

      if (!allowed) {
        return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
      }

      // Fetch attendance, leaves, and SOD/EOD reports for this user
      const attendance = await Attendance.findAll({ where: { employee: targetUserId } });
      const leaves = await Leave.findAll({ where: { employee: targetUserId, status: "Approved" } });
      const sods = await SodReport.findAll({ where: { employee: targetUserId } });
      const eods = await EodReport.findAll({ where: { employee: targetUserId } });

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
    // Privileged users get the whole list (if Owner/HR) or filtered managed list (if Department Manager / Reporting Manager)
    let companies: any[] = [];
    let users: any[] = [];

    const isGlobalManager = ["Owner", "Director", "HR Head", "HR Executive"].includes(loggedInUserRole);

    if (isGlobalManager) {
      companies = await Company.findAll({ where: { status: "active" } });
      users = await User.findAll({ 
        where: { status: "active" },
        attributes: ["id", "name", "email", "role", "companies"]
      });
    } else if (loggedInUserRole === "Department Manager" || isReportingManager) {
      // Find managed user IDs
      const managedUserIds = [loggedInUserId];
      const selfProfile = await EmployeeProfile.findOne({ where: { user: loggedInUserId } });
      if (loggedInUserRole === "Department Manager" && selfProfile?.department) {
        const deptProfiles = await EmployeeProfile.findAll({
          where: { department: selfProfile.department },
          attributes: ["user"]
        });
        deptProfiles.forEach((p: any) => {
          if (p.user && !managedUserIds.includes(p.user)) {
            managedUserIds.push(p.user);
          }
        });
      }
      if (selfUser && selfUser.name) {
        const reportProfiles = await EmployeeProfile.findAll({
          where: { reportingManager: selfUser.name },
          attributes: ["user"]
        });
        reportProfiles.forEach((p: any) => {
          if (p.user && !managedUserIds.includes(p.user)) {
            managedUserIds.push(p.user);
          }
        });
      }

      users = await User.findAll({
        where: { id: { [Op.in]: managedUserIds }, status: "active" },
        attributes: ["id", "name", "email", "role", "companies"]
      });

      // Find company IDs for these users
      const companyIds = new Set<string>();
      users.forEach((u: any) => {
        if (u.companies) {
          try {
            const parsed = typeof u.companies === 'string' ? JSON.parse(u.companies) : u.companies;
            if (Array.isArray(parsed)) {
              parsed.forEach((cid: any) => companyIds.add(cid.toString()));
            }
          } catch (e) {}
        }
      });

      companies = await Company.findAll({
        where: { id: { [Op.in]: Array.from(companyIds) }, status: "active" }
      });
    } else {
      // Find logged-in user details
      const selfUserObj = await User.findByPk(loggedInUserId, {
        attributes: ["id", "name", "email", "role", "companies"]
      });
      if (selfUserObj) {
        users = [selfUserObj];
        let companyIds = [];
        if (selfUserObj.companies) {
          try {
            companyIds = typeof selfUserObj.companies === 'string' ? JSON.parse(selfUserObj.companies) : selfUserObj.companies;
          } catch (e) {
            companyIds = [];
          }
        }
        companies = await Company.findAll({ where: { id: { [Op.in]: companyIds }, status: "active" } });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        companies,
        users,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
