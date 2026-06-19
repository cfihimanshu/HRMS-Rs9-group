import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Role extends Model<any, any> { [key: string]: any; }

Role.init(
  {
    
    mongo_id: {
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
    tableName: "roles",
    timestamps: true,
  }
);

export default Role;
