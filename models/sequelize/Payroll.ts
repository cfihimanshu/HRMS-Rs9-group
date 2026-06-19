import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Payroll extends Model<any, any> { [key: string]: any; }

Payroll.init(
  {
    
    mongo_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    month: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    year: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    basicPay: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    hra: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    conveyance: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    specialAllowance: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    bonus: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    totalEarnings: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    pfDeduction: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    esiDeduction: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    ptDeduction: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    tdsDeduction: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    lossOfPay: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    totalDeductions: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    netPay: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    transactionRef: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "payrolls",
    timestamps: true,
  }
);

export default Payroll;
