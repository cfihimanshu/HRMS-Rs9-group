import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class MonthlyWorkReportDelivery extends Model<any, any> { [key: string]: any; }

MonthlyWorkReportDelivery.init({
  id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  reportMonth: { type: DataTypes.STRING, allowNull: false },
  recipientId: { type: DataTypes.STRING, allowNull: false },
  recipientEmail: { type: DataTypes.STRING, allowNull: true },
  reportType: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  errorMessage: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize,
  tableName: "monthly_work_report_deliveries",
  timestamps: true,
  indexes: [
    { name: "idx_monthly_report_month", fields: ["reportMonth"] },
    { name: "uq_monthly_report_delivery", unique: true, fields: ["reportMonth", "recipientId", "reportType"] },
  ],
});

export default MonthlyWorkReportDelivery;
