import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalRecoveryPayment extends Model<any, any> { [key: string]: any; }

LegalRecoveryPayment.init(
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
    receivedBy: {
      type: DataTypes.STRING, // Employee ID/Name who logged it
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paymentMode: {
      type: DataTypes.STRING, // Cash, Cheque, NEFT/RTGS, UPI
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.STRING, // UTR or Ref number
      allowNull: true,
    },
    proofUrl: {
      type: DataTypes.STRING, // File upload link
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_recovery_payments",
    timestamps: true,
    indexes: [
      { fields: ["masterId"] }
    ]
  }
);

export default LegalRecoveryPayment;
