import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class ExitForm extends Model<any, any> { [key: string]: any; }

ExitForm.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    submittedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    exitReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assetReturn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    accessRevoke: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    handover: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    finalSettlement: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    exitFeedback: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postExitRisk: {
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
    tableName: "exitforms",
    timestamps: true,
  }
);

export default ExitForm;
