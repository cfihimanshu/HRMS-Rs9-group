import { Sequelize } from "sequelize";
import mysql2 from "mysql2";

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || "hrms",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "Legal786skr",
  {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT) || 3306,
    dialect: "mysql",
    dialectModule: mysql2,
    logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test the connection
export async function connectSequelize() {
  try {
    await sequelize.authenticate();
    console.log("Connected to MySQL database via Sequelize successfully!");
  } catch (error) {
    console.error("Unable to connect to the MySQL database:", error);
  }
}

export default sequelize;
