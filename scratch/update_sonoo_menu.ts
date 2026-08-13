import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import sequelize from '../lib/sequelize';
import User from '../models/sequelize/User';
import { Op } from 'sequelize';

const defaultEssPages = [
  "ess-dashboard",
  "ess-leaves",
  "ess-expenses",
  "asset-request",
  "bda-leads",
  "tasks",
  "performance",
  "field-visit",
  "leave-request",
  "exit"
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB.");

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%Sonoo%' } },
          { email: { [Op.like]: '%sonoo%' } }
        ]
      }
    });

    for (const u of users) {
      console.log(`Updating menuAccess for user ${u.name} (ID: ${u.id})...`);
      u.menuAccess = defaultEssPages;
      await u.save();
    }

    console.log("✅ Successfully updated menuAccess for Sonoo!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
