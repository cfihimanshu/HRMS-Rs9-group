import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Associate extends Model<any, any> { [key: string]: any; }

Associate.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alternateMobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    businessAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    territory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    businessType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountHolderName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referralCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    termsAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    profilePhotoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancelledChequeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedManager: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    leadsGenerated: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    conversionRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    payoutTerms: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reportingDiscipline: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    complaintRatio: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    clientFeedback: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    riskScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    exitRisk: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gstin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementStartDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementEndDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    kycDocUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "associates",
    timestamps: true,
  }
);

let associateColsChecked = false;

export async function ensureAssociateSchema() {
  if (associateColsChecked) return;
  try {
    const [cols]: any[] = await sequelize.query("SHOW COLUMNS FROM associates").catch(() => [[]]);
    if (Array.isArray(cols) && cols.length > 0) {
      const existingCols = cols.map((c: any) => (c.Field || c.field || "").toLowerCase());
      const neededCols = [
        { name: "name", type: "VARCHAR(255)" },
        { name: "contactPerson", type: "VARCHAR(255)" },
        { name: "email", type: "VARCHAR(255)" },
        { name: "mobile", type: "VARCHAR(255)" },
        { name: "alternateMobile", type: "VARCHAR(255)" },
        { name: "address", type: "TEXT" },
        { name: "businessAddress", type: "TEXT" },
        { name: "city", type: "VARCHAR(255)" },
        { name: "pincode", type: "VARCHAR(255)" },
        { name: "state", type: "VARCHAR(255)" },
        { name: "businessName", type: "VARCHAR(255)" },
        { name: "businessType", type: "VARCHAR(255)" },
        { name: "bankAccountNumber", type: "VARCHAR(255)" },
        { name: "ifscCode", type: "VARCHAR(255)" },
        { name: "accountHolderName", type: "VARCHAR(255)" },
        { name: "referralCode", type: "VARCHAR(255)" },
        { name: "termsAccepted", type: "TINYINT(1)" },
        { name: "profilePhotoUrl", type: "VARCHAR(255)" },
        { name: "cancelledChequeUrl", type: "VARCHAR(255)" },
        { name: "assignedManager", type: "VARCHAR(255)" },
        { name: "gstin", type: "VARCHAR(255)" },
        { name: "pan", type: "VARCHAR(255)" },
        { name: "agreementStartDate", type: "VARCHAR(255)" },
        { name: "agreementEndDate", type: "VARCHAR(255)" },
        { name: "agreementUrl", type: "VARCHAR(255)" },
        { name: "kycDocUrl", type: "VARCHAR(255)" }
      ];

      for (const col of neededCols) {
        if (!existingCols.includes(col.name.toLowerCase())) {
          await sequelize.query(`ALTER TABLE associates ADD COLUMN \`${col.name}\` ${col.type} NULL`).catch(() => {});
        }
      }
      associateColsChecked = true;
    }
  } catch (err) {
    console.warn("[ASSOCIATE SCHEMA] Warning:", err);
  }
}

export default Associate;
