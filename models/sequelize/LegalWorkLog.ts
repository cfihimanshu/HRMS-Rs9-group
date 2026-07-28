import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalWorkLog extends Model<any, any> { [key: string]: any; }

LegalWorkLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    masterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subCategory: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    workLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    typeOfWork: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    businessDevOption: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    businessDevSubOption: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    noOfCount: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    allocationDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    finalRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    expenses: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    grossProfit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    followUpDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stageAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    financialDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    broughtBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    preparedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    printedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dispatchedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billAmount: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    personName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uploadedFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_work_logs",
    timestamps: true,
  }
);

export default LegalWorkLog;
