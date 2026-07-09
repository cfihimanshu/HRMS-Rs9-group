import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class SodReport extends Model<any, any> { [key: string]: any; }

SodReport.init(
  {
    
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    plan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskSummary: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callsPlanned: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    meetings: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    fieldVisits: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    target: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    selfieUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
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
    tableName: "sodreports",
    timestamps: true,
    indexes: [
      { fields: ["employee"] },
      { fields: ["date"] }
    ]
  }
);

export default SodReport;
