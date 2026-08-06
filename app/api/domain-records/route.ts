import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { requireApiSession } from "@/lib/apiAuth";
import DomainRecord from "@/models/sequelize/DomainRecord";

export const dynamic = "force-dynamic";

function cleanDate(val: any): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === "Invalid date" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return trimmed;
  }
  const dateObj = new Date(trimmed);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}

function cleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || isNaN(Number(trimmed))) return null;
    return parseFloat(trimmed);
  }
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  return null;
}

function cleanString(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") val = String(val);
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    // Optional query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const type = searchParams.get("type")?.trim();
    const status = searchParams.get("status")?.trim();

    const where: any = {};
    if (type && type !== "all") {
      where.recordType = type;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { platform: { [Op.like]: `%${search}%` } },
        { attachedEmail: { [Op.like]: `%${search}%` } },
        { userId: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { remarks: { [Op.like]: `%${search}%` } }
      ];
    }

    const records = await DomainRecord.findAll({
      where,
      order: [["createdAt", "DESC"]]
    });

    return NextResponse.json({
      success: true,
      records
    });
  } catch (error: any) {
    console.error("[/api/domain-records GET]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch domain records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    const body = await request.json();
    const {
      recordType,
      name,
      platform,
      status,
      purchaseDate,
      expiryDate,
      renewalDate,
      attachedEmail,
      userId,
      password,
      authCode,
      phoneNumber,
      cost,
      url,
      remarks,
      customFields
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Record Name/Domain Name is required" }, { status: 400 });
    }

    const validRecordType = recordType || "Domain Record";

    // Auto-generate ID prefix based on category
    let prefix = "DOM";
    if (validRecordType === "Cloud Platform") prefix = "CLD";
    else if (validRecordType === "Gmail") prefix = "GML";
    else if (validRecordType === "GitHub Repo") prefix = "GIT";

    const count = await DomainRecord.count({ where: { recordType: validRecordType } });
    const id = `${prefix}-${String(1001 + count).padStart(4, "0")}`;

    const created = await DomainRecord.create({
      id,
      recordType: validRecordType,
      name: name.trim(),
      platform: cleanString(platform),
      status: status || "In Use",
      purchaseDate: cleanDate(purchaseDate),
      expiryDate: cleanDate(expiryDate),
      renewalDate: cleanDate(renewalDate),
      attachedEmail: cleanString(attachedEmail),
      userId: cleanString(userId),
      password: cleanString(password),
      authCode: cleanString(authCode),
      phoneNumber: cleanString(phoneNumber),
      cost: cleanNumber(cost),
      url: cleanString(url),
      remarks: cleanString(remarks),
      customFields: customFields ? (typeof customFields === "object" ? JSON.stringify(customFields) : customFields) : null,
      createdById: String((auth.session as any)?.user?.id || (auth.session as any)?.user?.email || "SYSTEM"),
      createdByName: String((auth.session as any)?.user?.name || (auth.session as any)?.user?.email || "Admin User")
    });

    return NextResponse.json({
      success: true,
      record: created,
      message: `${validRecordType} registered successfully`
    });
  } catch (error: any) {
    console.error("[/api/domain-records POST]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create domain record" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required for update" }, { status: 400 });
    }

    const record = await DomainRecord.findByPk(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    const updateFields: any = {};
    if ("recordType" in body) updateFields.recordType = body.recordType || "Domain Record";
    if ("name" in body) updateFields.name = (body.name || "").trim();
    if ("platform" in body) updateFields.platform = cleanString(body.platform);
    if ("status" in body) updateFields.status = body.status || "In Use";
    if ("purchaseDate" in body) updateFields.purchaseDate = cleanDate(body.purchaseDate);
    if ("expiryDate" in body) updateFields.expiryDate = cleanDate(body.expiryDate);
    if ("renewalDate" in body) updateFields.renewalDate = cleanDate(body.renewalDate);
    if ("attachedEmail" in body) updateFields.attachedEmail = cleanString(body.attachedEmail);
    if ("userId" in body) updateFields.userId = cleanString(body.userId);
    if ("password" in body) updateFields.password = cleanString(body.password);
    if ("authCode" in body) updateFields.authCode = cleanString(body.authCode);
    if ("phoneNumber" in body) updateFields.phoneNumber = cleanString(body.phoneNumber);
    if ("cost" in body) updateFields.cost = cleanNumber(body.cost);
    if ("url" in body) updateFields.url = cleanString(body.url);
    if ("remarks" in body) updateFields.remarks = cleanString(body.remarks);
    if ("customFields" in body) {
      updateFields.customFields = typeof body.customFields === "object" ? JSON.stringify(body.customFields) : body.customFields;
    }

    await record.update(updateFields);

    return NextResponse.json({
      success: true,
      record,
      message: "Record updated successfully"
    });
  } catch (error: any) {
    console.error("[/api/domain-records PUT]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required" }, { status: 400 });
    }

    const record = await DomainRecord.findByPk(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    await record.destroy();

    return NextResponse.json({
      success: true,
      message: "Record deleted successfully"
    });
  } catch (error: any) {
    console.error("[/api/domain-records DELETE]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete record" }, { status: 500 });
  }
}

