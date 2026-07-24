import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import ApprovalMatrix from "@/models/sequelize/ApprovalMatrix";

const DEFAULT_WORKFLOWS = [
  { formKey: "expense_claims", formName: "Expense Reimbursement Claims", category: "Employee Self Service", defaultRoles: ["Owner", "Accounts"] },
  { formKey: "leave_requests", formName: "Leave Applications", category: "Employee Self Service", defaultRoles: ["Owner", "HR Head", "Department Manager"] },
  { formKey: "asset_request", formName: "Asset & Equipment Requests", category: "Employee Self Service", defaultRoles: ["Owner", "IT MANAGER"] },
  { formKey: "hiring_requisition", formName: "Hiring Requisitions", category: "Core Workspace", defaultRoles: ["Owner", "HR Head", "Accounts"] },
  { formKey: "disciplinary_warnings", formName: "Disciplinary Warning Approvals", category: "Compliance & Exit", defaultRoles: ["Owner", "HR Head"] },
  { formKey: "inventory_purchase", formName: "Inventory Purchase Requests", category: "Core Workspace", defaultRoles: ["Owner"] },
];

// GET: Fetch all approval matrix routing configurations
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await ApprovalMatrix.sync({ alter: true });

    let records = await ApprovalMatrix.findAll({ order: [["category", "ASC"]] });

    // Seed default workflows if empty
    if (records.length === 0) {
      for (const wf of DEFAULT_WORKFLOWS) {
        await ApprovalMatrix.create({
          formKey: wf.formKey,
          formName: wf.formName,
          category: wf.category,
          approverRoles: JSON.stringify(wf.defaultRoles),
          approverUsers: JSON.stringify([]),
          notifyEmail: true,
          notifyApp: true,
        });
      }
      records = await ApprovalMatrix.findAll({ order: [["category", "ASC"]] });
    }

    const data = records.map((r: any) => {
      const plain = r.toJSON();
      try {
        plain.approverRoles = JSON.parse(plain.approverRoles || "[]");
      } catch (e) {
        plain.approverRoles = [];
      }
      try {
        plain.approverUsers = JSON.parse(plain.approverUsers || "[]");
      } catch (e) {
        plain.approverUsers = [];
      }
      try {
        plain.userOverrides = JSON.parse(plain.userOverrides || "[]");
      } catch (e) {
        plain.userOverrides = [];
      }
      return plain;
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[/api/admin/approval-matrix GET] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update an approval routing rule (Owner only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role || "Employee";
    if (userRole !== "Owner" && userRole !== "Admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Only Owner can modify approval routing matrix" }, { status: 403 });
    }

    const body = await request.json();
    const { formKey, formName, category, approverRoles, approverUsers, userOverrides, notifyEmail, notifyApp } = body;

    if (!formKey) {
      return NextResponse.json({ success: false, error: "Missing formKey" }, { status: 400 });
    }

    await sequelize.authenticate();
    await ApprovalMatrix.sync({ alter: true });

    let record = await ApprovalMatrix.findByPk(formKey);
    if (!record) {
      record = await ApprovalMatrix.create({
        formKey,
        formName: formName || formKey,
        category: category || "General",
        approverRoles: JSON.stringify(approverRoles || ["Owner"]),
        approverUsers: JSON.stringify(approverUsers || []),
        userOverrides: JSON.stringify(userOverrides || []),
        notifyEmail: notifyEmail !== undefined ? notifyEmail : true,
        notifyApp: notifyApp !== undefined ? notifyApp : true,
      });
    } else {
      record.approverRoles = JSON.stringify(approverRoles || []);
      record.approverUsers = JSON.stringify(approverUsers || []);
      record.userOverrides = JSON.stringify(userOverrides || []);
      record.notifyEmail = notifyEmail !== undefined ? notifyEmail : true;
      record.notifyApp = notifyApp !== undefined ? notifyApp : true;
      if (formName) record.formName = formName;
      if (category) record.category = category;
      await record.save();
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("[/api/admin/approval-matrix POST] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
