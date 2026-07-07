import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres', {
  dialect: 'postgres',
  logging: false,
});

async function run() {
  try {
    const users = await sequelize.query("SELECT * FROM users", { type: sequelize.QueryTypes.SELECT });
    console.log("Users:", users.length);
    const profiles = await sequelize.query("SELECT * FROM employeeprofiles", { type: sequelize.QueryTypes.SELECT });
    console.log("Profiles:", profiles.length);
    const deps = await sequelize.query("SELECT * FROM departments", { type: sequelize.QueryTypes.SELECT });
    console.log("Deps:", deps.length);
    const comps = await sequelize.query("SELECT * FROM companies", { type: sequelize.QueryTypes.SELECT });
    console.log("Comps:", comps.length);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}
run();
