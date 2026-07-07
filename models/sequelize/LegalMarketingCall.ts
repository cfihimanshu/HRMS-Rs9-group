import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalMarketingCall extends Model<any, any> { [key: string]: any; }

LegalMarketingCall.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    branchCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    callerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callRecordingUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Marketing',
    },
    callStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    conversationDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nextFollowUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    callDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "legal_marketing_calls",
    timestamps: true,
  }
);

export default LegalMarketingCall;
