import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Onboarding from "@/models/Onboarding";
import Candidate from "@/models/Candidate";
import { logAudit } from "@/lib/audit";

// GET: Fetch onboarding files
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json({ success: false, error: "Candidate ID required" }, { status: 400 });
    }

    await dbConnect();
    const onboarding = await Onboarding.findOne({ candidate: candidateId })
      .populate("candidate", "name email mobile status");

    return NextResponse.json({ success: true, data: onboarding });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Generate onboarding paperwork (Restricted to HR Head, Owner)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: HR Head or Owner role required" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { candidateId, category } = body; // category: Staff | Associate | Vendor | Franchise

    if (!candidateId || !category) {
      return NextResponse.json({ success: false, error: "Candidate ID and Category are required" }, { status: 400 });
    }

    const candidate = await Candidate.findById(candidateId).populate("job");
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    // Determine documents to generate based on category
    let docsToGen: string[] = [];

    if (category === "Staff") {
      docsToGen = [
        "Offer Letter",
        "Appointment Letter",
        "Agreement with NDA & NCA",
        "HR Policy Acceptance",
        "Code of Conduct",
        "Asset Policy",
      ];
    } else if (category === "Associate") {
      docsToGen = [
        "Associate Engagement Letter",
        "Payout Terms",
        "SOP Acceptance",
        "NDA & NCA",
        "Confidentiality",
        "Non-diversion terms",
      ];
    } else if (category === "Vendor") {
      docsToGen = [
        "Vendor Agreement",
        "SLA",
        "Payment Terms",
        "NDA & NCA",
        "Data Security Terms",
      ];
    } else if (category === "Franchise") {
      docsToGen = [
        "Franchise Agreement",
        "Territory Terms",
        "Branding Rules",
        "Revenue Sharing Terms",
        "Escalation Matrix",
      ];
    }

    // Find or create Onboarding record
    let onboarding = await Onboarding.findOne({ candidate: candidateId });
    if (!onboarding) {
      onboarding = new Onboarding({
        candidate: candidateId,
        category,
        generatedDocs: [],
        signedDocs: [],
        status: "Pending",
      });
    }

    // Add generated docs
    onboarding.generatedDocs = docsToGen.map((docName) => ({
      name: docName,
      url: `/api/documents/download?candidateId=${candidateId}&docName=${encodeURIComponent(
        docName
      )}&category=${category}`,
      generatedAt: new Date(),
    }));

    await onboarding.save();

    // Log in Audit Log
    await logAudit({
      userId: (session.user as any).id,
      action: "GENERATE_ONBOARDING_PAPERS",
      entity: "Onboarding",
      entityId: onboarding._id.toString(),
      details: `Generated onboarding documentation pack (${docsToGen.join(
        ", "
      )}) for candidate: ${candidate.name} under category: ${category}.`,
    });

    return NextResponse.json({ success: true, data: onboarding });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Simulate document signing (e-sign simulation)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { candidateId, docName } = body;

    if (!candidateId || !docName) {
      return NextResponse.json({ success: false, error: "Candidate ID and Document Name are required" }, { status: 400 });
    }

    const onboarding = await Onboarding.findOne({ candidate: candidateId });
    if (!onboarding) {
      return NextResponse.json({ success: false, error: "Onboarding record not found" }, { status: 404 });
    }

    // Check if document is already signed
    const isAlreadySigned = onboarding.signedDocs.some((d: any) => d.name === docName);
    if (!isAlreadySigned) {
      onboarding.signedDocs.push({
        name: docName,
        url: `/api/documents/signed?candidateId=${candidateId}&docName=${encodeURIComponent(docName)}`,
        signedAt: new Date(),
      });

      // Update overall status to Completed if all generated docs are signed
      const totalGen = onboarding.generatedDocs.length;
      const totalSigned = onboarding.signedDocs.length;
      if (totalGen > 0 && totalSigned >= totalGen) {
        onboarding.status = "Completed";
      }

      await onboarding.save();

      // Log in Audit Log
      await logAudit({
        userId: (session.user as any).id,
        action: "SIGN_ONBOARDING_DOCUMENT",
        entity: "Onboarding",
        entityId: onboarding._id.toString(),
        details: `Simulated signature of onboarding document '${docName}' for candidate: ${candidateId}.`,
      });
    }

    return NextResponse.json({ success: true, data: onboarding });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
