import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Role extends Model<any, any> { [key: string]: any; }

Role.init(
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
    companies: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
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
