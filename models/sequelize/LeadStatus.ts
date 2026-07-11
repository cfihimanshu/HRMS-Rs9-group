import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LeadStatus extends Model<any, any> { [key: string]: any; }

LeadStatus.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "leads_statuses",
    timestamps: true,
  }
);

export default LeadStatus;
