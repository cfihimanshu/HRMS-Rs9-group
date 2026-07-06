import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AssetPurchaseRequest extends Model<any, any> { [key: string]: any; }

AssetPurchaseRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    requested_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    asset_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    asset_detail: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    estimated_cost: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vendor_details: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    justification: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    company_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Pending Owner Approval",
    },
    owner_remarks: {
      type: DataTypes.TEXT,
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
    tableName: "asset_purchase_requests",
    timestamps: true,
  }
);

export default AssetPurchaseRequest;
