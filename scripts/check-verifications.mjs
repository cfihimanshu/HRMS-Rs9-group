import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const verifications = await db.collection("verifications").find({}).toArray();
  console.log("Verifications in DB:", verifications.length);
  verifications.forEach((v, i) => {
    console.log(`- ${i}: candidate: ${v.candidate}, status: ${v.status}`);
  });

  const candidates = await db.collection("candidates").find({}).toArray();
  console.log("Candidates in DB:");
  candidates.forEach((c, i) => {
    console.log(`- ${i}: name: ${c.name}, status: ${c.status}, id: ${c._id}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
