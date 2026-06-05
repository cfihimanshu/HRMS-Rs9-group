import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import EmployeeProfile from "@/models/EmployeeProfile";
import Company from "@/models/Company";
import Department from "@/models/Department";
import Probation from "@/models/Probation";
import ExitRecord from "@/models/ExitRecord";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

// GET /api/employees - Get list of all staff members
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // Check and process expired notice periods
    const exitRecords = await ExitRecord.find({ status: "active" });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const onNoticeUsers = await User.find({ status: "on notice" });
    for (const u of onNoticeUsers) {
      const exitRec = exitRecords.find(er => er.employee.toString() === u._id.toString());
      if (exitRec && new Date(exitRec.createdAt) < thirtyDaysAgo) {
        u.status = "inactive";
        await u.save();
      }
    }

    // Fetch employees (excluding inactive/exited employees)
    const employees = await User.find({ status: { $ne: "inactive" } }, { password: 0 })
      .populate("companies", "name code")
      .sort({ createdAt: -1 });
      
    // Optionally fetch their profiles and active probations to merge data
    const [profiles, probations] = await Promise.all([
      EmployeeProfile.find({}).populate("department", "name"),
      Probation.find({ status: "active" })
    ]);
    
    // Merge the data
    const mergedData = employees.map(emp => {
      const profile = profiles.find(p => p.user.toString() === emp._id.toString());
      const activeProbation = probations.find(p => p.employee.toString() === emp._id.toString());
      return {
        ...emp.toObject(),
        employeeProfile: profile || null,
        isOnProbation: !!activeProbation
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
    await dbConnect();
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "A user with this email already exists" }, { status: 400 });
    }
    
    // Check if Employee ID already exists
    const existingProfile = await EmployeeProfile.findOne({ employeeId });
    if (existingProfile) {
      return NextResponse.json({ success: false, error: "This Employee ID is already in use" }, { status: 400 });
    }

    // Verify Company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: "Selected Company not found" }, { status: 404 });
    }

    // Resolve or create department for this company
    let resolvedDepartmentId = null;
    if (department) {
      let deptDoc = await Department.findOne({ 
        name: department, 
        company: company._id 
      });
      if (!deptDoc) {
        deptDoc = await Department.create({
          name: department,
          company: company._id,
          status: "active"
        });
      }
      resolvedDepartmentId = deptDoc._id;
    }

    const userStatus = role === "Employee" ? "probation" : "active";

    // Create User with company linked
    const newUser = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      mobile: mobile || null,
      status: userStatus,
      companies: [company._id],
      companyName: company.name,
      departmentName: department || "",
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
      user: newUser._id,
      employeeId,
      designation: designation || "Employee",
      department: resolvedDepartmentId,
      dateOfJoining: dateOfJoining || new Date(),
      baseSalary: baseSalary || 0,
      salaryStructure: {
        basic: baseSalary ? baseSalary * 0.5 : 0,
        hra: baseSalary ? baseSalary * 0.2 : 0,
        conveyance: baseSalary ? baseSalary * 0.1 : 0,
        specialAllowance: baseSalary ? baseSalary * 0.2 : 0,
      },
      leaveBalances: {
        casualLeave: 12,
        sickLeave: 12,
        earnedLeave: 0
      }
    });

    // Log Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "CREATE_EMPLOYEE",
      entity: "User",
      entityId: newUser._id.toString(),
      details: `Created new employee profile: ${name} (${email}) as ${role} for company ${company.name}`
    });

    await logHRActivity({
      userId: (session.user as any).id,
      userRole: (session.user as any).role,
      action: "CREATE_EMPLOYEE",
      details: `Created new employee profile: ${name} (${email}) as ${role} for company ${company.name}`
    });

    // Strip password from returned object
    const returnedUser = newUser.toObject();
    delete returnedUser.password;

    return NextResponse.json({ success: true, data: returnedUser, message: "Employee onboarded successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/employees - Remove or deactivate a staff member
export async function DELETE(req: Request) {
  try {
    await dbConnect();
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

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
