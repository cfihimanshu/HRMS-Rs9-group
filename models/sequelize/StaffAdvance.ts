import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class StaffAdvance extends Model<any, any> { [key: string]: any; }

StaffAdvance.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  employeeId: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  issuedDate: { type: DataTypes.DATEONLY, allowNull: false },
  monthlyRecovery: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  recoveredAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  paymentMode: { type: DataTypes.STRING, allowNull: true },
  transactionRef: { type: DataTypes.STRING, allowNull: true },
  proofUrl: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Active" },
  createdBy: { type: DataTypes.STRING, allowNull: true },
}, { sequelize, tableName: "staff_advances", timestamps: true, indexes: [{ fields: ["employeeId"] }, { fields: ["issuedDate"] }] });

export default StaffAdvance;
