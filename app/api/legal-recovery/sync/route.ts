import { NextResponse } from "next/server";
import LegalNotice from "@/models/sequelize/LegalNotice";
import LegalExpense from "@/models/sequelize/LegalExpense";
import LegalAssetSeizure from "@/models/sequelize/LegalAssetSeizure";
import LegalAdvocateMaster from "@/models/sequelize/LegalAdvocateMaster";
import LegalNoticeType from "@/models/sequelize/LegalNoticeType";
import sequelize from "@/lib/sequelize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sequelize.authenticate();
    await LegalNoticeType.sync();
    await LegalNotice.sync();
    await LegalExpense.sync();
    await LegalAssetSeizure.sync();
    await LegalAdvocateMaster.sync();
    return NextResponse.json({ success: true, message: "Tables synced" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
