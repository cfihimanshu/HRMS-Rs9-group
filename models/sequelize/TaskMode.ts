import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class TaskMode extends Model<any, any> {
  [key: string]: any;
}

TaskMode.init(
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
    tableName: "task_modes",
    timestamps: true,
  }
);

export default TaskMode;
