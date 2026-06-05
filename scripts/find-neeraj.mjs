import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Find candidate by email
  const candidate = await db.collection("candidates").findOne({ email: /neeraj/i });
  console.log("CANDIDATE INFO:");
  console.log(JSON.stringify(candidate, null, 2));

  if (candidate && candidate.job) {
    const job = await db.collection("jobs").findOne({ _id: candidate.job });
    console.log("\nJOB INFO:");
    console.log(JSON.stringify(job, null, 2));
    
    if (job) {
      if (job.company) {
        const company = await db.collection("companies").findOne({ _id: job.company });
        console.log("\nCOMPANY INFO:");
        console.log(JSON.stringify(company, null, 2));
      }
      if (job.department) {
        const department = await db.collection("departments").findOne({ _id: job.department });
        console.log("\nDEPARTMENT INFO:");
        console.log(JSON.stringify(department, null, 2));
      }
    }
  }

  // Find EmployeeProfile for user
  const user = await db.collection("users").findOne({ email: /neeraj/i });
  console.log("\nUSER INFO:");
  console.log(JSON.stringify(user, null, 2));

  if (user) {
    const profile = await db.collection("employeeprofiles").findOne({ user: user._id });
    console.log("\nEMPLOYEE PROFILE INFO:");
    console.log(JSON.stringify(profile, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
