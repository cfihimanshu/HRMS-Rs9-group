import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Verification from "@/models/Verification";
import Candidate from "@/models/Candidate";
import { logAudit } from "@/lib/audit";

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
      .populate("candidate", "name email mobile status")
      .sort({ createdAt: -1 });

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

    await verObj.save();

    // Propagate verification high risk back to candidate status if flagged
    if (status === "High Risk" || policeStatus === "High Risk") {
      await Candidate.findByIdAndUpdate(candidateId, { status: "High Risk" });
    }

    const candidate = await Candidate.findById(candidateId);

    // Audit Log Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_BACKGROUND_VERIFICATION",
      entity: "Verification",
      entityId: verObj._id.toString(),
      details: `Background verification updated for candidate: ${candidate?.name || "Unknown"}. Overall status: ${status}. Remarks: ${remarks || "None"}.`,
    });

    return NextResponse.json({ success: true, data: verObj });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
