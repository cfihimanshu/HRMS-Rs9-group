import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LeadPlatform extends Model<any, any> { [key: string]: any; }

LeadPlatform.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tableName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "lead_platforms",
    timestamps: true,
  }
);

export default LeadPlatform;
