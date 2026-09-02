import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class SecurityProject extends Model<any, any> { [key: string]: any; }

SecurityProject.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sourceSecurityId: { type: DataTypes.INTEGER, allowNull: true },
  nbfcId: { type: DataTypes.STRING, allowNull: true },
  nbfcName: { type: DataTypes.STRING, allowNull: false },
  siteName: { type: DataTypes.STRING, allowNull: false },
  siteStartedDate: { type: DataTypes.DATEONLY, allowNull: false },
  guardId: { type: DataTypes.INTEGER, allowNull: true },
  guardName: { type: DataTypes.STRING, allowNull: false },
  contactNumber: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "Ongoing" },
  createdBy: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  tableName: "security_projects",
  timestamps: true,
  indexes: [
    { name: "idx_security_project_nbfc", fields: ["nbfcId"] },
    { name: "idx_security_project_source", fields: ["sourceSecurityId"] },
    { name: "idx_security_project_status", fields: ["status"] },
    { name: "idx_security_project_start_date", fields: ["siteStartedDate"] },
  ],
});

export default SecurityProject;
