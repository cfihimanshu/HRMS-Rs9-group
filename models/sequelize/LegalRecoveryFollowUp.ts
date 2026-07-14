import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalRecoveryFollowUp extends Model<any, any> { [key: string]: any; }

LegalRecoveryFollowUp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    masterId: {
      type: DataTypes.INTEGER, // Link to LegalRecoveryMaster
      allowNull: false,
    },
    callerId: {
      type: DataTypes.STRING, // Employee ID who made the call
      allowNull: true,
    },
    callerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callStatus: {
      type: DataTypes.STRING, // Connected, Not Answered, etc.
      allowNull: true,
    },
    conversationDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    callRecordingUrl: {
      type: DataTypes.STRING, // URL of the uploaded recording
      allowNull: true,
    },
    nextFollowUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    taskId: {
      type: DataTypes.STRING, // Linked task ID from TaskLog
      allowNull: true,
    },
    callDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchName: {
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
    tableName: "legal_recovery_followups",
    timestamps: true,
    indexes: [
      { fields: ["masterId"] }
    ]
  }
);

export default LegalRecoveryFollowUp;
