import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalNoticeType extends Model<any, any> { [key: string]: any; }

LegalNoticeType.init(
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "legal_notice_types",
    timestamps: true,
  }
);

export default LegalNoticeType;
