import sequelize from "./lib/sequelize";
import User from "./models/sequelize/User";
import EmployeeProfile from "./models/sequelize/EmployeeProfile";
import Company from "./models/sequelize/Company";
import Department from "./models/sequelize/Department";
import bcrypt from "bcryptjs";

async function run() {
  try {
    await sequelize.authenticate();
    const company = await Company.findOne();
    if (!company) {
      console.log("No company found");
      return;
    }
    const newUser = await User.create({
      id: Date.now().toString(),
      name: "Test BDA",
      email: "testbda@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "BDA",
      mobile: "1234567890",
      status: "active",
      companies: [company.id],
      loginHistory: [],
    });
    console.log("User created:", newUser.id);
    
    const ep = await EmployeeProfile.create({
      id: Date.now().toString(),
      user: newUser.id,
      employeeId: "TEST-001",
      designation: "BDA",
      department: "Sales",
      dateOfJoining: new Date(),
      baseSalary: 10000,
      "salaryStructure.basic": 5000,
      "salaryStructure.hra": 0,
      "salaryStructure.conveyance": 1000,
      "salaryStructure.specialAllowance": 4000,
      "leaveBalances.casualLeave": 12,
      "leaveBalances.sickLeave": 12,
      "leaveBalances.earnedLeave": 0,
      allocatedAsset: "",
      allocatedSim: "",
      allocatedGmail: "",
      allocatedWhatsapp: ""
    });
    console.log("EmployeeProfile created:", ep.id);
  } catch (e: any) {
    console.error("ERROR:", e.message);
  } finally {
    process.exit(0);
  }
}
run();
