import { NextResponse } from "next/server";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalExpense from "@/models/sequelize/LegalExpense";
import LegalAssetSeizure from "@/models/sequelize/LegalAssetSeizure";
import LegalAdvocateMaster from "@/models/sequelize/LegalAdvocateMaster";
import sequelize from "@/lib/sequelize";

export async function GET() {
  try {
    await sequelize.authenticate();
    await LegalNotice.sync({ alter: true });
    await LegalExpense.sync({ alter: true });
    await LegalAssetSeizure.sync({ alter: true });
    await LegalAdvocateMaster.sync({ alter: true });
    return NextResponse.json({ success: true, message: "Tables synced" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
