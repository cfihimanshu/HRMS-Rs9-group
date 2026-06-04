import mongoose, { Schema, Document } from "mongoose";

export interface IHiringRequisition extends Document {
  companyName: string;
  department: string;
  role: string;
  location: string;
  category: "Staff" | "Associate" | "Vendor" | "Franchise";
  qty: number;
  gender: "Male" | "Female" | "Any";
  experience: { min: number; max: number };
  budget: { min: number; max: number };
  skills: string;
  qualification: string;
  jd: string;
  kra: string;
  kpi: string;
  monitoringBenefits: string;
  companyGrowthBenefits: string;
  dateOfRequirement: Date;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  expectedOutput: string;
  status:
    | "Pending HR Sourcing Review"
    | "Pending Accounts Review"
    | "Pending Owner Approval"
    | "Approved — Pending HR Post"
    | "Job Posted"
    | "Rejected"
    | "Hold";
  sourcingBudget?: number;
  postingPlatform?: string;
  postingDuration?: number;
  hrSourcingRemarks?: string;
  accountsRemarks?: string;
  ownerRemarks?: string;
  createdBy: string;
  createdAt: Date;
}

const HiringRequisitionSchema: Schema = new Schema(
  {
    companyName: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, enum: ["Staff", "Associate", "Vendor", "Franchise"], required: true },
    qty: { type: Number, required: true, default: 1 },
    gender: { type: String, enum: ["Male", "Female", "Any"], default: "Any" },
    experience: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    budget: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    skills: { type: String },
    qualification: { type: String, required: true },
    jd: { type: String, required: true },
    kra: { type: String, required: true },
    kpi: { type: String, required: true },
    monitoringBenefits: { type: String },
    companyGrowthBenefits: { type: String },
    dateOfRequirement: { type: Date, required: true, default: Date.now },
    riskLevel: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Low" },
    expectedOutput: { type: String },
    sourcingBudget: { type: Number },
    postingPlatform: { type: String },
    postingDuration: { type: Number },
    hrSourcingRemarks: { type: String },
    status: {
      type: String,
      enum: [
        "Pending HR Sourcing Review",
        "Pending Accounts Review",
        "Pending Owner Approval",
        "Approved — Pending HR Post",
        "Job Posted",
        "Rejected",
        "Hold",
      ],
      default: "Pending HR Sourcing Review",
    },
    accountsRemarks: { type: String },
    ownerRemarks: { type: String },
    createdBy: { type: String, default: "Department Manager" },
  },
  { timestamps: true }
);

if (mongoose.models.HiringRequisition) {
  delete mongoose.models.HiringRequisition;
}

export default mongoose.model<IHiringRequisition>("HiringRequisition", HiringRequisitionSchema);
