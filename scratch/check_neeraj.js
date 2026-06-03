const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

// Define schemas with their real relations
const CompanySchema = new mongoose.Schema({
  name: String
});
const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema, "companies");

const JobSchema = new mongoose.Schema({
  title: String,
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  department: mongoose.Schema.Types.ObjectId
});
const Job = mongoose.models.Job || mongoose.model("Job", JobSchema, "jobs");

const CandidateSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  status: String,
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" }
});
const Candidate = mongoose.models.Candidate || mongoose.model("Candidate", CandidateSchema, "candidates");

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  companies: [mongoose.Schema.Types.ObjectId]
});
const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");

const EmployeeProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employeeId: String,
  designation: String,
  department: mongoose.Schema.Types.ObjectId,
  dateOfJoining: Date,
  baseSalary: Number
});
const EmployeeProfile = mongoose.models.EmployeeProfile || mongoose.model("EmployeeProfile", EmployeeProfileSchema, "employeeprofiles");

const ProbationSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  startDate: Date,
  endDate: Date,
  status: String
});
const Probation = mongoose.models.Probation || mongoose.model("Probation", ProbationSchema, "probations");

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB successfully!");

  const candidate = await Candidate.findOne({ name: /Neeraj/i });
  if (!candidate) {
    console.log("Neeraj Parwani candidate not found!");
    return;
  }
  
  const candidateId = candidate._id;
  console.log("Candidate found:", candidate.name, "Email:", candidate.email);

  try {
    const candDoc = await Candidate.findById(candidateId).populate("job");
    if (!candDoc) {
      throw new Error("Candidate doc not found");
    }
    console.log("Successfully fetched and populated candidate job.");

    const jobDoc = candDoc.job;
    console.log("Job populated:", jobDoc ? jobDoc.title : "None");
    if (jobDoc) {
      console.log("Job company:", jobDoc.company);
    }
    
    let companyId = jobDoc?.company;
    if (!companyId) {
      const defaultCompany = await Company.findOne();
      companyId = defaultCompany?._id;
      console.log("Fallback to default company:", companyId);
    } else {
      console.log("Using job company ID:", companyId);
    }

    // 1. Ensure User exists
    console.log("Checking User...");
    let userDoc = await User.findOne({ email: candDoc.email });
    if (!userDoc) {
      console.log("Creating new user...");
      const hashedPassword = await bcrypt.hash("Welcome@123", 12);
      userDoc = await User.create({
        name: candDoc.name,
        email: candDoc.email,
        password: hashedPassword,
        role: "Associate",
        mobile: candDoc.mobile || null,
        status: "active",
        companies: companyId ? [companyId] : [],
        loginHistory: [],
      });
      console.log("User created successfully:", userDoc._id);
    } else {
      console.log("User already exists:", userDoc._id);
    }

    // 2. Ensure EmployeeProfile exists
    console.log("Checking EmployeeProfile...");
    let profileDoc = await EmployeeProfile.findOne({ user: userDoc._id });
    if (!profileDoc) {
      console.log("Creating employee profile...");
      const getCompanyPrefix = (name) => {
        const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
        if (clean.startsWith("STARTUPKARE")) return "STK";
        if (clean.startsWith("STARTUPFLORA")) return "STA";
        if (clean.startsWith("FORCE")) return "FOR";
        return clean.substring(0, 3).padEnd(3, "X");
      };
      
      let prefix = "EMP";
      if (companyId) {
        const company = await Company.findById(companyId);
        if (company) {
          prefix = getCompanyPrefix(company.name);
        }
      }
      console.log("Prefix decided:", prefix);

      const regex = new RegExp(`^${prefix}-\\d+$`, 'i');
      const profiles = await EmployeeProfile.find({ employeeId: regex });
      let maxNum = 0;
      profiles.forEach(p => {
        const parts = p.employeeId.split("-");
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      
      const nextId = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
      console.log("Assigned Employee ID:", nextId);

      profileDoc = await EmployeeProfile.create({
        user: userDoc._id,
        employeeId: nextId,
        designation: jobDoc?.title || "Associate",
        department: jobDoc?.department || null,
        dateOfJoining: new Date(),
        baseSalary: 0,
        salaryStructure: { basic: 0, hra: 0, conveyance: 0, specialAllowance: 0 },
        leaveBalances: { casualLeave: 12, sickLeave: 12, earnedLeave: 0 }
      });
      console.log("Employee profile created successfully!");
    } else {
      console.log("Employee profile already exists.");
    }

    // 3. Ensure Probation track exists
    console.log("Checking Probation track...");
    let probationDoc = await Probation.findOne({ employee: userDoc._id });
    if (!probationDoc) {
      console.log("Creating probation track...");
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months probation
      probationDoc = await Probation.create({
        employee: userDoc._id,
        startDate,
        endDate,
        status: "active",
        attendanceSummary: { totalDays: 30, presentDays: 28 },
        reportsSummary: { sodSubmitted: 22, eodSubmitted: 22 },
        feedback: "Auto-initiated upon successful training completion."
      });
      console.log("Probation track created successfully!");
    } else {
      console.log("Probation track already exists.");
    }

    console.log("ALL STEPS COMPLETED WITHOUT ERROR!");
  } catch (error) {
    console.error("CRITICAL ERROR ENCOUNTERED:", error);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
