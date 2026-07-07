import { NextResponse } from "next/server";
import BranchMaster from "@/models/sequelize/BranchMaster";
import sequelize from "@/lib/sequelize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bankId');
    
    await sequelize.authenticate();
    await BranchMaster.sync({ alter: true });
    
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
    const data = await request.json();
    await sequelize.authenticate();
    await BranchMaster.sync({ alter: true });
    
    if (!data.branchCode) {
      return NextResponse.json({ success: false, error: "Branch Code is required" }, { status: 400 });
    }
    
    const newBranch = await BranchMaster.create({
      ...data,
      branchCode: data.branchCode
    });
    
    return NextResponse.json({ success: true, data: newBranch });
  } catch (error: any) {
    console.error("Branch POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
