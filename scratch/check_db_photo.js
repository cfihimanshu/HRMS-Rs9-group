import fs from "fs";
import path from "path";
import { Sequelize, DataTypes, Model } from "sequelize";

// Parse .env manually
const dotenvPath = path.join(process.cwd(), ".env");
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        process.env[key] = value;
      }
    }
  });
}

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || "hrms_new",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "root123",
  {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT) || 3306,
    dialect: "mysql",
    logging: false,
  }
);

class EmployeeProfile extends Model {}
EmployeeProfile.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  user: { type: DataTypes.STRING },
  employeeId: { type: DataTypes.STRING },
  profilePhoto: { type: DataTypes.TEXT },
  dailyWorkingHours: { type: DataTypes.FLOAT },
  workingDays: { type: DataTypes.STRING },
  reportingManager: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING }
}, { sequelize, tableName: "employeeprofiles", timestamps: true });

async function run() {
  try {
    const profiles = await EmployeeProfile.findAll({ where: {}, raw: true });
    console.log("DB Employee Profiles:");
    console.log(profiles);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    await sequelize.close();
  }
}
run();
