import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Vendor extends Model {
  declare id: string;
  declare vendorCode: string;
  declare vendorName: string;
  declare shopName: string;
  declare location: string;
  declare contact: string;
  declare mobile: string;
  declare email: string;
  declare category: string;
  declare serviceType: string;
  declare agreementUrl: string;
  declare status: string;
}

Vendor.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    vendorCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vendorName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shopName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agreementUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "active",
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
    modelName: "Vendor",
    tableName: "vendors",
    timestamps: true,
  }
);

export default Vendor;
