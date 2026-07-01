import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Franchise extends Model {
  public id!: string;
  public user!: string;
  public territory!: string;
  public agreementUrl!: string;
  public revenueSharing!: string;
  public leadsGenerated!: number;
  public reportsSubmitted!: number;
  public brandingCompliance!: string;
  public territoryRisk!: string;
  public complaintsCount!: number;
  public escalationsCount!: number;
  public status!: string;
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
