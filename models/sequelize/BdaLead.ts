import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class BdaLead extends Model<any, any> {
  [key: string]: any;
}

BdaLead.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    leadId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Excel Import",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "New", // New, Assigned, In Progress, Qualified, Converted, Lost
    },
    salesReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING, // User ID of assigned BDA
      allowNull: true,
    },
    assignedToName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedBy: {
      type: DataTypes.STRING, // User ID of assigning Manager / Owner
      allowNull: true,
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawExtraJson: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    convertedServicesJson: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    convertedAmount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    lostReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attachmentsJson: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "bda_leads",
    timestamps: true,
    indexes: [
      { fields: ["assignedTo"] },
      { fields: ["status"] },
      { fields: ["leadId"] },
    ],
  }
);

export default BdaLead;
