import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import Vendor from "@/models/sequelize/Vendor";
import { logAudit } from "@/lib/audit";

async function ensureVendorColumns() {
  // Ensure required active columns exist
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN vendorCode VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN vendorName VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN shopName VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN location VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN contact VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN mobile VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN email VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN category VARCHAR(255) NULL;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors ADD COLUMN serviceType VARCHAR(255) NULL;`); } catch (_) {}
  // Ensure vendor_categories table exists
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (_) {}

  // Drop unwanted columns from MySQL database table
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN paymentTerms;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN riskCategory;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN performanceScore;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN complaintsCount;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN renewalDate;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN panGst;`); } catch (_) {}
  try { await sequelize.query(`ALTER TABLE vendors DROP COLUMN user;`); } catch (_) {}
}

async function generateVendorCode(): Promise<string> {
  try {
    const count = await Vendor.count();
    let num = count + 1;
    let code = `VEN-${String(num).padStart(3, "0")}`;
    let exists = await Vendor.findByPk(code);
    while (exists) {
      num += 1;
      code = `VEN-${String(num).padStart(3, "0")}`;
      exists = await Vendor.findByPk(code);
    }
    return code;
  } catch (_) {
    return `VEN-001`;
  }
}

// GET: Retrieve vendors list directly from vendors master table
export async function GET() {
  try {
    await sequelize.authenticate();
    await ensureVendorColumns();

    const vendors = await Vendor.findAll({
      where: { status: "active" },
      order: [['createdAt', 'DESC']]
    });

    const data: any[] = [];

    vendors.forEach((v, index) => {
      const vJson = v.toJSON() as any;
      
      if (!vJson.vendorCode) {
        if (vJson.id && String(vJson.id).startsWith("VEN-")) {
          vJson.vendorCode = vJson.id;
        } else {
          vJson.vendorCode = `VEN-${String(vendors.length - index).padStart(3, "0")}`;
        }
      }

      vJson.displayMobile = vJson.mobile || vJson.contact || "—";
      vJson.displayEmail = vJson.email || "—";
      vJson.location = vJson.location || "—";
      vJson.serviceType = vJson.serviceType || "—";
      vJson.category = vJson.category || "General";
      
      data.push(vJson);
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update Vendor profile / create new Vendor
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await ensureVendorColumns();

    const body = await req.json();
    const { 
      id, 
      vendorName, 
      shopName, 
      location,
      mobile,
      email,
      contact, 
      category, 
      agreementUrl, 
      serviceType
    } = body;

    const nameToSave = vendorName || "New Vendor";

    if (!shopName || !mobile) {
      return NextResponse.json({ success: false, error: "Shop/Company Name and Phone Number are required" }, { status: 400 });
    }

    let vendor: any = null;

    if (id && id !== "new") {
      vendor = await Vendor.findByPk(id);
    }

    const contactVal = mobile || contact || "";

    if (!vendor) {
      const vendorCode = await generateVendorCode();
      vendor = await Vendor.create({
        id: vendorCode, // ID format: VEN-001, VEN-002, VEN-003
        vendorCode,
        vendorName: nameToSave,
        shopName: shopName || "",
        location: location || "",
        mobile: contactVal,
        email: email || "",
        contact: contactVal,
        category: category || "IT & Software",
        serviceType: serviceType || "",
        agreementUrl: agreementUrl || "",
        status: "active"
      });
    } else {
      if (vendorName !== undefined) vendor.vendorName = vendorName;
      if (shopName !== undefined) vendor.shopName = shopName;
      if (location !== undefined) vendor.location = location;
      if (mobile !== undefined) vendor.mobile = mobile;
      if (email !== undefined) vendor.email = email;
      if (contactVal !== undefined) vendor.contact = contactVal;
      if (category !== undefined) vendor.category = category;
      if (agreementUrl !== undefined) vendor.agreementUrl = agreementUrl;
      if (serviceType !== undefined) vendor.serviceType = serviceType;
      await vendor.save();
    }

    await logAudit({
      userId: (session.user as any).id,
      action: "SAVE_VENDOR_PROFILE",
      entity: "Vendor",
      entityId: vendor.id,
      details: `Saved Vendor profile: ${nameToSave} (${shopName || category}). Code: ${vendor.vendorCode}. Mobile: ${contactVal}.`,
    });

    return NextResponse.json({ success: true, data: vendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete vendor
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing vendor ID" }, { status: 400 });

    await sequelize.authenticate();
    await Vendor.destroy({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
