import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import Company from "@/models/Company";
import Department from "@/models/Department";
import { logAudit } from "@/lib/audit";

// GET: List all active jobs (can be public or authenticated)
export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // Get optional company filter or active filter
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    
    const query: any = { status: "active" };
    if (category) {
      query.category = category;
    }

    const jobs = await Job.find(query)
      .populate("company", "name code")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST: Create a new Job (Restricted to HR Head, HR Executive, Owner, Director)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const permittedRoles = ["Owner", "Director", "HR Head", "HR Executive"];
    if (!permittedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to post jobs" },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await req.json();

    const {
      title,
      companyId,
      departmentId,
      location,
      category,
      qualification,
      experience,
      salaryRange,
      description,
      applicationLink,
      source,
    } = body;

    if (
      !title ||
      !companyId ||
      !departmentId ||
      !location ||
      !category ||
      !qualification ||
      !experience ||
      !salaryRange ||
      !description
    ) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Verify company & department exists
    let company;
    if (/^[0-9a-fA-F]{24}$/.test(companyId)) {
      company = await Company.findById(companyId);
    }
    if (!company) {
      company = await Company.findOne({ name: companyId }) || await Company.findOne() || await Company.create({ name: companyId || "Acolyte Group", code: "ACO" });
    }

    let department;
    if (/^[0-9a-fA-F]{24}$/.test(departmentId)) {
      department = await Department.findById(departmentId);
    }
    if (!department) {
      department = await Department.findOne({ name: departmentId }) || await Department.findOne() || await Department.create({ name: departmentId || "Sales" });
    }

    const job = new Job({
      title,
      company: company._id,
      department: department._id,
      location,
      category,
      qualification,
      experience,
      salaryRange,
      description,
      applicationLink: applicationLink || "",
      source: source || "Other",
      status: "active",
    });

    // Save job first to get ID
    await job.save();

    // Generate and save shareable link
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const shareableLink = `${origin}/jobs/apply/${job._id}`;
    job.shareableLink = shareableLink;
    await job.save();

    // Log Audit entry
    await logAudit({
      userId: (session.user as any).id,
      action: "CREATE_JOB",
      entity: "Job",
      entityId: job._id.toString(),
      details: `HR Job posted: ${title} for ${company.name} (${department.name}). Category: ${category}.`,
    });

    return NextResponse.json({ success: true, data: job });
  } catch (error: any) {
    console.error("Failed to post job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create job" },
      { status: 500 }
    );
  }
}
