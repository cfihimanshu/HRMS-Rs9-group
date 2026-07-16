const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");

const sequelize = new Sequelize("hrms_new", "root", "root123", {
  host: "127.0.0.1",
  port: 3306,
  dialect: "mysql",
  dialectModule: mysql2,
  logging: false,
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log("DB connected.");

    const [cands] = await sequelize.query("SELECT id, name FROM candidates");
    console.log("--- CANDIDATES ---");
    cands.forEach(c => console.log(`ID: ${c.id}, Name: ${c.name}`));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();
