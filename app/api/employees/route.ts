import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

// GET /api/employees - Get list of all staff members
export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // Fetch employees
    const employees = await User.findAll({ where: {} });
      
    // Fetch profiles to merge data
    const profiles = await EmployeeProfile.findAll({ where: {} });
    const departments = await Department.findAll({ where: {} });
    const allCompanies = await Company.findAll({ where: {} });
    
    const deptMap = departments.reduce((acc: any, dept: any) => {
      acc[dept.mongo_id] = dept.toJSON();
      return acc;
    }, {});

    const compMap = allCompanies.reduce((acc: any, comp: any) => {
      acc[comp.mongo_id] = comp.toJSON();
      return acc;
    }, {});

    const profilesWithDept = profiles.map(p => {
      const pJson = p.toJSON() as any;
      if (pJson.department) {
        pJson.department = deptMap[pJson.department] || null;
      }
      return pJson;
    });

    // Merge the data
    const mergedData = employees.map(emp => {
      const empJson = emp.toJSON() as any;
      const profile = profilesWithDept.find((p: any) => p.user?.toString() === empJson.mongo_id?.toString());
      
      // Populate companies
      if (empJson.companies && Array.isArray(empJson.companies)) {
        empJson.companies = empJson.companies.map((compId: string) => compMap[compId] || { mongo_id: compId, name: "Unknown Company", code: "N/A" });
      }

      return {
        ...empJson,
        employeeProfile: profile || null
      };
    });

    return NextResponse.json({ success: true, data: mergedData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/employees - Create a new staff member/employee
export async function POST(req: Request) {
  try {
    await sequelize.authenticate();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, email, password, role, mobile, companyId, 
      employeeId, designation, dateOfJoining, baseSalary,
      department
    } = body;

    if (!name || !email || !password || !role || !companyId || !employeeId) {
      return NextResponse.json({ success: false, error: "Missing required fields: name, email, password, role, companyId, employeeId" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "A user with this email already exists" }, { status: 400 });
    }
    
    // Check if Employee ID already exists
    const existingProfile = await EmployeeProfile.findOne({ where: { employeeId } });
    if (existingProfile) {
      return NextResponse.json({ success: false, error: "This Employee ID is already in use" }, { status: 400 });
    }

    // Verify Company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: "Selected Company not found" }, { status: 404 });
    }

    // Resolve or create department for this company
    let resolvedDepartmentId = null;
    if (department) {
      let deptDoc = await Department.findOne({ 
        where: {
          name: department, 
          company: company.mongo_id 
        }
      });
      if (!deptDoc) {
        deptDoc = await Department.create({
          mongo_id: Date.now().toString(),
          name: department,
          company: company.mongo_id,
          status: "active"
        });
      }
      resolvedDepartmentId = deptDoc.mongo_id;
    }

    const userStatus = role === "Employee" ? "probation" : "active";

    // Create User with company linked
    const newUser = await User.create({
      mongo_id: Date.now().toString(),
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      mobile: mobile || null,
      status: "active",
      companies: [company.mongo_id],
      loginHistory: [],
    });

    if (userStatus === "probation") {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months probation
      await Probation.create({
        employee: newUser._id,
        startDate,
        endDate,
        status: "active",
        attendanceSummary: { totalDays: 30, presentDays: 30 },
        reportsSummary: { sodSubmitted: 3, eodSubmitted: 3 },
      });
    }

    // Create EmployeeProfile linked to User
    await EmployeeProfile.create({
      mongo_id: Date.now().toString(),
      user: newUser.mongo_id,
      employeeId,
      designation: designation || "Employee",
      department: resolvedDepartmentId,
      dateOfJoining: dateOfJoining || new Date(),
      baseSalary: baseSalary || 0,
      "salaryStructure.basic": baseSalary ? baseSalary * 0.5 : 0,
      "salaryStructure.hra": 0,
      "salaryStructure.conveyance": baseSalary ? baseSalary * 0.1 : 0,
      "salaryStructure.specialAllowance": baseSalary ? baseSalary * 0.4 : 0,
      "leaveBalances.casualLeave": 12,
      "leaveBalances.sickLeave": 12,
      "leaveBalances.earnedLeave": 0
    });

    // Log Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "CREATE_EMPLOYEE",
      entity: "User",
      entityId: newUser.mongo_id,
      details: `Created new employee profile: ${name} (${email}) as ${role} for company ${company.name}`
    });

    await logHRActivity({
      userId: (session.user as any).id,
      userRole: (session.user as any).role,
      action: "CREATE_EMPLOYEE",
      details: `Created new employee profile: ${name} (${email}) as ${role} for company ${company.name}`
    });

    // Strip password from returned object
    const returnedUser = newUser.toJSON() as any;
    delete returnedUser.password;

    return NextResponse.json({ success: true, data: returnedUser, message: "Employee onboarded successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/employees - Remove or deactivate a staff member
export async function DELETE(req: Request) {
  try {
    await sequelize.authenticate();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { url } = req;
    const { searchParams } = new URL(url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
    }

    // Do not allow deleting yourself
    if (id === (session.user as any).id) {
      return NextResponse.json({ success: false, error: "You cannot remove yourself" }, { status: 400 });
    }

    await User.destroy({ where: { id } });
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
