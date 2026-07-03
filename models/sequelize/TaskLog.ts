import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class TaskLog extends Model<any, any> { [key: string]: any; }

TaskLog.init(
  {
    
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    taskTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    progressNotes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    forwardedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    timerStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    timerState: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Stopped",
    },
    elapsedSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "tasklogs",
    timestamps: true,
  }
);

export default TaskLog;
