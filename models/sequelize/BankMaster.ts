import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class BankMaster extends Model {
  public id!: string;
  public bankName!: string;
}

BankMaster.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "bankmasters",
    timestamps: true,
  }
);

export default BankMaster;
