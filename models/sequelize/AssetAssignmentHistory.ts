import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AssetAssignmentHistory extends Model<any, any> {
  [key: string]: any;
}

AssetAssignmentHistory.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    assetId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fromUserId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fromUserName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    toUserId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    toUserName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    handoverDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    performedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "asset_assignment_history",
    timestamps: true,
  }
);

export default AssetAssignmentHistory;
