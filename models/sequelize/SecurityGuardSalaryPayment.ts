import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class SecurityGuardSalaryPayment extends Model<any, any> { [key: string]: any; }

SecurityGuardSalaryPayment.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  securityId: { type: DataTypes.INTEGER, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  guardId: { type: DataTypes.INTEGER, allowNull: false },
  guardName: { type: DataTypes.STRING, allowNull: false },
  nbfcName: { type: DataTypes.STRING, allowNull: true },
  siteName: { type: DataTypes.STRING, allowNull: true },
  salaryMonth: { type: DataTypes.STRING, allowNull: false },
  payableAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  paidAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
  paymentMode: { type: DataTypes.STRING, allowNull: true },
  transactionId: { type: DataTypes.STRING, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  paidBy: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  tableName: "security_guard_salary_payments",
  timestamps: true,
  indexes: [
    { name: "idx_guard_salary_payment_month", fields: ["salaryMonth"] },
    { name: "idx_guard_salary_payment_assignment", fields: ["securityId", "guardId", "salaryMonth"] },
  ],
});

export default SecurityGuardSalaryPayment;
