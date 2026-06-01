import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
  job?: mongoose.Types.ObjectId;
  name: string;
  mobile: string;
  email: string;
  address: string;
  qualification: string;
  experience: string;
  currentSalary: string;
  expectedSalary: string;
  noticePeriod: string;
  riskAnswers: {
    sideBusiness: "Yes" | "No";
    loanPressure: "Yes" | "No";
    courtCase: "Yes" | "No";
    targetWork: "Yes" | "No";
    fieldWork: "Yes" | "No";
    backgroundVerification: "Yes" | "No";
    confidentialityAgreement: "Yes" | "No";
  };
  uploads: {
    resume?: string; // Cloudinary URL
    photo?: string; // Cloudinary URL
    aadhaar?: string; // Cloudinary URL
    pan?: string; // Cloudinary URL
    salarySlip?: string; // Cloudinary URL
    bankStatement?: string; // Cloudinary URL
  };
  screeningResult?: {
    candidateSummary?: string;
    skillMatchScore?: number;
    stabilityScore?: number;
    riskScore?: number;
    loyaltyPossibility?: number;
    fraudRisk?: "Low" | "Medium" | "High";
    suggestedQuestions?: string[];
    recommendation?: "Shortlist" | "Hold" | "Reject" | "High Risk";
    screenedAt?: Date;
  };
  currentRound: number; // 1, 2, 3
  status: "Pending" | "Selected" | "Hold" | "Rejected" | "High Risk" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema: Schema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job" },
    name: { type: String, required: true },
    mobile: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    address: { type: String, required: true },
    qualification: { type: String, required: true },
    experience: { type: String, required: true },
    currentSalary: { type: String, required: true },
    expectedSalary: { type: String, required: true },
    noticePeriod: { type: String, required: true },
    riskAnswers: {
      sideBusiness: { type: String, enum: ["Yes", "No"], required: true },
      loanPressure: { type: String, enum: ["Yes", "No"], required: true },
      courtCase: { type: String, enum: ["Yes", "No"], required: true },
      targetWork: { type: String, enum: ["Yes", "No"], required: true },
      fieldWork: { type: String, enum: ["Yes", "No"], required: true },
      backgroundVerification: { type: String, enum: ["Yes", "No"], required: true },
      confidentialityAgreement: { type: String, enum: ["Yes", "No"], required: true },
    },
    uploads: {
      resume: { type: String },
      photo: { type: String },
      aadhaar: { type: String },
      pan: { type: String },
      salarySlip: { type: String },
      bankStatement: { type: String },
    },
    screeningResult: {
      candidateSummary: { type: String },
      skillMatchScore: { type: Number },
      stabilityScore: { type: Number },
      riskScore: { type: Number },
      loyaltyPossibility: { type: Number },
      fraudRisk: { type: String, enum: ["Low", "Medium", "High"] },
      suggestedQuestions: [{ type: String }],
      recommendation: {
        type: String,
        enum: ["Shortlist", "Hold", "Reject", "High Risk"],
      },
      screenedAt: { type: Date, default: Date.now },
    },
    currentRound: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["Pending", "Selected", "Hold", "Rejected", "High Risk", "inactive"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Candidate || mongoose.model<ICandidate>("Candidate", CandidateSchema);
