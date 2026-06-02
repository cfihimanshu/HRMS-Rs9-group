import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Role from "@/models/Role";
import Company from "@/models/Company";
import Department from "@/models/Department";
import Territory from "@/models/Territory";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await dbConnect();

    // 1. Seed Roles
    const rolesList = [
      "Owner",
      "Director",
      "HR Head",
      "HR Executive",
      "Department Manager",
      "DSM",
      "Trainer",
      "Accounts",
      "IT Admin",
      "Employee",
      "Business Associate",
      "Vendor",
      "Franchisee",
      "Territory Partner",
      "RIBP / Risk Officer",
    ];

    console.log("Seeding roles...");
    for (const r of rolesList) {
      await Role.findOneAndUpdate(
        { name: r },
        { name: r, permissions: ["read", "write"], status: "active" },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // 2. Seed Company
    console.log("Seeding company...");
    const company = await Company.findOneAndUpdate(
      { code: "ACOLYTE" },
      { name: "Acolyte Group of Companies", code: "ACOLYTE", address: "Corporate Headquarters, Delhi", status: "active" },
      { upsert: true, returnDocument: 'after' }
    );

    // 3. Seed Departments
    console.log("Seeding departments...");
    const departments = ["HR", "Accounts", "Management", "Operations", "Sales", "IT"];
    const deptIds = [];
    for (const d of departments) {
      const dept = await Department.findOneAndUpdate(
        { name: d, company: company._id },
        { name: d, company: company._id, status: "active" },
        { upsert: true, returnDocument: 'after' }
      );
      deptIds.push(dept._id);
    }

    // 4. Seed a default Territory
    console.log("Seeding territory...");
    const territory = await Territory.findOneAndUpdate(
      { name: "North Delhi Region" },
      { name: "North Delhi Region", status: "active" },
      { upsert: true, returnDocument: 'after' }
    );

    // 5. Seed Default Users
    console.log("Seeding users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const defaultUsers = [
      {
        name: "Acolyte Owner",
        email: "owner@acolyte.com",
        password: hashedPassword,
        mobile: "9999999991",
        role: "Owner",
        companies: [company._id],
        status: "active",
      },
      {
        name: "Acolyte HR Head",
        email: "hr@acolyte.com",
        password: hashedPassword,
        mobile: "9999999992",
        role: "HR Head",
        companies: [company._id],
        status: "active",
      },
      {
        name: "Acolyte HR Executive",
        email: "executive@acolyte.com",
        password: hashedPassword,
        mobile: "9999999993",
        role: "HR Executive",
        companies: [company._id],
        status: "active",
      },
      {
        name: "Acolyte Department Head",
        email: "manager@acolyte.com",
        password: hashedPassword,
        mobile: "9999999994",
        role: "Department Manager",
        companies: [company._id],
        status: "active",
      },
      {
        name: "Acolyte Trainer",
        email: "trainer@acolyte.com",
        password: hashedPassword,
        mobile: "9999999995",
        role: "Trainer",
        companies: [company._id],
        status: "active",
      },
      {
        name: "Acolyte Employee",
        email: "employee@acolyte.com",
        password: hashedPassword,
        mobile: "9999999996",
        role: "Employee",
        companies: [company._id],
        status: "active",
      },
      {
        name: "Acolyte Partner",
        email: "partner@acolyte.com",
        password: hashedPassword,
        mobile: "9999999997",
        role: "Territory Partner",
        companies: [company._id],
        status: "active",
      },
    ];

    for (const u of defaultUsers) {
      await User.findOneAndUpdate(
        { email: u.email },
        { ...u },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Write audit log entry
    await logAudit({
      action: "SEED_DATABASE",
      entity: "Database",
      details: "Database successfully seeded with default roles, company, departments, territories, and 7 core users.",
    });

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      usersSeeded: defaultUsers.map((u) => ({ name: u.name, email: u.email, role: u.role })),
    });
  } catch (error: any) {
    console.error("Database seeding failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Seeding failed" },
      { status: 500 }
    );
  }
}
