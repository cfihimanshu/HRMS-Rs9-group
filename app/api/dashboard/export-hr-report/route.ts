import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Candidate from "@/models/sequelize/Candidate";
import Interview from "@/models/sequelize/Interview";
import Verification from "@/models/sequelize/Verification";
import LeadPlatform from "@/models/sequelize/LeadPlatform";
import HRRecentActivity from "@/models/sequelize/HRRecentActivity";
import { Op } from "sequelize";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"];
    if (!permitted.includes(role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await sequelize.authenticate();

    // 1. Fetch Candidates List
    const candidates = await Candidate.findAll({
      where: { status: { [Op.ne]: "inactive" } },
      order: [['createdAt', 'DESC']]
    });

    // 2. Fetch Interviews List
    const interviews = await Interview.findAll({
      order: [['scheduleTime', 'DESC']]
    });

    // 3. Fetch Verifications List
    const verifications = await Verification.findAll();

    // 4. Fetch Business Leads from platforms
    const platforms = await LeadPlatform.findAll({ raw: true });
    let businessLeads: any[] = [];
    for (const plat of platforms) {
      try {
        const tableName = plat.tableName;
        const [leads]: any[] = await sequelize.query(`SELECT * FROM ${tableName}`);
        leads.forEach((l: any) => {
          l.platform_id = plat.id;
          l.source_type = plat.name;
        });
        businessLeads = businessLeads.concat(leads);
      } catch (e) {
        console.warn(`Failed to fetch leads for platform ${plat.id}:`, e);
      }
    }

    // 5. Fetch Activity Logs
    const activities = await HRRecentActivity.findAll({
      order: [['timestamp', 'DESC']],
      limit: 100
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Fetch columns for each platform dynamically to export full lead details
    const columnsSet = new Set<string>(["id", "status", "createdAt", "updatedAt"]);
    for (const plat of platforms) {
      try {
        const [columnsResult]: any[] = await sequelize.query(`SHOW COLUMNS FROM ${plat.tableName}`);
        columnsResult.forEach((c: any) => columnsSet.add(c.Field));
      } catch (e) {}
    }
    columnsSet.delete("platform_id");
    columnsSet.delete("source_type");
    
    const leadColumns = Array.from(columnsSet);
    const leadHeaders = [leadColumns.map(col => col.charAt(0).toUpperCase() + col.slice(1))];
    leadHeaders[0].push("Platform Source");

    const mapLeadsToRows = (leads: any[]) => {
      return leads.map((l: any) => {
        const rowData = leadColumns.map(col => {
          const val = l[col];
          if (val === null || val === undefined) return "";
          if (col === "createdAt" || col === "updatedAt") {
            return new Date(val).toLocaleString();
          }
          return val;
        });
        rowData.push(l.source_type || "N/A");
        return rowData;
      });
    };

    // A. HR Summary Sheet
    let selectedLeadsCount = 0;
    let pendingLeadsCount = 0;
    let rejectedLeadsCount = 0;
    businessLeads.forEach((row: any) => {
      const status = (row.status || "").toLowerCase();
      if (status === "pending" || status === "new" || status === "") {
        pendingLeadsCount++;
      } else if (status.includes("select")) {
        selectedLeadsCount++;
      } else if (status.includes("reject")) {
        rejectedLeadsCount++;
      }
    });

    // E. Calculate Verification Pending Candidates (Recruitment Candidate Vetting matching dashboard count)
    const candidateInterviewsMap: Record<string, Set<number>> = {};
    interviews.forEach((iv: any) => {
      if (iv.candidate && iv.status === "Selected") {
        const cid = iv.candidate.toString();
        if (!candidateInterviewsMap[cid]) {
          candidateInterviewsMap[cid] = new Set();
        }
        candidateInterviewsMap[cid].add(iv.round);
      }
    });

    const eligibleCandIds = candidates.filter((cand: any) => {
      const cid = cand.id.toString();
      const rounds = candidateInterviewsMap[cid] || new Set();
      const hasAllThree = rounds.has(1) && rounds.has(2) && rounds.has(3);
      const isDirectlyHired = cand.status === "Selected" && cand.currentRound === 3;
      return hasAllThree || isDirectlyHired;
    }).map((c: any) => c.id.toString());

    const verifiedDocs = verifications.filter((v: any) => v.status === "Verified");
    const verifiedIds = new Set(verifiedDocs.map((v: any) => v.candidate.toString()));

    const verificationPendingLeads = candidates.filter((c: any) => {
      const cid = c.id.toString();
      return eligibleCandIds.includes(cid) && !verifiedIds.has(cid);
    });

    const todayInterviewsCount = interviews.filter((iv: any) => {
      if (!iv.scheduleTime) return false;
      const d1 = new Date(iv.scheduleTime).toDateString();
      const d2 = new Date().toDateString();
      return d1 === d2;
    }).length;

    const summaryData = [
      ["HR Operations Report", ""],
      ["Generated At", new Date().toLocaleString()],
      ["", ""],
      ["Metric", "Value"],
      ["Total HR Leads", businessLeads.length],
      ["Selected Leads", selectedLeadsCount],
      ["Pending Leads", pendingLeadsCount],
      ["Rejected Leads", rejectedLeadsCount],
      ["Interviews Today", todayInterviewsCount],
      ["Verification Pending", verificationPendingLeads.length],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "HR Summary");

    // B. Selected Business Leads Sheet
    const selectedLeads = businessLeads.filter((l: any) => {
      const status = (l.status || "").toLowerCase();
      return status.includes("select");
    });
    const selectedRows = mapLeadsToRows(selectedLeads);
    const wsSelected = XLSX.utils.aoa_to_sheet([...leadHeaders, ...selectedRows]);
    wsSelected["!cols"] = leadHeaders[0].map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, wsSelected, "Selected Leads");

    // C. Pending Business Leads Sheet
    const pendingLeads = businessLeads.filter((l: any) => {
      const status = (l.status || "").toLowerCase();
      return status === "pending" || status === "new" || status === "";
    });
    const pendingRows = mapLeadsToRows(pendingLeads);
    const wsPending = XLSX.utils.aoa_to_sheet([...leadHeaders, ...pendingRows]);
    wsPending["!cols"] = leadHeaders[0].map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, wsPending, "Pending Leads");

    // D. Rejected Business Leads Sheet
    const rejectedLeads = businessLeads.filter((l: any) => {
      const status = (l.status || "").toLowerCase();
      return status.includes("reject");
    });
    const rejectedRows = mapLeadsToRows(rejectedLeads);
    const wsRejected = XLSX.utils.aoa_to_sheet([...leadHeaders, ...rejectedRows]);
    wsRejected["!cols"] = leadHeaders[0].map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, wsRejected, "Rejected Leads");

    // E. Verification Pending Candidates Sheet (Recruitment Candidate Vetting matching dashboard count)

    const verHeaders = [[
      "Candidate Name", "Email", "Phone", "Position",
      "Aadhaar Check", "PAN Check", "Address Check", "Employer Check",
      "CIBIL Check", "Police Clearance", "Overall Vetting Status", "Vetting Remarks"
    ]];
    const verRows = verificationPendingLeads.map((c: any) => {
      const matchVer = verifications.find((v: any) => v.candidate?.id === c.id || v.candidate === c.id || (v.candidate && v.candidate.toString() === c.id.toString()));
      return [
        c.name || "N/A",
        c.email || "N/A",
        c.mobile || "N/A",
        c.jobTitle || "General Application",
        matchVer?.aadhaarStatus || "Pending",
        matchVer?.panStatus || "Pending",
        matchVer?.addressStatus || "Pending",
        matchVer?.employerStatus || "Pending",
        matchVer?.cibilStatus || "Pending",
        matchVer?.policeStatus || "Pending",
        matchVer?.status || "Pending",
        matchVer?.remarks || "No remarks entered"
      ];
    });
    const wsVer = XLSX.utils.aoa_to_sheet([...verHeaders, ...verRows]);
    wsVer["!cols"] = [
      { wch: 22 }, { wch: 26 }, { wch: 15 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsVer, "Verification Pending");

    // F. Interviews Today Sheet
    const interviewsToday = interviews.filter((iv: any) => {
      if (!iv.scheduleTime) return false;
      const d1 = new Date(iv.scheduleTime).toDateString();
      const d2 = new Date().toDateString();
      return d1 === d2;
    });
    const interviewTodayHeaders = [[
      "Candidate Name", "Position", "Round", "Schedule Time", "Mode",
      "Interviewer", "Status", "Remarks/Feedback"
    ]];
    const interviewTodayRows = interviewsToday.map((iv: any) => {
      const timeFormatted = iv.scheduleTime 
        ? new Date(iv.scheduleTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) 
        : "N/A";
      
      return [
        iv.candidateName || iv.candidate || "N/A",
        iv.vacancyName || "General Application",
        iv.round || 1,
        timeFormatted,
        iv.mode || "offline",
        iv.interviewer || "TBD",
        iv.status || "Pending",
        iv.remarks || "-"
      ];
    });
    const wsInterviewsToday = XLSX.utils.aoa_to_sheet([...interviewTodayHeaders, ...interviewTodayRows]);
    wsInterviewsToday["!cols"] = [
      { wch: 22 }, { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInterviewsToday, "Interviews Today");

    // G. Detailed Interviews Sheet
    const interviewHeaders = [[
      "Candidate Name", "Position", "Round", "Schedule Time", "Mode",
      "Interviewer", "Status", "Remarks/Feedback"
    ]];
    const interviewRows = interviews.map((iv: any) => {
      const timeFormatted = iv.scheduleTime 
        ? new Date(iv.scheduleTime).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
        : "N/A";
      
      return [
        iv.candidateName || iv.candidate || "N/A",
        iv.vacancyName || "General Application",
        iv.round || 1,
        timeFormatted,
        iv.mode || "offline",
        iv.interviewer || "TBD",
        iv.status || "Pending",
        iv.remarks || "-"
      ];
    });
    const wsInterviews = XLSX.utils.aoa_to_sheet([...interviewHeaders, ...interviewRows]);
    wsInterviews["!cols"] = [
      { wch: 22 }, { wch: 25 }, { wch: 8 }, { wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInterviews, "Detailed Interviews");

    // H. Activity Logs Sheet
    const activityHeaders = [["Timestamp", "User ID", "Activity Details"]];
    const activityRows = activities.map((log: any) => [
      log.createdAt ? new Date(log.createdAt).toLocaleString() : (log.timestamp ? new Date(log.timestamp).toLocaleString() : new Date().toLocaleString()),
      log.userId || log.user || "System",
      log.details || log.description || "N/A"
    ]);
    const wsActivities = XLSX.utils.aoa_to_sheet([...activityHeaders, ...activityRows]);
    wsActivities["!cols"] = [
      { wch: 22 }, { wch: 15 }, { wch: 60 }
    ];
    XLSX.utils.book_append_sheet(wb, wsActivities, "Activity Logs");

    // Write to buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=HR_Operations_Report_${new Date().toISOString().split("T")[0]}.xlsx`
      }
    });

  } catch (error: any) {
    console.error("Export report API error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
