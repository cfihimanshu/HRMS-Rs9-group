import { DataTypes, Model } from "sequelize";
import sequelize from "@/lib/sequelize";

class NbfcFollowup extends Model<any, any> {
  [key: string]: any;
}

NbfcFollowup.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nbfcId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    nbfcName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nbfcCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callDate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    callStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Connected",
    },
    nextFollowUpDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    conversationDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attachmentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "NbfcFollowup",
    tableName: "nbfc_followups",
    timestamps: true,
  }
);

export default NbfcFollowup;
