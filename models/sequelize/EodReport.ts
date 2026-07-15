import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class EodReport extends Model<any, any> { [key: string]: any; }

EodReport.init(
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
    completedWork: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pendingWork: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    issues: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    escalationNeeded: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    tomorrowPlan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    selfieUrl: {
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
    tableName: "eodreports",
    timestamps: true,
    indexes: [
      { fields: ["employee"] },
      { fields: ["date"] }
    ]
  }
);

export default EodReport;
