import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalExpense extends Model<any, any> { [key: string]: any; }

LegalExpense.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    masterId: {
      type: DataTypes.INTEGER, // Link to LegalRecoveryMaster
      allowNull: false,
    },
    expenseType: {
      type: DataTypes.STRING, // e.g. Court Fee, Travel, Advocate Fee, Seizure Cost
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    dateIncurred: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    spentByUserId: {
      type: DataTypes.STRING, // Employee who made the expense
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    receiptUrl: {
      type: DataTypes.STRING, // Uploaded bill/receipt
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING, // Pending Approval, Approved, Rejected
      allowNull: true,
      defaultValue: "Pending Approval",
    }
  },
  {
    sequelize,
    tableName: "legal_expenses",
    timestamps: true,
  }
);

export default LegalExpense;
