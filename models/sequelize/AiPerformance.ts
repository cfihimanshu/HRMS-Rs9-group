import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AiPerformance extends Model<any, any> { [key: string]: any; }

AiPerformance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING, // id
      allowNull: false,
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    performance_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    strengths_json: {
      type: DataTypes.JSON, // Array of strings
      allowNull: true,
    },
    improvements_json: {
      type: DataTypes.JSON, // Array of strings
      allowNull: true,
    },
    recommendations_json: {
      type: DataTypes.JSON, // Array of strings
      allowNull: true,
    },
    raw_ai_response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attendance_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    task_completion_rate: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    average_delay_days: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    productivity_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "ai_performances",
    timestamps: true,
  }
);

export default AiPerformance;
