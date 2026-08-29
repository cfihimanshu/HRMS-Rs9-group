import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalRecoveryBill extends Model<any, any> { [key: string]: any; }

LegalRecoveryBill.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  masterId: { type: DataTypes.INTEGER, allowNull: false },
  companyId: { type: DataTypes.STRING, allowNull: false },
  companyCode: { type: DataTypes.STRING, allowNull: false },
  bankId: { type: DataTypes.INTEGER, allowNull: false },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  invoiceNo: { type: DataTypes.STRING, allowNull: false },
  billDate: { type: DataTypes.DATEONLY, allowNull: false },
  billAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  paymentReceivedDate: { type: DataTypes.DATEONLY, allowNull: true },
  receivedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  tdsAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  tdsPercent: { type: DataTypes.DECIMAL(7, 3), allowNull: false, defaultValue: 0 },
  dueAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  remark: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Pending" },
  revenueType: { type: DataTypes.STRING, allowNull: true },
  revenueAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  internalRemark: { type: DataTypes.TEXT, allowNull: true },
  assignedTo: { type: DataTypes.STRING, allowNull: true },
  importBatchId: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  tableName: "legal_recovery_bills",
  timestamps: true,
  indexes: [
    { unique: true, name: "uq_legal_bill_company_invoice", fields: ["companyId", "invoiceNo"] },
    { name: "idx_legal_bill_master_status", fields: ["masterId", "status"] },
    { name: "idx_legal_bill_company_due", fields: ["companyId", "dueAmount"] },
  ],
});

export default LegalRecoveryBill;
