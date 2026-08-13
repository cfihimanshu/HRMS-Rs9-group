import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import sequelize from '../lib/sequelize';
import TaskLog from '../models/sequelize/TaskLog';

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to MySQL DB.");
    await TaskLog.sync({ alter: true });
    console.log("SUCCESSFULLY SYNCED TaskLog schema! leadStatus column is added to tasklogs table.");
    process.exit(0);
  } catch (err) {
    console.error("Sync error:", err);
    process.exit(1);
  }
}

run();
