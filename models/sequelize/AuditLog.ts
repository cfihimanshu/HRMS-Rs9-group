import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AuditLog extends Model<any, any> { [key: string]: any; }

AuditLog.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
  },
  {
    sequelize,
    tableName: "auditlogs",
    timestamps: true,
  }
);

export default AuditLog;
