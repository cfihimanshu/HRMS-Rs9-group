import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalRecoverySchedule extends Model<any, any> {
  [key: string]: any;
}

LegalRecoverySchedule.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sodId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    workSection: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "General",
    },
    subType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Pending",
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aoName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rboName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    caseDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    otherType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    taskId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proofAttachment: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_recovery_schedules",
    timestamps: true,
    indexes: [
      { fields: ["employeeId"] },
      { fields: ["date"] },
      { fields: ["sodId"] },
    ],
  }
);

export default LegalRecoverySchedule;
