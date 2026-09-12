import { DataTypes, Model } from "sequelize";
import sequelize from "@/lib/sequelize";

class LegalRbo extends Model { declare name: string; }

LegalRbo.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
}, { sequelize, tableName: "legal_rbos", timestamps: true });

export default LegalRbo;
