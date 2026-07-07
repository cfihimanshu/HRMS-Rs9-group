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
      defaultValue: "Open", // Open, In Progress, Closed
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
  }
);

export default LegalRecoveryMaster;
