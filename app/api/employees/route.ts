import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import User from "@/models/sequelize/User";
import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";
import Probation from "@/models/sequelize/Probation";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";
import { sendEmail } from "@/lib/email";

// GET /api/employees - Get list of all staff members
export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    await EmployeeProfile.sync({ alter: true });
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // Fetch employees
    const employees = await User.findAll({ where: {}, raw: true });
      
    // Fetch profiles to merge data
    const profiles = await EmployeeProfile.findAll({ where: {}, raw: true });
    const departments = await Department.findAll({ where: {}, raw: true });
    const allCompanies = await Company.findAll({ where: {}, raw: true });
    
    const deptMap = departments.reduce((acc: any, dept: any) => {
      acc[dept.id] = dept;
      return acc;
    }, {});

    const compMap = allCompanies.reduce((acc: any, comp: any) => {
      acc[comp.id] = comp;
      return acc;
    }, {});

    const profilesWithDept = profiles.map(p => {
      const pJson = { ...p } as any;
      if (pJson.department) {
        pJson.department = deptMap[pJson.department] || null;
      }
      return pJson;
    });

    // Merge the data
    const mergedData = employees.map(emp => {
      const empJson = { ...emp } as any;
      const profile = profilesWithDept.find((p: any) => p.user?.toString() === empJson.id?.toString());
      
      // Populate companies
      if (typeof empJson.companies === 'string') {
        try { empJson.companies = JSON.parse(empJson.companies); } catch (e) {}
      }
      if (empJson.companies && Array.isArray(empJson.companies)) {
        empJson.companies = empJson.companies.map((compId: string) => compMap[compId] || { id: compId, name: "Unknown Company", code: "N/A" });
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
    await EmployeeProfile.sync({ alter: true });
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
          company: company.id 
        }
      });
      if (!deptDoc) {
        deptDoc = await Department.create({
          id: Date.now().toString(),
          name: department,
          company: company.id,
          status: "active"
        });
      }
      resolvedDepartmentId = deptDoc.id;
    }

    const userStatus = role === "Employee" ? "probation" : "active";

    // Create User with company linked
    const newUser = await User.create({
      id: Date.now().toString(),
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      mobile: mobile || null,
      status: "active",
      companies: [company.id],
      loginHistory: [],
    });

    if (userStatus === "probation") {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months probation
      await Probation.create({
        id: Date.now().toString() + "PROB",
        employee: newUser.id,
        startDate,
        endDate,
        status: "active",
        attendanceSummary: { totalDays: 30, presentDays: 30 },
        reportsSummary: { sodSubmitted: 3, eodSubmitted: 3 },
      });
    }

    // Create EmployeeProfile linked to User
    await EmployeeProfile.create({
      id: Date.now().toString(),
      user: newUser.id,
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
      "leaveBalances.earnedLeave": 0,
      allocatedAsset: "",
      allocatedSim: "",
      allocatedGmail: "",
      allocatedWhatsapp: ""
    });

    // Log Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "CREATE_EMPLOYEE",
      entity: "User",
      entityId: newUser.id,
      details: `Created new employee profile: ${name} (${email}) as ${role} for company ${company.name}`
    });

    await logHRActivity({
      userId: (session.user as any).id,
      userRole: (session.user as any).role,
      action: "CREATE_EMPLOYEE",
      details: `Created new employee profile: ${name} (${email}) as ${role} for company ${company.name}`
    });

    // Send email notification to new employee and all owners
    try {
      const owners = await User.findAll({
        where: { role: "Owner" },
        raw: true
      });
      const ownerEmails = owners.map((o: any) => o.email).filter(Boolean);
      const recipients = Array.from(new Set([email, ...ownerEmails])).filter(Boolean);

      if (recipients.length > 0) {
        const portalUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await sendEmail({
          to: recipients,
          subject: `Welcome Onboard & Account Details - ${name}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Employee Onboarded</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f1f5f9;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    .details-table th, .details-table td {
      padding: 12px 0;
      text-align: left;
      font-size: 14px;
    }
    .details-table th {
      color: #64748b;
      font-weight: 500;
      width: 40%;
      vertical-align: top;
    }
    .details-table td {
      color: #0f172a;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .badge-role {
      background-color: #e0e7ff;
      color: #4338ca;
    }
    .badge-dept {
      background-color: #f3e8ff;
      color: #6b21a8;
    }
    .welcome-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .welcome-box h3 {
      margin: 0 0 8px 0;
      color: #166534;
      font-size: 16px;
      font-weight: 600;
    }
    .welcome-box p {
      margin: 0 0 12px 0;
      color: #1e293b;
      font-size: 14px;
      line-height: 1.5;
    }
    .credentials {
      background-color: #ffffff;
      border: 1px dashed #bbf7d0;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      color: #0f172a;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>New Employee Registration</h1>
        <p>A new employee account has been successfully created</p>
      </div>
      <div class="content">
        <div class="welcome-box">
          <h3>Welcome onboard, ${name}!</h3>
          <p>Your official HRMS portal login credentials are listed below. Please login and complete your onboarding process.</p>
          <div class="credentials">
            <strong>Portal URL:</strong> <a href="${portalUrl}" style="color: #4f46e5; text-decoration: none;">${portalUrl}</a><br>
            <strong>Email ID:</strong> ${email}<br>
            <strong>Password:</strong> ${password}
          </div>
        </div>

        <div class="section-title">Employee Profile Details</div>
        <table class="details-table">
          <tr>
            <th>Full Name</th>
            <td>${name}</td>
          </tr>
          <tr>
            <th>Employee ID</th>
            <td>${employeeId}</td>
          </tr>
          <tr>
            <th>Company</th>
            <td>${company.name}</td>
          </tr>
          <tr>
            <th>Department</th>
            <td><span class="badge badge-dept">${department || 'N/A'}</span></td>
          </tr>
          <tr>
            <th>Designation</th>
            <td>${designation || 'Employee'}</td>
          </tr>
          <tr>
            <th>System Role</th>
            <td><span class="badge badge-role">${role}</span></td>
          </tr>
          <tr>
            <th>Mobile Number</th>
            <td>${mobile || 'N/A'}</td>
          </tr>
          <tr>
            <th>Date of Joining</th>
            <td>${dateOfJoining ? new Date(dateOfJoining).toLocaleDateString() : new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <th>Base Salary</th>
            <td>₹${baseSalary ? Number(baseSalary).toLocaleString('en-IN') : '0'} / month</td>
          </tr>
        </table>
      </div>
      <div class="footer">
        <p>This is an automated system email from the HRMS portal.</p>
        <p>&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
          `
        });
      }
    } catch (emailErr) {
      console.error("Error sending onboarding email:", emailErr);
    }

    // Strip password from returned object
    const returnedUser = newUser.toJSON() as any;
    delete returnedUser.password;

    return NextResponse.json({ success: true, data: returnedUser, message: "Employee onboarded successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/employees - Update an employee's profile/assets
export async function PUT(req: Request) {
  try {
    await sequelize.authenticate();
    await EmployeeProfile.sync({ alter: true });
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["Owner", "Director", "HR Head", "HR Executive"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      employeeId, 
      allocatedAsset, 
      allocatedSim, 
      allocatedGmail, 
      allocatedWhatsapp,
      designation,
      baseSalary,
    } = body;

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "Missing employeeId" }, { status: 400 });
    }

    const profile = await EmployeeProfile.findOne({ where: { employeeId } });
    if (!profile) {
      return NextResponse.json({ success: false, error: "Employee profile not found" }, { status: 404 });
    }

    // Update fields if provided
    if (allocatedAsset !== undefined) profile.allocatedAsset = allocatedAsset;
    if (allocatedSim !== undefined) profile.allocatedSim = allocatedSim;
    if (allocatedGmail !== undefined) profile.allocatedGmail = allocatedGmail;
    if (allocatedWhatsapp !== undefined) profile.allocatedWhatsapp = allocatedWhatsapp;
    if (designation !== undefined) profile.designation = designation;
    if (baseSalary !== undefined) profile.baseSalary = baseSalary;

    await profile.save();

    // Log Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_EMPLOYEE_ASSETS",
      entity: "EmployeeProfile",
      entityId: profile.id,
      details: `Updated assets/profile for employee ID ${employeeId}. Asset: ${allocatedAsset}, SIM: ${allocatedSim}, Gmail: ${allocatedGmail}, WhatsApp: ${allocatedWhatsapp}`
    });

    return NextResponse.json({ success: true, data: profile, message: "Employee profile updated successfully" });
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
