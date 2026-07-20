import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class NbfcBranch extends Model<any, any> { [key: string]: any; }

NbfcBranch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nbfcId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    branchName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    branchCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchEmail: { type: DataTypes.STRING, allowNull: true },
    branchManager: { type: DataTypes.STRING, allowNull: true },
    branchManagerContact: { type: DataTypes.STRING, allowNull: true },
    aoName: { type: DataTypes.STRING, allowNull: true },
    foName: { type: DataTypes.STRING, allowNull: true },
    foContact: { type: DataTypes.STRING, allowNull: true },
    rbo: { type: DataTypes.STRING, allowNull: true },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: "nbfc_branches",
    timestamps: true,
    indexes: [
      { fields: ["nbfcId"] }
    ]
  }
);

export default NbfcBranch;
