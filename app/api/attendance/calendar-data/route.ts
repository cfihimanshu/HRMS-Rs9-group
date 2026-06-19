import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Company from "@/models/sequelize/Company";
import User from "@/models/sequelize/User";
import Attendance from "@/models/sequelize/Attendance";
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

    // Check permissions
    const isPrivileged = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(loggedInUserRole);

    // If targetUserId is provided, fetch calendar details for that user
    if (targetUserId) {
      // Security check: non-privileged users can only view their own calendar
      if (!isPrivileged && targetUserId !== loggedInUserId) {
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
    // Privileged users get the whole list, non-privileged get only their own user record
    let companies: any[] = [];
    let users: any[] = [];

    if (isPrivileged) {
      companies = await Company.findAll({ where: { status: "active" } });
      users = await User.findAll({ 
        where: { status: "active" },
        attributes: ["mongo_id", "name", "email", "role", "companies"]
      });
    } else {
      // Find logged-in user details
      const selfUser = await User.findByPk(loggedInUserId, {
        attributes: ["mongo_id", "name", "email", "role", "companies"]
      });
      if (selfUser) {
        users = [selfUser];
        let companyIds = [];
        if (selfUser.companies) {
          try {
            companyIds = typeof selfUser.companies === 'string' ? JSON.parse(selfUser.companies) : selfUser.companies;
          } catch (e) {
            companyIds = [];
          }
        }
        companies = await Company.findAll({ where: { mongo_id: { [Op.in]: companyIds }, status: "active" } });
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
