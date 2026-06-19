import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Company extends Model {
  public mongo_id!: string;
  public name!: string;
  public code!: string;
  public address!: string;
  public status!: string;
}

Company.init(
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
