const { Op } = require("sequelize");
const SodReport = require("./models/sequelize/SodReport").default;

async function run() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log("Querying SOD between:", today.toISOString(), "and", tomorrow.toISOString());
    const sodReportsToday = await SodReport.findAll({
      where: {
        date: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      raw: true
    });
    console.log("TODAY SOD COUNT:", sodReportsToday.length);
    console.log("TODAY SODS:", sodReportsToday.map(r => ({ id: r.id, employee: r.employee, date: r.date, createdAt: r.createdAt })));
    
    const all = await SodReport.findAll({ raw: true });
    console.log("ALL SODS:", all.map(r => ({ id: r.id, employee: r.employee, date: r.date, createdAt: r.createdAt })));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
