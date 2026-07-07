import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalAdvocateMaster extends Model<any, any> { [key: string]: any; }

LegalAdvocateMaster.init(
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
    barCouncilNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    specialization: {
      type: DataTypes.STRING, // e.g. NI Act, Arbitration, Civil
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING, // Active, Inactive
      allowNull: true,
      defaultValue: "Active",
    }
  },
  {
    sequelize,
    tableName: "legal_advocate_master",
    timestamps: true,
  }
);

export default LegalAdvocateMaster;
