const { Op } = require("sequelize");
const sequelize = require("./lib/sequelize").default;
const User = require("./models/sequelize/User").default;
const EmployeeProfile = require("./models/sequelize/EmployeeProfile").default;
const Candidate = require("./models/sequelize/Candidate").default;
const Interview = require("./models/sequelize/Interview").default;
const Job = require("./models/sequelize/Job").default;
const Associate = require("./models/sequelize/Associate").default;
const Vendor = require("./models/sequelize/Vendor").default;
const Franchise = require("./models/sequelize/Franchise").default;
const Training = require("./models/sequelize/Training").default;
const Probation = require("./models/sequelize/Probation").default;
const Grievance = require("./models/sequelize/Grievance").default;
const RiskAlert = require("./models/sequelize/RiskAlert").default;
const Attendance = require("./models/sequelize/Attendance").default;
const SodReport = require("./models/sequelize/SodReport").default;
const EodReport = require("./models/sequelize/EodReport").default;
const Verification = require("./models/sequelize/Verification").default;
const ExitRecord = require("./models/sequelize/ExitRecord").default;
const Leave = require("./models/sequelize/Leave").default;
const HRRecentActivity = require("./models/sequelize/HRRecentActivity").default;

async function run() {
  try {
    let userFilter = {};
    let generalUserFilter = {};
    let candidateFilter = {};
    let interviewFilter = {};
    let generalCandidateFilter = {};
    let attendanceFilter = {};
    let grievanceFilter = {};
    let alertFilter = {};
    let exitFilter = {};
    let reportFilter = {};

    const sessionUser = { id: "1782968291659", role: "Employee" };
    const isGlobalViewer = false;

    if (!isGlobalViewer) {
      const profile = await EmployeeProfile.findOne({ where: { user: sessionUser.id } });
      let deptUserIds = [sessionUser.id];
      if (profile && profile.department) {
        const deptProfiles = await EmployeeProfile.findAll({ where: { department: profile.department }, attributes: ['user'] });
        deptUserIds = deptProfiles.map((p) => p.user);
      }
      const applyUserFilter = (filterObj, field) => {
        if (filterObj[field]) {
          filterObj[field][Op.in] = deptUserIds.filter((id) => filterObj[field][Op.in].includes(id));
        } else {
          filterObj[field] = { [Op.in]: deptUserIds };
        }
      };

      applyUserFilter(userFilter, 'id');
      applyUserFilter(generalUserFilter, 'employee');
      applyUserFilter(attendanceFilter, 'user');
      applyUserFilter(grievanceFilter, 'raisedBy');
      applyUserFilter(alertFilter, 'triggeredBy');
      applyUserFilter(exitFilter, 'employee');
      applyUserFilter(reportFilter, 'employee');
    }

    console.log("Filters applied. Querying...");
    
    await Candidate.count({ where: candidateFilter });
    await Interview.count({ where: { ...interviewFilter, status: "Pending" } });
    await User.count({ where: userFilter });
    await Probation.count({ where: { ...generalUserFilter, status: "active" } });
    await Grievance.count({ where: { ...grievanceFilter, status: "Open" } });
    await RiskAlert.count({ where: { ...alertFilter, status: "Open" } });
    await SodReport.findAll({ where: { ...reportFilter } });
    await Leave.count({ where: { ...generalUserFilter } });
    await HRRecentActivity.findAll({ where: {} });
    
    console.log("ALL QUERIES PASSED!");
    process.exit(0);
  } catch (error) {
    console.error("ERROR CAUGHT:");
    console.error(error);
    process.exit(1);
  }
}
run();
