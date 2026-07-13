const sequelize = require("../lib/sequelize").default || require("../lib/sequelize");

async function main() {
  await sequelize.authenticate();
  
  const [results] = await sequelize.query("SELECT * FROM candidates WHERE name LIKE '%Dhanush%'");
  console.log("DHANUSH:", JSON.stringify(results, null, 2));

  if (results.length > 0) {
    const candidateId = results[0].id;
    const [interviews] = await sequelize.query("SELECT * FROM interviews WHERE candidate = ?", {
      replacements: [candidateId]
    });
    console.log("INTERVIEWS:", JSON.stringify(interviews, null, 2));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
