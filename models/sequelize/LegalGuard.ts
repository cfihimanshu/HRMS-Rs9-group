import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalGuard extends Model<any, any> { [key: string]: any; }

LegalGuard.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    tableName: "legal_guards",
    timestamps: true,
  }
);

export default LegalGuard;
