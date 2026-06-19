import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Training extends Model<any, any> { [key: string]: any; }

Training.init(
  {
    mongo_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    candidate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trainer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assessments: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    recommendation: {
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
    tableName: "trainings",
    timestamps: true,
  }
);

export default Training;
