import { NextResponse } from "next/server";
import NbfcBranch from "@/models/sequelize/NbfcBranch";
import sequelize from "@/lib/sequelize";

export async function GET() {
  try {
    await sequelize.authenticate();
    await NbfcBranch.sync({ alter: true });
    
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
    await NbfcBranch.sync({ alter: true });

    if (!data.branchCode) {
      return NextResponse.json({ success: false, error: "Branch Code is required" }, { status: 400 });
    }
    
    const newBranch = await NbfcBranch.create({
      nbfcId: data.nbfcId || data.bankId || 1,
      branchName: data.branchName,
      branchCode: data.branchCode,
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
    await NbfcBranch.sync({ alter: true });

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
    await NbfcBranch.sync({ alter: true });

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
