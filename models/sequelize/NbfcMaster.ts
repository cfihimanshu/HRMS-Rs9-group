import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class NbfcMaster extends Model<any, any> { [key: string]: any; }

NbfcMaster.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nbfcName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nbfcCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
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
    tableName: "nbfc_masters",
    timestamps: true,
  }
);

export default NbfcMaster;
