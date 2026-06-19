import { NextResponse } from "next/server";
import sequelize from "@/lib/sequelize";
import Candidate from "@/models/sequelize/Candidate";
import Job from "@/models/sequelize/Job";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");
    const docName = searchParams.get("docName");
    const category = searchParams.get("category");

    if (!candidateId || !docName || !category) {
      return new Response("Missing parameters", { status: 400 });
    }

    await sequelize.authenticate();
    const candidateInstance = await Candidate.findByPk(candidateId);

    if (!candidateInstance) {
      return new Response("Candidate not found", { status: 404 });
    }

    const candidate = candidateInstance.toJSON() as any;
    if (candidate.job) {
      candidate.job = await Job.findByPk(candidate.job);
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const jobTitle = candidate.job ? (candidate.job as any).title : "Executive Consultant";

    // Draft beautiful legal document filled with real candidate parameters
    const documentBody = `
========================================================================
                      ACOLYTE GROUP OF COMPANIES
      Corporate Offices: 45, Connaught Place, New Delhi - 110001
========================================================================

DOCUMENT TYPE : ${docName.toUpperCase()}
CATEGORY      : ${category.toUpperCase()}
DATE OF ISSUE : ${todayStr}

------------------------------------------------------------------------
CONTRACTING PARTY DETAILS:
------------------------------------------------------------------------
Name           : ${candidate.name}
Email Address  : ${candidate.email}
Mobile Contact : +91 ${candidate.mobile}
Address        : ${candidate.address}
Designated Role: ${jobTitle}

------------------------------------------------------------------------
TERMS & CONDITIONS:
------------------------------------------------------------------------
1. SCOPE OF ENGAGEMENT:
The contracting party agrees to devote their professional expertise, time,
and skills to execute the duties designated under Acolyte Group specifications.

2. COMPLIANCE & PROTOCOLS:
The party agrees to strictly abide by Acolyte Standard Operating Procedures (SOPs),
Confidentiality frameworks, and Data Protection codes.

3. NON-DISCLOSURE & NDA COVENANTS:
The party shall not, during or after this engagement, disclose any proprietary,
client, or operational data of Acolyte Group to third parties.

4. NON-COMPETE & NON-DIVERT:
The party commits to a non-diversion period of 24 months, promising not to diversion
clients, capture territories, or establish rival commercial links.

------------------------------------------------------------------------
IN WITNESS WHEREOF, the parties hereto have set their hands on this document.
------------------------------------------------------------------------

For: Acolyte Group of Companies                 Acknowledged By:



______________________________                  ______________________________
Authorised Signatory, HR Head                   Candidate Signature
`;

    return new Response(documentBody.trim(), {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${docName.replace(/\s+/g, "_")}_${candidate.name.replace(/\s+/g, "_")}.txt"`,
      },
    });
  } catch (error: any) {
    return new Response("Failed to generate document: " + error.message, { status: 500 });
  }
}
