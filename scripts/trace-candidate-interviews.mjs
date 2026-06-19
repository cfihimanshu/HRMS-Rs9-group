import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const interviews = await db.collection("interviews").find({}).toArray();
  for (const iv of interviews) {
    const candObj = await db.collection("candidates").findOne({ _id: iv.candidate });
    console.log(`Interview ID: ${iv._id}, Candidate ID: ${iv.candidate}, Name: ${candObj?.name}, Round: ${iv.round}, Status: ${iv.status}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
