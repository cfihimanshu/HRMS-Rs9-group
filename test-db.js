const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");
const sequelize = new Sequelize("fmojnedg_Rs9_Group_HRMS", "fmojnedg_Rs9_Group", "Legal786skr", {
  host: "103.191.208.201",
  port: 3306,
  dialect: "mysql",
  dialectModule: mysql2,
});
async function run() {
  const [results] = await sequelize.query("SELECT attendanceDate, status, payableUnits, perDayRate, payoutAmount FROM security_guard_attendance WHERE guardName LIKE '%Surendra%' AND attendanceDate LIKE '2026-09%'");
  console.log("Total Records:", results.length);
  const totalPayout = results.reduce((sum, r) => sum + parseFloat(r.payoutAmount), 0);
  console.log("Total Payout:", totalPayout);
  console.log("First 3 records:", results.slice(0, 3));
}
run();
