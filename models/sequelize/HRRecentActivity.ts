import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class HRRecentActivity extends Model<any, any> { [key: string]: any; }

HRRecentActivity.init(
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
    action: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
  },
  {
    sequelize,
    tableName: "hrrecentactivitys",
    timestamps: true,
  }
);

export default HRRecentActivity;
