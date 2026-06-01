import mongoose, { Schema, Document } from "mongoose";

export interface IEmployeeProfile extends Document {
  user: mongoose.Types.ObjectId; // Reference to User
  employeeId: string; // EMP-001
  designation: string;
  department: mongoose.Types.ObjectId;
  dateOfJoining: Date;
  dateOfBirth?: Date;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: string;
  
  // Statutory & Compliance
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string; // PF UAN
  pfNumber?: string;
  esiNumber?: string;
  
  // Bank Details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  
  // Compensation
  baseSalary: number; // Monthly base
  salaryStructure?: {
    basic: number;
    hra: number;
    conveyance: number;
    specialAllowance: number;
  };
  
  // Leave Balances (Annual)
  leaveBalances: {
    casualLeave: number;
    sickLeave: number;
    earnedLeave: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeProfileSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    designation: { type: String, required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    dateOfJoining: { type: Date, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    bloodGroup: { type: String },
    
    panNumber: { type: String },
    aadhaarNumber: { type: String },
    uanNumber: { type: String },
    pfNumber: { type: String },
    esiNumber: { type: String },
    
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    
    baseSalary: { type: Number, required: true },
    salaryStructure: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      conveyance: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
    },
    
    leaveBalances: {
      casualLeave: { type: Number, default: 12 },
      sickLeave: { type: Number, default: 12 },
      earnedLeave: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeProfile || mongoose.model<IEmployeeProfile>("EmployeeProfile", EmployeeProfileSchema);
