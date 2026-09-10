import { NextResponse } from "next/server";
import BranchMaster from "@/models/sequelize/BranchMaster";
import sequelize from "@/lib/sequelize";
import { requireApiSession, MANAGEMENT_ROLES } from "@/lib/apiAuth";

const normalizeBranchValue = (value: unknown) => String(value || "").trim().toLowerCase();

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bankId');
    
    await sequelize.authenticate();
    await BranchMaster.sync();
    
    const where = bankId ? { bankId } : {};
    
    const branches = await BranchMaster.findAll({
      where,
      order: [["branchName", "ASC"]],
    });
    return NextResponse.json({ success: true, data: branches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Employees also create branches from their daily work entry forms.
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const data = await request.json();
    await sequelize.authenticate();
    await BranchMaster.sync();
    
    if (!String(data.branchName || "").trim()) {
      return NextResponse.json({ success: false, error: "Branch Name is required" }, { status: 400 });
    }
    if (!String(data.branchCode || "").trim()) {
      return NextResponse.json({ success: false, error: "Branch Code is required" }, { status: 400 });
    }

    const branchName = String(data.branchName || "").trim();
    const branchCode = String(data.branchCode).trim();
    const existingBranches = await BranchMaster.findAll({ where: { bankId: data.bankId } });
    const duplicate = existingBranches.find(branch =>
      normalizeBranchValue(branch.branchName) === normalizeBranchValue(branchName) ||
      normalizeBranchValue(branch.branchCode) === normalizeBranchValue(branchCode)
    );
    if (duplicate) {
      const duplicateField = normalizeBranchValue(duplicate.branchCode) === normalizeBranchValue(branchCode) ? "code" : "name";
      return NextResponse.json(
        { success: false, error: `This bank already has a branch with the same ${duplicateField}.` },
        { status: 409 }
      );
    }
    
    const newBranch = await BranchMaster.create({
      ...data,
      branchName,
      branchCode
    });
    
    return NextResponse.json({ success: true, data: newBranch });
  } catch (error: any) {
    console.error("Branch POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiSession(MANAGEMENT_ROLES);
    if (auth.response) return auth.response;
    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 });
    }
    await sequelize.authenticate();
    await BranchMaster.sync();

    const branch = await BranchMaster.findByPk(id);
    if (!branch) {
      return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });
    }

    await branch.update(updateData);
    return NextResponse.json({ success: true, data: branch });
  } catch (error: any) {
    console.error("Branch PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
