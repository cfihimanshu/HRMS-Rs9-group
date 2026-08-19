export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import BdaLead from "@/models/sequelize/BdaLead";
import TaskLog from "@/models/sequelize/TaskLog";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";

import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import { logAudit } from "@/lib/audit";
import { logHRActivity } from "@/lib/hrAudit";

// GET: Fetch BDA leads with optional filtering
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "Employee";
    const roleLower = userRole.toLowerCase();

    await sequelize.authenticate();
    await BdaLead.sync({ alter: true }).catch(() => {});
    await EmployeeProfile.sync({ alter: true }).catch(() => {});

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const assignedTo = searchParams.get("assignedTo") || "";

    // Role-based & Reporting Manager visibility
    let isManagerial = ["owner", "director", "hr head", "hr executive", "department manager", "operation manager", "manager", "dsm", "head"].some(
      r => roleLower.includes(r)
    ) || roleLower.includes("manager");

    if (!isManagerial) {
      // Check if current user is assigned as reportingManager to ANY employee in EmployeeProfile
      const userName = (session.user as any).name;
      if (userName) {
        try {
          const isRepMgr = await EmployeeProfile.findOne({
            where: {
              [Op.or]: [
                { reportingManager: userName },
                { reportingManager: { [Op.like]: `%${userName.trim()}%` } }
              ]
            },
            raw: true
          });
          if (isRepMgr) {
            isManagerial = true;
          }
        } catch (_) {}
      }
    }

    const whereConditions: any[] = [];

    if (!isManagerial) {
      // BDAs / Regular staff see leads assigned to them OR created by them
      whereConditions.push({
        [Op.or]: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      });
    } else if (assignedTo) {
      if (assignedTo === "unassigned") {
        whereConditions.push({ assignedTo: { [Op.or]: [null, ""] } });
      } else {
        whereConditions.push({ assignedTo });
      }
    }

    if (status && status !== "All") {
      whereConditions.push({ status });
    }

    if (search) {
      whereConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { companyName: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } },
          { leadId: { [Op.like]: `%${search}%` } },
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const leads = await BdaLead.findAll({
      where,
      order: [["id", "DESC"]],
    });

    // Auto-reformat IDs and recover converted services from TaskLogs history if lost
    for (const lead of leads) {
      const cleanId = `BDALEAD-${String(lead.id).padStart(3, "0")}`;
      if (lead.leadId !== cleanId) {
        lead.leadId = cleanId;
        await lead.save().catch(() => {});
      }

      // Auto-recover converted services if missing but recorded in task progress notes
      if (!lead.convertedServicesJson || lead.convertedServicesJson === "[]") {
        try {
          const searchConditions: any[] = [];
          if (lead.leadId) searchConditions.push({ description: { [Op.like]: `%${lead.leadId}%` } });
          if (lead.name) searchConditions.push({ personName: lead.name });
          if (lead.phone) searchConditions.push({ contactNo: lead.phone });

          if (searchConditions.length > 0) {
            const tasks = await TaskLog.findAll({ where: { [Op.or]: searchConditions } });
            for (const t of tasks) {
              if (t.progressNotes && t.progressNotes.includes("Lead Converted! Services:")) {
                const match = t.progressNotes.match(/Services:\s*([^|]+)\|\s*Total Amount:\s*₹?\s*(\d+(?:\.\d+)?)/i);
                if (match) {
                  const servicesStr = match[1].trim();
                  const totalAmt = parseFloat(match[2]) || 0;
                  const serviceItems = servicesStr.split(",").map((item: string) => {
                    const itemMatch = item.match(/^(.*?)(?:\(₹?(\d+(?:\.\d+)?)\))?$/);
                    if (itemMatch) {
                      return {
                        serviceName: itemMatch[1].trim(),
                        amount: itemMatch[2] ? parseFloat(itemMatch[2]) : 0
                      };
                    }
                    return { serviceName: item.trim(), amount: 0 };
                  }).filter((s: any) => s.serviceName);

                  if (serviceItems.length > 0) {
                    lead.convertedServicesJson = JSON.stringify(serviceItems);
                    lead.convertedAmount = totalAmt;
                    await lead.save().catch(() => {});
                    break;
                  }
                }
              }
            }
          }
        } catch (recoverErr) {
          console.error("Auto recovery error for lead:", lead.leadId, recoverErr);
        }
      }

      // Auto-recover Converted / Lost status if lead was previously converted or lost but status got overwritten to Assigned/New
      if (lead.status === "Assigned" || lead.status === "New") {
        if (lead.convertedServicesJson && lead.convertedServicesJson !== "[]") {
          lead.status = "Converted";
          await lead.save().catch(() => {});
        } else if (lead.lostReason && lead.lostReason.trim()) {
          lead.status = "Lost";
          await lead.save().catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    console.error("GET /api/bda-leads Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add single or bulk import BDA leads
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await BdaLead.sync({ alter: true }).catch(() => {});

    const body = await req.json();
    const leadsInput = Array.isArray(body.leads) ? body.leads : [body];

    if (leadsInput.length === 0) {
      return NextResponse.json({ success: false, error: "No lead data provided" }, { status: 400 });
    }

    const createdLeads: any[] = [];
    let skippedDuplicatesCount = 0;

    // Load existing company names, phones, and emails to prevent duplicates
    const existingLeads = await BdaLead.findAll({
      attributes: ["id", "companyName", "phone", "email", "name"],
      raw: true
    }) as any[];

    const existingCompanySet = new Set(
      existingLeads
        .map(l => (l.companyName || "").trim().toLowerCase())
        .filter(c => c.length > 0)
    );
    const existingPhoneSet = new Set(
      existingLeads
        .map(l => (l.phone || "").trim())
        .filter(p => p.length > 5)
    );
    const existingEmailSet = new Set(
      existingLeads
        .map(l => (l.email || "").trim().toLowerCase())
        .filter(e => e.length > 3)
    );

    // Intra-file batch tracking sets
    const batchCompanySet = new Set<string>();
    const batchPhoneSet = new Set<string>();
    const batchEmailSet = new Set<string>();

    // Find current max lead DB ID or count to generate clean sequential BDALEAD-001, BDALEAD-002 IDs
    const lastLead = await BdaLead.findOne({
      order: [["id", "DESC"]],
      raw: true,
    }) as any;
    const baseNum = lastLead && lastLead.id ? lastLead.id : 0;

    for (let i = 0; i < leadsInput.length; i++) {
      const item = leadsInput[i];
      const compName = (item.companyName || item.company || "").trim();
      const ph = (item.phone || item.contactNo || item.mobile || "").trim();
      const em = (item.email || item.emailAddress || "").trim();
      const nm = (item.name || item.contactPerson || "").trim();

      if (!nm && !compName && !ph) continue;

      const compLower = compName.toLowerCase();
      const emLower = em.toLowerCase();

      // Check duplicate condition: companyName match OR phone match OR email match
      const isDuplicateCompany = compLower.length > 0 && (existingCompanySet.has(compLower) || batchCompanySet.has(compLower));
      const isDuplicatePhone = ph.length > 5 && (existingPhoneSet.has(ph) || batchPhoneSet.has(ph));
      const isDuplicateEmail = emLower.length > 3 && (existingEmailSet.has(emLower) || batchEmailSet.has(emLower));

      if (isDuplicateCompany || (isDuplicatePhone && !compName) || (isDuplicateEmail && !compName)) {
        skippedDuplicatesCount++;
        continue;
      }

      // Track in batch sets
      if (compLower) batchCompanySet.add(compLower);
      if (ph) batchPhoneSet.add(ph);
      if (emLower) batchEmailSet.add(emLower);

      const creatorUserId = (session.user as any).id;
      const creatorUserName = (session.user as any).name || "BDA User";
      const creatorRole = (session.user as any).role || "Employee";
      const isCreatorManagerial = ["owner", "director", "hr head", "hr executive", "department manager", "operation manager"].some(
        r => (creatorRole || "").toLowerCase().includes(r)
      );

      let targetAssignedTo = item.assignedTo || null;
      let targetAssignedToName = item.assignedToName || null;

      // If no target specified and creator is BDA / non-managerial (or autoAssign requested), auto-assign to creator
      if (!targetAssignedTo && (!isCreatorManagerial || item.autoAssignToCreator)) {
        targetAssignedTo = creatorUserId;
        targetAssignedToName = creatorUserName;
      }

      const currentNum = baseNum + createdLeads.length + 1;
      const leadId = `BDALEAD-${String(currentNum).padStart(3, "0")}`;

      const newLead = await BdaLead.create({
        leadId,
        name: nm || compName || "Prospective Client",
        phone: ph,
        email: em,
        companyName: compName,
        city: (item.city || item.location || "").trim(),
        source: item.source || "Manual Add",
        status: targetAssignedTo ? "Assigned" : (item.status || "New"),
        salesReason: (item.salesReason || item.reason || "").trim(),
        assignedTo: targetAssignedTo || null,
        assignedToName: targetAssignedToName || null,
        assignedBy: creatorUserId,
        assignedAt: targetAssignedTo ? new Date() : null,
        remarks: (item.remarks || item.notes || "").trim(),
        rawExtraJson: item.rawExtraJson ? (typeof item.rawExtraJson === "string" ? item.rawExtraJson : JSON.stringify(item.rawExtraJson)) : null,
      });

      // If lead is assigned, auto-create TaskLog entry for target BDA
      if (targetAssignedTo) {
        try {
          const taskDescription = [
            `Call Mode: Outgoing Call`,
            newLead.name ? `Person Name: ${newLead.name}` : "",
            newLead.phone ? `Contact No: ${newLead.phone}` : "",
            newLead.companyName ? `Company Name: ${newLead.companyName}` : "",
            newLead.email ? `Email: ${newLead.email}` : "",
            newLead.city ? `Location: ${newLead.city}` : "",
            newLead.salesReason ? `Reason: ${newLead.salesReason}` : `Reason: Pitching`,
            `Lead Status: ${newLead.status || "Assigned"}`,
            `Lead Reference: ${newLead.leadId}`,
            newLead.remarks ? `Remarks: ${newLead.remarks}` : ""
          ].filter(Boolean).join("\n");

          const taskId = await TaskLog.generateNextTaskId(targetAssignedTo);
          await TaskLog.create({
            id: taskId,
            employee: targetAssignedTo,
            assignedBy: creatorUserId,
            date: new Date(),
            taskTitle: "Sales",
            taskType: "Call",
            description: taskDescription,
            status: "Pending",
            scheduledAt: new Date(),
            timerState: "Stopped",
            timerStart: null,
            elapsedSeconds: 0,
            personName: newLead.name || null,
            contactNo: newLead.phone || null,
            companyName: newLead.companyName || null,
            emailAddress: newLead.email || null,
            visitLocation: newLead.city || null,
            salesReason: newLead.salesReason || "Pitching",
            callStatus: "Assigned",
            leadStatus: newLead.status || "Assigned"
          });
        } catch (tErr) {
          console.warn("Failed to auto-create TaskLog for new lead:", tErr);
        }
      }

      createdLeads.push(newLead);
    }

    const msg = skippedDuplicatesCount > 0
      ? `Imported ${createdLeads.length} new lead(s). ${skippedDuplicatesCount} duplicate lead(s) skipped.`
      : `Successfully imported ${createdLeads.length} lead(s)`;

    if (createdLeads.length > 0) {
      try {
        const creatorUserId = (session.user as any).id;
        const creatorRole = (session.user as any).role || "Employee";
        await logAudit({
          userId: creatorUserId,
          userName: session.user.name,
          userRole: creatorRole,
          action: "BDA_LEAD_CREATED",
          entity: "BdaLead",
          details: `Added ${createdLeads.length} new BDA lead(s) into sales pipeline`
        });
        await logHRActivity({
          userId: creatorUserId,
          userRole: creatorRole,
          action: "BDA_LEAD_CREATED",
          details: `Added ${createdLeads.length} new BDA lead(s) into sales pipeline`
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: msg,
      data: createdLeads,
      createdCount: createdLeads.length,
      skippedCount: skippedDuplicatesCount
    });
  } catch (error: any) {
    console.error("POST /api/bda-leads Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update lead details / status & sync to TaskLog
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await BdaLead.sync({ alter: true }).catch(() => {});

    const body = await req.json();
    const {
      id,
      status,
      remarks,
      name,
      phone,
      email,
      companyName,
      city,
      salesReason,
      convertedServicesJson,
      convertedAmount,
      lostReason,
      attachmentsJson
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Lead ID is required" }, { status: 400 });
    }

    const lead = await BdaLead.findByPk(id);
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    if (status !== undefined) {
      lead.status = status;
      if (status === "New") {
        lead.assignedTo = null;
        lead.assignedToName = null;
      }
    }
    if (remarks !== undefined) lead.remarks = remarks;
    if (name !== undefined) lead.name = name;
    if (phone !== undefined) lead.phone = phone;
    if (email !== undefined) lead.email = email;
    if (companyName !== undefined) lead.companyName = companyName;
    if (city !== undefined) lead.city = city;
    if (salesReason !== undefined) lead.salesReason = salesReason;
    if (convertedServicesJson !== undefined && convertedServicesJson !== null) lead.convertedServicesJson = typeof convertedServicesJson === "string" ? convertedServicesJson : JSON.stringify(convertedServicesJson);
    if (convertedAmount !== undefined && convertedAmount !== null) lead.convertedAmount = parseFloat(convertedAmount) || 0;
    if (lostReason !== undefined && lostReason !== null) lead.lostReason = lostReason;
    if (attachmentsJson !== undefined && attachmentsJson !== null) {
      try {
        const newAtts = typeof attachmentsJson === "string" ? JSON.parse(attachmentsJson) : attachmentsJson;
        if (Array.isArray(newAtts)) {
          // Strip transient blobUrls before saving to DB
          const sanitizedAtts = newAtts.map((a: any) => ({
            name: a.name,
            type: a.type,
            url: a.url,
            size: a.size
          }));
          lead.attachmentsJson = JSON.stringify(sanitizedAtts);
        } else {
          lead.attachmentsJson = typeof attachmentsJson === "string" ? attachmentsJson : JSON.stringify(attachmentsJson);
        }
      } catch {
        lead.attachmentsJson = typeof attachmentsJson === "string" ? attachmentsJson : JSON.stringify(attachmentsJson);
      }
    }

    await lead.save();

    try {
      const updaterUserId = (session.user as any).id;
      const updaterRole = (session.user as any).role || "Employee";
      await logAudit({
        userId: updaterUserId,
        userName: session.user.name,
        userRole: updaterRole,
        action: "BDA_LEAD_UPDATED",
        entity: "BdaLead",
        entityId: String(lead.id),
        details: `Updated BDA lead '${lead.name || lead.companyName}' status to '${lead.status}'`
      });
      await logHRActivity({
        userId: updaterUserId,
        userRole: updaterRole,
        action: "BDA_LEAD_UPDATED",
        details: `Updated BDA lead '${lead.name || lead.companyName}' status to '${lead.status}'`
      });
    } catch (_) {}

    // Sync status update, progress notes & attachments to associated TaskLog entry
    try {
      await TaskLog.sync({ alter: true }).catch(() => {});

      const searchConditions: any[] = [];
      if (lead.leadId) {
        searchConditions.push({ description: { [Op.like]: `%${lead.leadId}%` } });
      }
      if (lead.name) {
        searchConditions.push({ personName: lead.name, taskTitle: "Sales" });
      }
      if (lead.phone) {
        searchConditions.push({ contactNo: lead.phone });
      }

      if (searchConditions.length > 0) {
        const associatedTasks = await TaskLog.findAll({
          where: { [Op.or]: searchConditions }
        });

        const updaterName = (session.user as any)?.name || "BDA Team";

        // Build note text summary
        let noteText = `[Lead Status: ${lead.status}]`;
        if (lead.status === "Converted") {
          let servicesList = "";
          try {
            const parsed = lead.convertedServicesJson ? JSON.parse(lead.convertedServicesJson) : [];
            if (Array.isArray(parsed) && parsed.length > 0) {
              servicesList = parsed.map((s: any) => `${s.serviceName} (₹${s.amount})`).join(", ");
            }
          } catch {}
          noteText += ` Lead Converted! Services: ${servicesList || "N/A"} | Total Amount: ₹${lead.convertedAmount || 0}`;
        } else if (lead.status === "Lost") {
          noteText += ` Lead Lost. Reason: ${lead.lostReason || "N/A"}`;
        }
        if (remarks) {
          noteText += ` | Remarks: ${remarks}`;
        }
        for (const task of associatedTasks) {
          const prevLeadStatus = task.leadStatus || task.callStatus;
          const isStatusChanged = status !== undefined && status !== prevLeadStatus;

          // 1. Append Progress Note only if status actually changed or new remarks provided
          if (isStatusChanged || remarks) {
            let currentNotesList: any[] = [];
            if (task.progressNotes) {
              try {
                const parsed = JSON.parse(task.progressNotes);
                currentNotesList = Array.isArray(parsed) ? parsed : [{ id: 'legacy_' + Date.now(), note: task.progressNotes, createdAt: new Date().toISOString(), userName: "System" }];
              } catch {
                currentNotesList = [{ id: 'legacy_' + Date.now(), note: task.progressNotes, createdAt: new Date().toISOString(), userName: "System" }];
              }
            }

            const lastNoteObj = currentNotesList.length > 0 ? currentNotesList[currentNotesList.length - 1] : null;
            const lastNoteText = lastNoteObj ? (typeof lastNoteObj === 'string' ? lastNoteObj : lastNoteObj.note) : "";

            // Avoid pushing duplicate consecutive note text
            if (!lastNoteText || lastNoteText.trim() !== noteText.trim()) {
              const newNoteObj = {
                id: 'note_lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
                note: noteText,
                createdAt: new Date().toISOString(),
                userName: updaterName
              };
              currentNotesList.push(newNoteObj);
              task.progressNotes = JSON.stringify(currentNotesList);
            }
          }

          // 2. Attach Proof Attachments with STRICT Deduplication
          if (attachmentsJson) {
            let existingAtts: any[] = [];
            if (task.proofAttachment) {
              try {
                const parsedProof = JSON.parse(task.proofAttachment);
                existingAtts = Array.isArray(parsedProof) ? parsedProof : [{ url: task.proofAttachment, name: "Attachment" }];
              } catch {
                existingAtts = task.proofAttachment ? [{ url: task.proofAttachment, name: "Attachment" }] : [];
              }
            }

            let incomingAtts: any[] = [];
            try {
              const newAtts = typeof attachmentsJson === "string" ? JSON.parse(attachmentsJson) : attachmentsJson;
              if (Array.isArray(newAtts)) {
                incomingAtts = newAtts;
              } else if (newAtts && typeof newAtts === "object") {
                incomingAtts = [newAtts];
              }
            } catch {}

            // Deduplicate attachments by url or name
            const attMap = new Map<string, any>();
            const addAttachmentToMap = (a: any) => {
              if (!a) return;
              const url = typeof a === "string" ? a : (a.url || a.src || "");
              const name = typeof a === "string" ? "Attachment" : (a.name || "Attachment");
              const key = (url || name || JSON.stringify(a)).toString().trim();
              if (!key) return;

              const itemObj = typeof a === "string" ? { name: "Attachment", url: a } : a;

              if (attMap.has(key)) {
                const existing = attMap.get(key);
                const existingName = typeof existing === "string" ? "Attachment" : (existing?.name || "Attachment");
                if (existingName === "Attachment" && name !== "Attachment") {
                  attMap.set(key, itemObj);
                }
              } else {
                attMap.set(key, itemObj);
              }
            };

            existingAtts.forEach(addAttachmentToMap);
            incomingAtts.forEach(addAttachmentToMap);

            const mergedAtts = Array.from(attMap.values());
            task.proofAttachment = mergedAtts.length > 0 ? JSON.stringify(mergedAtts) : null;
          }

          // 3. Update task lead info fields & dynamic lead status
          if (name !== undefined) task.personName = name;
          if (phone !== undefined) task.contactNo = phone;
          if (companyName !== undefined) task.companyName = companyName;
          if (email !== undefined) task.emailAddress = email;
          if (city !== undefined) task.visitLocation = city;
          if (salesReason !== undefined) task.salesReason = salesReason;

          if (lead.status) {
            task.callStatus = lead.status;
            task.leadStatus = lead.status;

            // Sync task lead status - NEVER auto-complete task automatically; keep task in progress so user can mark complete manually
            if (task.status === "Pending" || !task.status) {
              task.status = "In Progress";
            }

            // Sync description text if it has a Status: or Lead Status: line
            if (task.description) {
              if (task.description.includes("Lead Status:")) {
                task.description = task.description.replace(/Lead Status:\s*[^\n]+/, `Lead Status: ${lead.status}`);
              } else if (task.description.includes("Status:")) {
                task.description = task.description.replace(/Status:\s*[^\n]+/, `Status: ${lead.status}`);
              } else {
                task.description += `\nLead Status: ${lead.status}`;
              }
            }
          }

          await task.save().catch(() => {});
        }
      }
    } catch (taskSyncErr) {
      console.error("TaskLog sync error from lead update:", taskSyncErr);
    }

    return NextResponse.json({ success: true, message: "Lead updated successfully", data: lead });
  } catch (error: any) {
    console.error("PUT /api/bda-leads Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove lead(s) - Supports single ID & bulk IDs
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    let idsToDelete: number[] = [];

    // Parse single query ID
    if (id) {
      idsToDelete.push(parseInt(id, 10));
    }

    // Parse comma-separated query IDs
    if (idsParam) {
      const parsed = idsParam.split(",").map(i => parseInt(i.trim(), 10)).filter(Boolean);
      idsToDelete = [...idsToDelete, ...parsed];
    }

    // Parse JSON body if available
    try {
      const body = await req.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete = [...idsToDelete, ...body.ids.map((i: any) => parseInt(i, 10)).filter(Boolean)];
      } else if (body && body.id) {
        idsToDelete.push(parseInt(body.id, 10));
      }
    } catch {}

    // Deduplicate
    idsToDelete = Array.from(new Set(idsToDelete));

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: "Lead ID(s) required" }, { status: 400 });
    }

    const deletedCount = await BdaLead.destroy({
      where: { id: { [Op.in]: idsToDelete } }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} lead(s)`,
      deletedCount
    });
  } catch (error: any) {
    console.error("DELETE /api/bda-leads Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
