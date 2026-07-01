import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class FranchiseRegistration extends Model<any, any> { [key: string]: any; }

FranchiseRegistration.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    registeredBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    partnerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    territory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brandProject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    revenueShare: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reportingPerson: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    riskLevel: {
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
    tableName: "franchiseregistrations",
    timestamps: true,
  }
);

export default FranchiseRegistration;
