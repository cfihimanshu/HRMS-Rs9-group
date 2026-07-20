import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class ProjectMaster extends Model<any, any> {
  [key: string]: any;
}

ProjectMaster.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: "project_masters",
    timestamps: true,
  }
);

export default ProjectMaster;
