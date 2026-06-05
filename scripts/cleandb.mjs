/**
 * DB Clean Script
 * Deletes ALL data from every collection,
 * then inserts the single Owner user.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

// ─── Collection names to drop (all models) ─────────────────────────
const COLLECTIONS = [
  "users",
  "companies",
  "departments",
  "roles",
  "territories",
  "candidates",
  "interviews",
  "jobs",
  "hiringrequisitions",
  "onboardings",
  "trainings",
  "probations",
  "attendances",
  "sodreports",
  "eodreports",
  "employees",
  "associates",
  "vendors",
  "franchises",
  "grievances",
  "riskalerts",
  "verifications",
  "exitrecords",
  "notifications",
  "auditlogs",
];

async function cleanDB() {
  console.log("\n🔴  Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log("✅  Connected to database:", db.databaseName, "\n");

  // ── Drop every collection ──────────────────────────────────────────
  for (const col of COLLECTIONS) {
    try {
      await db.collection(col).drop();
      console.log(`🗑️   Dropped collection: ${col}`);
    } catch (err) {
      // Collection may not exist yet — skip silently
      console.log(`⚠️   Skipped (not found): ${col}`);
    }
  }

  console.log("\n🌱  Creating Owner user...");

  // ── Insert Owner ───────────────────────────────────────────────────
  await db.collection("users").insertOne({
    name: "Himanshu Sharma (Owner)",
    email: "cfi.himanshu@gmail.com",
    password: "admin123",
    mobile: null,
    role: "Owner",
    companies: [],
    status: "active",
    loginHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✅  Owner user created successfully!");
  console.log("    📧  Email   : cfi.himanshu@gmail.com");
  console.log("    🔑  Password: admin123");
  console.log("    👑  Role    : Owner\n");

  await mongoose.disconnect();
  console.log("🔌  Disconnected. Database is clean and ready!\n");
}

cleanDB().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
