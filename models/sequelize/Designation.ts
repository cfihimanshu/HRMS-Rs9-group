import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";
import Department from "./Department";

class Designation extends Model<any, any> { [key: string]: any; }

Designation.init(
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
    department_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    level: {
      type: DataTypes.STRING, // e.g., L1, L2, Manager, Executive
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    tableName: "designations",
    timestamps: true,
  }
);

// We define simple associations if needed, or rely on manual joins
// Department.hasMany(Designation, { foreignKey: 'department_id', as: 'designations' });
// Designation.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

export default Designation;
