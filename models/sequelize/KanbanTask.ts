import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class KanbanTask extends Model<any, any> { [key: string]: any; }

KanbanTask.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Medium", // High, Medium, Low
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "To Do", // Backlog, To Do, In Progress, Review, Completed, Closed
    },
    department_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assigned_by: {
      type: DataTypes.STRING, // mongo_id or employee id
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.STRING, // mongo_id or employee id
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimated_hours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    actual_hours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    attachments_json: {
      type: DataTypes.JSON, // For file URLs
      allowNull: true,
    },
    comments_json: {
      type: DataTypes.JSON, // For quick comment storage
      allowNull: true,
    },
    activity_log_json: {
      type: DataTypes.JSON, // Tracking status changes
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
    tableName: "kanban_tasks",
    timestamps: true,
  }
);

export default KanbanTask;
