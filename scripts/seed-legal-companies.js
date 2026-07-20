const { Sequelize, DataTypes } = require("sequelize");
const mysql2 = require("mysql2");
require("dotenv").config();

const dbName = process.env.MYSQL_DATABASE || "hrms_new";
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD || "Legal786skr";
const host = process.env.MYSQL_HOST || "127.0.0.1";
const port = Number(process.env.MYSQL_PORT) || 3306;

const sequelize = new Sequelize(dbName, user, password, {
  host,
  port,
  dialect: "mysql",
  dialectModule: mysql2,
  logging: console.log,
});

const LegalCompany = sequelize.define(
  "LegalCompany",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    companyName: { type: DataTypes.STRING, allowNull: false, unique: true },
    createdBy: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "legal_companies", timestamps: true }
);

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB successfully!");
    await LegalCompany.sync({ alter: true });

    const defaultCompanies = [
      { companyName: "Force009", createdBy: "System" },
      { companyName: "ATPL (Acolyte Technologies Private Limited)", createdBy: "System" },
    ];

    for (const comp of defaultCompanies) {
      await LegalCompany.findOrCreate({
        where: { companyName: comp.companyName },
        defaults: comp,
      });
    }

    console.log("Seeded legal_companies table successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
