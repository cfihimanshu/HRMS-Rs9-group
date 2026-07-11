// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Interview from "@/models/sequelize/Interview";
import Candidate from "@/models/sequelize/Candidate";
import LeadPlatform from "@/models/sequelize/LeadPlatform";
import { Op } from "sequelize";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

// GET: Fetch interviews (restricted to HR, Managers, Owners)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    await sequelize.authenticate();
    const query: any = { status: { [Op.ne]: "inactive" } };
    if (candidateId) {
      query.candidate = candidateId;
    }

    const interviews = await Interview.findAll({ 
      where: query,
      order: [['scheduleTime', 'ASC']],
      raw: true
    });

    const candIds = [...new Set(interviews.map((i: any) => i.candidate).filter(Boolean))];
    let candsMap: any = {};
    if (candIds.length > 0) {
      const cands = await Candidate.findAll({ where: { id: { [Op.in]: candIds } }, raw: true });
      cands.forEach((c: any) => { candsMap[c.id] = { id: c.id, name: c.name, email: c.email, mobile: c.mobile }; });
    }

    const data = interviews.map((i: any) => ({
      ...i,
      candidate: candsMap[i.candidate] || { id: i.candidate, name: 'Unknown' }
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Schedule an Interview (HR & Management only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: HR role required" }, { status: 403 });
    }

    await sequelize.authenticate();
    const body = await req.json();
    const { candidateId, round, scheduleTime, videoLink, interviewerId, mode } = body;

    if (!candidateId || !round || !scheduleTime) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const candidate = await Candidate.findByPk(candidateId);
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    let vacancyTitle = "General Application";
    if (candidate.job) {
      const jobObj = candidate.job as any;
      const deptName = jobObj.department ? jobObj.department.name : "";
      vacancyTitle = deptName ? `${deptName} - ${jobObj.title}` : jobObj.title;
    }

    // Validate progression of rounds
    const targetRound = parseInt(round);
    if (targetRound > 1) {
      const prevRound = targetRound - 1;
      const prevSelectedInterview = await Interview.findOne({
        where: {
          candidate: candidateId,
          round: prevRound,
          status: "Selected",
        }
      });

      if (!prevSelectedInterview) {
        return NextResponse.json({
          success: false,
          error: `Cannot schedule Round-${targetRound} interview. Candidate must be marked as 'Selected' in Round-${prevRound} first.`
        }, { status: 400 });
      }
    }

    const suggested = candidate.screeningResult?.suggestedQuestions || [];
    const customQuestions = suggested.map((q: string) => ({
      question: q,
      isCorrect: null,
      rating: "",
      score: 0
    }));

    const interview = await Interview.create({
      id: Date.now().toString(),
      candidate: candidateId,
      candidateName: candidate.name,
      round,
      scheduleTime: new Date(scheduleTime),
      videoLink: mode === "offline" ? "" : videoLink,
      mode: mode || "online",
      vacancyName: vacancyTitle,
      interviewer: interviewerId || (session.user as any).id,
      status: "Pending",
      customQuestions,
    });

    // Sync scheduled interview back to the Business Lead's call history
    if (scheduleTime && candidate) {
      try {
        const platforms = await LeadPlatform.findAll();
        
        for (const platform of platforms) {
          const tableName = platform.tableName;
          
          // Check if this candidate ID exists in this platform's table
          const [existingLeads]: any[] = await sequelize.query(
            `SELECT * FROM ${tableName} WHERE id = ?`,
            { replacements: [candidate.id] }
          );
          
          if (existingLeads && existingLeads.length > 0) {
            const lead = existingLeads[0];
            let historyList: any[] = [];
            
            if (lead.call_history) {
              try {
                const parsed = JSON.parse(lead.call_history);
                if (Array.isArray(parsed)) {
                  historyList = parsed;
                }
              } catch (e) {
                console.error("[SYNC INTERVIEW HISTORY] Failed to parse call_history:", e);
              }
            }
            
            const datePart = scheduleTime.includes("T") ? scheduleTime.split("T")[0] : scheduleTime;
            const timePart = scheduleTime.includes("T") ? scheduleTime.split("T")[1] : null;
            
            // Build the history entry
            const followUpHistoryEntry = {
              id: "followup_" + Date.now().toString(),
              status: "Interview Scheduled",
              call_remarks: `Interview Scheduled (Round ${round || 1}). Mode: ${mode || "online"}.${videoLink ? ` Meeting Link: ${videoLink}` : ""}`,
              interview_round: String(round || 1),
              interview_date: datePart,
              interview_time: timePart,
              interview_mode: mode || "online",
              interview_video_link: videoLink || null,
              updatedAt: new Date().toISOString(),
              updatedBy: session.user.name || "System"
            };
            
            historyList.push(followUpHistoryEntry);
            
            // Update call_history JSON and other fields on the lead record
            await sequelize.query(
              `UPDATE ${tableName} 
               SET call_history = ?, 
                   status = ?,
                   interview_round = ?,
                   interview_date = ?,
                   interview_time = ?,
                   interview_mode = ?,
                   interview_video_link = ?
               WHERE id = ?`,
              {
                replacements: [
                  JSON.stringify(historyList),
                  "Interview Scheduled",
                  String(round || 1),
                  datePart,
                  timePart,
                  mode || "online",
                  videoLink || null,
                  candidate.id
                ]
              }
            );
            
            console.log(`[SYNC INTERVIEW SUCCESS] Appended interview log to lead ${candidate.id} in ${tableName}`);
            break; // Matched and updated, break the loop
          }
        }
      } catch (syncErr) {
        console.error("[SYNC INTERVIEW ERROR] Failed to sync schedule to lead:", syncErr);
      }
    }

    // Track Audit Log
    await logAudit({
      userId: (session.user as any).id,
      action: "SCHEDULE_INTERVIEW",
      entity: "Interview",
      entityId: interview.id.toString(),
      details: `Scheduled Round ${round} Interview for candidate: ${candidate.name}. Time: ${scheduleTime}.`,
    });

    await logHRActivity({
      userId: (session.user as any).id,
      userRole: (session.user as any).role,
      action: "SCHEDULE_INTERVIEW",
      details: `Scheduled Round ${round} Interview for candidate: ${candidate.name}.`
    });

    return NextResponse.json({ success: true, data: interview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update Score / Remarks / Select or Reject Candidate (Interviewer, HR & Management)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const body = await req.json();
    const { 
      interviewId, 
      communicationScore, 
      skillScore, 
      behaviourScore, 
      stabilityScore, 
      riskScore, 
      remarks, 
      status,
      scheduleTime,
      videoLink,
      mode,
      round,
      customQuestions
    } = body;

    if (!interviewId) {
      return NextResponse.json({ success: false, error: "Missing interview ID" }, { status: 400 });
    }

    const role = (session.user as any).role;
    const isUpdatingSchedule = scheduleTime !== undefined || mode !== undefined || videoLink !== undefined || round !== undefined;
    if (isUpdatingSchedule && role !== "HR Head" && role !== "Owner") {
      return NextResponse.json({ success: false, error: "Forbidden: HR Head or Owner role required to edit schedule" }, { status: 403 });
    }

    const interview = await Interview.findByPk(interviewId);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    // Validate progression of rounds if round is being updated
    if (round !== undefined) {
      const targetRound = parseInt(round);
      if (targetRound > 1) {
        const prevRound = targetRound - 1;
        const prevSelectedInterview = await Interview.findOne({
          where: {
            candidate: interview.candidate,
            round: prevRound,
            status: "Selected",
          }
        });

        if (!prevSelectedInterview) {
          return NextResponse.json({
            success: false,
            error: `Cannot schedule Round-${targetRound} interview. Candidate must be marked as 'Selected' in Round-${prevRound} first.`
          }, { status: 400 });
        }
      }
    }

    if (communicationScore !== undefined) interview.communicationScore = communicationScore;
    if (skillScore !== undefined) interview.skillScore = skillScore;
    if (behaviourScore !== undefined) interview.behaviourScore = behaviourScore;
    if (stabilityScore !== undefined) interview.stabilityScore = stabilityScore;
    if (riskScore !== undefined) interview.riskScore = riskScore;
    if (scheduleTime !== undefined) interview.scheduleTime = new Date(scheduleTime);
    if (videoLink !== undefined) interview.videoLink = videoLink;
    if (mode !== undefined) interview.mode = mode;
    if (round !== undefined) interview.round = round;
    if (customQuestions !== undefined) interview.customQuestions = customQuestions;
    
    interview.remarks = remarks !== undefined ? remarks : interview.remarks;
    if (status !== undefined) interview.status = status;
    await interview.save();

    // Update candidate profile state based on interview output
    const candidate = await Candidate.findByPk(interview.candidate);
    if (status !== undefined && candidate) {
      candidate.status = status;
      if (status === "Selected") {
        if (candidate.currentRound < 3) {
          // Advance to next round
          candidate.currentRound += 1;
        }
      }
      await candidate.save();
    }

    // Sync scheduled follow-up interview back to the Business Lead's call history
    if (scheduleTime && candidate) {
      try {
        const platforms = await LeadPlatform.findAll();
        
        for (const platform of platforms) {
          const tableName = platform.tableName;
          
          // Check if this candidate ID exists in this platform's table
          const [existingLeads]: any[] = await sequelize.query(
            `SELECT * FROM ${tableName} WHERE id = ?`,
            { replacements: [candidate.id] }
          );
          
          if (existingLeads && existingLeads.length > 0) {
            const lead = existingLeads[0];
            let historyList: any[] = [];
            
            if (lead.call_history) {
              try {
                const parsed = JSON.parse(lead.call_history);
                if (Array.isArray(parsed)) {
                  historyList = parsed;
                }
              } catch (e) {
                console.error("[SYNC INTERVIEW HISTORY] Failed to parse call_history:", e);
              }
            }
            
            const datePart = scheduleTime.includes("T") ? scheduleTime.split("T")[0] : scheduleTime;
            const timePart = scheduleTime.includes("T") ? scheduleTime.split("T")[1] : null;
            
            // Build the follow-up history entry
            const followUpHistoryEntry = {
              id: "followup_" + Date.now().toString(),
              status: "Interview Scheduled",
              call_remarks: `Follow-up Interview Scheduled (Round ${interview.round || 1}). Mode: ${mode || "online"}.${videoLink ? ` Meeting Link: ${videoLink}` : ""}`,
              interview_round: String(interview.round || 1),
              interview_date: datePart,
              interview_time: timePart,
              interview_mode: mode || "online",
              interview_video_link: videoLink || null,
              updatedAt: new Date().toISOString(),
              updatedBy: session.user.name || "System"
            };
            
            historyList.push(followUpHistoryEntry);
            
            // Update call_history JSON and other fields on the lead record
            await sequelize.query(
              `UPDATE ${tableName} 
               SET call_history = ?, 
                   status = ?,
                   interview_round = ?,
                   interview_date = ?,
                   interview_time = ?,
                   interview_mode = ?,
                   interview_video_link = ?
               WHERE id = ?`,
              {
                replacements: [
                  JSON.stringify(historyList),
                  "Interview Scheduled",
                  String(interview.round || 1),
                  datePart,
                  timePart,
                  mode || "online",
                  videoLink || null,
                  candidate.id
                ]
              }
            );
            
            console.log(`[SYNC INTERVIEW SUCCESS] Appended follow-up interview log to lead ${candidate.id} in ${tableName}`);
            break; // Matched and updated, break the loop
          }
        }
      } catch (syncErr) {
        console.error("[SYNC INTERVIEW ERROR] Failed to sync follow-up schedule to lead:", syncErr);
      }
    }

    // Write Audit Entry
    await logAudit({
      userId: (session.user as any).id,
      action: "UPDATE_INTERVIEW_ROUND",
      entity: "Interview",
      entityId: interviewId,
      details: `Round ${interview.round} outcome updated for candidate: ${candidate?.name || "Unknown"}. Outcome: ${status}. Remarks: ${remarks || "None"}`,
    });

    await logHRActivity({
      userId: (session.user as any).id,
      userRole: (session.user as any).role,
      action: "SUBMIT_INTERVIEW_EVALUATION",
      details: `Round ${interview.round} outcome updated for candidate: ${candidate?.name || "Unknown"}. Outcome: ${status}.`
    });

    return NextResponse.json({ success: true, data: interview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a scheduled interview (HR Head & Owner only)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "HR Head" && role !== "Owner") {
      return NextResponse.json({ success: false, error: "Forbidden: HR Head or Owner role required" }, { status: 403 });
    }

    await sequelize.authenticate();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing interview ID" }, { status: 400 });
    }

    const interview = await Interview.findByPk(id);
    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    await Interview.destroy({ where: { id: id } });

    // Track Audit Log
    await logAudit({
      userId: (session.user as any).id,
      action: "DELETE_INTERVIEW",
      entity: "Interview",
      entityId: id,
      details: `Deleted scheduled interview for candidate: ${(interview.candidate as any)?.name || "Unknown"}.`,
    });

    return NextResponse.json({ success: true, message: "Interview deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
