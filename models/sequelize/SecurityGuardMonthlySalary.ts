import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class SecurityGuardMonthlySalary extends Model<any, any> { [key: string]: any; }

SecurityGuardMonthlySalary.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  securityId: { type: DataTypes.INTEGER, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  guardId: { type: DataTypes.INTEGER, allowNull: false },
  guardName: { type: DataTypes.STRING, allowNull: false },
  nbfcName: { type: DataTypes.STRING, allowNull: true },
  siteName: { type: DataTypes.STRING, allowNull: true },
  salaryMonth: { type: DataTypes.STRING, allowNull: false },
  monthlySalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  savedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  tableName: "security_guard_monthly_salaries",
  timestamps: true,
  indexes: [
    { name: "idx_guard_monthly_salary_month", fields: ["salaryMonth"] },
    { unique: true, name: "uq_guard_monthly_salary_project", fields: ["securityId", "projectId", "guardId", "salaryMonth"] },
  ],
});

export default SecurityGuardMonthlySalary;
