const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || "hrms",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "Legal786skr",
  {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT) || 3306,
    dialect: "mysql",
    dialectModule: mysql2,
    logging: console.log,
  }
);

async function runMigration() {
  try {
    console.log("Checking lead_platforms to find all dynamic platform tables...");
    const [platforms] = await sequelize.query("SELECT * FROM lead_platforms");
    console.log(`Found ${platforms.length} platforms.`);

    for (const platform of platforms) {
      const tableName = platform.tableName;
      try {
        console.log(`\n--------------------------------------------`);
        console.log(`Processing table: ${tableName} (${platform.name})`);

        // Check if table exists
        const [tableExists] = await sequelize.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = ?
        `, { replacements: [tableName] });

        if (tableExists[0].count === 0) {
          console.log(`Table ${tableName} does not exist in schema. Skipping.`);
          continue;
        }

        // Run table migration
        await migrateTable(tableName);
      } catch (err) {
        console.error(`Failed to migrate table ${tableName}:`, err);
      }
    }

    console.log("\nMigration completed successfully.");
  } catch (error) {
    console.error("Migration failed with error:", error);
  } finally {
    await sequelize.close();
  }
}

async function migrateTable(tableName) {
  const [colsResult] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
  const colsMap = {}; // lowercase -> original case
  colsResult.forEach(c => {
    colsMap[c.Field.toLowerCase()] = c.Field;
  });

  const categories = [
    {
      defaultCol: 'name',
      duplicates: ['full_name', 'fullname', 'candidate_name', 'lead_name']
    },
    {
      defaultCol: 'phone',
      duplicates: ['mobile_no', 'mobile', 'phone_no', 'phoneno', 'phone_number', 'contact_no', 'contact']
    },
    {
      defaultCol: 'email',
      duplicates: ['email_id', 'emailid', 'email_address']
    },
    {
      defaultCol: 'experience',
      duplicates: ['level_of_experience', 'level_of_experien', 'exp', 'relevant_experience']
    }
  ];

  for (const cat of categories) {
    const defaultInDb = colsMap[cat.defaultCol];
    const existingDuplicates = cat.duplicates
      .map(d => colsMap[d])
      .filter(Boolean);

    if (existingDuplicates.length > 0 && defaultInDb) {
      // Both default column AND duplicate columns exist
      const targetCol = existingDuplicates[0];
      console.log(`- Merging standard column "${defaultInDb}" into imported column "${targetCol}" and dropping "${defaultInDb}".`);

      // 1. Merge defaultCol values into targetCol
      await sequelize.query(`
        UPDATE ${tableName} 
        SET ${targetCol} = ${defaultInDb} 
        WHERE (${targetCol} IS NULL OR ${targetCol} = '') 
          AND (${defaultInDb} IS NOT NULL AND ${defaultInDb} != '')
      `);

      // 2. Drop defaultCol
      await sequelize.query(`ALTER TABLE ${tableName} DROP COLUMN ${defaultInDb}`);
      delete colsMap[cat.defaultCol];

      // 3. Consolidate any other duplicate columns for this category into targetCol
      for (let i = 1; i < existingDuplicates.length; i++) {
        const otherCol = existingDuplicates[i];
        console.log(`- Merging duplicate column "${otherCol}" into "${targetCol}" and dropping "${otherCol}".`);
        await sequelize.query(`
          UPDATE ${tableName} 
          SET ${targetCol} = ${otherCol} 
          WHERE (${targetCol} IS NULL OR ${targetCol} = '') 
            AND (${otherCol} IS NOT NULL AND ${otherCol} != '')
        `);
        await sequelize.query(`ALTER TABLE ${tableName} DROP COLUMN ${otherCol}`);
        delete colsMap[otherCol.toLowerCase()];
      }
    } else if (existingDuplicates.length > 1) {
      // Multiple duplicate columns exist, default column doesn't.
      // Merge all other duplicates into the first one.
      const targetCol = existingDuplicates[0];
      console.log(`- Multiple duplicate columns found: ${existingDuplicates.join(', ')}. Consolidating into "${targetCol}".`);
      for (let i = 1; i < existingDuplicates.length; i++) {
        const otherCol = existingDuplicates[i];
        console.log(`- Merging duplicate column "${otherCol}" into "${targetCol}" and dropping "${otherCol}".`);
        await sequelize.query(`
          UPDATE ${tableName} 
          SET ${targetCol} = ${otherCol} 
          WHERE (${targetCol} IS NULL OR ${targetCol} = '') 
            AND (${otherCol} IS NOT NULL AND ${otherCol} != '')
        `);
        await sequelize.query(`ALTER TABLE ${tableName} DROP COLUMN ${otherCol}`);
        delete colsMap[otherCol.toLowerCase()];
      }
    }
  }
}

runMigration();
