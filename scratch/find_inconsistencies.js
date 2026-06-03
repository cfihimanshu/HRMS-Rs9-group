const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Parse .env manually
const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
  }
});

const MONGODB_URI = envVars.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB successfully!");

  const db = mongoose.connection.db;

  // Find all trainings with status "Activation"
  const activeTrainings = await db.collection("trainings").find({ status: "Activation" }).toArray();
  console.log(`Found ${activeTrainings.length} trainings in 'Activation' status.`);

  for (const tr of activeTrainings) {
    const candidate = await db.collection("candidates").findOne({ _id: tr.candidate });
    if (!candidate) {
      console.log(`Warning: Training ${tr._id} has no valid candidate.`);
      continue;
    }

    const user = await db.collection("users").findOne({ email: candidate.email });
    const probation = user ? await db.collection("probations").findOne({ employee: user._id }) : null;

    if (!user || !probation) {
      console.log(`Inconsistency found: Candidate '${candidate.name}' (Email: ${candidate.email}) is Activated but has no User/Probation record.`);
      
      // Reset this candidate too so they can be activated correctly
      await db.collection("candidates").updateOne(
        { _id: candidate._id },
        { $set: { status: "Pending" } }
      );
      await db.collection("trainings").updateOne(
        { _id: tr._id },
        { 
          $set: { status: "Final Status" },
          $unset: { recommendation: "" }
        }
      );
      console.log(`Reset candidate '${candidate.name}' to 'Pending' status and training to 'Final Status'.`);
      
      // Clean up any stray user if it exists partially
      if (user) {
        await db.collection("employeeprofiles").deleteMany({ user: user._id });
        await db.collection("probations").deleteMany({ employee: user._id });
        await db.collection("users").deleteOne({ _id: user._id });
        console.log(`Cleared partial user/profile for '${candidate.name}'.`);
      }
    } else {
      console.log(`Consistent: Candidate '${candidate.name}' has valid User and Probation record.`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
