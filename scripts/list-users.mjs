import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const users = await db.collection("users").find({}).toArray();
  console.log("Users in DB:");
  users.forEach(u => {
    console.log(`- Email: ${u.email}, Password: ${u.password}, Role: ${u.role}, Status: ${u.status}`);
  });
  await mongoose.disconnect();
}

run().catch(console.error);
