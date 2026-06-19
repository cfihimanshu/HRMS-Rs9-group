import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const usersCol = db.collection("users");
  const profilesCol = db.collection("employeeprofiles");
  const companiesCol = db.collection("companies");
  const deptsCol = db.collection("departments");

  // Find Acolyte Group of Companies
  const company = await companiesCol.findOne({ name: "Acolyte Group of Companies" });
  if (!company) {
    throw new Error("Acolyte Group of Companies not found");
  }

  // Find HR department
  const dept = await deptsCol.findOne({ name: "HR", company: company._id });
  if (!dept) {
    throw new Error("HR Department not found for Acolyte");
  }

  console.log("Updating Neeraj Parwani user document...");
  const userUpdate = await usersCol.updateOne(
    { email: "neeraj@gmail.com" },
    {
      $set: {
        password: "neeraj123",
        role: "Employee",
        companies: [company._id],
        companyName: company.name,
        departmentName: dept.name,
        status: "probation",
        updatedAt: new Date()
      }
    }
  );
  console.log("User document update result:", userUpdate);

  // Get User ID
  const user = await usersCol.findOne({ email: "neeraj@gmail.com" });
  if (!user) {
    throw new Error("User neeraj@gmail.com not found after update");
  }

  console.log("Updating Neeraj Parwani EmployeeProfile...");
  const profileUpdate = await profilesCol.updateOne(
    { user: user._id },
    {
      $set: {
        department: dept._id,
        designation: "sales",
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log("Employee profile update result:", profileUpdate);

  await mongoose.disconnect();
  console.log("Done! Neeraj Parwani's credentials, company, and department successfully updated in DB.");
}

run().catch(console.error);
