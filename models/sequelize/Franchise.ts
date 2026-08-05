import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Franchise extends Model {
  declare id: string;
  declare user: string;
  declare territory: string;
  declare agreementUrl: string;
  declare revenueSharing: string;
  declare leadsGenerated: number;
  declare reportsSubmitted: number;
  declare brandingCompliance: string;
  declare territoryRisk: string;
  declare complaintsCount: number;
  declare escalationsCount: number;
  declare status: string;
}

Franchise.init(
  {
    
    id: {
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
    agreementUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    revenueSharing: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    leadsGenerated: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    reportsSubmitted: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    brandingCompliance: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    territoryRisk: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    complaintsCount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    escalationsCount: {
      type: DataTypes.FLOAT,
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
    tableName: "franchises",
    timestamps: true,
  }
);

export default Franchise;
