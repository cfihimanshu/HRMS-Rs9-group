import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class User extends Model {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string | null;
  declare mobile: string;
  declare role: string;
  declare status: string;
  declare companies: any;
  declare loginHistory: any;
  declare menuAccess: any;
}

User.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companies: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    loginHistory: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    menuAccess: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    indexes: [
      { fields: ["role"] },
      { fields: ["status"] },
      { fields: ["email"] }
    ]
  }
);

export default User;
