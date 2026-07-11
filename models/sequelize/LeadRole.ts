import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LeadRole extends Model<any, any> { [key: string]: any; }

LeadRole.init(
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
    department: {
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
    tableName: "leads_roles",
    timestamps: true,
  }
);

export default LeadRole;
