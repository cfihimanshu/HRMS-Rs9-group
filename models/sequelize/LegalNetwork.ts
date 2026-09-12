import { DataTypes, Model } from "sequelize";
import sequelize from "@/lib/sequelize";

class LegalNetwork extends Model { declare name: string; }

LegalNetwork.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
}, { sequelize, tableName: "legal_networks", timestamps: true });

export default LegalNetwork;
