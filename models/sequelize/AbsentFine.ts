import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AbsentFine extends Model<any, any> { [key: string]: any; }

AbsentFine.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    employee: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 500,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imposedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imposedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    tableName: "absent_fines",
    timestamps: true,
    indexes: [
      { fields: ["employee"] },
      { fields: ["date"] },
      { fields: ["imposedBy"] },
    ],
  }
);

export default AbsentFine;
