import fs from "fs";
import path from "path";

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

async function main() {
  try {
    const sequelize = (await import("../lib/sequelize")).default;
    await sequelize.authenticate();
    
    const User = (await import("../models/sequelize/User")).default;
    const EmployeeProfile = (await import("../models/sequelize/EmployeeProfile")).default;
    const Department = (await import("../models/sequelize/Department")).default;
    
    // Setup soft associations
    User.hasOne(EmployeeProfile, { foreignKey: "user", as: "profile", constraints: false });
    EmployeeProfile.belongsTo(User, { foreignKey: "user", as: "account", constraints: false });
    EmployeeProfile.belongsTo(Department, { foreignKey: "department", targetKey: "id", as: "departmentDetails", constraints: false });

    const users = await User.findAll({
      include: [
        {
          model: EmployeeProfile,
          as: "profile",
          include: [
            {
              model: Department,
              as: "departmentDetails"
            }
          ]
        }
      ]
    });

    console.log("Employees List:");
    users.forEach((u: any) => {
      console.log({
        id: u.id,
        name: u.name,
        role: u.role,
        designation: u.profile?.designation,
        departmentId: u.profile?.department,
        departmentName: u.profile?.departmentDetails?.name
      });
    });

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
