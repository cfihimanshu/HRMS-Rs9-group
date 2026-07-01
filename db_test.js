const sequelize = require("./lib/sequelize").default;
const SodReport = require("./models/sequelize/SodReport").default;

async function run() {
    await sequelize.authenticate();
    const reports = await SodReport.findAll({
        order: [['createdAt', 'DESC']],
        limit: 1,
        raw: true
    });
    console.log("Last SOD Report:");
    console.log(reports);
}
run();
