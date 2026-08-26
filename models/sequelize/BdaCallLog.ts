import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class BdaCallLog extends Model<any, any> {
  [key: string]: any;
}

BdaCallLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    leadId: { type: DataTypes.INTEGER, allowNull: false },
    leadCode: { type: DataTypes.STRING, allowNull: true },
    bdaUserId: { type: DataTypes.STRING, allowNull: false },
    bdaName: { type: DataTypes.STRING, allowNull: true },
    callDateTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    callType: { type: DataTypes.STRING, allowNull: false, defaultValue: "Outgoing" },
    callStatus: { type: DataTypes.STRING, allowNull: false },
    durationSeconds: { type: DataTypes.INTEGER, allowNull: true },
    conversationNotes: { type: DataTypes.TEXT, allowNull: false },
    customerInterest: { type: DataTypes.STRING, allowNull: true },
    leadStatus: { type: DataTypes.STRING, allowNull: true },
    nextCallbackAt: { type: DataTypes.DATE, allowNull: true },
    forwardedTo: { type: DataTypes.STRING, allowNull: true },
    recordingUrl: { type: DataTypes.TEXT("long"), allowNull: true },
    proofUrl: { type: DataTypes.TEXT("long"), allowNull: true },
  },
  {
    sequelize,
    tableName: "bda_call_logs",
    timestamps: true,
    indexes: [
      { fields: ["leadId"] },
      { fields: ["bdaUserId"] },
      { fields: ["callDateTime"] },
      { fields: ["nextCallbackAt"] },
    ],
  }
);

export default BdaCallLog;
