import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadPlatform from "@/models/sequelize/LeadPlatform";
import Candidate from "@/models/sequelize/Candidate";
import Interview from "@/models/sequelize/Interview";
import TaskLog from "@/models/sequelize/TaskLog";
import Job from "@/models/sequelize/Job";
import Department from "@/models/sequelize/Department";
import { Op } from "sequelize";

// GET: Fetch leads and columns from a specific platform's physical table
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platformId = searchParams.get("platformId");
    if (!platformId) {
      return NextResponse.json({ success: false, error: "platformId query parameter is required." }, { status: 400 });
    }

    await sequelize.authenticate();

    const platform = await LeadPlatform.findOne({ where: { id: platformId } });
    if (!platform) {
      return NextResponse.json({ success: false, error: "Platform not found." }, { status: 404 });
    }

    const tableName = platform.tableName;

    // 1. Get existing columns in the table
    const [columnsResult]: any[] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
    const columns = columnsResult.map((c: any) => c.Field);

    // 2. Fetch all leads from the table, ordering by the sequence number part numerically
    const [leads]: any[] = await sequelize.query(
      `SELECT * FROM ${tableName} ORDER BY CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED) ASC`
    );

    // 3. Fetch call logs from tasklogs table that belong to business leads updates
    let taskLogs: any[] = [];
    try {
      const [results]: any[] = await sequelize.query(
        `SELECT id, employee, date, taskTitle, description, status, proofAttachment FROM tasklogs WHERE taskType = 'CALL' AND description LIKE '%Lead ID:%'`
      );
      taskLogs = results || [];
    } catch (e) {
      console.warn("TaskLog table retrieval warning (maybe not synced yet):", e);
    }

    // Map task logs by Lead ID
    const taskLogsByLeadId: { [leadId: string]: any[] } = {};
    for (const log of taskLogs) {
      const desc = log.description || "";
      const match = desc.match(/Lead ID:\s*([^\s\n\r]+)/i);
      if (match && match[1]) {
        const leadId = match[1].trim();
        if (!taskLogsByLeadId[leadId]) {
          taskLogsByLeadId[leadId] = [];
        }
        taskLogsByLeadId[leadId].push(log);
      }
    }

    // Helper to parse description from tasklogs
    const parseTaskLogDescription = (log: any) => {
      const desc = log.description || "";
      const title = log.taskTitle || "";
      
      let status = "Connected";
      const titleMatch = title.match(/\(([^)]+)\)$/);
      if (titleMatch) {
        status = titleMatch[1];
      }

      const extractField = (regex: RegExp) => {
        const m = desc.match(regex);
        return m ? m[1].trim() : null;
      };

      const remarks = extractField(/Remarks\/Notes:\s*([^\n\r]+)/i) || 
                      extractField(/Remarks:\s*([^\n\r]+)/i) || "";
                      
      const followupDate = extractField(/Set Follow-up Date:\s*([^\n\r]+)/i) || null;
      
      const round = extractField(/Round:\s*([^\n\r]+)/i) || null;
      const date = extractField(/Date:\s*([^\n\r]+)/i) || null;
      const time = extractField(/Time:\s*([^\n\r]+)/i) || null;
      const mode = extractField(/Mode:\s*([^\n\r]+)/i) || null;
      const link = extractField(/Meeting Link:\s*([^\n\r]+)/i) || null;

      const screenshot = extractField(/Screenshot Proof Link:\s*([^\n\r]+)/i) || null;
      const recording = extractField(/Call Recording Link:\s*([^\n\r]+)/i) || null;

      return {
        id: "tasklog_" + log.id,
        status,
        call_remarks: remarks,
        followup_date: followupDate,
        interview_round: round,
        interview_date: date,
        interview_time: time,
        interview_mode: mode,
        interview_video_link: link === "N/A" ? "" : link,
        screenshot_url: screenshot || log.proofAttachment || null,
        recording_url: recording || null,
        updatedAt: log.date || new Date().toISOString(),
        updatedBy: log.employee || "HR System"
      };
    };

    let systemJobLinkCount = 0;
    let leadsCalled = 0;
    let connected = 0;
    let notConnected = 0;
    let interviewScheduled = 0;
    let selected = 0;
    let rejected = 0;

    // Merge tasklogs into lead's call_history dynamically
    const mergedLeads = leads.map((lead: any) => {
      // Check if lead has status
      const status = lead.status || "";
      if (status && status !== "New") {
        leadsCalled++;
      }
      const statusLower = status.toLowerCase();
      if (statusLower.includes("connected")) {
        connected++;
      } else if (statusLower.includes("no answer") || statusLower.includes("busy") || statusLower.includes("not interested") || statusLower.includes("not intrested")) {
        notConnected++;
      } else if (statusLower.includes("interview")) {
        interviewScheduled++;
      } else if (statusLower.includes("select")) {
        selected++;
      } else if (statusLower.includes("reject")) {
        rejected++;
      }

      // Check System Job Link matching (strictly by source_type to avoid matching imported leads)
      const isSystemLink = lead.source_type === "System Job Link";
      if (isSystemLink) {
        systemJobLinkCount++;
      }

      let callHistoryList: any[] = [];
      if (lead.call_history) {
        try {
          const parsed = JSON.parse(lead.call_history);
          if (Array.isArray(parsed)) {
            callHistoryList = parsed;
          }
        } catch (e) {
          console.error("JSON parse error for call_history:", e);
        }
      }

      const tasklogsList = taskLogsByLeadId[lead.id] || [];
      const parsedTasklogs = tasklogsList.map(parseTaskLogDescription);

      // Merge and deduplicate by status, remarks, and timestamp
      const mergedMap = new Map<string, any>();
      
      parsedTasklogs.forEach((item) => {
        const key = `${item.status}_${item.call_remarks}_${new Date(item.updatedAt).getTime()}`;
        mergedMap.set(key, item);
      });

      callHistoryList.forEach((item) => {
        const key = `${item.status}_${item.call_remarks}_${new Date(item.updatedAt).getTime()}`;
        mergedMap.set(key, item);
      });

      // Sort chronological
      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );

      return {
        ...lead,
        isSystemLink,
        call_history: mergedList.length > 0 ? JSON.stringify(mergedList) : null
      };
    });

    const stats = {
      totalLeads: mergedLeads.length,
      leadsCalled,
      connected,
      notConnected,
      interviewScheduled,
      selected,
      rejected,
      systemJobLink: systemJobLinkCount
    };

    return NextResponse.json({
      success: true,
      data: {
        leads: mergedLeads,
        columns,
        stats
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch business leads:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Dynamic Import of Leads (with Alter Table columns mapping)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { platformId, leads, headers, departmentId, roleId } = body; // leads: array of raw objects, headers: array of original excel column names

    if (!platformId || !leads || !Array.isArray(leads) || !headers || !Array.isArray(headers)) {
      return NextResponse.json({ success: false, error: "Invalid parameters. platformId, leads, and headers are required." }, { status: 400 });
    }

    await sequelize.authenticate();

    const platform = await LeadPlatform.findOne({ where: { id: platformId } });
    if (!platform) {
      return NextResponse.json({ success: false, error: "Platform registry not found." }, { status: 404 });
    }

    const tableName = platform.tableName;
    const prefix = platform.prefix;

    // 1. Fetch current columns from MySQL
    const [existingColsResult]: any[] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
    const existingCols = existingColsResult.map((c: any) => c.Field.toLowerCase());

    // Ensure platform_id, department_id and role_id columns exist in the physical table
    if (!existingCols.includes("platform_id")) {
      console.log(`[SCHEMA EVOLUTION] Altering table ${tableName} to add column platform_id`);
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN platform_id VARCHAR(255) NULL`);
      existingCols.push("platform_id");
    }
    if (!existingCols.includes("department_id")) {
      console.log(`[SCHEMA EVOLUTION] Altering table ${tableName} to add column department_id`);
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN department_id INT NULL`);
      existingCols.push("department_id");
    }
    if (!existingCols.includes("role_id")) {
      console.log(`[SCHEMA EVOLUTION] Altering table ${tableName} to add column role_id`);
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN role_id INT NULL`);
      existingCols.push("role_id");
    }

    // Helper to check for standard column synonyms and map to existing db column if it represents the same concept
    const getStandardColumnName = (h: string, existingColsList: string[]) => {
      const cleaned = h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // Name mappings
      if (["name", "fullname", "leadname", "customer", "client", "person"].includes(cleaned)) {
        if (existingColsList.includes("full_name")) return "full_name";
        if (existingColsList.includes("fullname")) return "fullname";
        if (existingColsList.includes("candidate_name")) return "candidate_name";
        if (existingColsList.includes("lead_name")) return "lead_name";
        return "name";
      }
      // Email mappings
      if (["email", "emailaddress", "mail", "emailid", "emailaddress"].includes(cleaned)) {
        if (existingColsList.includes("email_id")) return "email_id";
        if (existingColsList.includes("emailid")) return "emailid";
        if (existingColsList.includes("email_address")) return "email_address";
        return "email";
      }
      // Phone mappings
      if (["phone", "mobile", "contact", "phonenumber", "telephone", "cell", "mobileno", "phone_no", "phoneno", "mobilenumber", "contactno", "contactnumber", "contact_no"].includes(cleaned)) {
        if (existingColsList.includes("mobile_no")) return "mobile_no";
        if (existingColsList.includes("mobile")) return "mobile";
        if (existingColsList.includes("phone_no")) return "phone_no";
        if (existingColsList.includes("phoneno")) return "phoneno";
        if (existingColsList.includes("phone_number")) return "phone_number";
        if (existingColsList.includes("contact_no")) return "contact_no";
        if (existingColsList.includes("contact")) return "contact";
        return "phone";
      }
      // Company mappings
      if (["company", "organization", "firm", "business", "companyname"].includes(cleaned)) {
        return "company";
      }
      // Experience mappings
      if (["experience", "levelofexperience", "relevantexperience", "exp", "levelofexperien", "workexperience"].includes(cleaned)) {
        if (existingColsList.includes("level_of_experience")) return "level_of_experience";
        if (existingColsList.includes("level_of_experien")) return "level_of_experien";
        if (existingColsList.includes("exp")) return "exp";
        if (existingColsList.includes("relevant_experience")) return "relevant_experience";
        return "experience";
      }
      // Notes mappings
      if (["notes", "remarks", "description", "comments"].includes(cleaned)) {
        return "notes";
      }
      
      return null;
    };

    // 2. Helper to clean header to a valid SQL column name
    const sanitizeHeader = (h: string) => {
      let cleaned = h.trim().toLowerCase();
      // Replace spaces, dashes, hyphens, parentheses, slashes with underscores
      cleaned = cleaned.replace(/[^a-z0-9_]+/g, "_");
      // Strip leading/trailing underscores
      cleaned = cleaned.replace(/(^_|_$)/g, "");
      // If it starts with a number, prefix with "col_"
      if (/^[0-9]/.test(cleaned)) {
        cleaned = "col_" + cleaned;
      }
      return cleaned || "column_" + Math.random().toString(36).substring(2, 6);
    };

    // 3. Map original headers to sanitized db column names and alter table if columns are new
    const headerMapping: { [key: string]: string } = {};
    for (const originalHeader of headers) {
      const stdCol = getStandardColumnName(originalHeader, existingCols);
      const dbColName = stdCol || sanitizeHeader(originalHeader);
      headerMapping[originalHeader] = dbColName;

      // Check if it is a standard/already existing column in database
      const standardCols = ["id", "createdat", "updatedat", "name", "email", "phone", "company", "notes", "status"];
      if (!existingCols.includes(dbColName) && !standardCols.includes(dbColName)) {
        console.log(`[SCHEMA EVOLUTION] Altering table ${tableName} to add column ${dbColName}`);
        await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${dbColName} TEXT NULL`);
        existingCols.push(dbColName); // Track it now
      }
    }

    // 4. Helper to normalize phone number to last 10 digits
    const normalizePhone = (num: any) => {
      if (!num) return "";
      const digits = String(num).replace(/\D/g, "");
      return digits.slice(-10);
    };

    // 5. Fetch all existing leads to extract already imported phone numbers
    const [existingRows]: any[] = await sequelize.query(`SELECT * FROM ${tableName}`);
    const existingPhoneLast10 = new Set<string>();
    const phoneToLeadId = new Map<string, string>();
    const possiblePhoneKeys = ["phone", "mobile_no", "phone_number", "contact_no", "mobileno", "contact", "phone_no"];

    existingRows.forEach((row: any) => {
      possiblePhoneKeys.forEach((key) => {
        if (row[key]) {
          const clean = normalizePhone(row[key]);
          if (clean && clean.length === 10) {
            existingPhoneLast10.add(clean);
            phoneToLeadId.set(clean, row.id);
          }
        }
      });
    });

    // 6. Find the original excel header representing the phone number
    let excelPhoneHeader = "";
    for (const originalHeader of headers) {
      const dbCol = headerMapping[originalHeader];
      if (dbCol === "phone" || possiblePhoneKeys.includes(dbCol)) {
        excelPhoneHeader = originalHeader;
        break;
      }
    }

    // 7. Determine next ID index for prefix
    let maxNum = 0;
    existingRows.forEach((row: any) => {
      if (row.id && row.id.startsWith(`${prefix}-`)) {
        const parts = row.id.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    // Resolve short 3-letter codes for department and role once
    const get3LetterCode = (name: string): string => {
      if (!name) return "XXX";
      let clean = name.trim().replace(/^(dept_|role_)/i, "");
      const up = clean.toUpperCase();
      
      if (up.includes("INFORMATION TECHNOLOGY") || up === "IT") return "ITX";
      if (up.includes("HUMAN RESOURCES") || up === "HR") return "HRX";
      if (up.includes("ACCOUNTS") || up.includes("ACCOUNTING")) return "ACC";
      if (up.includes("BUSINESS DEVELOPMENT EXECUTIVE") || up.includes("BDE")) return "BDE";
      if (up.includes("DEVELOPER") || up.includes("DEVELOPMENT")) return "DEV";
      if (up.includes("TELECALLER") || up.includes("TELE CALLING")) return "TEL";
      if (up.includes("RECRUITER") || up.includes("RECRUITMENT")) return "REC";
      if (up.includes("SALES")) return "SAL";
      if (up.includes("MARKETING")) return "MKT";
      if (up.includes("ADMIN")) return "ADM";
      if (up.includes("SUPPORT")) return "SUP";
      if (up.includes("LEGAL")) return "LEG";
      
      clean = clean.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s_]/g, "");
      const words = clean.split(/[\s_]+/g).filter(Boolean);
      if (words.length >= 3) {
        return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
      }
      if (words.length === 2) {
        return (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || "X")).toUpperCase().slice(0, 3);
      }
      return up.slice(0, 3).padEnd(3, "X");
    };

    let deptCode = "000";
    if (departmentId) {
      try {
        const LeadsDepartment = (await import("@/models/sequelize/LeadsDepartment")).default;
        const deptRec = await LeadsDepartment.findByPk(departmentId);
        if (deptRec) {
          deptCode = get3LetterCode(deptRec.name);
        } else {
          deptCode = get3LetterCode(departmentId);
        }
      } catch (_) {
        deptCode = get3LetterCode(departmentId);
      }
    }

    let roleCode = "000";
    if (roleId) {
      try {
        const LeadRole = (await import("@/models/sequelize/LeadRole")).default;
        const roleRec = await LeadRole.findByPk(roleId);
        if (roleRec) {
          roleCode = get3LetterCode(roleRec.name);
        } else {
          roleCode = get3LetterCode(roleId);
        }
      } catch (_) {
        roleCode = get3LetterCode(roleId);
      }
    }

    const now = new Date();
    let skippedCount = 0;
    let importedCount = 0;

    // Start database transaction
    const transaction = await sequelize.transaction();

    try {
      let currentNumber = maxNum;
      for (const lead of leads) {
        // De-duplicate check
        let existingLeadId = null;
        if (excelPhoneHeader) {
          const rawPhone = lead[excelPhoneHeader];
          if (rawPhone) {
            const cleanPhone = normalizePhone(rawPhone);
            if (cleanPhone && cleanPhone.length === 10) {
              if (phoneToLeadId.has(cleanPhone)) {
                existingLeadId = phoneToLeadId.get(cleanPhone);
              }
              // Add to set to prevent duplicate rows inside the same Excel file
              existingPhoneLast10.add(cleanPhone);
            }
          }
        }

        // Map lead properties to sanitized DB columns
        const rowData: { [key: string]: any } = {
          updatedAt: now
        };

        // Populate values based on mapped headers
        for (const originalHeader of headers) {
          const dbCol = headerMapping[originalHeader];
          const rawVal = lead[originalHeader];
          rowData[dbCol] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : null;
        }

        if (existingLeadId) {
          // Construct parameterized UPDATE query
          const setStatements: string[] = [];
          const values: any[] = [];
          Object.keys(rowData).forEach((col) => {
            setStatements.push(`${col} = ?`);
            values.push(rowData[col]);
          });
          values.push(existingLeadId);

          const query = `
            UPDATE ${tableName} 
            SET ${setStatements.join(", ")} 
            WHERE id = ?
          `;
          await sequelize.query(query, {
            replacements: values,
            transaction
          });
          skippedCount++; // Count as updated
        } else {
          currentNumber++;
          const nextId = `${prefix}-${deptCode}-${roleCode}-${currentNumber}`;
          rowData.id = nextId;
          rowData.createdAt = now;
          rowData.platform_id = platformId || null;
          rowData.department_id = departmentId || null;
          rowData.role_id = roleId || null;

          const colNames = Object.keys(rowData);
          const placeholders = colNames.map(() => "?").join(", ");
          const values = colNames.map((col) => rowData[col]);

          const query = `
            INSERT INTO ${tableName} (${colNames.join(", ")}) 
            VALUES (${placeholders})
          `;
          await sequelize.query(query, {
            replacements: values,
            transaction
          });
          importedCount++;
        }
      }

      await transaction.commit();
      console.log(`[IMPORT SUCCESS] Imported ${importedCount} leads, skipped ${skippedCount} duplicates into ${tableName}`);
      return NextResponse.json({ success: true, count: importedCount, skippedCount });
    } catch (err: any) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    console.error("Failed to import business leads:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update a specific lead's fields dynamically (e.g. status, call_remarks, interview_date, followup_date)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { platformId, leadId, fields } = body;

    if (!platformId || !leadId || !fields || typeof fields !== "object") {
      return NextResponse.json({ success: false, error: "Invalid parameters. platformId, leadId, and fields object are required." }, { status: 400 });
    }

    await sequelize.authenticate();

    const platform = await LeadPlatform.findOne({ where: { id: platformId } });
    if (!platform) {
      return NextResponse.json({ success: false, error: "Platform registry not found." }, { status: 404 });
    }

    const tableName = platform.tableName;

    const [existingColsResult]: any[] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
    const existingCols = existingColsResult.map((c: any) => c.Field.toLowerCase());

    // Ensure platform_id, department_id, role_id, and call_history columns exist in the physical table
    if (!existingCols.includes("platform_id")) {
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN platform_id VARCHAR(255) NULL`);
      existingCols.push("platform_id");
    }
    if (!existingCols.includes("department_id")) {
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN department_id VARCHAR(255) NULL`);
      existingCols.push("department_id");
    } else {
      await sequelize.query(`ALTER TABLE ${tableName} MODIFY COLUMN department_id VARCHAR(255) NULL`);
    }
    if (!existingCols.includes("role_id")) {
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN role_id VARCHAR(255) NULL`);
      existingCols.push("role_id");
    } else {
      await sequelize.query(`ALTER TABLE ${tableName} MODIFY COLUMN role_id VARCHAR(255) NULL`);
    }
    if (!existingCols.includes("call_history")) {
      await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN call_history TEXT NULL`);
      existingCols.push("call_history");
    }

    // Fetch existing lead record to retrieve current call_history
    const [existingLeads]: any[] = await sequelize.query(`SELECT * FROM ${tableName} WHERE id = ?`, {
      replacements: [leadId]
    });
    const existingLead = existingLeads[0];
    let history: any[] = [];
    if (existingLead) {
      const rawHistory = existingLead.call_history || existingLead.CALL_HISTORY || existingLead.Call_History || null;
      if (rawHistory) {
        try {
          const parsed = JSON.parse(rawHistory);
          if (Array.isArray(parsed)) {
            history = parsed;
          }
        } catch (e) {
          console.error("[CALL HISTORY] JSON parse error:", e);
        }
      }
      
      // If there is no call_history yet, but the lead already has call info in their columns,
      // preserve it by synthesizing a legacy history entry first!
      if (history.length === 0) {
        const existingStatus = existingLead.status || existingLead.STATUS || null;
        const existingRemarks = existingLead.call_remarks || existingLead.CALL_REMARKS || existingLead.remarks || existingLead.REMARKS || null;
        
        if (existingStatus && existingStatus !== "New") {
          const legacyHistoryEntry = {
            id: "legacy_" + (existingLead.updatedAt ? new Date(existingLead.updatedAt).getTime() : Date.now() - 60000).toString(),
            status: existingStatus,
            call_remarks: existingRemarks || "Pre-existing status log.",
            followup_date: existingLead.followup_date || existingLead.FOLLOWUP_DATE || null,
            interview_round: existingLead.interview_round || existingLead.INTERVIEW_ROUND || null,
            interview_date: existingLead.interview_date || existingLead.INTERVIEW_DATE || null,
            interview_time: existingLead.interview_time || existingLead.INTERVIEW_TIME || null,
            interview_mode: existingLead.interview_mode || existingLead.INTERVIEW_MODE || null,
            interview_video_link: existingLead.interview_video_link || existingLead.INTERVIEW_VIDEO_LINK || null,
            screenshot_url: existingLead.screenshot_url || existingLead.SCREENSHOT_URL || null,
            recording_url: existingLead.recording_url || existingLead.RECORDING_URL || null,
            updatedAt: existingLead.updatedAt || existingLead.createdAt || new Date().toISOString(),
            updatedBy: "HR System"
          };
          history.push(legacyHistoryEntry);
        }
      }
    }

    // 2. Helper to clean header/key to valid SQL column name
    const sanitizeHeader = (h: string) => {
      let cleaned = h.trim().toLowerCase();
      cleaned = cleaned.replace(/[^a-z0-9_]+/g, "_");
      cleaned = cleaned.replace(/(^_|_$)/g, "");
      if (/^[0-9]/.test(cleaned)) {
        cleaned = "col_" + cleaned;
      }
      return cleaned;
    };

    // 3. Check and add columns if they don't exist in the database table yet
    const updateData: { [key: string]: any } = {};
    const now = new Date();
    updateData["updatedAt"] = now;

    for (const key of Object.keys(fields)) {
      const dbColName = sanitizeHeader(key);
      if (!dbColName) continue;

      const val = fields[key];
      updateData[dbColName] = val !== undefined && val !== null ? String(val).trim() : null;

      const standardCols = ["id", "createdat", "updatedat"];
      if (!existingCols.includes(dbColName) && !standardCols.includes(dbColName)) {
        console.log(`[SCHEMA EVOLUTION] Altering table ${tableName} to add update column ${dbColName}`);
        await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${dbColName} TEXT NULL`);
        existingCols.push(dbColName); // Track it now
      }
    }

    // Append the new call log to the history
    const newHistoryEntry = {
      id: Date.now().toString(),
      status: fields.status || null,
      call_remarks: fields.call_remarks || null,
      followup_date: fields.followup_date || null,
      followup_time: fields.followup_time || null,
      interview_round: fields.interview_round || null,
      interview_date: fields.interview_date || null,
      interview_time: fields.interview_time || null,
      interview_mode: fields.interview_mode || null,
      interview_video_link: fields.interview_video_link || null,
      screenshot_url: fields.screenshot_url || null,
      recording_url: fields.recording_url || null,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.name || "System"
    };
    history.push(newHistoryEntry);
    updateData["call_history"] = JSON.stringify(history);

    // 4. Construct parameterized UPDATE query
    const setStatements: string[] = [];
    const values: any[] = [];

    Object.keys(updateData).forEach((col) => {
      setStatements.push(`${col} = ?`);
      values.push(updateData[col]);
    });

    values.push(leadId); // For WHERE clause

    const query = `
      UPDATE ${tableName} 
      SET ${setStatements.join(", ")} 
      WHERE id = ?
    `;

    await sequelize.query(query, {
      replacements: values
    });

    // Fetch the lead record to build the description and obtain info
    const [[leadRecord]]: any[] = await sequelize.query(`SELECT * FROM ${tableName} WHERE id = ?`, {
      replacements: [leadId]
    });

    if (leadRecord) {
      const getLeadFieldVal = (rec: any, keys: string[]) => {
        for (const k of keys) {
          if (rec[k] !== undefined && rec[k] !== null) return String(rec[k]);
        }
        return "";
      };

      const leadName = getLeadFieldVal(leadRecord, ["name", "full_name", "candidate_name", "candidate"]);
      const leadPhone = getLeadFieldVal(leadRecord, ["phone", "mobile_no", "phone_number", "contact_no", "mobileno", "contact", "phone_no"]);
      const leadEmail = getLeadFieldVal(leadRecord, ["email", "email_id", "email_address"]);
      const leadQual = getLeadFieldVal(leadRecord, ["qualification", "degree", "education"]);
      const leadExp = getLeadFieldVal(leadRecord, ["level_of_experience", "experience", "relevant_experience", "exp"]);

      // If the status is "Interview Scheduled", create/ensure a Candidate exists and create an Interview record
      if (fields.status === "Interview Scheduled") {
        const schedRound = fields.interview_round || "1";
        const schedDate = fields.interview_date; 
        const schedTime = fields.interview_time; 
        const schedMode = fields.interview_mode || "online";
        const schedVideo = fields.interview_video_link || "";

        if (schedDate && schedTime) {
          const candId = leadId;
          
          // 1. Search candidate by ID
          let candidate = await Candidate.findByPk(candId);
          
          // 2. Search candidate by phone/email to prevent duplicates
          if (!candidate) {
            const searchOr = [];
            if (leadPhone && leadPhone.trim()) searchOr.push({ mobile: leadPhone.trim() });
            if (leadEmail && leadEmail.trim()) searchOr.push({ email: leadEmail.trim() });
            
            if (searchOr.length > 0) {
              candidate = await Candidate.findOne({
                where: { [Op.or]: searchOr }
              });
            }
          }

          // 3. Create or reuse/update candidate
          if (!candidate) {
            candidate = await Candidate.create({
              id: candId,
              name: leadName || "Lead Candidate",
              mobile: leadPhone || "",
              email: leadEmail || "",
              qualification: leadQual || "",
              experience: leadExp || "",
              status: "Selected",
              sourcingChannel: "Business Lead",
              currentRound: 1
            });
          } else {
            // Upgrade existing profile status & sourcingChannel
            candidate.status = "Selected";
            if (!candidate.currentRound) {
              candidate.currentRound = 1;
            }
            if (candidate.sourcingChannel === "System Job Link") {
              candidate.sourcingChannel = "Both";
            }
            await candidate.save();
          }

          // 4. Resolve vacancy title dynamically
          let vacancyName = "Business Lead Application";
          if (candidate.job) {
            try {
              const jobRecord = await Job.findByPk(candidate.job, {
                include: [{ model: Department, as: "department" }]
              });
              if (jobRecord) {
                const deptName = jobRecord.department ? jobRecord.department.name : "";
                vacancyName = deptName ? `${deptName} - ${jobRecord.title}` : jobRecord.title;
              }
            } catch (e) {
              console.error("Failed to load Job details for business lead sync:", e);
            }
          }

          const actualCandId = candidate.id;
          const scheduleTimeVal = new Date(`${schedDate}T${schedTime}`);
          
          await Interview.create({
            id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            candidate: actualCandId,
            candidateName: candidate.name || leadName || "Lead Candidate",
            round: parseFloat(schedRound),
            scheduleTime: scheduleTimeVal,
            videoLink: schedMode === "offline" ? "" : schedVideo,
            mode: schedMode,
            vacancyName: vacancyName,
            status: "Pending"
          });
        }
      }

      // Auto-create a Task in Kanban Board representing this log action
      let taskDescription = `Lead ID: ${leadId}
Candidate Name: ${leadName || "Unknown"}
Platform: ${platform.name}
Action Status: ${fields.status}
Remarks/Notes: ${fields.call_remarks || "N/A"}
`;

      if (fields.status === "Interview Scheduled") {
        taskDescription += `
--- Scheduled Interview Details ---
Round: ${fields.interview_round || "1"}
Date: ${fields.interview_date || "N/A"}
Time: ${fields.interview_time || "N/A"}
Mode: ${fields.interview_mode || "online"}
Meeting Link: ${fields.interview_video_link || "N/A"}
`;
      }
      if (fields.followup_date) {
        taskDescription += `Set Follow-up Date: ${fields.followup_date}\n`;
      }

      const taskTitle = `Lead Log: ${leadName || "Candidate"} (${fields.status})`;
      try {
        await TaskLog.sync({ alter: true });
      } catch (e) {
        console.warn("[SCHEMA EVOLUTION] TaskLog sync failed:", e);
      }
      const taskId = await TaskLog.generateNextTaskId((session.user as any).id);
      
      await TaskLog.create({
        id: taskId,
        employee: (session.user as any).id,
        date: new Date(),
        taskTitle: taskTitle,
        taskType: "CALL",
        description: taskDescription,
        status: "Pending",
        scheduledAt: fields.followup_date 
          ? new Date(`${fields.followup_date}T${fields.followup_time || "00:00"}`) 
          : null,
        timerState: "Stopped",
        elapsedSeconds: 0,
        proofAttachment: fields.screenshot_url || fields.recording_url || null
      });
    }

    console.log(`[UPDATE SUCCESS] Successfully updated lead ${leadId} in ${tableName}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update business lead:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
