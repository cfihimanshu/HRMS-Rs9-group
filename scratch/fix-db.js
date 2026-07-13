const sequelize = require("../lib/sequelize").default || require("../lib/sequelize");

async function main() {
  await sequelize.authenticate();
  
  // 1. Update candidate IND-ITX-BDE-4 currentRound to 2
  const [result1] = await sequelize.query(
    "UPDATE candidates SET currentRound = 2 WHERE id = 'IND-ITX-BDE-4'"
  );
  console.log("Updated Rajeev (IND-ITX-BDE-4) currentRound:", result1);

  // 2. Also fix any other candidates whose Round 1 is Selected but currentRound is still 1 or null
  const [candidates] = await sequelize.query(
    `SELECT DISTINCT candidate FROM interviews WHERE round = 1 AND status = 'Selected'`
  );
  
  for (const row of candidates) {
    const [updateRes] = await sequelize.query(
      `UPDATE candidates SET currentRound = 2 WHERE id = ? AND (currentRound IS NULL OR currentRound = 1)`,
      { replacements: [row.candidate] }
    );
    console.log(`Ensured candidate ${row.candidate} currentRound is at least 2:`, updateRes);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
