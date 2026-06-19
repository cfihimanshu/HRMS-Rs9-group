// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Job from "@/models/sequelize/Job";
import Company from "@/models/sequelize/Company";
import Department from "@/models/sequelize/Department";
import { logAudit } from "@/lib/audit";
import HiringRequisition from "@/models/sequelize/HiringRequisition";
import { Op } from "sequelize";

// GET: List all active jobs (can be public or authenticated)
export async function GET(req: Request) {
  try {
    await sequelize.authenticate();
    
    // Get optional company filter or active filter
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    
    const query: any = { status: "active" };
    if (category) {
      query.category = category;
    }

    const jobs = await Job.findAll({ 
      where: query,
      order: [['createdAt', 'DESC']],
      raw: true
    });

    const companyIds = [...new Set(jobs.map((j: any) => j.company).filter(Boolean))];
    const deptIds = [...new Set(jobs.map((j: any) => j.department).filter(Boolean))];

    let companiesMap: any = {};
    if (companyIds.length > 0) {
      const companies = await Company.findAll({ where: { mongo_id: { [Op.in]: companyIds } }, raw: true });
      companies.forEach((c: any) => { companiesMap[c.mongo_id] = { name: c.name, code: c.code }; });
    }

    let deptsMap: any = {};
    if (deptIds.length > 0) {
      const depts = await Department.findAll({ where: { mongo_id: { [Op.in]: deptIds } }, raw: true });
      depts.forEach((d: any) => { deptsMap[d.mongo_id] = { name: d.name }; });
    }

    const data = jobs.map((job: any) => ({
      ...job,
      company: companiesMap[job.company] || { name: job.company },
      department: deptsMap[job.department] || { name: job.department }
    }));

    return NextResponse.json({ success: true, data });
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

    await sequelize.authenticate();
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
      requisitionId,
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
    let company: any;
    if (/^[0-9a-fA-F]{24}$/.test(companyId)) {
      company = await Company.findByPk(companyId);
    }
    if (!company) {
      company = await Company.findOne({ where: { name: companyId } }) || await Company.findOne() || await Company.create({ mongo_id: Date.now().toString(), name: companyId || "Acolyte Group", code: "ACO" });
    }

    let department: any;
    if (/^[0-9a-fA-F]{24}$/.test(departmentId)) {
      department = await Department.findByPk(departmentId);
    }
    if (!department) {
      department = await Department.findOne({ where: { name: departmentId } }) || await Department.findOne() || await Department.create({ mongo_id: Date.now().toString(), name: departmentId || "Sales" });
    }

    let reqPostingDuration = undefined;
    if (requisitionId) {
      const reqDoc: any = await HiringRequisition.findByPk(requisitionId);
      if (reqDoc) {
        reqPostingDuration = reqDoc.postingDuration;
      }
    }

    const job = await Job.create({
      mongo_id: Date.now().toString(),
      title,
      company: company.mongo_id,
      department: department.mongo_id,
      location,
      category,
      qualification,
      experience,
      salaryRange,
      description,
      applicationLink: applicationLink || "",
      source: source || "Other",
      status: "active",
      postingDuration: reqPostingDuration,
    });

    // Generate and save shareable link
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const shareableLink = `${origin}/jobs/apply/${job.mongo_id}`;
    job.shareableLink = shareableLink;
    await job.save();

    if (requisitionId) {
      await HiringRequisition.update({
        status: "Job Posted",
        ownerRemarks: "Job vacancy posted via Module 3 Form.",
        postingDuration: reqPostingDuration,
      }, { where: { mongo_id: requisitionId } });
    }

    // Log Audit entry
    await logAudit({
      userId: (session.user as any).id,
      action: "CREATE_JOB",
      entity: "Job",
      entityId: job.mongo_id.toString(),
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
