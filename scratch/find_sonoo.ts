import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import sequelize from '../lib/sequelize';
import User from '../models/sequelize/User';
import BdaLead from '../models/sequelize/BdaLead';
import SodReport from '../models/sequelize/SodReport';
import { Op } from 'sequelize';

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB.");

    // Find Sonoo
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%Sonoo%' } },
          { email: { [Op.like]: '%sonoo%' } }
        ]
      },
      raw: true
    });

    console.log("Users matching Sonoo:", JSON.stringify(users, null, 2));

    if (users.length > 0) {
      const sonoo = users[0];
      const sonooId = String(sonoo.id);

      // Check Sonoo's BDA Leads for today
      const sonooLeads = await BdaLead.findAll({
        where: {
          [Op.or]: [
            { assignedTo: sonooId },
            { assignedToName: { [Op.like]: '%Sonoo%' } }
          ]
        },
        raw: true
      });

      console.log(`Sonoo assigned leads count: ${sonooLeads.length}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
