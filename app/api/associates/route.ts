import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import { Op } from "sequelize";
import Associate, { ensureAssociateSchema } from "@/models/sequelize/Associate";
import { logAudit } from "@/lib/audit";
import User from "@/models/sequelize/User";

// GET: Retrieve associates list
export async function GET() {
  try {
    await sequelize.authenticate();
    await Associate.sync({ alter: true });
    await ensureAssociateSchema();

    // 1. Fetch users with Business Associate roles
    const baUsers = await User.findAll({
      where: {
        role: {
          [Op.or]: ["Business Associate", "BA", "Business Partner", "Business associate"]
        }
      },
      attributes: ['id', 'name', 'email', 'mobile', 'status']
    }).catch(() => []);

    // 2. Fetch existing Associate records
    let associates = await Associate.findAll({
      order: [['createdAt', 'DESC']]
    });

    const existingUserIds = new Set(associates.map(a => (a as any).user).filter(Boolean));

    // 3. Auto-initialize Associate records for any BA users missing an Associate profile
    for (const u of baUsers) {
      if (!existingUserIds.has(u.id)) {
        try {
          const newAssoc = await Associate.create({
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            user: u.id,
            name: u.name,
            email: u.email,
            mobile: u.mobile,
            territory: "General",
            payoutTerms: "Standard Commission",
            reportingDiscipline: 100,
            complaintRatio: 0,
            clientFeedback: 100,
            riskScore: 0,
            exitRisk: "Low",
            status: "active"
          });
          associates.push(newAssoc);
          existingUserIds.add(u.id);
        } catch (e) {
          console.warn("Failed to auto-create associate profile for user:", u.id, e);
        }
      }
    }

    const userIds = associates.map(a => (a as any).user).filter(Boolean);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'email', 'mobile', 'status']
    });

    const userMap = users.reduce((acc: any, u: any) => {
      acc[u.id] = u.toJSON();
      return acc;
    }, {});

    const data = associates
      .filter(a => (a as any).status !== "inactive")
      .map(a => {
        const aJson = a.toJSON() as any;
        const linkedUser = userMap[aJson.user];
        if (linkedUser) {
          aJson.user = linkedUser;
          if (!aJson.name) aJson.name = linkedUser.name;
          if (!aJson.email) aJson.email = linkedUser.email;
          if (!aJson.mobile) aJson.mobile = linkedUser.mobile;
        } else {
          aJson.user = {
            id: aJson.user || aJson.id,
            name: aJson.name || aJson.contactPerson || "Business Associate",
            email: aJson.email || "N/A",
            mobile: aJson.mobile || "N/A",
            status: aJson.status || "active"
          };
        }
        return aJson;
      });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Associates Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Save or update Associate profile
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await sequelize.authenticate();
    await Associate.sync({ alter: true });
    await ensureAssociateSchema();

    const body = await req.json();
    const {
      userId,
      name,
      contactPerson,
      email,
      mobile,
      alternateMobile,
      assignedTerritory,
      territory,
      state,
      city,
      pincode,
      address,
      businessAddress,
      businessName,
      businessType,
      bankAccountNumber,
      ifscCode,
      accountHolderName,
      referralCode,
      termsAccepted,
      profilePhotoUrl,
      cancelledChequeUrl,
      assignedManager,
      leadsGenerated,
      conversionRate,
      payoutTerms,
      gstin,
      pan,
      agreementStartDate,
      agreementEndDate,
      agreementUrl,
      kycDocUrl,
      riskScore,
      exitRisk,
      flags,
      reportingDiscipline,
      complaintRatio,
      clientFeedback,
      status
    } = body;

    const assocName = name || contactPerson;
    const assocTerritory = territory || assignedTerritory;

    if (!assocName && !userId) {
      return NextResponse.json({ success: false, error: "Associate Name or Contact Person is required" }, { status: 400 });
    }

    let associate: any = null;

    if (userId) {
      associate = await Associate.findOne({ where: { user: userId } });
    }

    if (!associate && email) {
      associate = await Associate.findOne({ where: { email } });
    }

    if (!associate) {
      // Find or create User record for Business Associate
      let linkedUser: any = null;
      if (email || mobile) {
        const whereClause: any[] = [];
        if (email) whereClause.push({ email });
        if (mobile) whereClause.push({ mobile });

        linkedUser = await User.findOne({
          where: { [Op.or]: whereClause }
        });

        if (!linkedUser && email) {
          try {
            linkedUser = await User.create({
              id: Date.now().toString(),
              name: assocName || "Business Associate",
              email,
              mobile: mobile || "",
              role: "Business Associate",
              status: "Active",
            });
          } catch (err) {
            console.warn("User auto-creation skipped:", err);
          }
        }
      }

      associate = await Associate.create({
        id: Date.now().toString(),
        user: linkedUser ? linkedUser.id : (userId || Date.now().toString()),
        name: assocName,
        contactPerson: assocName,
        email: email || "",
        mobile: mobile || "",
        alternateMobile: alternateMobile || "",
        territory: assocTerritory || "General",
        city: city || "",
        state: state || "",
        pincode: pincode || "",
        address: address || "",
        businessAddress: businessAddress || "",
        businessName: businessName || "",
        businessType: businessType || "",
        bankAccountNumber: bankAccountNumber || "",
        ifscCode: ifscCode || "",
        accountHolderName: accountHolderName || "",
        referralCode: referralCode || `BA-${Math.floor(100000 + Math.random() * 900000)}`,
        termsAccepted: termsAccepted !== undefined ? termsAccepted : true,
        profilePhotoUrl: profilePhotoUrl || "",
        cancelledChequeUrl: cancelledChequeUrl || "",
        assignedManager: assignedManager || "Manager",
        payoutTerms: payoutTerms || "Standard Commission",
        gstin: gstin || "",
        pan: pan || "",
        agreementStartDate: agreementStartDate || "",
        agreementEndDate: agreementEndDate || "",
        agreementUrl: agreementUrl || "",
        kycDocUrl: kycDocUrl || "",
        status: status || "active",
        reportingDiscipline: 100,
        complaintRatio: 0,
        clientFeedback: 100,
        riskScore: 0,
        exitRisk: "Low"
      });
    } else {
      if (assocName !== undefined) (associate as any).name = assocName;
      if (assocName !== undefined) (associate as any).contactPerson = assocName;
      if (email !== undefined) (associate as any).email = email;
      if (mobile !== undefined) (associate as any).mobile = mobile;
      if (alternateMobile !== undefined) (associate as any).alternateMobile = alternateMobile;
      if (assocTerritory !== undefined) (associate as any).territory = assocTerritory;
      if (city !== undefined) (associate as any).city = city;
      if (state !== undefined) (associate as any).state = state;
      if (pincode !== undefined) (associate as any).pincode = pincode;
      if (address !== undefined) (associate as any).address = address;
      if (businessAddress !== undefined) (associate as any).businessAddress = businessAddress;
      if (businessName !== undefined) (associate as any).businessName = businessName;
      if (businessType !== undefined) (associate as any).businessType = businessType;
      if (bankAccountNumber !== undefined) (associate as any).bankAccountNumber = bankAccountNumber;
      if (ifscCode !== undefined) (associate as any).ifscCode = ifscCode;
      if (accountHolderName !== undefined) (associate as any).accountHolderName = accountHolderName;
      if (referralCode !== undefined) (associate as any).referralCode = referralCode;
      if (termsAccepted !== undefined) (associate as any).termsAccepted = termsAccepted;
      if (profilePhotoUrl !== undefined) (associate as any).profilePhotoUrl = profilePhotoUrl;
      if (cancelledChequeUrl !== undefined) (associate as any).cancelledChequeUrl = cancelledChequeUrl;
      if (assignedManager !== undefined) (associate as any).assignedManager = assignedManager;
      if (leadsGenerated !== undefined) (associate as any).leadsGenerated = leadsGenerated;
      if (conversionRate !== undefined) (associate as any).conversionRate = conversionRate;
      if (payoutTerms !== undefined) (associate as any).payoutTerms = payoutTerms;
      if (gstin !== undefined) (associate as any).gstin = gstin;
      if (pan !== undefined) (associate as any).pan = pan;
      if (agreementStartDate !== undefined) (associate as any).agreementStartDate = agreementStartDate;
      if (agreementEndDate !== undefined) (associate as any).agreementEndDate = agreementEndDate;
      if (agreementUrl !== undefined) (associate as any).agreementUrl = agreementUrl;
      if (kycDocUrl !== undefined) (associate as any).kycDocUrl = kycDocUrl;
      if (reportingDiscipline !== undefined) (associate as any).reportingDiscipline = reportingDiscipline;
      if (complaintRatio !== undefined) (associate as any).complaintRatio = complaintRatio;
      if (clientFeedback !== undefined) (associate as any).clientFeedback = clientFeedback;
      if (riskScore !== undefined) (associate as any).riskScore = riskScore;
      if (exitRisk !== undefined) (associate as any).exitRisk = exitRisk;
      if (flags !== undefined) (associate as any).flags = flags;
      if (status !== undefined) (associate as any).status = status;

      await associate.save();
    }

    // Audit log entry
    await logAudit({
      userId: (session.user as any).id,
      action: "REGISTER_ASSOCIATE_PROFILE",
      entity: "Associate",
      entityId: (associate as any).id,
      details: `Registered/Updated Associate profile for: ${assocName || userId} in territory: ${assocTerritory || 'General'}.`,
    });

    return NextResponse.json({ success: true, data: associate });
  } catch (error: any) {
    console.error("POST Associate Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
