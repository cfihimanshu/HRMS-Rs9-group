import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Verification extends Model {
  public mongo_id!: string;
  public candidate!: string;
  public aadhaarStatus!: string;
  public panStatus!: string;
  public addressStatus!: string;
  public employerStatus!: string;
  public referencesStatus!: string;
  public cibilStatus!: string;
  public bankStatus!: string;
  public policeStatus!: string;
  public socialMediaStatus!: string;
  public remarks!: string;
  public status!: string;
  public aadhaarUrl!: string;
  public panUrl!: string;
  public salarySlipUrl!: string;
  public bankStatementUrl!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Verification.init(
  {
    
    mongo_id: {
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
