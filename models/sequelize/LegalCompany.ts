import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalCompany extends Model<any, any> { [key: string]: any; }

LegalCompany.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "legal_companies",
    timestamps: true,
  }
);

export default LegalCompany;
