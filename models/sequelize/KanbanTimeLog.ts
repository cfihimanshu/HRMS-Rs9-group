import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";
import KanbanTask from "./KanbanTask";

class KanbanTimeLog extends Model<any, any> { [key: string]: any; }

KanbanTimeLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: KanbanTask,
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.STRING, // mongo_id
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true, // Null when timer is running
    },
    duration_minutes: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Running", // Running, Paused, Stopped
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "kanban_time_logs",
    timestamps: true,
  }
);

KanbanTask.hasMany(KanbanTimeLog, { foreignKey: 'task_id', as: 'timeLogs' });
KanbanTimeLog.belongsTo(KanbanTask, { foreignKey: 'task_id', as: 'task' });

export default KanbanTimeLog;
