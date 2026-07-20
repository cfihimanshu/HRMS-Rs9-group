import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalSecurity extends Model<any, any> { [key: string]: any; }

LegalSecurity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    billNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    billAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    nbfcId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nbfcName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentDays: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Due",
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receivedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    receivedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_securities",
    timestamps: true,
  }
);

export default LegalSecurity;
