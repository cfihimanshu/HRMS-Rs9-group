import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Candidate from "@/models/sequelize/Candidate";
import { logAudit } from "@/lib/audit";

// PUT: Update Candidate Status (HR + Management override)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: HR role required" }, { status: 403 });
    }

    await sequelize.authenticate();
    const candidateId = params.id;
    const body = await req.json();
    const { status, uploads } = body;

    if (status) {
      const validStatuses = ["Pending", "Selected", "Hold", "Rejected", "High Risk"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status value" }, { status: 400 });
      }
    }

    const candidate = await Candidate.findByPk(candidateId);
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    const oldStatus = candidate.status;
    if (status) {
      candidate.status = status;
    }
    if (uploads) {
      candidate.uploads = {
        ...candidate.uploads,
        ...uploads
      };
    }
    await candidate.save();

    // Log Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "HR_CANDIDATE_STATUS_OVERRIDE",
      entity: "Candidate",
      entityId: candidateId,
      details: `HR override candidate status for ${candidate.name} from "${oldStatus}" to "${status}"`,
    });

    return NextResponse.json({
      success: true,
      data: candidate,
    });
  } catch (error: any) {
    console.error("Candidate update API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update candidate status" },
      { status: 500 }
    );
  }
}
