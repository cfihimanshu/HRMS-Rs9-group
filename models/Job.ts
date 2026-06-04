import mongoose, { Schema, Document } from "mongoose";

export interface IJob extends Document {
  title: string;
  company: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  location: string;
  category: "Staff" | "Associate" | "Vendor" | "Franchise";
  qualification: string;
  experience: string;
  salaryRange: string;
  description: string;
  applicationLink?: string;
  source?: string;
  status: "active" | "inactive";
  shareableLink?: string;
  postingDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    location: { type: String, required: true },
    category: {
      type: String,
      enum: ["Staff", "Associate", "Vendor", "Franchise"],
      required: true,
    },
    qualification: { type: String, required: true },
    experience: { type: String, required: true },
    salaryRange: { type: String, required: true },
    description: { type: String, required: true },
    applicationLink: { type: String },
    source: {
      type: String,
      enum: ["Indeed", "Naukri", "WhatsApp", "Walk-in", "Referral", "Other"],
      default: "Other",
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    shareableLink: { type: String },
    postingDuration: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);
