import { Sequelize } from "sequelize";
import mysql2 from "mysql2";

/* eslint-disable no-var */
declare global {
  var sequelizeInstance: Sequelize | undefined;
}
/* eslint-enable no-var */

const getSequelizeInstance = () => {
  if (globalThis.sequelizeInstance) {
    return globalThis.sequelizeInstance;
  }

  const instance = new Sequelize(
    process.env.MYSQL_DATABASE || "hrms",
    process.env.MYSQL_USER || "root",
    process.env.MYSQL_PASSWORD || "Legal786skr",
    {
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT) || 3306,
      dialect: "mysql",
      dialectModule: mysql2,
      logging: false,
      dialectOptions: {
        connectTimeout: 5000,
        ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined
      },
      pool: {
        max: 20,
        min: 0,
        acquire: 10000,
        idle: 5000,
        evict: 1000
      }
    }
  );

  globalThis.sequelizeInstance = instance;
  return instance;
};

const sequelize = getSequelizeInstance();

let isAssociationsInitialized = false;

export async function safeAuthenticate(timeoutMs = 4000) {
  try {
    const authPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout")), timeoutMs)
    );
    await Promise.race([authPromise, timeoutPromise]);
    return true;
  } catch (err) {
    console.warn("Database connection timeout or error:", (err as any)?.message);
    return false;
  }
}

export async function connectSequelize() {
  try {
    const ok = await safeAuthenticate(5000);
    if (ok && !isAssociationsInitialized) {
      await import("../models/sequelize/associations");
      isAssociationsInitialized = true;
    }
  } catch (error) {
    console.error("Unable to connect to the MySQL database:", error);
  }
}

export default sequelize;
