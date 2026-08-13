import User from "./User";
import EmployeeProfile from "./EmployeeProfile";
import Department from "./Department";
import Designation from "./Designation";
import SodReport from "./SodReport";
import EodReport from "./EodReport";
import Attendance from "./Attendance";
import AuditLog from "./AuditLog";

import DisciplinaryWarning from "./DisciplinaryWarning";

// Establish soft relationships without enforcing strict SQL constraints
// This prevents database crashes if old/dirty data exists and avoids HMR re-association errors.

if (!(global as any)._associationsInitialized) {
  if (!User.associations?.profile) {
    User.hasOne(EmployeeProfile, { foreignKey: "user", as: "profile", constraints: false });
  }
  if (!EmployeeProfile.associations?.account) {
    EmployeeProfile.belongsTo(User, { foreignKey: "user", as: "account", constraints: false });
  }

  if (!EmployeeProfile.associations?.departmentDetails) {
    EmployeeProfile.belongsTo(Department, { foreignKey: "department", targetKey: "id", as: "departmentDetails", constraints: false });
  }
  if (!EmployeeProfile.associations?.designationDetails) {
    EmployeeProfile.belongsTo(Designation, { foreignKey: "designation", targetKey: "id", as: "designationDetails", constraints: false });
  }

  if (!SodReport.associations?.employeeDetails) {
    SodReport.belongsTo(User, { foreignKey: "employee", targetKey: "id", as: "employeeDetails", constraints: false });
  }
  if (!User.associations?.sodReports) {
    User.hasMany(SodReport, { foreignKey: "employee", as: "sodReports", constraints: false });
  }

  if (!EodReport.associations?.employeeDetails) {
    EodReport.belongsTo(User, { foreignKey: "employee", targetKey: "id", as: "employeeDetails", constraints: false });
  }
  if (!User.associations?.eodReports) {
    User.hasMany(EodReport, { foreignKey: "employee", as: "eodReports", constraints: false });
  }

  if (!Attendance.associations?.employeeDetails) {
    Attendance.belongsTo(User, { foreignKey: "employee", targetKey: "id", as: "employeeDetails", constraints: false });
  }
  if (!User.associations?.attendances) {
    User.hasMany(Attendance, { foreignKey: "employee", as: "attendances", constraints: false });
  }

  if (!AuditLog.associations?.userDetails) {
    AuditLog.belongsTo(User, { foreignKey: "user", targetKey: "id", as: "userDetails", constraints: false });
  }
  if (!User.associations?.auditLogs) {
    User.hasMany(AuditLog, { foreignKey: "user", as: "auditLogs", constraints: false });
  }

  if (!DisciplinaryWarning.associations?.employeeDetails) {
    DisciplinaryWarning.belongsTo(User, { foreignKey: "employeeId", targetKey: "id", as: "employeeDetails", constraints: false });
  }
  if (!User.associations?.warnings) {
    User.hasMany(DisciplinaryWarning, { foreignKey: "employeeId", as: "warnings", constraints: false });
  }

  (global as any)._associationsInitialized = true;
  console.log("Sequelize Soft Associations initialized safely.");
}
