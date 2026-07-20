import { NextResponse } from "next/server";
import NbfcMaster from "@/models/sequelize/NbfcMaster";
import sequelize from "@/lib/sequelize";

export async function GET() {
  try {
    await sequelize.authenticate();
    await NbfcMaster.sync({ alter: true });
    
    const nbfcs = await NbfcMaster.findAll({
      order: [["nbfcName", "ASC"]],
    });
    
    return NextResponse.json({ success: true, data: nbfcs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await sequelize.authenticate();
    await NbfcMaster.sync({ alter: true });

    if (!data.nbfcName) {
      return NextResponse.json({ success: false, error: "NBFC Name is required" }, { status: 400 });
    }
    
    const newNbfc = await NbfcMaster.create({
      nbfcName: data.nbfcName,
      nbfcCode: data.nbfcCode || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    });
    
    return NextResponse.json({ success: true, data: newNbfc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ success: false, error: "NBFC ID is required" }, { status: 400 });
    }
    await sequelize.authenticate();
    await NbfcMaster.sync({ alter: true });

    const nbfc = await NbfcMaster.findByPk(id);
    if (!nbfc) {
      return NextResponse.json({ success: false, error: "NBFC not found" }, { status: 404 });
    }

    await nbfc.update(updateData);
    return NextResponse.json({ success: true, data: nbfc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "NBFC ID is required" }, { status: 400 });
    }
    await sequelize.authenticate();
    await NbfcMaster.sync({ alter: true });

    const nbfc = await NbfcMaster.findByPk(id);
    if (!nbfc) {
      return NextResponse.json({ success: false, error: "NBFC not found" }, { status: 404 });
    }

    await nbfc.destroy();
    return NextResponse.json({ success: true, message: "NBFC deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
