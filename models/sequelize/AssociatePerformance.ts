import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AssociatePerformance extends Model<any, any> { [key: string]: any; }

AssociatePerformance.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    evaluator: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    associateName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    associateId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    territory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    leads: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    conversion: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    collectionPayout: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    complaint: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    reporting: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    riskFlag: {
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
    tableName: "associateperformances",
    timestamps: true,
  }
);

export default AssociatePerformance;
