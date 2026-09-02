import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class SecurityGuardAttendance extends Model<any, any> { [key: string]: any; }

SecurityGuardAttendance.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    securityId: { type: DataTypes.INTEGER, allowNull: false },
    nbfcId: { type: DataTypes.STRING, allowNull: true },
    nbfcName: { type: DataTypes.STRING, allowNull: false },
    branchId: { type: DataTypes.STRING, allowNull: true },
    branchName: { type: DataTypes.STRING, allowNull: true },
    siteLocation: { type: DataTypes.STRING, allowNull: true },
    guardId: { type: DataTypes.INTEGER, allowNull: false },
    guardName: { type: DataTypes.STRING, allowNull: false },
    guardPhone: { type: DataTypes.STRING, allowNull: true },
    replacementGuardId: { type: DataTypes.INTEGER, allowNull: true },
    replacementGuardName: { type: DataTypes.STRING, allowNull: true },
    attendanceDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Present" },
    payableUnits: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1 },
    perDayRate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    payoutAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    markedBy: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: "security_guard_attendance",
    timestamps: true,
    indexes: [
      { unique: true, name: "uq_security_guard_attendance", fields: ["securityId", "guardId", "attendanceDate"] },
      { name: "idx_security_guard_attendance_month", fields: ["attendanceDate"] },
    ],
  }
);

export default SecurityGuardAttendance;
