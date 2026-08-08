import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class VendorCategory extends Model {
  declare id: string;
  declare name: string;
}

VendorCategory.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "VendorCategory",
    tableName: "vendor_categories",
    timestamps: true,
  }
);

export default VendorCategory;
