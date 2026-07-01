import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Onboarding extends Model {
  public id!: string;
  public candidate!: string;
  public category!: string;
  public generatedDocs!: any;
  public signedDocs!: any;
  public status!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Onboarding.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    candidate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    generatedDocs: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    signedDocs: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
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
    tableName: "onboardings",
    timestamps: true,
  }
);

export default Onboarding;
