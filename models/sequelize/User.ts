import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class User extends Model {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public mobile!: string;
  public role!: string;
  public status!: string;
  public companies!: any;
  public loginHistory!: any;
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
