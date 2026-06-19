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
    const isManagerial = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(role);

    await sequelize.authenticate();
    await SodReport.sync({ alter: true });
    await EodReport.sync({ alter: true });
    await TaskLog.sync({ alter: true });
    await FieldVisit.sync({ alter: true });

    let filter: any = {};
    let deptUserIds: any[] = [];

    if (!isManagerial) {
      filter = { employee: userId };
    } else if (role === "Department Manager") {
      const deptName = (session.user as any).department;
      const dept = await Department.findOne({ where: { name: deptName } });
      if (dept) {
        const profilesInDept = await EmployeeProfile.findAll({
          where: { department: dept.mongo_id },
          attributes: ['user']
        });
        deptUserIds = profilesInDept.map((p: any) => p.user).filter(Boolean);
        filter = { employee: { [Op.in]: deptUserIds } };
      } else {
        filter = { employee: userId };
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

    let fieldVisitFilter: any = {};
    if (!isManagerial) {
      fieldVisitFilter = { employee_id: userId };
    } else if (role === "Department Manager") {
      if (deptUserIds.length > 0) {
        fieldVisitFilter = { employee_id: { [Op.in]: deptUserIds } };
      } else {
        fieldVisitFilter = { employee_id: userId };
      }
    }

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
      attributes: ['user', 'department']
    });

    const deptIds = Array.from(new Set(profiles.map((p: any) => p.department).filter(Boolean)));
    const departments = await Department.findAll({
      where: { mongo_id: deptIds },
      attributes: ['mongo_id', 'name']
    });

    const deptMap = departments.reduce((acc: any, d: any) => {
      acc[d.mongo_id] = d.name;
      return acc;
    }, {});

    const userDeptMap = profiles.reduce((acc: any, p: any) => {
      acc[p.user] = deptMap[p.department] || "General";
      return acc;
    }, {});

    const employees = await User.findAll({
      where: { mongo_id: employeeIds },
      attributes: ['mongo_id', 'name', 'email', 'role', 'companies']
    });

    const employeeMap = employees.reduce((acc: any, emp: any) => {
      const empJson = emp.toJSON();
      empJson.department = userDeptMap[emp.mongo_id] || "General";
      acc[emp.mongo_id] = empJson;
      return acc;
    }, {});

    const mappedSods = sods.map(s => {
      const json = s.toJSON() as any;
      json._id = json.id ? json.id.toString() : (json.mongo_id ? json.mongo_id.toString() : "");
      json.employee = employeeMap[json.employee] || null;
      return json;
    });

    const mappedEods = eods.map(e => {
      const json = e.toJSON() as any;
      json._id = json.id ? json.id.toString() : (json.mongo_id ? json.mongo_id.toString() : "");
      json.employee = employeeMap[json.employee] || null;
      return json;
    });

    const mappedTasks = tasks.map(t => {
      const json = t.toJSON() as any;
      json._id = json.id ? json.id.toString() : (json.mongo_id ? json.mongo_id.toString() : "");
      json.employee = employeeMap[json.employee] || null;
      return json;
    });

    const mappedFieldVisits = fieldVisits.map(v => {
      const json = v.toJSON() as any;
      json._id = json.id ? json.id.toString() : (json.mongo_id ? json.mongo_id.toString() : "");
      json.employee = employeeMap[json.employee_id] || null;
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


