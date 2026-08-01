import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class ExitForm extends Model<any, any> { [key: string]: any; }

ExitForm.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    submittedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    exitReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resignationDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    handoverTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assetReturn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    accessRevoke: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    handover: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    finalSettlement: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    dataAudit: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    clientTransfer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    ndaReminder: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    postExitWatch: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    finalSettlementStatus: {
      type: DataTypes.STRING, // "Pending Audit" | "On Hold" | "Completed & Paid"
      defaultValue: "Pending Audit",
      allowNull: true,
    },
    exitFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    postExitRisk: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Multi-Stage Workflow Fields
    approvalStage: {
      type: DataTypes.STRING,
      defaultValue: "Pending Manager",
      allowNull: true,
    },
    exitType: {
      type: DataTypes.STRING, // "Direct Exit" | "Notice Period"
      allowNull: true,
    },
    noticePeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastWorkingDay: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    managerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    managerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    managerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    managerApprovalStatus: {
      type: DataTypes.STRING, // "Pending" | "Approved" | "Rejected"
      defaultValue: "Pending",
      allowNull: true,
    },
    managerRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    managerApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ownerApprovalStatus: {
      type: DataTypes.STRING, // "Pending" | "Approved" | "Rejected"
      defaultValue: "Pending",
      allowNull: true,
    },
    ownerRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ownerApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hrApprovalStatus: {
      type: DataTypes.STRING, // "Pending" | "Approved" | "Rejected"
      defaultValue: "Pending",
      allowNull: true,
    },
    hrRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hrApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
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
    tableName: "exitforms",
    timestamps: true,
  }
);

export default ExitForm;
