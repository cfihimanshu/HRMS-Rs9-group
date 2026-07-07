import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalNotice extends Model<any, any> { [key: string]: any; }

LegalNotice.init(
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
    noticeType: {
      type: DataTypes.STRING, // e.g. Demand Notice, Sec 138, Sec 25
      allowNull: false,
    },
    noticeDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    advocateId: {
      type: DataTypes.INTEGER, // Link to LegalAdvocateMaster
      allowNull: true,
    },
    dispatchMode: {
      type: DataTypes.STRING, // Speed Post, Registered AD, Email
      allowNull: true,
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deliveryStatus: {
      type: DataTypes.STRING, // Dispatched, Delivered, RTO
      allowNull: true,
      defaultValue: "Pending",
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documentUrl: {
      type: DataTypes.STRING, // URL of the softcopy of the notice
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: "legal_notices",
    timestamps: true,
  }
);

export default LegalNotice;
