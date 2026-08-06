import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class DomainRecord extends Model<any, any> { [key: string]: any; }

DomainRecord.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  recordType: {
    type: DataTypes.ENUM("Domain Record", "Cloud Platform", "Gmail", "GitHub Repo"),
    allowNull: false,
    defaultValue: "Domain Record"
  },
  name: { type: DataTypes.STRING, allowNull: false }, // Domain Name / Cloud Server Name / Email / Repo Name
  platform: { type: DataTypes.STRING, allowNull: true }, // GoDaddy / AWS / Google Workspace / GitHub
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "In Use" // Available, In Use, Transferred, Archived, Suspended
  },
  purchaseDate: { type: DataTypes.DATEONLY, allowNull: true },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
  renewalDate: { type: DataTypes.DATEONLY, allowNull: true },
  attachedEmail: { type: DataTypes.STRING, allowNull: true },
  userId: { type: DataTypes.STRING, allowNull: true }, // User ID / IAM User / Assigned Staff / Lead Dev
  password: { type: DataTypes.STRING, allowNull: true },
  authCode: { type: DataTypes.TEXT, allowNull: true }, // EPP Auth Code / 2FA / SSH Key / Access Token
  phoneNumber: { type: DataTypes.STRING, allowNull: true },
  cost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  url: { type: DataTypes.STRING, allowNull: true }, // Access URL / Repo Link
  remarks: { type: DataTypes.TEXT, allowNull: true },
  customFields: { type: DataTypes.TEXT, allowNull: true },
  createdById: { type: DataTypes.STRING, allowNull: false },
  createdByName: { type: DataTypes.STRING, allowNull: false }
}, {
  sequelize,
  tableName: "domain_records",
  timestamps: true,
  indexes: [
    { fields: ["recordType"] },
    { fields: ["name"] },
    { fields: ["status"] },
    { fields: ["attachedEmail"] }
  ]
});

export default DomainRecord;
