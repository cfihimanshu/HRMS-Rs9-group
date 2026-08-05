import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Vertical extends Model {
  declare id: string;
  declare name: string;
  declare code: string;
  declare description: string;
  declare status: string;
}

Vertical.init(
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
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    tableName: "verticals",
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["name"] }
    ]
  }
);

export default Vertical;
