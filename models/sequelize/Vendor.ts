import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Vendor extends Model {
  public mongo_id!: string;
  public user!: string;
  public category!: string;
  public agreementUrl!: string;
  public serviceType!: string;
  public paymentTerms!: string;
  public riskCategory!: string;
  public performanceScore!: number;
  public complaintsCount!: number;
  public renewalDate!: Date;
  public status!: string;
}

Vendor.init(
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
