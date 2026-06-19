import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const candCount = await db.collection("candidates").countDocuments();
  console.log("Total candidates in DB:", candCount);

  const pendingCand = await db.collection("candidates").countDocuments({ status: "Pending" });
  console.log("Pending candidates in DB:", pendingCand);

  const selectedCand = await db.collection("candidates").countDocuments({ status: "Selected" });
  console.log("Selected candidates in DB:", selectedCand);

  const rejectedCand = await db.collection("candidates").countDocuments({ status: "Rejected" });
  console.log("Rejected candidates in DB:", rejectedCand);

  const interviewsCount = await db.collection("interviews").countDocuments();
  console.log("Total interviews in DB:", interviewsCount);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  
  const todayInterviewsList = await db.collection("interviews").find({ scheduleTime: { $gte: today, $lte: endOfToday } }).toArray();
  console.log("Today interviews in DB (local range):", todayInterviewsList.length);

  // Print all interviews scheduleTime and status
  const allInterviews = await db.collection("interviews").find({}).toArray();
  console.log("All interviews details:");
  allInterviews.forEach((iv, i) => {
    console.log(`- ${i}: candidateName: ${iv.candidateName}, round: ${iv.round}, scheduleTime: ${iv.scheduleTime}, status: ${iv.status}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
