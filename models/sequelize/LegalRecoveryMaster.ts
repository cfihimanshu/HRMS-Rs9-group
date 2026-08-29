import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalRecoveryMaster extends Model<any, any> { [key: string]: any; }

LegalRecoveryMaster.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aoName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deptManagerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    foName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    foContact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rbo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalBillAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    pendingAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    pendingSince: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Open", // Open, In Progress, Closed, Settled
    },
    archivedAt: {
      type: DataTypes.DATE,
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
    tableName: "legal_recovery_masters",
    timestamps: true,
    indexes: [
      { name: "idx_lrm_pending_age", fields: ["pendingAmount", "pendingSince"] },
      { name: "idx_lrm_status_updated", fields: ["status", "updatedAt"] },
      { name: "idx_lrm_archived", fields: ["archivedAt"] },
      { name: "idx_lrm_bank_branch", fields: ["bankName", "branchId"] },
    ],
  }
);

export default LegalRecoveryMaster;
