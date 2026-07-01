import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Department extends Model {
  public id!: string;
  public name!: string;
  public company!: string;
  public status!: string;
}

Department.init(
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
    company: {
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
    tableName: "departments",
    timestamps: true,
  }
);

export default Department;
