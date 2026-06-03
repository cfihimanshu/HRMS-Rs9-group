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

  const candidate = await db.collection("candidates").findOne({ name: /Neeraj/i });
  if (candidate) {
    const candidateId = candidate._id;
    
    // 1. Reset candidate status to "Pending"
    await db.collection("candidates").updateOne(
      { _id: candidateId },
      { $set: { status: "Pending" } }
    );
    console.log("Reset candidate status to Pending.");

    // 2. Reset training status to "Final Status" and clear recommendation
    await db.collection("trainings").updateOne(
      { candidate: candidateId },
      { 
        $set: { status: "Final Status" },
        $unset: { recommendation: "" }
      }
    );
    console.log("Reset training status to Final Status and cleared recommendation.");

    // 3. Clear any users/profiles/probations for neeraj@gmail.com to avoid duplicates
    const user = await db.collection("users").findOne({ email: candidate.email });
    if (user) {
      await db.collection("employeeprofiles").deleteMany({ user: user._id });
      await db.collection("probations").deleteMany({ employee: user._id });
      await db.collection("users").deleteOne({ _id: user._id });
      console.log("Cleared existing user/profile/probation records for Neeraj.");
    }
  } else {
    console.log("Candidate not found.");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
