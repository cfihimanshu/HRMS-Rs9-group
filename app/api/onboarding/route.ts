import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Onboarding from "@/models/sequelize/Onboarding";
import Candidate from "@/models/sequelize/Candidate";
import Job from "@/models/sequelize/Job";
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

    await sequelize.authenticate();
    const onboardingInstance = await Onboarding.findOne({ where: { candidate: candidateId } });

    if (!onboardingInstance) {
      return NextResponse.json({ success: true, data: null });
    }

    const onboarding = onboardingInstance.toJSON() as any;
    const candidate = await Candidate.findByPk(onboarding.candidate);
    if (candidate) {
      onboarding.candidate = {
        mongo_id: (candidate as any).mongo_id,
        name: (candidate as any).name,
        email: (candidate as any).email,
        mobile: (candidate as any).mobile,
        status: (candidate as any).status
      };
    }

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

    await sequelize.authenticate();
    const body = await req.json();
    const { candidateId, category } = body; // category: Staff | Associate | Vendor | Franchise

    if (!candidateId || !category) {
      return NextResponse.json({ success: false, error: "Candidate ID and Category are required" }, { status: 400 });
    }

    const candidateInstance = await Candidate.findByPk(candidateId);
    if (!candidateInstance) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }
    const candidate = candidateInstance.toJSON() as any;
    if (candidate.job) {
      candidate.job = await Job.findByPk(candidate.job);
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
    let onboarding = await Onboarding.findOne({ where: { candidate: candidateId } });
    if (!onboarding) {
      onboarding = await Onboarding.create({
        mongo_id: Date.now().toString(),
        candidate: candidateId,
        category,
        generatedDocs: [],
        signedDocs: [],
        status: "Pending",
      });
    }

    // Add generated docs
    (onboarding as any).generatedDocs = docsToGen.map((docName) => ({
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
      entityId: (onboarding as any).mongo_id,
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

    await sequelize.authenticate();
    const body = await req.json();
    const { candidateId, docName } = body;

    if (!candidateId || !docName) {
      return NextResponse.json({ success: false, error: "Candidate ID and Document Name are required" }, { status: 400 });
    }

    const onboarding = await Onboarding.findOne({ where: { candidate: candidateId } });
    if (!onboarding) {
      return NextResponse.json({ success: false, error: "Onboarding record not found" }, { status: 404 });
    }

    // Check if document is already signed
    const signedDocs = (onboarding as any).signedDocs || [];
    const generatedDocs = (onboarding as any).generatedDocs || [];

    const isAlreadySigned = signedDocs.some((d: any) => d.name === docName);
    if (!isAlreadySigned) {
      const updatedSignedDocs = [
        ...signedDocs,
        {
          name: docName,
          url: `/api/documents/signed?candidateId=${candidateId}&docName=${encodeURIComponent(docName)}`,
          signedAt: new Date(),
        }
      ];
      (onboarding as any).signedDocs = updatedSignedDocs;

      // Update overall status to Completed if all generated docs are signed
      const totalGen = generatedDocs.length;
      const totalSigned = updatedSignedDocs.length;
      if (totalGen > 0 && totalSigned >= totalGen) {
        (onboarding as any).status = "Completed";
      }

      await onboarding.save();

      // Log in Audit Log
      await logAudit({
        userId: (session.user as any).id,
        action: "SIGN_ONBOARDING_DOCUMENT",
        entity: "Onboarding",
        entityId: (onboarding as any).mongo_id,
        details: `Simulated signature of onboarding document '${docName}' for candidate: ${candidateId}.`,
      });
    }

    return NextResponse.json({ success: true, data: onboarding });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
