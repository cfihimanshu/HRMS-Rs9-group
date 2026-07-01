import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Interview extends Model<any, any> { [key: string]: any; }

Interview.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    candidate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    round: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    scheduleTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    videoLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vacancyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    interviewer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    communicationScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    skillScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    behaviourScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    stabilityScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    riskScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    question: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
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
    tableName: "interviews",
    timestamps: true,
  }
);

export default Interview;
