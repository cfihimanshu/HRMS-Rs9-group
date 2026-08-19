import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class FranchiseRegistration extends Model<any, any> { [key: string]: any; }

FranchiseRegistration.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    registeredBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    partnerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    territory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brandProject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    revenueShare: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reportingPerson: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    riskLevel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contactPerson: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    alternateMobile: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    pincode: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    franchiseFee: { type: DataTypes.STRING, allowNull: true },
    agreementStartDate: { type: DataTypes.STRING, allowNull: true },
    agreementEndDate: { type: DataTypes.STRING, allowNull: true },
    gstin: { type: DataTypes.STRING, allowNull: true },
    pan: { type: DataTypes.STRING, allowNull: true },
    kycDocUrl: { type: DataTypes.STRING, allowNull: true },
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
    tableName: "franchiseregistrations",
    timestamps: true,
  }
);

let franchiseColsChecked = false;

export async function ensureFranchiseRegistrationSchema() {
  if (franchiseColsChecked) return;
  try {
    const [cols]: any[] = await sequelize.query("SHOW COLUMNS FROM franchiseregistrations").catch(() => [[]]);
    if (Array.isArray(cols) && cols.length > 0) {
      const existingCols = cols.map((c: any) => (c.Field || c.field || "").toLowerCase());
      const neededCols = [
        { name: "contactPerson", type: "VARCHAR(255)" },
        { name: "email", type: "VARCHAR(255)" },
        { name: "mobile", type: "VARCHAR(255)" },
        { name: "alternateMobile", type: "VARCHAR(255)" },
        { name: "address", type: "TEXT" },
        { name: "pincode", type: "VARCHAR(255)" },
        { name: "state", type: "VARCHAR(255)" },
        { name: "franchiseFee", type: "VARCHAR(255)" },
        { name: "agreementStartDate", type: "VARCHAR(255)" },
        { name: "agreementEndDate", type: "VARCHAR(255)" },
        { name: "gstin", type: "VARCHAR(255)" },
        { name: "pan", type: "VARCHAR(255)" },
        { name: "kycDocUrl", type: "VARCHAR(255)" }
      ];

      for (const col of neededCols) {
        if (!existingCols.includes(col.name.toLowerCase())) {
          await sequelize.query(`ALTER TABLE franchiseregistrations ADD COLUMN \`${col.name}\` ${col.type} NULL`).catch(() => {});
          console.log(`[FRANCHISE REGISTRATION SCHEMA] Dynamically added column ${col.name}`);
        }
      }
      franchiseColsChecked = true;
    }
  } catch (err) {
    console.warn("[FRANCHISE REGISTRATION SCHEMA] Warning:", err);
  }
}

export default FranchiseRegistration;
