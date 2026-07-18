import User from "./User";
import EmployeeProfile from "./EmployeeProfile";
import Department from "./Department";
import Designation from "./Designation";
import SodReport from "./SodReport";
import EodReport from "./EodReport";
import Attendance from "./Attendance";
import AuditLog from "./AuditLog";

// Establish soft relationships without enforcing strict SQL constraints
// This prevents database crashes if old/dirty data exists.

// User and EmployeeProfile
User.hasOne(EmployeeProfile, { foreignKey: "user", as: "profile", constraints: false });
EmployeeProfile.belongsTo(User, { foreignKey: "user", as: "account", constraints: false });

// Profile and Masters (Department, Designation)
// Assuming EmployeeProfile.department stores the department ID or name
EmployeeProfile.belongsTo(Department, { foreignKey: "department", targetKey: "id", as: "departmentDetails", constraints: false });
EmployeeProfile.belongsTo(Designation, { foreignKey: "designation", targetKey: "id", as: "designationDetails", constraints: false });

// Reports and User
SodReport.belongsTo(User, { foreignKey: "employee", targetKey: "id", as: "employeeDetails", constraints: false });
User.hasMany(SodReport, { foreignKey: "employee", as: "sodReports", constraints: false });

EodReport.belongsTo(User, { foreignKey: "employee", targetKey: "id", as: "employeeDetails", constraints: false });
User.hasMany(EodReport, { foreignKey: "employee", as: "eodReports", constraints: false });

Attendance.belongsTo(User, { foreignKey: "employee", targetKey: "id", as: "employeeDetails", constraints: false });
User.hasMany(Attendance, { foreignKey: "employee", as: "attendances", constraints: false });

// Audit Logs
AuditLog.belongsTo(User, { foreignKey: "user", targetKey: "id", as: "userDetails", constraints: false });
User.hasMany(AuditLog, { foreignKey: "user", as: "auditLogs", constraints: false });

// Disciplinary Warnings
import DisciplinaryWarning from "./DisciplinaryWarning";
DisciplinaryWarning.belongsTo(User, { foreignKey: "employeeId", targetKey: "id", as: "employeeDetails", constraints: false });
User.hasMany(DisciplinaryWarning, { foreignKey: "employeeId", as: "warnings", constraints: false });

console.log("Sequelize Soft Associations initialized safely.");
