import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class DisciplinaryWarning extends Model<any, any> { [key: string]: any; }

DisciplinaryWarning.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    warningLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Pending Approval",
    },
    issuedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    improvementPeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    improvementPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pipPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    salaryHold: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    promotionHold: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    bonusHold: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    hrApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    deptHeadApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    directorApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    terminationLetterUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    terminatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "disciplinary_warnings",
    timestamps: true,
  }
);

export default DisciplinaryWarning;
