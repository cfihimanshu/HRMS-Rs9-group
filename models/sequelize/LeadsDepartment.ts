import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LeadsDepartment extends Model<any, any> { [key: string]: any; }

LeadsDepartment.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: "leads_departments",
    timestamps: true,
  }
);

export default LeadsDepartment;
