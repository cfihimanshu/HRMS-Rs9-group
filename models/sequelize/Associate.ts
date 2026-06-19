import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Associate extends Model<any, any> { [key: string]: any; }

Associate.init(
  {
    
    mongo_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    territory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    leadsGenerated: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    conversionRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    payoutTerms: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reportingDiscipline: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    complaintRatio: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    clientFeedback: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    riskScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    exitRisk: {
      type: DataTypes.STRING,
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
    tableName: "associates",
    timestamps: true,
  }
);

export default Associate;
