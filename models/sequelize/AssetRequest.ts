import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AssetRequest extends Model<any, any> { [key: string]: any; }

AssetRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING, // id
      allowNull: false,
    },
    asset_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.STRING, // Low, Medium, High
      allowNull: false,
      defaultValue: "Medium",
    },
    status: {
      type: DataTypes.STRING, // Pending, Approved, Rejected, Dispatched
      allowNull: false,
      defaultValue: "Pending",
    },
    admin_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "asset_requests",
    timestamps: true,
  }
);

export default AssetRequest;
