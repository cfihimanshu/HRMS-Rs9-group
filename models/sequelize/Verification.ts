import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Verification extends Model {
  declare id: string;
  declare candidate: string;
  declare aadhaarStatus: string;
  declare panStatus: string;
  declare addressStatus: string;
  declare employerStatus: string;
  declare referencesStatus: string;
  declare cibilStatus: string;
  declare bankStatus: string;
  declare policeStatus: string;
  declare socialMediaStatus: string;
  declare remarks: string;
  declare status: string;
  declare aadhaarUrl: string;
  declare panUrl: string;
  declare salarySlipUrl: string;
  declare bankStatementUrl: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Verification.init(
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
    aadhaarStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    panStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    addressStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employerStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referencesStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cibilStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    policeStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    socialMediaStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aadhaarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    panUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    salarySlipUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankStatementUrl: {
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
    tableName: "verifications",
    timestamps: true,
  }
);

export default Verification;
