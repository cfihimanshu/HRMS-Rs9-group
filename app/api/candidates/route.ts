// Removed @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Candidate from "@/models/sequelize/Candidate";
import Job from "@/models/sequelize/Job";
import LeadPlatform from "@/models/sequelize/LeadPlatform";
import LeadRole from "@/models/sequelize/LeadRole";
import { logAudit } from "@/lib/audit";
import { Op } from "sequelize";

// POST: Candidate submits their application form (Public Endpoint)
export async function POST(req: Request) {
  try {
    await sequelize.authenticate();

    // Ensure all custom candidate columns exist based on job_form_fields configuration
    try {
      const [existingColsResult]: any[] = await sequelize.query("SHOW COLUMNS FROM candidates");
      const existingCols = existingColsResult.map((c: any) => c.Field.toLowerCase());

      // Query all fields from job_form_fields
      const [configuredFields]: any[] = await sequelize.query("SELECT id, type FROM job_form_fields");
      
      for (const field of configuredFields) {
        const colName = field.id;
        if (!existingCols.includes(colName.toLowerCase())) {
          await sequelize.query(`ALTER TABLE candidates ADD COLUMN \`${colName}\` TEXT NULL`);
          console.log(`[CANDIDATE DYNAMIC SCHEMA] Dynamically added column ${colName} to candidates table`);
        }
      }
    } catch (dbErr) {
      console.error("[CANDIDATE SCHEMA EVOLUTION] Failed to dynamically sync columns:", dbErr);
    }

    const body = await req.json();

    const {
      jobId,
      name,
      mobile,
      email,
      address,
      qualification,
      experience,
      currentSalary,
      expectedSalary,
      noticePeriod,
      riskAnswers,
      uploads,
    } = body;

    if (
      !name ||
      !mobile ||
      !email ||
      !address ||
      !qualification ||
      !experience ||
      !currentSalary ||
      !expectedSalary ||
      !noticePeriod
    ) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Verify job if provided
    let jobExists: any = null;
    if (jobId) {
      jobExists = await Job.findByPk(jobId);
      if (!jobExists) {
        return NextResponse.json({ success: false, error: "Job posting not found" }, { status: 400 });
      }
    }

    // 3-month Reapply Limitation Check
    if (jobExists && jobExists.company) {
      const companyJobs = await Job.findAll({ where: { company: jobExists.company }, attributes: ["id"] });
      const companyJobIds = companyJobs.map((j: any) => j.id);

      const existingCandidates = await Candidate.findAll({ where: {
        [Op.or]: [
          { email: email.trim() },
          { mobile: mobile.trim() }
        ],
        job: { [Op.in]: companyJobIds },
        status: { [Op.ne]: "inactive" }
      } });

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentApp = existingCandidates.find((c: any) => {
        return new Date(c.createdAt) >= threeMonthsAgo;
      });

      if (recentApp) {
        const nextAllowedDate = new Date(recentApp.createdAt);
        nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 3);
        const formattedDate = nextAllowedDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
        return NextResponse.json({
          success: false,
          error: `You have already applied to this company within the last 3 months. You can re-apply after ${formattedDate}.`
        }, { status: 400 });
      }
    }

    // 1. Construct parameters mapping
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");
    const createData: { [key: string]: any } = {
      id: Date.now().toString(),
      job: jobId || null,
      name: name || null,
      mobile: mobile || null,
      email: email || null,
      address: address || null,
      qualification: qualification || null,
      experience: experience || null,
      currentSalary: currentSalary || null,
      expectedSalary: expectedSalary || null,
      noticePeriod: noticePeriod || null,
      status: "Pending",
      currentRound: 1,
      createdAt: nowStr,
      updatedAt: nowStr
    };

    // Map virtual uploads to literal MySQL column names
    if (uploads) {
      if (uploads.resume) createData["uploads.resume"] = uploads.resume;
      if (uploads.photo) createData["uploads.photo"] = uploads.photo;
      if (uploads.aadhaar) createData["uploads.aadhaar"] = uploads.aadhaar;
      if (uploads.pan) createData["uploads.pan"] = uploads.pan;
      if (uploads.salarySlip) createData["uploads.salarySlip"] = uploads.salarySlip;
      if (uploads.bankStatement) createData["uploads.bankStatement"] = uploads.bankStatement;
    }
    // Map virtual riskAnswers to literal MySQL column names
    if (riskAnswers) {
      if (riskAnswers.sideBusiness) createData["riskAnswers.sideBusiness"] = riskAnswers.sideBusiness;
      if (riskAnswers.loanPressure) createData["riskAnswers.loanPressure"] = riskAnswers.loanPressure;
      if (riskAnswers.courtCase) createData["riskAnswers.courtCase"] = riskAnswers.courtCase;
      if (riskAnswers.targetWork) createData["riskAnswers.targetWork"] = riskAnswers.targetWork;
      if (riskAnswers.fieldWork) createData["riskAnswers.fieldWork"] = riskAnswers.fieldWork;
      if (riskAnswers.backgroundVerification) createData["riskAnswers.backgroundVerification"] = riskAnswers.backgroundVerification;
      if (riskAnswers.confidentialityAgreement) createData["riskAnswers.confidentialityAgreement"] = riskAnswers.confidentialityAgreement;
    }

    // Extract dynamic fields configured in DB from the body
    try {
      const [configuredFields]: any[] = await sequelize.query("SELECT id FROM job_form_fields");
      for (const field of configuredFields) {
        const key = field.id;
        const defaultFields = ["name", "mobile", "email", "address", "qualification", "experience", "currentSalary", "expectedSalary", "noticePeriod"];
        if (!defaultFields.includes(key) && body[key] !== undefined) {
          createData[key] = body[key] !== null ? String(body[key]).trim() : null;
        }
      }
    } catch (e) {
      console.error("[POST CANDIDATES] Failed to dynamically map custom fields:", e);
    }

    // 2. Insert candidate via raw SQL to support runtime schema additions
    const colsList = Object.keys(createData);
    const placeholders = colsList.map(() => "?").join(", ");
    const paramValues = colsList.map((k) => createData[k]);
    
    await sequelize.query(
      `INSERT INTO candidates (${colsList.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`,
      { replacements: paramValues }
    );

    // 3. Fetch newly inserted record
    const [insertedCandidates]: any[] = await sequelize.query("SELECT * FROM candidates WHERE id = ?", {
      replacements: [createData.id]
    });
    const candidate = insertedCandidates[0];

    // Replicate candidate application to Business Leads directory
    try {
      let platform = null;

      if (jobExists && jobExists.source) {
        platform = await LeadPlatform.findOne({
          where: {
            [Op.or]: [
              { name: jobExists.source },
              { id: jobExists.source }
            ]
          }
        });
      }

      if (!platform) {
        // Fallback to Indeed or first available
        platform = await LeadPlatform.findOne({
          where: { name: { [Op.like]: "%Indeed%" } }
        }) || await LeadPlatform.findOne();
      }

      if (platform) {
        const tableName = platform.tableName;
        const prefix = platform.prefix;

        // Fetch existing columns
        const [existingColsResult]: any[] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
        const existingCols = existingColsResult.map((c: any) => c.Field.toLowerCase());

        // Get existing rows for ID index
        const [existingRows]: any[] = await sequelize.query(`SELECT id FROM ${tableName}`);
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

        // Resolve role ID
        let roleId = "0";
        if (jobExists && jobExists.title) {
          try {
            const roleRecord = await LeadRole.findOne({
              where: { name: jobExists.title }
            });
            if (roleRecord) {
              roleId = String(roleRecord.id);
            } else {
              roleId = "role_" + jobExists.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
            }
          } catch (_) {
            roleId = "role_" + jobExists.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          }
        }

        // Resolve short 3-letter codes for department and role
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

        const deptPart = (jobExists && jobExists.department) ? jobExists.department : "0";
        let deptCode = "000";
        if (deptPart && deptPart !== "0") {
          try {
            const LeadsDepartment = (await import("@/models/sequelize/LeadsDepartment")).default;
            const deptRec = await LeadsDepartment.findByPk(deptPart);
            if (deptRec) {
              deptCode = get3LetterCode(deptRec.name);
            } else {
              const Department = (await import("@/models/sequelize/Department")).default;
              const deptRec2 = await Department.findByPk(deptPart);
              if (deptRec2) {
                deptCode = get3LetterCode(deptRec2.name);
              } else {
                deptCode = get3LetterCode(deptPart);
              }
            }
          } catch (_) {
            deptCode = get3LetterCode(deptPart);
          }
        }

        let roleCode = "000";
        if (roleId && roleId !== "0") {
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
        const nextLeadNum = maxNum + 1;
        const nextLeadId = `${prefix}-${deptCode}-${roleCode}-${nextLeadNum}`;

        const rowData: { [key: string]: any } = {
          id: nextLeadId,
          createdAt: now,
          updatedAt: now
        };

        const nameCol = existingCols.includes("full_name") ? "full_name"
                      : existingCols.includes("fullname") ? "fullname"
                      : existingCols.includes("candidate_name") ? "candidate_name"
                      : existingCols.includes("lead_name") ? "lead_name" : "name";

        const phoneCol = existingCols.includes("mobile_no") ? "mobile_no"
                       : existingCols.includes("mobile") ? "mobile"
                       : existingCols.includes("phone_no") ? "phone_no"
                       : existingCols.includes("phoneno") ? "phoneno"
                       : existingCols.includes("phone_number") ? "phone_number"
                       : existingCols.includes("contact_no") ? "contact_no"
                       : existingCols.includes("contact") ? "contact" : "phone";

        const emailCol = existingCols.includes("email_id") ? "email_id"
                       : existingCols.includes("emailid") ? "emailid"
                       : existingCols.includes("email_address") ? "email_address" : "email";

        const expCol = existingCols.includes("level_of_experience") ? "level_of_experience"
                     : existingCols.includes("level_of_experien") ? "level_of_experien"
                     : existingCols.includes("exp") ? "exp"
                     : existingCols.includes("relevant_experience") ? "relevant_experience" : "experience";

        const cityCol = existingCols.includes("city") ? "city"
                      : existingCols.includes("current_city") ? "current_city"
                      : existingCols.includes("currentcity") ? "currentcity" : "city";

        const resumeCol = existingCols.includes("resume_link") ? "resume_link"
                        : existingCols.includes("resumelink") ? "resumelink"
                        : existingCols.includes("resume") ? "resume" : "cvUpload";

        const standardFields = [
          { name: nameCol, type: "TEXT", val: name },
          { name: phoneCol, type: "TEXT", val: mobile },
          { name: emailCol, type: "TEXT", val: email },
          { name: "qualification", type: "TEXT", val: qualification },
          { name: expCol, type: "TEXT", val: experience },
          { name: "status", type: "TEXT", val: "New" },
          { name: "platform_id", type: "VARCHAR(255)", val: platform.id },
          { name: "department_id", type: "VARCHAR(255)", val: deptPart },
          { name: "role_id", type: "VARCHAR(255)", val: roleId },
          { name: "source_type", type: "VARCHAR(255)", val: "System Job Link" },
          { name: cityCol, type: "TEXT", val: body.currentCity || null },
          { name: resumeCol, type: "TEXT", val: (uploads ? uploads.resume : null) || null }
        ];

        for (const f of standardFields) {
          if (!existingCols.includes(f.name.toLowerCase())) {
            await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${f.name} ${f.type} NULL`);
            existingCols.push(f.name.toLowerCase());
          }
          rowData[f.name] = f.val;
        }

        // Build and run dynamic SQL insert statement
        const colNames = Object.keys(rowData);
        const placeholders = colNames.map(() => "?").join(", ");
        const values = colNames.map((col) => rowData[col]);

        const query = `
          INSERT INTO ${tableName} (${colNames.join(", ")}) 
          VALUES (${placeholders})
        `;

        await sequelize.query(query, {
          replacements: values
        });

        console.log(`[CANDIDATE LEAD] Successfully replicated candidate application ${name} as business lead: ${nextLeadId} in ${tableName}`);
      }
    } catch (leadReplicationError) {
      console.error("[CANDIDATE LEAD ERROR] Failed to replicate candidate application to business leads:", leadReplicationError);
    }

    // Log Audit Entry (Public Action, user reference is null)
    await logAudit({
      userId: null,
      action: "SUBMIT_CANDIDATE",
      entity: "Candidate",
      entityId: candidate.id.toString(),
      details: `Candidate application submitted: ${name} (${email}) for Job: ${
        jobExists ? jobExists.title : "General Inquiry"
      }.`,
    });

    // Module 4: Auto response message text
    const autoReplyMessage = `Thank you ${name}. To proceed with the Acolyte Group Recruitment Process, please fill out this form. The HR Team will contact you once the form is submitted.`;
    
    // In production, you would call an SMS/WhatsApp gateway API (Twilio/WhatsApp Cloud API) here
    console.log(`[SMS/WhatsApp AUTO REPLY] Sent to ${mobile}: "${autoReplyMessage}"`);

    return NextResponse.json({
      success: true,
      data: candidate,
      autoResponseSent: true,
      message: autoReplyMessage,
    });
  } catch (error: any) {
    console.error("Failed to submit candidate:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}

// GET: List candidate applications (HR & Owner only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const permitted = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"];
    if (!permitted.includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await sequelize.authenticate();
    await Candidate.sync({ alter: true });
    const url = new URL(req.url);
    const pageStr = url.searchParams.get("page");
    const limitStr = url.searchParams.get("limit");
    const search = url.searchParams.get("search");

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const offset = (page - 1) * limit;

    const whereClause: any = { status: { [Op.ne]: "inactive" } };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } }
      ];
    }

    const isPaginated = !!pageStr || !!limitStr;

    const fetchOptions: any = {
      where: whereClause,
      order: [['createdAt', 'DESC']]
    };

    if (isPaginated) {
      fetchOptions.limit = limit;
      fetchOptions.offset = offset;
    }

    const { count, rows: candidates } = await Candidate.findAndCountAll(fetchOptions);

    const responsePayload: any = { success: true, data: candidates };
    if (isPaginated) {
      responsePayload.pagination = {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
