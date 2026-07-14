import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalNotice extends Model<any, any> { [key: string]: any; }

LegalNotice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    masterId: {
      type: DataTypes.INTEGER, // Optional Link to LegalRecoveryMaster
      allowNull: true,
    },
    bankId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    noticeOrderDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    noticeDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    noticeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    noticeTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    documentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    broughtBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    noOfPrint: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    printedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    noOfScan: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    scannedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    renamedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    noticeRenameBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dispatchedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    billNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    billMailedToBM: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    paymentRcvdDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    amountRcvd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    tdsDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    gstDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    expenses: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    handoverTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    handedOverBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    handoverRemarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    handoverReceiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_notices",
    timestamps: true,
    indexes: [
      { fields: ["masterId"] },
      { fields: ["bankId"] },
      { fields: ["branchId"] },
      { fields: ["noticeTypeId"] }
    ]
  }
);

export default LegalNotice;
