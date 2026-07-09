import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import LeadPlatform from "@/models/sequelize/LeadPlatform";

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

    // 2. Fetch all leads from the table
    const [leads]: any[] = await sequelize.query(`SELECT * FROM ${tableName} ORDER BY createdAt DESC`);

    return NextResponse.json({
      success: true,
      data: {
        leads,
        columns
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
    const { platformId, leads, headers } = body; // leads: array of raw objects, headers: array of original excel column names

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

    // Helper to check for standard column synonyms
    const getStandardColumnName = (h: string) => {
      const cleaned = h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // Name mappings
      if (["name", "fullname", "leadname", "customer", "client", "person"].includes(cleaned)) {
        return "name";
      }
      // Email mappings
      if (["email", "emailaddress", "mail"].includes(cleaned)) {
        return "email";
      }
      // Phone mappings
      if (["phone", "mobile", "contact", "phonenumber", "telephone", "cell", "mobileno"].includes(cleaned)) {
        return "phone";
      }
      // Company mappings
      if (["company", "organization", "firm", "business", "companyname"].includes(cleaned)) {
        return "company";
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
      const stdCol = getStandardColumnName(originalHeader);
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

    // 4. Determine next ID index for prefix
    const [currentIdsResult]: any[] = await sequelize.query(`SELECT id FROM ${tableName}`);
    let maxNum = 0;
    currentIdsResult.forEach((row: any) => {
      if (row.id && row.id.startsWith(`${prefix}-`)) {
        const parts = row.id.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const now = new Date();

    // Start database transaction
    const transaction = await sequelize.transaction();

    try {
      let currentNumber = maxNum;
      for (const lead of leads) {
        currentNumber++;
        const nextId = `${prefix}-${String(currentNumber).padStart(5, "0")}`;

        // Map lead properties to sanitized DB columns
        const rowData: { [key: string]: any } = {
          id: nextId,
          createdAt: now,
          updatedAt: now
        };

        // Populate values based on mapped headers
        for (const originalHeader of headers) {
          const dbCol = headerMapping[originalHeader];
          const rawVal = lead[originalHeader];
          rowData[dbCol] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : null;
        }

        // Build dynamically parameterized SQL query
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
      }

      await transaction.commit();
      console.log(`[IMPORT SUCCESS] Successfully imported ${leads.length} leads into ${tableName}`);
      return NextResponse.json({ success: true, count: leads.length });
    } catch (err: any) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    console.error("Failed to import business leads:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
