import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Vendor extends Model {
  declare id: string;
  declare user: string;
  declare category: string;
  declare agreementUrl: string;
  declare serviceType: string;
  declare paymentTerms: string;
  declare riskCategory: string;
  declare performanceScore: number;
  declare complaintsCount: number;
  declare renewalDate: Date;
  declare status: string;
}

Vendor.init(
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
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentTerms: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    riskCategory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    performanceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    complaintsCount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    renewalDate: {
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
    tableName: "vendors",
    timestamps: true,
  }
);

export default Vendor;
