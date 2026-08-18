import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import SodReport from "@/models/sequelize/SodReport";
import EodReport from "@/models/sequelize/EodReport";
import TaskLog from "@/models/sequelize/TaskLog";
import FieldVisit from "@/models/sequelize/FieldVisit";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    await sequelize.authenticate();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range");

    let filter: any = {};
    let fieldVisitFilter: any = {};
    let managedUserIds: any[] = [userId];

    const normRole = (role || "").toString().trim().toLowerCase();
    const isGlobalManager = ["owner", "director", "hr head", "hr-head", "hr executive", "hr-executive", "cfo", "legal head", "it admin"].some(r => normRole.includes(r)) || normRole.includes("owner");

    if (!isGlobalManager) {
      // 1. Get logged-in user's profile to check department
      const loggedInProfile = await EmployeeProfile.findOne({ where: { user: userId } });
      
      // 2. Add department profiles if they are Department Manager
      if (role === "Department Manager" && loggedInProfile?.department) {
        const deptProfiles = await EmployeeProfile.findAll({
          where: { department: loggedInProfile.department },
          attributes: ['user']
        });
        deptProfiles.forEach((p: any) => {
          if (p.user && !managedUserIds.includes(p.user)) {
            managedUserIds.push(p.user);
          }
        });
      }

      // 3. Add reporting manager subordinates
      const userName = session.user.name;
      if (userName) {
        const reportProfiles = await EmployeeProfile.findAll({
          where: { reportingManager: userName },
          attributes: ['user']
        });
        reportProfiles.forEach((p: any) => {
          if (p.user && !managedUserIds.includes(p.user)) {
            managedUserIds.push(p.user);
          }
        });
      }

      filter = { employee: { [Op.in]: managedUserIds } };
      fieldVisitFilter = { employee_id: { [Op.in]: managedUserIds } };
    }

    if (range === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);

      filter.date = { [Op.gte]: todayStart, [Op.lte]: todayEnd };
      
      const todayStr = new Date().toISOString().split("T")[0];
      fieldVisitFilter.date = todayStr;
    } else if (range === "yesterday") {
      const yestStart = new Date();
      yestStart.setDate(yestStart.getDate() - 1);
      yestStart.setHours(0, 0, 0, 0);
      const yestEnd = new Date(yestStart);
      yestEnd.setHours(23, 59, 59, 999);

      filter.date = { [Op.gte]: yestStart, [Op.lte]: yestEnd };

      const yestStr = yestStart.toISOString().split("T")[0];
      fieldVisitFilter.date = yestStr;
    } else if (range === "recent" || range === "3days") {
      const recentStart = new Date();
      recentStart.setDate(recentStart.getDate() - 3);
      recentStart.setHours(0, 0, 0, 0);

      filter.date = { [Op.gte]: recentStart };
      
      const recentStr = recentStart.toISOString().split("T")[0];
      fieldVisitFilter.date = { [Op.gte]: recentStr };
    } else if (range === "current-month") {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      filter.date = { [Op.gte]: start, [Op.lt]: end };
      
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      fieldVisitFilter.date = { [Op.gte]: startStr, [Op.lt]: endStr };
    } else if (range === "last-month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      filter.date = { [Op.gte]: start, [Op.lte]: end };

      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      fieldVisitFilter.date = { [Op.gte]: startStr, [Op.lte]: endStr };
    } else if (range === "custom") {
      const startParam = searchParams.get("startDate");
      const endParam = searchParams.get("endDate");
      if (startParam || endParam) {
        const dateCond: any = {};
        const fvCond: any = {};
        
        if (startParam) {
          const start = new Date(startParam);
          start.setHours(0, 0, 0, 0);
          dateCond[Op.gte] = start;
          fvCond[Op.gte] = startParam;
        }
        if (endParam) {
          const end = new Date(endParam);
          end.setHours(23, 59, 59, 999);
          dateCond[Op.lte] = end;
          fvCond[Op.lte] = endParam;
        }
        
        filter.date = dateCond;
        fieldVisitFilter.date = fvCond;
      }
    }

    const sods = await SodReport.findAll({ 
      where: filter,
      order: [['createdAt', 'DESC']]
    });

    const eods = await EodReport.findAll({ 
      where: filter,
      order: [['createdAt', 'DESC']]
    });

    const tasks = await TaskLog.findAll({ 
      where: filter,
      order: [['createdAt', 'DESC']]
    });

    // fieldVisitFilter is already initialized and filtered above

    const fieldVisits = await FieldVisit.findAll({
      where: fieldVisitFilter,
      order: [['createdAt', 'DESC']]
    });

    const employeeIds = Array.from(new Set([
      ...sods.map(s => (s as any).employee),
      ...eods.map(e => (e as any).employee),
      ...tasks.map(t => (t as any).employee),
      ...fieldVisits.map(v => (v as any).employee_id)
    ])).filter(Boolean);

    // Fetch department names mapping
    const profiles = await EmployeeProfile.findAll({
      where: { user: employeeIds },
      attributes: ['user', 'department', 'vertical']
    });

    const deptIds = Array.from(new Set(profiles.map((p: any) => p.department).filter(Boolean)));
    const departments = await Department.findAll({
      where: { id: deptIds },
      attributes: ['id', 'name']
    });

    const deptMap = departments.reduce((acc: any, d: any) => {
      acc[d.id] = d.name;
      return acc;
    }, {});

    const userProfileMap = profiles.reduce((acc: any, p: any) => {
      acc[p.user] = {
        department: deptMap[p.department] || p.department || "General",
        vertical: p.vertical || ""
      };
      return acc;
    }, {});

    const employees = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'status', 'companies'],
      raw: true
    });

    const employeeMap: Record<string, any> = {};
    employees.forEach((emp: any) => {
      const dept = userProfileMap[emp.id]?.department || "General";
      const vert = userProfileMap[emp.id]?.vertical || "";
      const empObj = { ...emp, department: dept, vertical: vert };
      if (emp.id) {
        employeeMap[emp.id] = empObj;
        employeeMap[String(emp.id).trim()] = empObj;
      }
      if (emp.email) {
        employeeMap[emp.email.toLowerCase().trim()] = empObj;
      }
    });

    const findEmp = (empKey: any) => {
      if (!empKey) return null;
      const keyStr = String(empKey).trim();
      return employeeMap[keyStr] || employeeMap[keyStr.toLowerCase()] || null;
    };

    const mappedSods = sods.map(s => {
      const json = s.toJSON() as any;
      json.id = json.id ? json.id.toString() : "";
      const empObj = findEmp(json.employee);
      json.employee = empObj ? { ...empObj, id: empObj.id } : { id: json.employee, name: empObj?.name || `Employee ${json.employee}`, role: "Employee" };
      return json;
    });

    const mappedEods = eods.map(e => {
      const json = e.toJSON() as any;
      json.id = json.id ? json.id.toString() : "";
      const empObj = findEmp(json.employee);
      json.employee = empObj ? { ...empObj, id: empObj.id } : { id: json.employee, name: empObj?.name || `Employee ${json.employee}`, role: "Employee" };
      return json;
    });

    const mappedTasks = tasks.map(t => {
      const json = t.toJSON() as any;
      json.id = json.id ? json.id.toString() : "";
      const empObj = findEmp(json.employee);
      json.employee = empObj ? { ...empObj, id: empObj.id } : { id: json.employee, name: empObj?.name || `Employee ${json.employee}`, role: "Employee" };
      return json;
    });

    const mappedFieldVisits = fieldVisits.map(v => {
      const json = v.toJSON() as any;
      json.id = json.id ? json.id.toString() : "";
      const empObj = findEmp(json.employee_id);
      json.employee = empObj ? { ...empObj, id: empObj.id } : { id: json.employee_id, name: empObj?.name || `Employee ${json.employee_id}`, role: "Employee" };
      return json;
    });

    return NextResponse.json({
      success: true,
      data: {
        sod: mappedSods,
        eod: mappedEods,
        tasks: mappedTasks,
        fieldVisits: mappedFieldVisits
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
