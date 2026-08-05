import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Company extends Model {
  declare id: string;
  declare name: string;
  declare code: string;
  declare address: string;
  declare status: string;
}

Company.init(
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
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
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
    tableName: "companys",
    timestamps: true,
  }
);

export default Company;
