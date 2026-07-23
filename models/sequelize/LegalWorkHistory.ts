import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalWorkHistory extends Model<any, any> { [key: string]: any; }

LegalWorkHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    masterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subCategory: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attachmentUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    workDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "legal_work_history",
    timestamps: true,
  }
);

export default LegalWorkHistory;
