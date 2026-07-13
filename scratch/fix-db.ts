import sequelize from "../lib/sequelize";

async function main() {
  await sequelize.authenticate();

  // Try to add sourcingChannel column to candidates table if it doesn't exist
  try {
    const [cols]: any[] = await sequelize.query("SHOW COLUMNS FROM candidates LIKE 'sourcingChannel'");
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE candidates ADD COLUMN sourcingChannel VARCHAR(255) NULL");
      console.log("Added column 'sourcingChannel' to candidates table successfully!");
    } else {
      console.log("Column 'sourcingChannel' already exists.");
    }
  } catch (e) {
    console.error("Failed to alter candidates table:", e);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
