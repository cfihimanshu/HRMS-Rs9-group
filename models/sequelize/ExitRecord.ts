import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class ExitRecord extends Model<any, any> { [key: string]: any; }

ExitRecord.init(
  {
    
    mongo_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    exitReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assetsReturned: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    accessRevoked: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    ndaReminder: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    dataAudit: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    clientTransfer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    postExitWatch: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    finalSettlementStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    exitInterviewNotes: {
      type: DataTypes.STRING,
      allowNull: true,
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
    tableName: "exitrecords",
    timestamps: true,
  }
);

export default ExitRecord;
