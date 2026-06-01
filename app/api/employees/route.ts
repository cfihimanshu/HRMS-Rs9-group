import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import EmployeeProfile from "@/models/EmployeeProfile";
import Company from "@/models/Company";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/employees - Get list of all staff members
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // Fetch employees and populate their companies
    const employees = await User.find({}, { password: 0 })
      .populate("companies", "name code")
      .sort({ createdAt: -1 });
      
    // Optionally fetch their profiles to merge data
    const profiles = await EmployeeProfile.find({});
    
    // Merge the data
    const mergedData = employees.map(emp => {
      const profile = profiles.find(p => p.user.toString() === emp._id.toString());
      return {
        ...emp.toObject(),
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
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, email, password, role, mobile, companyId, 
      employeeId, designation, dateOfJoining, baseSalary 
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create User with company linked
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      mobile: mobile || null,
      status: "active",
      companies: [company._id],
      loginHistory: [],
    });

    // Create EmployeeProfile linked to User
    await EmployeeProfile.create({
      user: newUser._id,
      employeeId,
      designation: designation || "Employee",
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
