import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://cfihimanshu_db_user:Legal786skr@cluster0.ywobnmq.mongodb.net/acolyte_hr?appName=Cluster0";

const USERS_TO_SEED = [
  {
    name: "Himanshu Sharma (Owner)",
    email: "cfi.himanshu@gmail.com",
    password: "admin123",
    role: "Owner",
    companyName: "CFI",
  },
  {
    name: "Acolyte Director",
    email: "director@gmail.com",
    password: "director123",
    role: "Director",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Acolyte HR Head",
    email: "hrhead@gmail.com",
    password: "hr123",
    role: "HR Head",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Acolyte HR Executive",
    email: "hrexecutive@gmail.com",
    password: "hr123",
    role: "HR Executive",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Sales Manager",
    email: "sales.manager@gmail.com",
    password: "manager123",
    role: "Department Manager",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Accounts Manager",
    email: "accounts.manager@gmail.com",
    password: "manager123",
    role: "Department Manager",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "IT Manager",
    email: "it.manager@gmail.com",
    password: "manager123",
    role: "Department Manager",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Operations Manager",
    email: "operations@gmail.com",
    password: "manager123",
    role: "Department Manager",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Marketing Manager",
    email: "marketing@gmail.com",
    password: "manager123",
    role: "Department Manager",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Acolyte Trainer",
    email: "trainer@gmail.com",
    password: "manager123",
    role: "Trainer",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Business Associate 1",
    email: "bda1@gmail.com",
    password: "bda123",
    role: "Business Associate",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Business Associate 2",
    email: "bda2@gmail.com",
    password: "bda123",
    role: "Business Associate",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Acolyte Vendor",
    email: "vendor@gmail.com",
    password: "vendor123",
    role: "Vendor",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Acolyte Accounts",
    email: "accounts@acolyte.com",
    password: "accounts123",
    role: "Accounts",
    companyName: "Acolyte Group of Companies",
  },
  {
    name: "Siya (CFI HR Executive)",
    email: "siya@gmail.com",
    password: "siya123",
    role: "HR Executive",
    companyName: "CFI",
  }
];

async function updatePasswords() {
  console.log("\nConnecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log("Connected to database:", db.databaseName);

  // 1. Get or Create companies
  console.log("\nEnsuring companies exist...");
  const companiesCol = db.collection("companies");
  
  const acolyteComp = await companiesCol.findOneAndUpdate(
    { code: "ACOLYTE" },
    { $setOnInsert: { name: "Acolyte Group of Companies", code: "ACOLYTE", address: "Delhi", status: "active", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  const cfiComp = await companiesCol.findOneAndUpdate(
    { code: "CFI" },
    { $setOnInsert: { name: "CFI", code: "CFI", address: "Delhi", status: "active", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  const acolyteId = acolyteComp._id || (await companiesCol.findOne({ code: "ACOLYTE" }))._id;
  const cfiId = cfiComp._id || (await companiesCol.findOne({ code: "CFI" }))._id;

  console.log(`Company ID Acolyte: ${acolyteId}`);
  console.log(`Company ID CFI: ${cfiId}`);

  // 2. Insert/Update Users
  console.log("\nProcessing users...");
  const usersCol = db.collection("users");

  for (const u of USERS_TO_SEED) {
    const companyId = u.companyName === "CFI" ? cfiId : acolyteId;
    
    // Check if user exists
    const existing = await usersCol.findOne({ email: u.email });
    if (existing) {
      // Update password and ensure correct role, status, companies
      await usersCol.updateOne(
        { _id: existing._id },
        { 
          $set: { 
            password: u.password,
            role: u.role,
            status: "active",
            companies: [companyId],
            updatedAt: new Date()
          } 
        }
      );
      console.log(`Updated user: ${u.email} -> password: ${u.password}`);
    } else {
      // Create user
      await usersCol.insertOne({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        companies: [companyId],
        status: "active",
        mobile: null,
        loginHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created user: ${u.email} -> password: ${u.password}`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDone! All passwords successfully updated in DB.");
}

updatePasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
