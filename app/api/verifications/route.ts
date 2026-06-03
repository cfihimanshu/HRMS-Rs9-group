import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Verification from "@/models/Verification";
import Candidate from "@/models/Candidate";
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

    await dbConnect();
    const query: any = {};
    if (candidateId) {
      query.candidate = candidateId;
    }

    const verifications = await Verification.find(query)
      .populate("candidate", "name email mobile status uploads")
      .sort({ createdAt: -1 });

    // Sync any missing URLs from Candidate uploads to Verification record (self-healing migration)
    for (const ver of verifications) {
      let needsSave = false;
      const candidateObj: any = ver.candidate;
      if (candidateObj && candidateObj.uploads) {
        if (!ver.aadhaarUrl && candidateObj.uploads.aadhaar) {
          ver.aadhaarUrl = candidateObj.uploads.aadhaar;
          needsSave = true;
        }
        if (!ver.panUrl && candidateObj.uploads.pan) {
          ver.panUrl = candidateObj.uploads.pan;
          needsSave = true;
        }
        if (!ver.salarySlipUrl && candidateObj.uploads.salarySlip) {
          ver.salarySlipUrl = candidateObj.uploads.salarySlip;
          needsSave = true;
        }
        if (!ver.bankStatementUrl && candidateObj.uploads.bankStatement) {
          ver.bankStatementUrl = candidateObj.uploads.bankStatement;
          needsSave = true;
        }
      }
      if (needsSave) {
        await ver.save();
      }
    }

    return NextResponse.json({ success: true, data: verifications });
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

    await dbConnect();
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
    let verObj = await Verification.findOne({ candidate: candidateId });
    if (!verObj) {
      verObj = new Verification({ candidate: candidateId });
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

    const candidate = await Candidate.findById(candidateId);

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
      await Candidate.findByIdAndUpdate(candidateId, { status: "High Risk" });
    }

    // Audit Log Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_BACKGROUND_VERIFICATION",
      entity: "Verification",
      entityId: verObj._id.toString(),
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
