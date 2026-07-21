import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalSecurityPayment extends Model<any, any> { [key: string]: any; }

LegalSecurityPayment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    securityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nbfcName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paymentMode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proofUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    receivedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_security_payments",
    timestamps: true,
    indexes: [{ fields: ["securityId"] }],
  }
);

export default LegalSecurityPayment;
