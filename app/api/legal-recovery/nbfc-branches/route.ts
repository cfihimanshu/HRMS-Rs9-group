import { NextResponse } from "next/server";
import NbfcBranch from "@/models/sequelize/NbfcBranch";
import sequelize from "@/lib/sequelize";

const normalizeBranchValue = (value: unknown) => String(value || "").trim().toLowerCase();

export async function GET() {
  try {
    await sequelize.authenticate();
    await NbfcBranch.sync();
    
    const branches = await NbfcBranch.findAll({
      order: [["branchName", "ASC"]],
    });
    
    return NextResponse.json({ success: true, data: branches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await NbfcBranch.sync();

    if (!String(data.branchName || "").trim()) {
      return NextResponse.json({ success: false, error: "Branch Name is required" }, { status: 400 });
    }
    if (!String(data.branchCode || "").trim()) {
      return NextResponse.json({ success: false, error: "Branch Code is required" }, { status: 400 });
    }

    const nbfcId = data.nbfcId || data.bankId || 1;
    const branchName = String(data.branchName || "").trim();
    const branchCode = String(data.branchCode).trim();
    const existingBranches = await NbfcBranch.findAll({ where: { nbfcId } });
    const duplicate = existingBranches.find(branch =>
      normalizeBranchValue(branch.branchName) === normalizeBranchValue(branchName) ||
      normalizeBranchValue(branch.branchCode) === normalizeBranchValue(branchCode)
    );
    if (duplicate) {
      const duplicateField = normalizeBranchValue(duplicate.branchCode) === normalizeBranchValue(branchCode) ? "code" : "name";
      return NextResponse.json(
        { success: false, error: `This NBFC already has a branch with the same ${duplicateField}.` },
        { status: 409 }
      );
    }
    
    const newBranch = await NbfcBranch.create({
      nbfcId,
      branchName,
      branchCode,
      branchEmail: data.branchEmail || null,
      branchManager: data.branchManager || null,
      branchManagerContact: data.branchManagerContact || null,
      aoName: data.aoName || null,
      foName: data.foName || null,
      foContact: data.foContact || null,
      rbo: data.rbo || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    });
    
    return NextResponse.json({ success: true, data: newBranch });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 });
    }
    await sequelize.authenticate();
    await NbfcBranch.sync();

    const branch = await NbfcBranch.findByPk(id);
    if (!branch) {
      return NextResponse.json({ success: false, error: "NBFC Branch not found" }, { status: 404 });
    }

    await branch.update(updateData);
    return NextResponse.json({ success: true, data: branch });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 });
    }
    await sequelize.authenticate();
    await NbfcBranch.sync();

    const branch = await NbfcBranch.findByPk(id);
    if (!branch) {
      return NextResponse.json({ success: false, error: "NBFC Branch not found" }, { status: 404 });
    }

    await branch.destroy();
    return NextResponse.json({ success: true, message: "NBFC Branch deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
