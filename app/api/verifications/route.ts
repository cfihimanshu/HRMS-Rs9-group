import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Verification from "@/models/sequelize/Verification";
import Candidate from "@/models/sequelize/Candidate";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

// GET: Retrieve background checklists
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    await sequelize.authenticate();
    const query: any = {};
    if (candidateId) {
      query.candidate = candidateId;
    }

    const verifications = await Verification.findAll({
      where: query,
      order: [['createdAt', 'DESC']]
    });

    const candidateIds = verifications.map(v => (v as any).candidate).filter(Boolean);
    const candidates = await Candidate.findAll({
      where: { mongo_id: candidateIds }
    });

    const candidateMap = candidates.reduce((acc: any, c: any) => {
      acc[c.mongo_id] = c.toJSON();
      return acc;
    }, {});

    const updatedVerifications = [];
    for (const verInstance of verifications) {
      const ver = verInstance.toJSON() as any;
      const candidateObj = candidateMap[ver.candidate];
      ver.candidate = candidateObj || null;

      let needsSave = false;
      if (candidateObj && candidateObj.uploads) {
        if (!verInstance.aadhaarUrl && candidateObj.uploads.aadhaar) {
          verInstance.aadhaarUrl = candidateObj.uploads.aadhaar;
          needsSave = true;
        }
        if (!verInstance.panUrl && candidateObj.uploads.pan) {
          verInstance.panUrl = candidateObj.uploads.pan;
          needsSave = true;
        }
        if (!verInstance.salarySlipUrl && candidateObj.uploads.salarySlip) {
          verInstance.salarySlipUrl = candidateObj.uploads.salarySlip;
          needsSave = true;
        }
        if (!verInstance.bankStatementUrl && candidateObj.uploads.bankStatement) {
          verInstance.bankStatementUrl = candidateObj.uploads.bankStatement;
          needsSave = true;
        }
      }
      if (needsSave) {
        await verInstance.save();
        ver.aadhaarUrl = verInstance.aadhaarUrl;
        ver.panUrl = verInstance.panUrl;
        ver.salarySlipUrl = verInstance.salarySlipUrl;
        ver.bankStatementUrl = verInstance.bankStatementUrl;
      }
      updatedVerifications.push(ver);
    }

    return NextResponse.json({ success: true, data: updatedVerifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST/PUT: Update background checklist status (restricted to HR, Owner, Risk Officer)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive", "RIBP / Risk Officer"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Risk/HR role required" }, { status: 403 });
    }

    await sequelize.authenticate();
    const body = await req.json();
    const {
      candidateId,
      aadhaarStatus,
      panStatus,
      addressStatus,
      employerStatus,
      referencesStatus,
      cibilStatus,
      bankStatus,
      policeStatus,
      socialMediaStatus,
      remarks,
      status,
      aadhaarUrl,
      panUrl,
      salarySlipUrl,
      bankStatementUrl,
    } = body;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: "Candidate ID is required" }, { status: 400 });
    }

    // Find or create verification checklist
    let verObj = await Verification.findOne({ where: { candidate: candidateId } });
    if (!verObj) {
      verObj = await Verification.create({
        mongo_id: Date.now().toString(),
        candidate: candidateId
      });
    }

    // Map statuses
    if (aadhaarStatus) verObj.aadhaarStatus = aadhaarStatus;
    if (panStatus) verObj.panStatus = panStatus;
    if (addressStatus) verObj.addressStatus = addressStatus;
    if (employerStatus) verObj.employerStatus = employerStatus;
    if (referencesStatus) verObj.referencesStatus = referencesStatus;
    if (cibilStatus) verObj.cibilStatus = cibilStatus;
    if (bankStatus) verObj.bankStatus = bankStatus;
    if (policeStatus) verObj.policeStatus = policeStatus;
    if (socialMediaStatus) verObj.socialMediaStatus = socialMediaStatus;
    if (remarks !== undefined) verObj.remarks = remarks;
    if (status) verObj.status = status;

    const candidateInstance = await Candidate.findByPk(candidateId);
    const candidate = candidateInstance ? (candidateInstance.toJSON() as any) : null;

    // Map document URLs if provided
    if (aadhaarUrl !== undefined) verObj.aadhaarUrl = aadhaarUrl;
    if (panUrl !== undefined) verObj.panUrl = panUrl;
    if (salarySlipUrl !== undefined) verObj.salarySlipUrl = salarySlipUrl;
    if (bankStatementUrl !== undefined) verObj.bankStatementUrl = bankStatementUrl;

    // Fallback/auto-fill from candidate uploads if not provided or empty in verification object
    if (candidate && candidate.uploads) {
      if (!verObj.aadhaarUrl && candidate.uploads.aadhaar) verObj.aadhaarUrl = candidate.uploads.aadhaar;
      if (!verObj.panUrl && candidate.uploads.pan) verObj.panUrl = candidate.uploads.pan;
      if (!verObj.salarySlipUrl && candidate.uploads.salarySlip) verObj.salarySlipUrl = candidate.uploads.salarySlip;
      if (!verObj.bankStatementUrl && candidate.uploads.bankStatement) verObj.bankStatementUrl = candidate.uploads.bankStatement;
    }

    await verObj.save();

    // Propagate verification high risk back to candidate status if flagged
    if (status === "High Risk" || policeStatus === "High Risk") {
      await Candidate.update({ status: "High Risk" }, { where: { mongo_id: candidateId } });
    }

    // Audit Log Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_BACKGROUND_VERIFICATION",
      entity: "Verification",
      entityId: verObj.mongo_id,
      details: `Background verification updated for candidate: ${candidate?.name || "Unknown"}. Overall status: ${status}. Remarks: ${remarks || "None"}.`,
    });

    await logHRActivity({
      userId: (session.user as any).id,
      userRole: (session.user as any).role,
      action: "SUBMIT_VERIFICATION",
      details: `Background verification updated for candidate: ${candidate?.name || "Unknown"}. Overall status: ${status}.`
    });

    return NextResponse.json({ success: true, data: verObj });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
