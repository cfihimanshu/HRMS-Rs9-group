import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class TaskCallCategory extends Model<any, any> {
  [key: string]: any;
}

TaskCallCategory.init(
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
    tableName: "task_call_categories",
    timestamps: true,
  }
);

export default TaskCallCategory;
