import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Probation extends Model {
  get attendanceSummary() {
    return {
      totalDays: this.getDataValue('totalDays'),
      presentDays: this.getDataValue('presentDays'),
    };
  }

  set attendanceSummary(val: any) {
    this.setDataValue('totalDays', val?.totalDays);
    this.setDataValue('presentDays', val?.presentDays);
  }

  get reportsSummary() {
    return {
      sodSubmitted: this.getDataValue('sodSubmitted'),
      eodSubmitted: this.getDataValue('eodSubmitted'),
    };
  }

  set reportsSummary(val: any) {
    this.setDataValue('sodSubmitted', val?.sodSubmitted);
    this.setDataValue('eodSubmitted', val?.eodSubmitted);
  }

  public toJSON(): object {
    const values = { ...this.get() };
    values.attendanceSummary = {
      totalDays: values.totalDays,
      presentDays: values.presentDays,
    };
    values.reportsSummary = {
      sodSubmitted: values.sodSubmitted,
      eodSubmitted: values.eodSubmitted,
    };
    return values;
  }
}

Probation.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    kpiName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    totalDays: {
      type: DataTypes.FLOAT,
      field: "attendanceSummary.totalDays",
      allowNull: true,
    },
    presentDays: {
      type: DataTypes.FLOAT,
      field: "attendanceSummary.presentDays",
      allowNull: true,
    },
    sodSubmitted: {
      type: DataTypes.FLOAT,
      field: "reportsSummary.sodSubmitted",
      allowNull: true,
    },
    eodSubmitted: {
      type: DataTypes.FLOAT,
      field: "reportsSummary.eodSubmitted",
      allowNull: true,
    },
    feedback: {
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
    tableName: "probations",
    timestamps: true,
  }
);

export default Probation;
