import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class HiringRequisition extends Model {
  get experience() {
    return {
      min: this.getDataValue('experienceMin'),
      max: this.getDataValue('experienceMax'),
    };
  }

  set experience(val: any) {
    this.setDataValue('experienceMin', val?.min);
    this.setDataValue('experienceMax', val?.max);
  }

  get budget() {
    return {
      min: this.getDataValue('budgetMin'),
      max: this.getDataValue('budgetMax'),
    };
  }

  set budget(val: any) {
    this.setDataValue('budgetMin', val?.min);
    this.setDataValue('budgetMax', val?.max);
  }

  public toJSON(): object {
    const values = { ...this.get() };
    values.experience = {
      min: values.experienceMin,
      max: values.experienceMax,
    };
    values.budget = {
      min: values.budgetMin,
      max: values.budgetMax,
    };
    return values;
  }
}

HiringRequisition.init(
  {
    
    mongo_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qty: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    experienceMin: {
      type: DataTypes.FLOAT,
      field: "experience.min",
      allowNull: true,
    },
    experienceMax: {
      type: DataTypes.FLOAT,
      field: "experience.max",
      allowNull: true,
    },
    budgetMin: {
      type: DataTypes.FLOAT,
      field: "budget.min",
      allowNull: true,
    },
    budgetMax: {
      type: DataTypes.FLOAT,
      field: "budget.max",
      allowNull: true,
    },
    skills: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    jd: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    kra: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    kpi: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    monitoringBenefits: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyGrowthBenefits: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfRequirement: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    riskLevel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expectedOutput: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sourcingBudget: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    postingPlatform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postingDuration: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    hrSourcingRemarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountsRemarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ownerRemarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
  },
  {
    sequelize,
    tableName: "hiringrequisitions",
    timestamps: true,
  }
);

export default HiringRequisition;
